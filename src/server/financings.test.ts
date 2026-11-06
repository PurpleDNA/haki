import fs from 'node:fs';
import path from 'node:path';
import fontkit from '@pdf-lib/fontkit';
import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { agreementPdf } from './pdf';
import { connect, type Db } from './db';
import {
  acceptAgreement, decline, loadAgreement, loadDetail, loadViews, markPurchased, recordPayment, sendAgreement, submitApplication,
  UserError, voidPayment, writeOff,
} from './financings';
import { migrate } from './migrate';
import { hashPassword, verifyPassword } from './passwords';

let pg: PGlite;
let server: PGLiteSocketServer;
let sql: Db;
let staff: { id: string; name: string };
const N = (n: number) => n * 100;
const file = { filename: 'statement.pdf', mime: 'application/pdf', content: new Uint8Array([0x25, 0x50, 0x44, 0x46]) };
const app = {
  fullName: 'Aisha Bello', phone: '0803 000 0001', email: 'aisha@example.com', address: 'Kano', dateOfBirth: '1990-01-01', nin: '12345678901',
  employmentType: 'employed' as const, employer: 'Acme', monthlyIncome: '500,000', otherObligations: '0',
  category: 'travel' as const, description: 'Flight to Dubai', vendorName: 'Agent', vendorContact: '', quoted: '1,000,000',
  downPayment: '250,000', tenor: 3, paymentDay: 28, consent: true as const,
};
const terms = { costKobo: N(1000000), profitKobo: N(150000), downKobo: N(250000), tenor: 3 };

beforeAll(async () => {
  pg = await PGlite.create();
  server = new PGLiteSocketServer({ db: pg, port: 54399, host: '127.0.0.1' });
  await server.start();
  sql = connect('postgres://postgres:postgres@127.0.0.1:54399/postgres', 1);
  await migrate(sql);
  const [s] = await sql<{ id: string; name: string }[]>`
    insert into staff (name, email, password_hash, role) values ('Amina', 'a@example.com', 'x', 'admin') returning id, name`;
  staff = s;
});
afterAll(async () => {
  await sql.end();
  await server.stop();
  await pg.close();
});
let ipCounter = 0;
const newIp = () => `10.0.0.${++ipCounter}`;
const submit = () => submitApplication(sql, app, file, newIp());

async function accepted() {
  const a = await submit();
  const { token } = await sendAgreement(sql, a.id, terms, 'Amina');
  await acceptAgreement(sql, token, 'Aisha Bello', '1.2.3.4', '2026-11-06');
  return a.id;
}

describe('schema', () => {
  it('locks every table against the public Supabase API', async () => {
    const rows = await sql<{ relname: string; relrowsecurity: boolean }[]>`
      select relname, relrowsecurity from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'r'`;
    expect(rows.length).toBeGreaterThanOrEqual(9);
    expect(rows.filter((r) => !r.relrowsecurity)).toEqual([]);
  });
});

describe('application', () => {
  it('creates a reference and keeps the statement', async () => {
    const a = await submit();
    expect(a.reference).toMatch(/^MF-\d{4}-\d{4}$/);
    const d = await loadDetail(sql, a.id);
    expect(d!.record.status).toBe('submitted');
    expect(d!.documents.map((x) => x.kind)).toEqual(['bank_statement']);
  });
  it('rejects a down payment under 25%', async () => {
    await expect(submitApplication(sql, { ...app, downPayment: '249,999' }, file, newIp())).rejects.toThrow(/25%/);
  });
  it('rejects tenors that are not offered', async () => {
    await expect(submitApplication(sql, { ...app, tenor: 12 }, file, newIp())).rejects.toThrow(/period/);
  });
  it('matches repeat customers by phone without overwriting anyone', async () => {
    const a = await submit();
    const b = await submitApplication(sql, { ...app, fullName: 'Impostor', phone: '+234 803 000 0001' }, file, newIp());
    const da = await loadDetail(sql, a.id);
    const db_ = await loadDetail(sql, b.id);
    expect(da!.record.borrower_id).toBe(db_!.record.borrower_id);
    expect(da!.record.applicant.fullName).toBe('Aisha Bello');
    expect(da!.history.map((h) => h.id)).toContain(b.id);
  });
  it('limits applications from one connection', async () => {
    const ip = '10.9.9.9';
    for (let i = 0; i < 10; i++) await submitApplication(sql, app, file, ip);
    await expect(submitApplication(sql, app, file, ip)).rejects.toThrow(/Too many/);
  });
});

