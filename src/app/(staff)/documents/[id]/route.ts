import { currentStaff } from '@/server/auth';
import { db } from '@/server/db';

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await currentStaff())) return new Response('Not signed in', { status: 401 });
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response('Not found', { status: 404 });
  const [d] = await db()<{ filename: string; mime: string; content: Uint8Array }[]>`select filename, mime, content from documents where id = ${id}`;
  if (!d) return new Response('Not found', { status: 404 });
  return new Response(Buffer.from(d.content), {
    headers: { 'Content-Type': d.mime, 'Content-Disposition': `attachment; filename="${d.filename}"`, 'Cache-Control': 'private, no-store' },
  });
}
