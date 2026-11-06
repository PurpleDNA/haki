// Walks the whole flow in a real browser against a running app with seeded data.
import fs from 'node:fs';
import { chromium } from 'playwright-core';

const BASE = process.env.BASE ?? 'http://localhost:3000';
const OUT = '.playwright-out';
const browser = await chromium.launch({ executablePath: process.env.CHROME });
const problems = [];
const watch = (p) => {
  p.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
  p.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('401')) problems.push(`console: ${m.text()}`); });
};
const check = (cond, what) => { console.log(`${cond ? 'ok  ' : 'FAIL'} ${what}`); if (!cond) process.exitCode = 1; };

// A borrower applies, on a phone.
const phoneCtx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const m = await phoneCtx.newPage(); watch(m);
await m.goto(`${BASE}/apply`);
await m.screenshot({ path: `${OUT}/apply-mobile.png` });
await m.getByRole('button', { name: /Continue/ }).click();
check(await m.getByText('Enter your full name.').isVisible(), 'empty step shows errors');
await m.fill('#fullName', 'Test Borrower');
await m.fill('#phone', '0809 123 4567');
await m.fill('#email', 'test@example.com');
await m.fill('#address', '1 Test Road, Abuja');
await m.fill('#dateOfBirth', '1990-05-05');
await m.fill('#nin', '12345678901');
await m.getByRole('button', { name: /Continue/ }).click();
await m.reload();
await m.waitForFunction(() => document.querySelector('#fullName').value !== '', null, { timeout: 5000 }).catch(() => {});
check(await m.inputValue('#fullName') === 'Test Borrower', 'progress survives a refresh');
check(await m.inputValue('#nin') === '' && !(await m.evaluate(() => localStorage.getItem('haki-application'))).includes('12345678901'), 'the NIN is not stored in the browser');
await m.fill('#nin', '12345678901');
await m.getByRole('button', { name: /Continue/ }).click();
await m.selectOption('#employmentType', 'employed');
await m.fill('#employer', 'Test Ltd');
await m.fill('#monthlyIncome', '800000');
await m.setInputFiles('#statement', { name: 'statement.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 test') });
await m.getByRole('button', { name: /Continue/ }).click();
await m.getByLabel('Travel').check({ force: true });
await m.fill('#description', 'Flight to Madinah');
await m.fill('#vendorName', 'Test Travel');
await m.fill('#quoted', '1000000');
await m.screenshot({ path: `${OUT}/apply-mobile-step3.png`, fullPage: true });
await m.getByRole('button', { name: /Continue/ }).click();
await m.fill('#downPayment', '100000');
await m.getByRole('button', { name: 'Submit application' }).click();
check(await m.getByText(/At least ₦250,000/).first().isVisible(), 'down payment under 25% is refused');
await m.fill('#downPayment', '250000');
await m.getByRole('checkbox').check();
await m.screenshot({ path: `${OUT}/apply-mobile-step4.png`, fullPage: true });
await m.getByRole('button', { name: 'Submit application' }).click();
await m.getByRole('heading', { name: 'Application received' }).waitFor();
const ref = await m.locator('.bigref').innerText();
check(/^MF-\d{4}-\d{4}$/.test(ref), `reference issued: ${ref}`);

// Staff prices it.
const desk = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const s = await desk.newPage(); watch(s);
await s.goto(`${BASE}/financings`);
check(s.url().endsWith('/login'), 'staff pages need a login');
await s.screenshot({ path: `${OUT}/login.png` });
await s.fill('#email', 'admin@example.com');
await s.fill('#password', 'wrong-password');
await s.getByRole('button', { name: 'Sign in' }).click();
await s.getByText('isn’t right').waitFor();
await s.fill('#password', 'haki-demo-password');
await s.getByRole('button', { name: 'Sign in' }).click();
await s.waitForURL('**/dashboard');
await s.screenshot({ path: `${OUT}/dashboard.png`, fullPage: true });
await s.getByRole('tab', { name: 'Disbursements' }).click();
await s.getByRole('tab', { name: 'On-time rate' }).click();
await s.screenshot({ path: `${OUT}/dashboard-ontime.png` });
await s.goto(`${BASE}/financings`);
await s.screenshot({ path: `${OUT}/financings.png`, fullPage: true });
await s.getByRole('link', { name: ref }).click();
await s.waitForURL('**/financings/*');
const detailUrl = s.url().split('?')[0];
await s.getByRole('button', { name: 'Start review' }).click();
await s.getByRole('button', { name: /Approve and create/ }).waitFor();
await s.screenshot({ path: `${OUT}/pricing.png`, fullPage: true });
await s.getByRole('button', { name: /Approve and create/ }).click();
await s.getByText('Waiting for the borrower').waitFor();
const href = await s.getByRole('link', { name: 'Preview' }).getAttribute('href');
await s.goto(`${detailUrl}?tab=summary`);
await s.screenshot({ path: `${OUT}/summary.png`, fullPage: true });

