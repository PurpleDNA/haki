import { STATEMENT_MAX_BYTES, sniffDocument } from '@/domain/application';
import { UserError, type Upload } from './financings';

/** Reads and checks an uploaded file. Returns null if the form field was left empty. */
export async function readUpload(value: FormDataEntryValue | null): Promise<Upload | null> {
  if (!(value instanceof File) || value.size === 0) return null;
  if (value.size > STATEMENT_MAX_BYTES) throw new UserError('That file is too large. The limit is 4 MB.');
  const content = new Uint8Array(await value.arrayBuffer());
  const mime = sniffDocument(content);
  if (!mime) throw new UserError('Please upload a PDF, JPG or PNG file.');
  return { filename: value.name, mime, content };
}

export function clientIp(h: Headers): string {
  return h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || 'unknown';
}
