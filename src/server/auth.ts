import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { db, type Db } from './db';
import { UserError } from './financings';
import { verifyPassword } from './passwords';

const COOKIE = 'haki_session';
const HOURS = 12;
const MAX_FAILED = 5;

export interface Staff {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'staff';
}

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error('SESSION_SECRET must be at least 32 characters');
  return new TextEncoder().encode(s);
}

// Checked against when an email is unknown, so response time doesn't reveal which emails exist.
const DUMMY_HASH = '00000000000000000000000000000000:' + '0'.repeat(128);

export async function checkLogin(database: Db, email: string, password: string) {
  const [s] = await database<{ id: string; password_hash: string; active: boolean; session_version: number; locked_until: Date | null }[]>`
    select id, password_hash, active, session_version, locked_until from staff where email = ${email.trim().toLowerCase()}`;
  const ok = await verifyPassword(password, s?.password_hash ?? DUMMY_HASH);
  if (!s || !s.active) throw new UserError('That email or password isn’t right.');
  if (s.locked_until && s.locked_until > new Date()) throw new UserError('Too many failed attempts. Try again in 15 minutes.');
  if (!ok) {
    await database`update staff set
      failed_logins = case when failed_logins + 1 >= ${MAX_FAILED} then 0 else failed_logins + 1 end,
      locked_until = case when failed_logins + 1 >= ${MAX_FAILED} then now() + interval '15 minutes' else locked_until end
      where id = ${s.id}`;
    throw new UserError('That email or password isn’t right.');
  }
  await database`update staff set failed_logins = 0, locked_until = null where id = ${s.id}`;
  return { id: s.id, version: s.session_version };
}

export async function startSession(id: string, version: number) {
  const token = await new SignJWT({ v: version }).setProtectedHeader({ alg: 'HS256' }).setSubject(id)
    .setIssuedAt().setExpirationTime(`${HOURS}h`).sign(secret());
  (await cookies()).set(COOKIE, token, {
    httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: HOURS * 3600,
  });
}

export async function endSession() {
  (await cookies()).delete(COOKIE);
}

export const currentStaff = cache(async (): Promise<Staff | null> => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ['HS256'] });
    const [s] = await db()<(Staff & { active: boolean; session_version: number })[]>`
      select id, name, email, role, active, session_version from staff where id = ${payload.sub!}`;
    if (!s || !s.active || s.session_version !== payload.v) return null;
    return { id: s.id, name: s.name, email: s.email, role: s.role };
  } catch {
    return null;
  }
});

export async function requireStaff(): Promise<Staff> {
  const s = await currentStaff();
  if (!s) redirect('/login');
  return s;
}

export async function requireAdmin(): Promise<Staff> {
  const s = await requireStaff();
  if (s.role !== 'admin') redirect('/dashboard');
  return s;
}
