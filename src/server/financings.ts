import crypto from 'node:crypto';
import type { TransactionSql } from 'postgres';
import type { ApplicationInput } from '@/domain/application';
import { normalisePhone } from '@/domain/application';
import { todayInLagos } from '@/domain/dates';
import { parseNaira } from '@/domain/money';
import { view, type FinancingRow, type FinancingView } from '@/domain/portfolio';
import { buildSchedule, minDownKobo, validateTerms, type Terms } from '@/domain/pricing';
import { canMove, canPrice, takesPayments, type Category, type FinancingStatus, type Method } from '@/domain/status';
import type { Db } from './db';
import { getSettings, renderAgreement } from './settings';

/** A failure the person using the app can understand and fix. */
export class UserError extends Error {}

export interface Upload {
  filename: string;
  mime: string;
  content: Uint8Array;
}

type Tx = TransactionSql<{ date: string; bigint: number }>;

const AGREEMENT_DAYS = 14;
const APPLICATIONS_PER_IP_PER_HOUR = 10;

const log = (tx: Tx, financingId: string, actor: string, action: string, detail: object | null = null) =>
  tx`insert into activity_log (financing_id, actor, action, detail) values (${financingId}, ${actor}, ${action}, ${detail ? tx.json(detail as never) : null})`;

const safeName = (n: string) => n.replace(/[^\w.\- ]/g, '_').slice(0, 120) || 'file';

async function lockFinancing(tx: Tx, id: string) {
  const [f] = await tx<FinancingRecord[]>`select * from financings where id = ${id} for update`;
  if (!f) throw new UserError('That financing no longer exists.');
  return f;
}

function move(from: FinancingStatus, to: FinancingStatus) {
  if (!canMove(from, to)) throw new UserError('This financing can’t make that change at its current stage.');
}

export interface Applicant {
  fullName: string;
  email: string;
  address: string;
  dateOfBirth: string;
  nin: string;
  employmentType: string;
  employer: string;
  monthlyIncomeKobo: number;
  otherObligationsKobo: number;
}

export interface FinancingRecord {
  id: string;
  reference: string;
  borrower_id: string;
  status: FinancingStatus;
  applicant: Applicant;
  category: Category;
  description: string;
  vendor_name: string;
  vendor_contact: string | null;
  quoted_kobo: number;
  requested_down_kobo: number;
  requested_tenor: number;
  payment_day: number;
  cost_kobo: number | null;
  profit_kobo: number | null;
  down_kobo: number | null;
  tenor: number | null;
  decline_reason: string | null;
  agreement_token: string | null;
  agreement_text: string | null;
  agreement_expires_at: Date | null;
  accepted_at: Date | null;
  accepted_name: string | null;
  accepted_ip: string | null;
  purchased_on: string | null;
  created_at: Date;
}

export async function submitApplication(db: Db, input: ApplicationInput, statement: Upload, ip: string) {
  const settings = await getSettings(db);
  const phone = normalisePhone(input.phone);
  const quoted = parseNaira(input.quoted);
  const down = parseNaira(input.downPayment);
  if (!phone || !quoted || down === null) throw new UserError('Please check your details and try again.');
  if (down < minDownKobo(quoted, Number(settings.min_down_percent))) {
    throw new UserError(`Your down payment must be at least ${Number(settings.min_down_percent)}% of the vendor’s price.`);
  }
  if (down >= quoted) throw new UserError('Your down payment must be less than the vendor’s price.');
  if (!settings.tenors.includes(input.tenor)) throw new UserError('Please choose an available payment period.');

  const [{ count }] = await db<{ count: number }[]>`
    select count(*) from financings where submitted_ip = ${ip} and created_at > now() - interval '1 hour'`;
  if (count >= APPLICATIONS_PER_IP_PER_HOUR) throw new UserError('Too many applications from this connection. Please try again later.');

  const applicant: Applicant = {
    fullName: input.fullName, email: input.email, address: input.address, dateOfBirth: input.dateOfBirth, nin: input.nin,
    employmentType: input.employmentType, employer: input.employer,
    monthlyIncomeKobo: parseNaira(input.monthlyIncome)!, otherObligationsKobo: parseNaira(input.otherObligations)!,
  };

  return db.begin(async (tx) => {
    const [b] = await tx<{ id: string }[]>`
      insert into borrowers (phone) values (${phone})
      on conflict (phone) do update set phone = excluded.phone returning id`;
    const [{ reference }] = await tx<{ reference: string }[]>`
      select 'MF-' || extract(year from now())::int || '-' || lpad(nextval('financing_ref_seq')::text, 4, '0') as reference`;
    const [f] = await tx<{ id: string }[]>`
      insert into financings (reference, borrower_id, applicant, category, description, vendor_name, vendor_contact,
        quoted_kobo, requested_down_kobo, requested_tenor, payment_day, submitted_ip)
      values (${reference}, ${b.id}, ${tx.json(applicant as never)}, ${input.category}, ${input.description}, ${input.vendorName},
        ${input.vendorContact || null}, ${quoted}, ${down}, ${input.tenor}, ${input.paymentDay}, ${ip})
      returning id`;
    await tx`insert into documents (financing_id, kind, filename, mime, size_bytes, content)
      values (${f.id}, 'bank_statement', ${safeName(statement.filename)}, ${statement.mime}, ${statement.content.length}, ${Buffer.from(statement.content)})`;
    await log(tx, f.id, input.fullName, 'Application submitted');
    return { id: f.id, reference, alertEmail: settings.alert_email };
  });
}

