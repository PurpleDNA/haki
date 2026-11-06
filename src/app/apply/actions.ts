'use server';

import { headers } from 'next/headers';
import { applicationSchema } from '@/domain/application';
import { db } from '@/server/db';
import { sendEmail } from '@/server/email';
import { submitApplication, UserError } from '@/server/financings';
import { clientIp, readUpload } from '@/server/uploads';

export type ApplyResult = { reference?: string; error?: string; name?: string } | null;

export async function applyAction(_: ApplyResult, form: FormData): Promise<ApplyResult> {
  // Bots tend to fill in every field, including this hidden one.
  if (form.get('website')) return { reference: 'MF-0000-0000', name: '' };
  try {
    const parsed = applicationSchema.safeParse({ ...JSON.parse(String(form.get('answers') ?? '{}')) });
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Please check your answers.' };
    const statement = await readUpload(form.get('statement'));
    if (!statement) return { error: 'Please upload your bank statement.' };
    const ip = clientIp(await headers());
    const result = await submitApplication(db(), parsed.data, statement, ip);
    if (result.alertEmail) {
      await sendEmail({
        to: result.alertEmail,
        subject: `New application ${result.reference}`,
        text: `A new application has come in.\n\nReference: ${result.reference}\n\nOpen it here: ${process.env.APP_URL ?? ''}/financings/${result.id}`,
      });
    }
    return { reference: result.reference, name: parsed.data.fullName.split(' ')[0] };
  } catch (e) {
    if (e instanceof UserError) return { error: e.message };
    throw e;
  }
}
