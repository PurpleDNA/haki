# Haki

A web app for running Murabaha (cost-plus) financing. Borrowers apply through a public form and accept their
agreement through a private link. Staff price, approve and track each financing from a dashboard.

Haki buys what the borrower needs (travel, services or goods) and sells it to them at a fixed, disclosed price.
Late payments add no charges, and an accepted agreement can't be cancelled.

## Pages

| Path | Who | What |
| --- | --- | --- |
| `/apply` | Public | Four-step application form |
| `/agreement/<token>` | Borrower | Review, accept and download the agreement |
| `/dashboard` | Staff | Headline numbers, one tabbed chart and what needs attention |
| `/financings` | Staff | Search, filter and export every financing |
| `/financings/<id>` | Staff | Summary, pricing and approval, payment plan, payments, activity |
| `/settings` | Admin | Rates, company and bank details, agreement wording, staff |

## Run it locally

You need Node 22. No Docker is required, because the dev database is PGlite.

```bash
npm install
cp .env.example .env.local   # Set SESSION_SECRET, and add DATABASE_MAX_CONNECTIONS=1
npm run db:dev               # Leave this running in its own terminal
npm run db:seed              # Made-up data. Run this before starting the app.
npm run dev
```

The local database accepts one connection at a time, so stop the app before running seed or migrate.
Sign in as `admin@example.com` or `staff@example.com` with the password `haki-demo-password`.

## Tests

```bash
npm test                 # Domain rules, plus the server layer against a real Postgres engine
npm run lint             # Type check
node scripts/e2e.mjs     # Full browser flow. Needs the seeded app running, and CHROME set to a Chromium path.
```

## Deploy

1. Create a Supabase project and copy its **transaction pooler** connection string.
2. Run `DATABASE_URL=... npm run db:migrate`.
3. Run `DATABASE_URL=... npm run create-admin -- "Full Name" you@example.com "a long password"`.
4. Deploy to Vercel with the variables in `.env.example`.
5. Fill in everything listed under **Still needed before launch** in Settings.

## How it's built

- **Money** is stored in kobo as whole numbers. The rules live in `src/domain` and don't touch the database.
- **Amounts paid are never stored.** They're worked out from the payments each time, so a reversal can't leave totals out of step.
- **Instalment 0 is the down payment.** Payments fill the oldest unpaid instalment first.
- **Supabase is used as hosted Postgres.** The app connects directly so that money changes can run in real transactions.
  Row-level security is on for every table with no policies, so Supabase's public API can read nothing.
- **Uploaded files live in the database**, and only signed-in staff can download them. The limit is 4 MB per file.
- **Sign-in is built in**: scrypt password hashes, a signed cookie, and a 15-minute lockout after 5 failed attempts.

`design/` holds the original mockups and clickable demo. They predate the client's final answers, so they show
vehicle financing, a guarantor step and an earlier logo. The app is the source of truth.