/** Agreements left unaccepted expire. There's no scheduler, so this runs before reads that depend on it. */
async function expireStale(db: Db) {
  const expired = await db<{ id: string }[]>`
    update financings set status = 'expired', agreement_token = null
    where status = 'agreement_sent' and agreement_expires_at < now() returning id`;
  for (const { id } of expired) {
    await db`insert into activity_log (financing_id, actor, action) values (${id}, 'System', 'Agreement link expired')`;
  }
}

export async function loadViews(db: Db, today = todayInLagos()): Promise<FinancingView[]> {
  await expireStale(db);
  const [rows, dues, pays] = await Promise.all([
    db<FinancingRecord[] & { phone: string }[]>`
      select f.*, b.phone from financings f join borrowers b on b.id = f.borrower_id order by f.created_at desc`,
    db<{ financing_id: string; number: number; due_on: string; amount_kobo: number }[]>`select * from instalments`,
    db<{ financing_id: string; paid_on: string; amount_kobo: number; created_at: Date }[]>`
      select financing_id, paid_on, amount_kobo, created_at from payments where voided_at is null`,
  ]);
  const duesBy = Map.groupBy(dues, (d) => d.financing_id);
  const paysBy = Map.groupBy(pays, (p) => p.financing_id);
  return rows.map((f) => view(toRow(f as unknown as FinancingRecord & { phone: string }, duesBy.get(f.id) ?? [], paysBy.get(f.id) ?? []), today));
}

function toRow(
  f: FinancingRecord & { phone: string },
  dues: { number: number; due_on: string; amount_kobo: number }[],
  pays: { paid_on: string; amount_kobo: number; created_at: Date }[],
): FinancingRow {
  return {
    id: f.id, reference: f.reference, status: f.status, name: f.applicant.fullName, phone: f.phone, category: f.category,
    description: f.description, quotedKobo: f.quoted_kobo, costKobo: f.cost_kobo, profitKobo: f.profit_kobo,
    purchasedOn: f.purchased_on, createdAt: f.created_at,
    dues: dues.map((d) => ({ number: d.number, dueOn: d.due_on, amountKobo: d.amount_kobo })),
    payments: pays.map((p) => ({ paidOn: p.paid_on, amountKobo: p.amount_kobo, createdAt: p.created_at.toISOString() })),
  };
}

export interface PaymentRecord {
  id: string;
  paid_on: string;
  amount_kobo: number;
  method: Method;
  reference: string | null;
  recorded_by_name: string | null;
  voided_at: Date | null;
  receipt_id: string | null;
  created_at: Date;
}

export async function loadDetail(db: Db, id: string, today = todayInLagos()) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  await expireStale(db);
  const [record] = await db<(FinancingRecord & { phone: string })[]>`
    select f.*, b.phone from financings f join borrowers b on b.id = f.borrower_id where f.id = ${id}`;
  if (!record) return null;
  const [dues, payments, documents, activity, history] = await Promise.all([
    db<{ number: number; due_on: string; amount_kobo: number }[]>`select number, due_on, amount_kobo from instalments where financing_id = ${id}`,
    db<PaymentRecord[]>`
      select p.*, s.name as recorded_by_name,
        (select d.id from documents d where d.payment_id = p.id limit 1) as receipt_id
      from payments p left join staff s on s.id = p.recorded_by
      where p.financing_id = ${id} order by p.paid_on desc, p.created_at desc`,
    db<{ id: string; kind: string; filename: string; size_bytes: number; created_at: Date }[]>`
      select id, kind, filename, size_bytes, created_at from documents where financing_id = ${id} order by created_at`,
    db<{ id: number; actor: string; action: string; detail: Record<string, unknown> | null; created_at: Date }[]>`
      select * from activity_log where financing_id = ${id} order by created_at desc, id desc`,
    db<{ id: string; reference: string; status: FinancingStatus }[]>`
      select id, reference, status from financings where borrower_id = ${record.borrower_id} and id <> ${id} order by created_at desc`,
  ]);
  const live = payments.filter((p) => !p.voided_at).map((p) => ({ paid_on: p.paid_on, amount_kobo: p.amount_kobo, created_at: p.created_at }));
  return { record, view: view(toRow(record, dues, live), today), payments, documents, activity, history };
}

