import { db } from '@/server/db';
import { loadAgreement } from '@/server/financings';
import { agreementPdf } from '@/server/pdf';

export async function GET(_: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const a = await loadAgreement(db(), token);
  if (!a) return new Response('Not found', { status: 404 });
  const bytes = await agreementPdf({
    reference: a.record.reference, borrower: a.record.applicant.fullName, description: a.record.description, vendor: a.record.vendor_name,
    terms: a.terms, schedule: a.schedule, agreementText: a.record.agreement_text ?? '',
    acceptedName: a.record.accepted_name, acceptedAt: a.record.accepted_at, acceptedIp: a.record.accepted_ip,
  });
  return new Response(Buffer.from(bytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="haki-agreement-${a.record.reference}.pdf"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