// The borrower accepts.
const b = await phoneCtx.newPage(); watch(b);
await b.goto(`${BASE}${href}`);
await b.screenshot({ path: `${OUT}/agreement-mobile.png`, fullPage: true });
check(await b.getByText('cannot be cancelled').isVisible(), 'agreement shows the no-cancellation clause');
check(await b.getByRole('button', { name: 'Accept agreement' }).isDisabled(), 'accept is locked until boxes are ticked');
for (const c of await b.getByRole('checkbox').all()) await c.check();
await b.fill('#name', 'Test Borrower');
await b.getByRole('button', { name: 'Accept agreement' }).click();
await b.getByRole('heading', { name: 'Agreement accepted' }).waitFor();
const [dl] = await Promise.all([b.waitForEvent('download'), b.getByRole('link', { name: /Download your copy/ }).click()]);
await dl.saveAs(`${OUT}/agreement.pdf`);
check(fs.readFileSync(`${OUT}/agreement.pdf`).subarray(0, 4).toString() === '%PDF', 'signed PDF downloads');

// Staff takes the down payment, buys the item, and records the rest.
await s.goto(`${detailUrl}?tab=pricing`);
await s.getByText('hasn’t been fully received').waitFor();
await s.getByRole('button', { name: '+ Record payment' }).click();
await s.fill('#amount', '250000');
await s.getByText('clears the down payment').waitFor();
await s.screenshot({ path: `${OUT}/record-payment.png` });
await s.getByRole('button', { name: 'Save payment' }).click();
await s.locator('.scrim').waitFor({ state: 'detached' });
await s.goto(`${detailUrl}?tab=pricing`);
await s.getByRole('button', { name: 'Mark as purchased' }).click();
await s.getByText('Bought from vendor on').waitFor();
await s.goto(`${detailUrl}?tab=plan`);
await s.screenshot({ path: `${OUT}/plan.png`, fullPage: true });
check(await s.getByText('₦900,000').first().isVisible(), 'balance is ₦900,000 after the down payment (15% profit)');
await s.getByRole('button', { name: '+ Record payment' }).click();
await s.fill('#amount', '900001');
check(await s.getByRole('button', { name: 'Save payment' }).isDisabled(), 'overpayment is blocked');
await s.fill('#amount', '900000');
await s.getByRole('button', { name: 'Save payment' }).click();
await s.locator('.scrim').waitFor({ state: 'detached' });
await s.reload();
check(await s.locator('.dhead').getByText('Completed').isVisible(), 'early full payment completes it, no discount');
await s.goto(`${detailUrl}?tab=payments`);
await s.screenshot({ path: `${OUT}/payments.png`, fullPage: true });
s.once('dialog', (d) => d.accept());
await s.getByRole('button', { name: 'Reverse' }).first().click();
await s.getByText('Reversed').first().waitFor();
await s.goto(`${detailUrl}?tab=activity`);
await s.screenshot({ path: `${OUT}/activity.png`, fullPage: true });
check(await s.getByText('Reversed a payment').isVisible(), 'reversal is logged');

// Admin-only and export.
await s.goto(`${BASE}/settings`);
await s.screenshot({ path: `${OUT}/settings.png`, fullPage: true });
check(await s.getByText('Still needed before launch').isVisible(), 'settings lists what’s still missing');
const res = await s.request.get(`${BASE}/financings/export`);
check(res.status() === 200 && (await res.text()).includes(ref), 'CSV export works');
const staffCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const t = await staffCtx.newPage(); watch(t);
await t.goto(`${BASE}/login`);
await t.fill('#email', 'staff@example.com');
await t.fill('#password', 'haki-demo-password');
await t.getByRole('button', { name: 'Sign in' }).click();
await t.waitForURL('**/dashboard');
await t.goto(`${BASE}/settings`);
await t.waitForURL('**/dashboard');
check(true, 'non-admin is kept out of settings');
await t.setViewportSize({ width: 390, height: 844 });
await t.screenshot({ path: `${OUT}/dashboard-mobile.png`, fullPage: true });

const anon = await browser.newContext();
const anonRes = await anon.request.get(`${BASE}/financings/export`);
check(anonRes.status() === 401, 'export refuses anonymous visitors');
check((await anon.request.get(`${BASE}/agreement/not-a-token`)).status() === 404, 'bad agreement link is 404');

check(problems.length === 0, `no browser errors${problems.length ? ': ' + problems.slice(0, 5).join(' | ') : ''}`);
await browser.close();