export async function startReview(db: Db, id: string, actor: string) {
  await db.begin(async (tx) => {
    const f = await lockFinancing(tx, id);
    move(f.status, 'under_review');
    await tx`update financings set status = 'under_review', agreement_expires_at = null where id = ${id}`;
    await log(tx, id, actor, 'Started review');
  });
}

export async function decline(db: Db, id: string, reason: string, actor: string) {
  const why = reason.trim();
  if (!why) throw new UserError('Enter a reason for declining.');
  await db.begin(async (tx) => {
    const f = await lockFinancing(tx, id);
    move(f.status, 'declined');
    await tx`update financings set status = 'declined', decline_reason = ${why} where id = ${id}`;
    await log(tx, id, actor, 'Declined', { reason: why });
  });
}

/** Prices the financing, freezes the terms and agreement wording, and creates the private link. */
export async function sendAgreement(db: Db, id: string, terms: Terms, actor: string) {
  const settings = await getSettings(db);
  const problem = validateTerms(terms, Number(settings.min_down_percent));
  if (problem) throw new UserError(problem);
  if (!settings.tenors.includes(terms.tenor)) throw new UserError('That tenor isn’t available. Check the settings.');
  const token = crypto.randomBytes(32).toString('base64url');
  return db.begin(async (tx) => {
    const f = await lockFinancing(tx, id);
    if (!canPrice(f.status)) throw new UserError('This financing can no longer be priced.');
    const expires = new Date(Date.now() + AGREEMENT_DAYS * 86400000);
    await tx`update financings set status = 'agreement_sent', cost_kobo = ${terms.costKobo}, profit_kobo = ${terms.profitKobo},
      down_kobo = ${terms.downKobo}, tenor = ${terms.tenor}, agreement_token = ${token}, agreement_expires_at = ${expires},
      agreement_text = ${renderAgreement(settings, f.applicant.fullName)} where id = ${id}`;
    await log(tx, id, actor, 'Approved and created agreement link', { ...terms });
    return { token, email: f.applicant.email, name: f.applicant.fullName };
  });
}

export async function loadAgreement(db: Db, token: string, today = todayInLagos()) {
  if (!token || token.length > 100) return null;
  await expireStale(db);
  const [f] = await db<FinancingRecord[]>`select * from financings where agreement_token = ${token}`;
  if (!f || f.cost_kobo === null || f.profit_kobo === null || f.down_kobo === null || f.tenor === null) return null;
  const terms: Terms = { costKobo: f.cost_kobo, profitKobo: f.profit_kobo, downKobo: f.down_kobo, tenor: f.tenor };
  const acceptedOn = f.accepted_at ? new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Lagos' }).format(f.accepted_at) : today;
  return { record: f, terms, schedule: buildSchedule(terms, acceptedOn, f.payment_day), accepted: f.accepted_at !== null };
}

/** The moment the sale becomes binding: fixes the schedule and records who accepted, when and from where. */
export async function acceptAgreement(db: Db, token: string, typedName: string, ip: string, today = todayInLagos()) {
  const name = typedName.trim();
  if (name.length < 3) throw new UserError('Type your full name to accept.');
  return db.begin(async (tx) => {
    const [f] = await tx<FinancingRecord[]>`select * from financings where agreement_token = ${token} for update`;
    if (!f) throw new UserError('This agreement link isn’t valid any more.');
    if (f.status !== 'agreement_sent') throw new UserError('This agreement has already been accepted.');
    if (f.agreement_expires_at && f.agreement_expires_at < new Date()) throw new UserError('This agreement link has expired. Please contact us for a new one.');
    const terms: Terms = { costKobo: f.cost_kobo!, profitKobo: f.profit_kobo!, downKobo: f.down_kobo!, tenor: f.tenor! };
    const schedule = buildSchedule(terms, today, f.payment_day);
    for (const s of schedule) {
      await tx`insert into instalments (financing_id, number, due_on, amount_kobo) values (${f.id}, ${s.number}, ${s.dueOn}, ${s.amountKobo})`;
    }
    await tx`update financings set status = 'accepted', accepted_at = now(), accepted_name = ${name}, accepted_ip = ${ip} where id = ${f.id}`;
    await log(tx, f.id, name, 'Accepted the agreement', { ip });
    return { firstDue: schedule[0], email: f.applicant.email, alert: f.reference };
  });
}

