'use server';

import { redirect } from 'next/navigation';
import { checkLogin, startSession } from '@/server/auth';
import { db } from '@/server/db';
import { UserError } from '@/server/financings';

export async function loginAction(_: unknown, form: FormData) {
  try {
    const { id, version } = await checkLogin(db(), String(form.get('email') ?? ''), String(form.get('password') ?? ''));
    await startSession(id, version);
  } catch (e) {
    if (e instanceof UserError) return { error: e.message };
    throw e;
  }
  redirect('/dashboard');
}