describe('agreement', () => {
  it('rejects an under-25% down payment on pricing', async () => {
    const a = await submit();
    await expect(sendAgreement(sql, a.id, { ...terms, downKobo: N(249999) }, 'Amina')).rejects.toThrow(/25%/);
  });
  it('fixes the schedule when accepted, and only once', async () => {
    const a = await submit();
    const { token } = await sendAgreement(sql, a.id, terms, 'Amina');
    expect(token.length).toBeGreaterThan(40);
    await acceptAgreement(sql, token, 'Aisha Bello', '1.2.3.4', '2026-11-06');
    const d = await loadDetail(sql, a.id, '2026-11-06');
    expect(d!.record.status).toBe('accepted');
    expect(d!.record.accepted_ip).toBe('1.2.3.4');
    expect(d!.view.instalments.map((i) => [i.number, i.dueOn, i.amountKobo])).toEqual([
      [0, '2026-11-06', N(250000)], [1, '2026-12-28', N(300000)], [2, '2027-01-28', N(300000)], [3, '2027-02-28', N(300000)],
    ]);
    await expect(acceptAgreement(sql, token, 'Aisha Bello', '1.2.3.4')).rejects.toThrow(/already/);
  });
  it('freezes pricing once sent', async () => {
    const a = await submit();
    await sendAgreement(sql, a.id, terms, 'Amina');
    await expect(sendAgreement(sql, a.id, { ...terms, profitKobo: 0 }, 'Amina')).rejects.toThrow(/no longer/);
  });
  it('expires unused links after their window', async () => {
    const a = await submit();
    const { token } = await sendAgreement(sql, a.id, terms, 'Amina');
    await sql`update financings set agreement_expires_at = now() - interval '1 minute' where id = ${a.id}`;
    expect(await loadAgreement(sql, token)).toBeNull();
    expect((await loadDetail(sql, a.id))!.record.status).toBe('expired');
    await expect(acceptAgreement(sql, token, 'Aisha Bello', '1.2.3.4')).rejects.toThrow(/valid/);
  });
  it('has a font for the naira sign, which Manrope lacks', () => {
    const load = (f: string) => fontkit.create(fs.readFileSync(path.join(process.cwd(), 'src/assets/fonts', f)));
    expect(load('naira-500.woff').hasGlyphForCodePoint(0x20a6)).toBe(true);
    expect(load('naira-700.woff').hasGlyphForCodePoint(0x20a6)).toBe(true);
    expect(load('Manrope-500.ttf').hasGlyphForCodePoint(0x20a6)).toBe(false);
  });
  it('produces a PDF', async () => {
    const a = await submit();
    const { token } = await sendAgreement(sql, a.id, terms, 'Amina');
    const ag = await loadAgreement(sql, token);
    const bytes = await agreementPdf({
      reference: ag!.record.reference, borrower: 'Aisha Bello', description: 'Flight', vendor: 'Agent', terms: ag!.terms, schedule: ag!.schedule,
      agreementText: ag!.record.agreement_text!, acceptedName: null, acceptedAt: null, acceptedIp: null,
    });
    expect(Buffer.from(bytes.slice(0, 4)).toString()).toBe('%PDF');
  });
});

describe('no going back', () => {
  it('cannot decline once accepted', async () => {
    const id = await accepted();
    await expect(decline(sql, id, 'changed their mind', 'Amina')).rejects.toBeInstanceOf(UserError);
  });
  it('the agreement states it', async () => {
    const a = await submit();
    const { token } = await sendAgreement(sql, a.id, terms, 'Amina');
    expect((await loadAgreement(sql, token))!.record.agreement_text).toMatch(/cannot be cancelled/);
  });
});

describe('payments', () => {
  const pay = (id: string, amountKobo: number, paidOn = '2026-11-06') =>
    recordPayment(sql, id, { paidOn, amountKobo, method: 'transfer', reference: '' }, null, staff);

  it('can’t be taken before acceptance', async () => {
    const a = await submit();
    await expect(pay(a.id, N(1))).rejects.toThrow(/current stage/);
  });
  it('rejects paying more than the balance', async () => {
    const id = await accepted();
    await expect(pay(id, N(1150001))).rejects.toThrow(/remaining balance/);
  });
  it('completes when fully paid, and reversing reopens it', async () => {
    const id = await accepted();
    await markPurchased(sql, id, '2026-11-06', null, 'Amina');
    await pay(id, N(1150000));
    let d = await loadDetail(sql, id, '2026-11-06');
    expect(d!.record.status).toBe('completed');
    expect(d!.view.balanceKobo).toBe(0);
    await voidPayment(sql, id, d!.payments[0].id, staff);
    d = await loadDetail(sql, id, '2026-11-06');
    expect(d!.record.status).toBe('active');
    expect(d!.view.balanceKobo).toBe(N(1150000));
    expect(d!.payments[0].voided_at).not.toBeNull();
  });
  it('shows overdue with no added charge', async () => {
    const id = await accepted();
    await markPurchased(sql, id, '2026-11-06', null, 'Amina');
    await pay(id, N(250000));
    const d = await loadDetail(sql, id, '2027-01-10');
    expect(d!.view.isOverdue).toBe(true);
    expect(d!.view.overdueKobo).toBe(N(300000));
    expect(d!.view.balanceKobo).toBe(N(900000));
  });
  it('write-off is recorded and stops payments', async () => {
    const id = await accepted();
    await writeOff(sql, id, 'Uncollectable', 'Amina');
    await expect(pay(id, N(1))).rejects.toThrow(/current stage/);
  });
  it('logs every money change', async () => {
    const id = await accepted();
    await pay(id, N(10));
    const d = await loadDetail(sql, id);
    expect(d!.activity.map((x) => x.action)).toEqual(expect.arrayContaining(['Recorded a payment', 'Accepted the agreement', 'Application submitted']));
  });
  it('feeds the portfolio view', async () => {
    const id = await accepted();
    const v = (await loadViews(sql, '2026-11-06')).find((x) => x.id === id);
    expect(v!.balanceKobo).toBe(N(1150000));
  });
});

describe('passwords', () => {
  it('verifies only the right password', async () => {
    const h = await hashPassword('correct horse');
    expect(await verifyPassword('correct horse', h)).toBe(true);
    expect(await verifyPassword('wrong', h)).toBe(false);
  });
});
