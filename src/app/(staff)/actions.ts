'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { parseNaira } from '@/domain/money';
import { profitFromPercent } from '@/domain/pricing';
import type { Method } from '@/domain/status';
import { endSession, requireAdmin, requireStaff } from '@/server/auth';
import { db } from '@/server/db';
import { sendEmail } from '@/server/email';
import * as fin from '@/server/financings';
import { UserError } from '@/server/financings';
import { hashPassword } from '@/server/passwords';
import { readUpload } from '@/server/uploads';

export type ActionState = { ok?: boolean; error?: string } | null;

async function attempt(id: string | null, fn: () => Promise<void>): Promise<ActionState> {
  try {
    await fn();
  } catch (e) {
    if (e instanceof UserError) return { error: e.message };
    throw e;
  }
  revalidatePath(id ? `/financings/${id}` : '/settings');
  return { ok: true };
}

const text = (f: FormData, k: string) => String(f.get(k) ?? '');

export async function logoutAction() {
  await endSession();
  redirect('/login');
}

export async function startReviewAction(id: string) {
  const s = await requireStaff();
  return attempt(id, () => fin.startReview(db(), id, s.name));
}

export async function declineAction(id: string, _: ActionState, form: FormData) {
  const s = await requireStaff();
  return attempt(id, () => fin.decline(db(), id, text(form, 'reason'), s.name));
}

export async function sendAgreementAction(id: string, _: ActionState, form: FormData) {
  const s = await requireStaff();
  return attempt(id, async () => {
    const costKobo = parseNaira(text(form, 'cost'));
    const downKobo = parseNaira(text(form, 'down'));
    if (costKobo === null || downKobo === null) throw new UserError('Check the cost and down payment amounts.');
    let profitKobo: number | null;
    if (text(form, 'profitMode') === 'percent') {
      const pct = Number(text(form, 'profit'));
      if (!Number.isFinite(pct) || pct < 0) throw new UserError('Check the profit percentage.');
      profitKobo = profitFromPercent(costKobo, pct);
    } else {
      profitKobo = parseNaira(text(form, 'profit'));
      if (profitKobo === null) throw new UserError('Check the profit amount.');
    }
    const r = await fin.sendAgreement(db(), id, { costKobo, profitKobo, downKobo, tenor: Number(text(form, 'tenor')) }, s.name);
    await sendEmail({
      to: r.email, subject: 'Your Haki agreement is ready',
      text: `Hi ${r.name},\n\nYour agreement is ready. Please read and accept it within 14 days:\n${process.env.APP_URL ?? ''}/agreement/${r.token}\n\nThis link is private, so please don't share it.`,
    });
  });
}

export async function markPurchasedAction(id: string, _: ActionState, form: FormData) {
  const s = await requireStaff();
  return attempt(id, async () => fin.markPurchased(db(), id, text(form, 'purchasedOn'), await readUpload(form.get('receipt')), s.name));
}

export async function recordPaymentAction(id: string, _: ActionState, form: FormData) {
  const s = await requireStaff();
  return attempt(id, async () => {
    const amountKobo = parseNaira(text(form, 'amount'));
    if (amountKobo === null) throw new UserError('Enter the amount received.');
    await fin.recordPayment(db(), id, {
      amountKobo, paidOn: text(form, 'paidOn'), method: text(form, 'method') as Method, reference: text(form, 'reference'),
    }, await readUpload(form.get('receipt')), s);
  });
}

export async function voidPaymentAction(id: string, paymentId: string) {
  const s = await requireAdmin();
  return attempt(id, () => fin.voidPayment(db(), id, paymentId, s));
}

export async function writeOffAction(id: string, _: ActionState, form: FormData) {
  const s = await requireAdmin();
  return attempt(id, () => fin.writeOff(db(), id, text(form, 'reason'), s.name));
}

export async function addNoteAction(id: string, _: ActionState, form: FormData) {
  const s = await requireStaff();
  return attempt(id, () => fin.addNote(db(), id, text(form, 'note'), s.name));
}

const blank = (v: string) => v.trim() || null;

export async function saveSettingsAction(_: ActionState, form: FormData) {
  await requireAdmin();
  return attempt(null, async () => {
    const profit = Number(text(form, 'default_profit_percent'));
    const minDown = Number(text(form, 'min_down_percent'));
    const tenors = text(form, 'tenors').split(',').map((t) => Number(t.trim()));
    if (!Number.isFinite(profit) || profit < 0 || profit > 1000) throw new UserError('Check the profit percentage.');
    if (!Number.isFinite(minDown) || minDown < 0 || minDown >= 100) throw new UserError('Check the minimum down payment.');
    if (!tenors.length || tenors.some((t) => !Number.isInteger(t) || t < 1 || t > 120)) throw new UserError('List tenors as whole months, like 3, 6, 12.');
    await db()`update settings set
      company_name = ${blank(text(form, 'company_name'))}, rc_number = ${blank(text(form, 'rc_number'))}, address = ${blank(text(form, 'address'))},
      phone = ${blank(text(form, 'phone'))}, email = ${blank(text(form, 'email'))}, bank_name = ${blank(text(form, 'bank_name'))},
      bank_account_name = ${blank(text(form, 'bank_account_name'))}, bank_account_number = ${blank(text(form, 'bank_account_number'))},
      alert_email = ${blank(text(form, 'alert_email'))}, default_profit_percent = ${profit}, profit_rate_confirmed = ${form.get('profit_rate_confirmed') === 'on'},
      min_down_percent = ${minDown}, tenors = ${tenors}, agreement_text = ${blank(text(form, 'agreement_text'))}, updated_at = now()
      where id = 1`;
  });
}

const checkPassword = (p: string) => {
  if (p.length < 10) throw new UserError('Passwords need at least 10 characters.');
};

export async function addStaffAction(_: ActionState, form: FormData) {
  await requireAdmin();
  return attempt(null, async () => {
    const email = text(form, 'email').trim().toLowerCase();
    const name = text(form, 'name').trim();
    const role = text(form, 'role') === 'admin' ? 'admin' : 'staff';
    if (!name || !email.includes('@')) throw new UserError('Enter a name and email.');
    checkPassword(text(form, 'password'));
    const rows = await db()`insert into staff (name, email, password_hash, role)
      values (${name}, ${email}, ${await hashPassword(text(form, 'password'))}, ${role}) on conflict (email) do nothing returning id`;
    if (!rows.length) throw new UserError('Someone already uses that email.');
  });
}

export async function setStaffActiveAction(id: string, active: boolean) {
  const me = await requireAdmin();
  return attempt(null, async () => {
    if (id === me.id) throw new UserError('You can’t deactivate your own account.');
    await db()`update staff set active = ${active}, session_version = session_version + 1 where id = ${id}`;
  });
}

export async function resetPasswordAction(id: string, _: ActionState, form: FormData) {
  await requireAdmin();
  return attempt(null, async () => {
    checkPassword(text(form, 'password'));
    await db()`update staff set password_hash = ${await hashPassword(text(form, 'password'))}, session_version = session_version + 1,
      failed_logins = 0, locked_until = null where id = ${id}`;
  });
}
