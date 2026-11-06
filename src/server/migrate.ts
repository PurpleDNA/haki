import fs from 'node:fs';
import path from 'node:path';
import type { Sql } from 'postgres';

/** Applies each file in db/migrations once, in filename order. */
export async function migrate(sql: Sql, dir = path.join(process.cwd(), 'db/migrations')) {
  await sql`create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())`;
  await sql`alter table schema_migrations enable row level security`;
  const done = new Set((await sql<{ name: string }[]>`select name from schema_migrations`).map((r) => r.name));
  for (const name of fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()) {
    if (done.has(name)) continue;
    await sql.begin(async (tx) => {
      await tx.unsafe(fs.readFileSync(path.join(dir, name), 'utf8'));
      await tx`insert into schema_migrations (name) values (${name})`;
    });
  }
}
