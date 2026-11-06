import type { Metadata } from 'next';
import Link from 'next/link';
import { Icons } from '@/components/icons';
import { Pill } from '@/components/Pill';
import { formatDate, todayInLagos } from '@/domain/dates';
import { naira } from '@/domain/money';
import { CATEGORY_LABEL } from '@/domain/status';
import { requireStaff } from '@/server/auth';
import { db } from '@/server/db';
import { loadViews } from '@/server/financings';
import { filterViews, tabOf, type ListFilters, type ListTab } from '@/server/list';
import { RowLink } from './RowLink';

export const metadata: Metadata = { title: 'Financings' };

const TABS: [ListTab, string][] = [['all', 'All'], ['applications', 'Applications'], ['active', 'Active'], ['overdue', 'Overdue'], ['completed', 'Completed'], ['declined', 'Declined']];
const PAGE = 20;

export default async function FinancingsPage({ searchParams }: { searchParams: Promise<ListFilters & { page?: string }> }) {
  await requireStaff();
  const sp = await searchParams;
  const { page: rawPage, ...filters } = sp;
  const { rows, counts } = filterViews(await loadViews(db(), todayInLagos()), filters);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const page = Math.min(pages, Math.max(1, Number(rawPage) || 1));
  const shown = rows.slice((page - 1) * PAGE, page * PAGE);
  const clean = Object.fromEntries(Object.entries(filters).filter(([, v]) => v)) as Record<string, string>;
  const qs = (over: Record<string, string | undefined>) => {
    const p = new URLSearchParams(clean);
    for (const [k, v] of Object.entries(over)) { if (v) p.set(k, v); else p.delete(k); }
    return p.toString();
  };
  const tab = tabOf(filters.tab);

  return (
    <>
      <div className="top">
        <h1>Financings</h1><span className="sp" />
        <a className="btn" href={`/financings/export?${qs({})}`}>{Icons.down}Export CSV</a>
      </div>
      <div className="chips">
        {TABS.map(([k, label]) => (
          <Link key={k} href={`/financings?${qs({ tab: k === 'all' ? undefined : k, page: undefined })}`} className={`chip ${k === 'overdue' ? 'warn' : ''} ${tab === k ? 'on' : ''}`}>{label}<b>{counts[k]}</b></Link>
        ))}
      </div>
      <div className="card" style={{ overflow: 'hidden' }}>
        <form className="filters" action="/financings">
          {filters.tab && <input type="hidden" name="tab" value={filters.tab} />}
          <div className="search" style={{ height: 38, borderRadius: 10 }}>{Icons.search}<input name="q" defaultValue={filters.q} placeholder="Name, reference or phone" aria-label="Search" /></div>
          <select name="category" className="dd" defaultValue={filters.category ?? ''} aria-label="Type">
            <option value="">All types</option>
            {Object.entries(CATEGORY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <input type="date" name="from" className="dd" defaultValue={filters.from} aria-label="Applied from" />
          <input type="date" name="to" className="dd" defaultValue={filters.to} aria-label="Applied to" />
          <button className="btn sm">Apply</button>
          <span className="sp" />
          <span className="muted" style={{ fontSize: 13 }}>Showing {shown.length} of {rows.length}</span>
        </form>
        <div className="tablewrap">
          <table>
            <thead><tr><th>Reference</th><th>Borrower</th><th>Item</th><th className="r">Cost</th><th>Status</th><th>Next due</th><th className="r">Balance</th><th className="r">Days overdue</th></tr></thead>
            <tbody>
              {shown.map((f) => (
                <RowLink key={f.id} href={`/financings/${f.id}`}>
                  <td className="ref"><Link href={`/financings/${f.id}`}>{f.reference}</Link></td>
                  <td><b>{f.name}</b></td>
                  <td className="ink2" style={{ maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.description}</td>
                  <td className="r num">{naira(f.costKobo ?? f.quotedKobo)}</td>
                  <td><Pill status={f.status} overdue={f.isOverdue} /></td>
                  <td className={f.isOverdue ? 'late' : ''}>{f.next ? formatDate(f.next.dueOn, 'short') : <span className="muted">—</span>}</td>
                  <td className="r num">{f.balanceKobo === null ? <span className="muted">—</span> : naira(f.balanceKobo)}</td>
                  <td className="r">{f.daysOverdue ? <span className="late">{f.daysOverdue}</span> : <span className="muted">—</span>}</td>
                </RowLink>
              ))}
              {shown.length === 0 && <tr><td colSpan={8}><div className="empty">No financings match.</div></td></tr>}
            </tbody>
          </table>
        </div>
        {pages > 1 && (
          <div className="pg">
            <span>Page {page} of {pages}</span>
            <span style={{ display: 'flex', gap: 8 }}>
              {page > 1 && <Link className="btn sm" href={`/financings?${qs({ page: String(page - 1) })}`}>Previous</Link>}
              {page < pages && <Link className="btn sm" href={`/financings?${qs({ page: String(page + 1) })}`}>Next</Link>}
            </span>
          </div>
        )}
      </div>
    </>
  );
}
