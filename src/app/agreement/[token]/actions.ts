'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { db } from '@/server/db';
import { sendEmail } from '@/server/email';
import { acceptAgreement, loadAgreement, UserError } from '@/server/financings';
import { agreementPdf } from '@/server/pdf';
import { getSettings } from '@/server/settings';
import { clientIp } from '@/server/uploads';

export async function acceptAction(_: unknown, form: FormData) {
  const token = String(form.get('token') ?? '');
  try {
    const ip = clientIp(await headers());
    const result = await acceptAgreement(db(), token, String(form.get('name') ?? ''), ip);
    const a = await loadAgreement(db(), token);
    if (a) {
      const bytes = await agreementPdf({
        reference: a.record.reference, borrower: a.record.applicant.fullName, description: a.record.description, vendor: a.record.vendor_name,
        terms: a.terms, schedule: a.schedule, agreementText: a.record.agreement_text ?? '',
        acceptedName: a.record.accepted_name, acceptedAt: a.record.accepted_at, acceptedIp: a.record.accepted_ip,
      });
      await sendEmail({
        to: result.email, subject: `Your Haki agreement ${a.record.reference}`,
        text: 'Thank you. Your signed agreement is attached. Please keep it for your records.',
        attachment: { filename: `haki-agreement-${a.record.reference}.pdf`, content: bytes },
      });
      const { alert_email } = await getSettings(db());
      if (alert_email) {
        await sendEmail({
          to: alert_email, subject: `Agreement accepted ${a.record.reference}`,
          text: `${a.record.applicant.fullName} has accepted their agreement. Open it here: ${process.env.APP_URL ?? ''}/financings/${a.record.id}`,
        });
      }
    }
  } catch (e) {
    if (e instanceof UserError) return { error: e.message };
    throw e;
  }
  revalidatePath(`/agreement/${token}`);
  return null;
}
