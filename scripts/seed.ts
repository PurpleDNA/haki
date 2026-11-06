// Fills a dev database with made-up people and financings. Refuses to run on a database with data in it.
import { config } from 'dotenv';
import { addDays, monthlyDate, todayInLagos } from '../src/domain/dates';
import { connect } from '../src/server/db';
import { acceptAgreement, decline, markPurchased, recordPayment, sendAgreement, startReview, submitApplication } from '../src/server/financings';
import { migrate } from '../src/server/migrate';
import { hashPassword } from '../src/server/passwords';

config({ path: '.env.local' });
config();
// These accounts have a published password, so they must never reach a real database.
if (!/@(127\.0\.0\.1|localhost)[:/]/.test(process.env.DATABASE_URL ?? '')) {
  console.error('Seeding only runs against a local database.');
  process.exit(1);
}
const sql = connect(process.env.DATABASE_URL!, 1);
await migrate(sql);
const [{ count }] = await sql<{ count: number }[]>`select count(*) from staff`;
if (count > 0) {
  console.error('This database already has staff, so seeding was skipped.');
  await sql.end();
  process.exit(1);
}

const password = 'haki-demo-password';
const [admin] = await sql<{ id: string; name: string }[]>`
  insert into staff (name, email, password_hash, role) values ('Amina Oladipo', 'admin@example.com', ${await hashPassword(password)}, 'admin') returning id, name`;
await sql`insert into staff (name, email, password_hash, role) values ('Bola Staff', 'staff@example.com', ${await hashPassword(password)}, 'staff')`;

const statement = { filename: 'statement.pdf', mime: 'application/pdf', content: new TextEncoder().encode('%PDF-1.4 sample') };
const today = todayInLagos();
let n = 0;

interface Case { name: string; category: 'travel' | 'services' | 'goods'; item: string; vendor: string; price: number; startMonthsAgo?: number; stage: string; paidInstalments?: number; partial?: number }
const cases: Case[] = [
  { name: 'Zainab Abdullahi', category: 'travel', item: 'Umrah package, December', vendor: 'Al-Noor Travels', price: 1800000, stage: 'new' },
  { name: 'Ibrahim Musa', category: 'goods', item: 'Grinding mill', vendor: 'Kano Machinery', price: 1450000, stage: 'new' },
  { name: 'Ngozi Eze', category: 'services', item: 'Postgraduate school fees', vendor: 'Lagos Business College', price: 950000, stage: 'review' },
  { name: 'Yusuf Bala', category: 'travel', item: 'Return flights to Dubai', vendor: 'Skyline Agents', price: 720000, stage: 'sent' },
  { name: 'Tunde Adeyemi', category: 'goods', item: 'HP EliteBook laptop', vendor: 'Slot, Ikeja', price: 870000, stage: 'accepted' },
  { name: 'Chinedu Okafor', category: 'travel', item: 'Family trip to Istanbul', vendor: 'Prestige Travels', price: 3200000, startMonthsAgo: 2, stage: 'live', paidInstalments: 0, partial: 300000 },
  { name: 'Kemi Balogun', category: 'goods', item: 'iPhone 15 Pro', vendor: 'Pointek', price: 1280000, startMonthsAgo: 1, stage: 'live', paidInstalments: 0 },
  { name: 'Halima Sani', category: 'services', item: 'Wedding hall and catering', vendor: 'Royal Events', price: 2100000, startMonthsAgo: 1, stage: 'live', paidInstalments: 1 },
  { name: 'Musa Danjuma', category: 'goods', item: 'Chest freezer', vendor: 'Sahad Stores', price: 760000, startMonthsAgo: 3, stage: 'live', paidInstalments: 1 },
  { name: 'Aisha Bello', category: 'goods', item: '7.5kVA generator', vendor: 'Mikano', price: 1740000, startMonthsAgo: 2, stage: 'live', paidInstalments: 2 },
  { name: 'Usman Garba', category: 'services', item: 'Clinic equipment servicing', vendor: 'MedServe', price: 1300000, startMonthsAgo: 2, stage: 'live', paidInstalments: 1 },
  { name: 'Fatima Yusuf', category: 'goods', item: 'Solar inverter kit', vendor: 'Arnergy', price: 2300000, startMonthsAgo: 5, stage: 'live', paidInstalments: 3 },
  { name: 'Emeka Nwosu', category: 'travel', item: 'Business trip to Guangzhou', vendor: 'Globe Travels', price: 2600000, startMonthsAgo: 6, stage: 'live', paidInstalments: 3 },
  { name: 'Sade Ogunleye', category: 'services', item: 'Shop renovation', vendor: 'BuildRight', price: 1500000, startMonthsAgo: 8, stage: 'live', paidInstalments: 3 },
  { name: 'Bashir Lawal', category: 'goods', item: 'POS terminals, four units', vendor: 'Moniepoint Partner', price: 620000, startMonthsAgo: 10, stage: 'live', paidInstalments: 3 },
  { name: 'Grace Peters', category: 'travel', item: 'Hajj package', vendor: 'Al-Noor Travels', price: 6500000, startMonthsAgo: 11, stage: 'live', paidInstalments: 3 },
  { name: 'Rilwan Hassan', category: 'goods', item: 'Used motorcycle', vendor: 'Unknown seller', price: 400000, stage: 'declined' },
];

