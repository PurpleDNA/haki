export interface Email {
  to: string;
  subject: string;
  text: string;
  attachment?: { filename: string; content: Uint8Array };
}

/** Sends through Resend. Email is a courtesy here, so failures are logged and never block the action. */
export async function sendEmail(mail: Email): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.log(`[email skipped: no RESEND_API_KEY] "${mail.subject}"`);
    return false;
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM, to: mail.to, subject: mail.subject, text: mail.text,
        attachments: mail.attachment
          ? [{ filename: mail.attachment.filename, content: Buffer.from(mail.attachment.content).toString('base64') }]
          : undefined,
      }),
    });
    if (!res.ok) console.error(`[email failed] ${res.status} "${mail.subject}"`);
    return res.ok;
  } catch (e) {
    console.error('[email failed]', mail.subject, e);
    return false;
  }
}
