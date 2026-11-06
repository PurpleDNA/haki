import { todayInLagos } from '@/domain/dates';
import { STATUS_LABEL, CATEGORY_LABEL } from '@/domain/status';
import { currentStaff } from '@/server/auth';
import { db } from '@/server/db';
import { loadViews } from '@/server/financings';
import { filterViews } from '@/server/list';

/** Quotes a cell, and stops spreadsheets from running applicant text as a formula. */
function cell(v: string | number | null) {
  if (v === null) return '';
  const s = String(v);
  const safe = typeof v === 'string' && /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return `"${safe.replaceAll('"', '""')}"`;
}

export async function GET(req: Request) {
  if (!(await currentStaff())) return new Response('Not signed in', { status: 401 });
  const p = new URL(req.url).searchParams;
  const today = todayInLagos();
  const { rows } = filterViews(await loadViews(db(), today), {
    q: p.get('q') ?? undefined, tab: p.get('tab') ?? undefined, category: p.get('category') ?? undefined, from: p.get('from') ?? undefined, to: p.get('to') ?? undefined,
  });
  const naira = (k: number | null) => (k === null ? null : k / 100);
  const lines = [
    ['Reference', 'Borrower', 'Phone', 'Type', 'Item', 'Cost (NGN)', 'Sale price (NGN)', 'Status', 'Next due', 'Balance (NGN)', 'Days overdue'].map(cell).join(','),
    ...rows.map((f) => [
      f.reference, f.name, f.phone, CATEGORY_LABEL[f.category], f.description, naira(f.costKobo ?? f.quotedKobo), naira(f.saleKobo),
      f.isOverdue ? 'Overdue' : STATUS_LABEL[f.status], f.next?.dueOn ?? null, naira(f.balanceKobo), f.daysOverdue,
    ].map(cell).join(',')),
  ];
  return new Response('﻿' + lines.join('\r\n'), {
    headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="haki-financings-${today}.csv"`, 'Cache-Control': 'private, no-store' },
  });
}
