-- Money is stored in kobo as whole numbers. Dates that matter to borrowers are plain dates.

create table staff (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  password_hash text not null,
  role text not null check (role in ('admin', 'staff')),
  active boolean not null default true,
  session_version int not null default 1,
  failed_logins int not null default 0,
  locked_until timestamptz,
  created_at timestamptz not null default now()
);

create table settings (
  id int primary key default 1 check (id = 1),
  company_name text,
  rc_number text,
  address text,
  phone text,
  email text,
  bank_name text,
  bank_account_name text,
  bank_account_number text,
  alert_email text,
  default_profit_percent numeric(5,2) not null default 15,
  profit_rate_confirmed boolean not null default false,
  min_down_percent numeric(5,2) not null default 25,
  tenors int[] not null default '{3}',
  agreement_text text,
  updated_at timestamptz not null default now()
);
insert into settings (id) values (1);

-- Matches repeat customers by phone. Details submitted on a form are stored on the financing,
-- because the public form must never be able to overwrite an existing customer's details.
create table borrowers (
  id uuid primary key default gen_random_uuid(),
  phone text not null unique,
  created_at timestamptz not null default now()
);

create sequence financing_ref_seq;

create table financings (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  borrower_id uuid not null references borrowers(id),
  status text not null default 'submitted' check (status in
    ('submitted','under_review','agreement_sent','accepted','active','completed','declined','expired','written_off')),
  applicant jsonb not null,
  category text not null check (category in ('travel','services','goods')),
  description text not null,
  vendor_name text not null,
  vendor_contact text,
  quoted_kobo bigint not null check (quoted_kobo > 0),
  requested_down_kobo bigint not null check (requested_down_kobo >= 0),
  requested_tenor int not null,
  payment_day int not null check (payment_day between 1 and 28),
  cost_kobo bigint check (cost_kobo > 0),
  profit_kobo bigint check (profit_kobo >= 0),
  down_kobo bigint check (down_kobo >= 0),
  tenor int check (tenor > 0),
  decline_reason text,
  agreement_token text unique,
  agreement_text text,
  agreement_expires_at timestamptz,
  accepted_at timestamptz,
  accepted_name text,
  accepted_ip text,
  purchased_on date,
  submitted_ip text,
  created_at timestamptz not null default now()
);
create index financings_status on financings (status);
create index financings_submitted_ip on financings (submitted_ip, created_at);

-- Number 0 is the down payment. Amount paid is worked out from payments, never stored.
create table instalments (
  financing_id uuid not null references financings(id) on delete cascade,
  number int not null check (number >= 0),
  due_on date not null,
  amount_kobo bigint not null check (amount_kobo >= 0),
  primary key (financing_id, number)
);

create table payments (
  id uuid primary key default gen_random_uuid(),
  financing_id uuid not null references financings(id) on delete cascade,
  paid_on date not null,
  amount_kobo bigint not null check (amount_kobo > 0),
  method text not null check (method in ('transfer','cash','pos')),
  reference text,
  recorded_by uuid references staff(id),
  voided_at timestamptz,
  voided_by uuid references staff(id),
  created_at timestamptz not null default now()
);
create index payments_financing on payments (financing_id);

-- Files live in the database so that nothing outside the app can serve them.
create table documents (
  id uuid primary key default gen_random_uuid(),
  financing_id uuid not null references financings(id) on delete cascade,
  payment_id uuid references payments(id) on delete cascade,
  kind text not null check (kind in ('bank_statement','receipt','purchase_receipt')),
  filename text not null,
  mime text not null,
  size_bytes int not null,
  content bytea not null,
  created_at timestamptz not null default now()
);
create index documents_financing on documents (financing_id);

create table activity_log (
  id bigint generated always as identity primary key,
  financing_id uuid not null references financings(id) on delete cascade,
  actor text not null,
  action text not null,
  detail jsonb,
  created_at timestamptz not null default now()
);
create index activity_financing on activity_log (financing_id, created_at);

-- The app connects as the table owner, which RLS does not restrict. With no policies, Supabase's
-- public API can read nothing from these tables.
alter table staff enable row level security;
alter table settings enable row level security;
alter table borrowers enable row level security;
alter table financings enable row level security;
alter table instalments enable row level security;
alter table payments enable row level security;
alter table documents enable row level security;
alter table activity_log enable row level security;