for (const c of cases) {
  n++;
  const down = Math.ceil(c.price * 0.25);
  const app = await submitApplication(sql, {
    fullName: c.name, phone: `080300${String(10000 + n)}`, email: `${c.name.split(' ')[0].toLowerCase()}@example.com`, address: `${n} Sample Street, Lagos`,
    dateOfBirth: '1988-04-12', nin: `1000000${String(1000 + n)}`, employmentType: 'employed', employer: 'Sample Ltd', monthlyIncome: '600000', otherObligations: '50000',
    category: c.category, description: c.item, vendorName: c.vendor, vendorContact: '', quoted: String(c.price), downPayment: String(down), tenor: 3, paymentDay: [28, 10, 12, 8][n % 4], consent: true,
  }, statement, `192.0.2.${n}`);
  if (c.stage === 'new') continue;
  if (c.stage === 'declined') { await decline(sql, app.id, 'The seller could not be verified.', admin.name); continue; }
  await startReview(sql, app.id, admin.name);
  if (c.stage === 'review') continue;
  const terms = { costKobo: c.price * 100, profitKobo: Math.round(c.price * 15), downKobo: down * 100, tenor: 3 };
  const { token } = await sendAgreement(sql, app.id, terms, admin.name);
  if (c.stage === 'sent') continue;

  const acceptedOn = c.startMonthsAgo ? addDays(monthlyDate(today, -c.startMonthsAgo, 10), 0) : today;
  await acceptAgreement(sql, token, c.name, '192.0.2.200', acceptedOn);
  await sql`update financings set created_at = ${acceptedOn}::date - 3, accepted_at = ${acceptedOn}::date + time '10:15' where id = ${app.id}`;
  if (c.stage === 'accepted') continue;

  const dues = await sql<{ number: number; due_on: string; amount_kobo: number }[]>`
    select number, due_on, amount_kobo from instalments where financing_id = ${app.id} order by number`;
  await markPurchased(sql, app.id, addDays(acceptedOn, 2), null, admin.name);
  const pay = (paidOn: string, amountKobo: number) =>
    recordPayment(sql, app.id, { paidOn, amountKobo, method: 'transfer', reference: '' }, null, admin);
  await pay(acceptedOn, dues[0].amount_kobo);
  for (const d of dues.slice(1, 1 + (c.paidInstalments ?? 0))) {
    const paidOn = d.due_on <= today ? d.due_on : addDays(today, -1);
    await pay(paidOn, d.amount_kobo);
  }
  if (c.partial) await pay(addDays(today, -5), c.partial * 100);
}
await sql.end();
console.log(`Seeded ${cases.length} financings. Sign in as admin@example.com or staff@example.com, password: ${password}`);
