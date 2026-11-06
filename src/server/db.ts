import postgres, { type Sql } from 'postgres';

const types = {
  // Keep dates as YYYY-MM-DD strings so that time zones can't shift them.
  date: { to: 1082, from: [1082], serialize: (v: string) => v, parse: (v: string) => v },
  // Kobo totals fit safely in a JavaScript number.
  bigint: { to: 20, from: [20], serialize: (v: number) => String(v), parse: (v: string) => Number(v) },
};

export function connect(url: string, max = 5): Sql<{ date: string; bigint: number }> {
  // The Supabase transaction pooler doesn't support prepared statements.
  return postgres(url, { max, prepare: false, fetch_types: false, types, onnotice: () => {} }) as unknown as Sql<{ date: string; bigint: number }>;
}

export type Db = ReturnType<typeof connect>;

const global_ = globalThis as unknown as { hakiDb?: Db };

export function db(): Db {
  if (!global_.hakiDb) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL is not set');
    global_.hakiDb = connect(url, Number(process.env.DATABASE_MAX_CONNECTIONS ?? 5));
  }
  return global_.hakiDb;
}