export async function markPurchased(db: Db, id: string, purchasedOn: string, receipt: Upload | null, actor: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(purchasedOn) || purchasedOn > todayInLagos()) throw new UserError('Enter a valid purchase date.');
  await db.begin(async (tx) => {
    const f = await lockFinancing(tx, id);
    if (f.status !== 'accepted') throw new UserError('Only an accepted financing can be marked as purchased.');
    await tx`update financings set status = 'active', purchased_on = ${purchasedOn} where id = ${id}`;
    if (receipt) {
      await tx`insert into documents (financing_id, kind, filename, mime, size_bytes, content)
        values (${id}, 'purchase_receipt', ${safeName(receipt.filename)}, ${receipt.mime}, ${receipt.content.length}, ${Buffer.from(receipt.content)})`;
    }
    await log(tx, id, actor, 'Marked item as purchased', { purchasedOn });
    const { paid, due } = await totals(tx, id);
    if (paid === due) await tx`update financings set status = 'completed' where id = ${id}`;
  });
}

async function totals(tx: Tx, id: string) {
  const [{ paid }] = await tx<{ paid: number }[]>`
    select coalesce(sum(amount_kobo), 0)::bigint as paid from payments where financing_id = ${id} and voided_at is null`;
  const [{ due }] = await tx<{ due: number }[]>`
    select coalesce(sum(amount_kobo), 0)::bigint as due from instalments where financing_id = ${id}`;
  return { paid, due };
}

export interface NewPayment {
  paidOn: string;
  amountKobo: number;
  method: Method;
  reference: string;
}

export async function recordPayment(db: Db, id: string, p: NewPayment, receipt: Upload | null, staff: { id: string; name: string }) {
  if (!Number.isSafeInteger(p.amountKobo) || p.amountKobo <= 0) throw new UserError('Enter the amount received.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(p.paidOn) || p.paidOn > todayInLagos()) throw new UserError('The payment date can’t be in the future.');
  if (!['transfer', 'cash', 'pos'].includes(p.method)) throw new UserError('Choose a payment method.');
  await db.begin(async (tx) => {
    const f = await lockFinancing(tx, id);
    if (!takesPayments(f.status)) throw new UserError('This financing can’t take payments at its current stage.');
    const { paid, due } = await totals(tx, id);
    if (paid + p.amountKobo > due) throw new UserError('That’s more than the remaining balance.');
    const [row] = await tx<{ id: string }[]>`
      insert into payments (financing_id, paid_on, amount_kobo, method, reference, recorded_by)
      values (${id}, ${p.paidOn}, ${p.amountKobo}, ${p.method}, ${p.reference.trim() || null}, ${staff.id}) returning id`;
    if (receipt) {
      await tx`insert into documents (financing_id, payment_id, kind, filename, mime, size_bytes, content)
        values (${id}, ${row.id}, 'receipt', ${safeName(receipt.filename)}, ${receipt.mime}, ${receipt.content.length}, ${Buffer.from(receipt.content)})`;
    }
    await log(tx, id, staff.name, 'Recorded a payment', { amountKobo: p.amountKobo, paidOn: p.paidOn, method: p.method });
    if (paid + p.amountKobo === due && f.purchased_on) {
      await tx`update financings set status = 'completed' where id = ${id}`;
      await log(tx, id, 'System', 'Fully paid');
    }
  });
}

/** Payments are never deleted. Voiding one puts the money back on the balance and leaves the record. */
export async function voidPayment(db: Db, financingId: string, paymentId: string, staff: { id: string; name: string }) {
  await db.begin(async (tx) => {
    const f = await lockFinancing(tx, financingId);
    if (f.status === 'written_off') throw new UserError('This financing has been written off.');
    const [p] = await tx<{ amount_kobo: number }[]>`
      update payments set voided_at = now(), voided_by = ${staff.id}
      where id = ${paymentId} and financing_id = ${financingId} and voided_at is null returning amount_kobo`;
    if (!p) throw new UserError('That payment has already been reversed.');
    await log(tx, financingId, staff.name, 'Reversed a payment', { amountKobo: p.amount_kobo });
    if (f.status === 'completed') await tx`update financings set status = 'active' where id = ${financingId}`;
  });
}

export async function writeOff(db: Db, id: string, reason: string, actor: string) {
  const why = reason.trim();
  if (!why) throw new UserError('Enter a reason for the write-off.');
  await db.begin(async (tx) => {
    const f = await lockFinancing(tx, id);
    move(f.status, 'written_off');
    await tx`update financings set status = 'written_off' where id = ${id}`;
    await log(tx, id, actor, 'Written off', { reason: why });
  });
}

export async function addNote(db: Db, id: string, note: string, actor: string) {
  const text = note.trim();
  if (!text) throw new UserError('Write a note first.');
  await db.begin(async (tx) => {
    await lockFinancing(tx, id);
    await log(tx, id, actor, 'Note', { note: text.slice(0, 2000) });
  });
}

