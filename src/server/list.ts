import type { FinancingView } from '@/domain/portfolio';

export type ListTab = 'all' | 'applications' | 'active' | 'overdue' | 'completed' | 'declined';

const IN_TAB: Record<ListTab, (f: FinancingView) => boolean> = {
  all: () => true,
  applications: (f) => ['submitted', 'under_review', 'agreement_sent', 'expired'].includes(f.status),
  active: (f) => f.status === 'accepted' || f.status === 'active',
  overdue: (f) => f.isOverdue,
  completed: (f) => f.status === 'completed',
  declined: (f) => f.status === 'declined' || f.status === 'written_off',
};

export interface ListFilters { q?: string; tab?: string; category?: string; from?: string; to?: string }

export const tabOf = (t?: string): ListTab => (t && t in IN_TAB ? (t as ListTab) : 'all');

/** Everything except the tab, so that each tab's count reflects the other filters. */
function matches(f: FinancingView, x: ListFilters) {
  const q = x.q?.trim().toLowerCase();
  if (q && !`${f.reference} ${f.name} ${f.phone} ${f.description}`.toLowerCase().includes(q)) return false;
  if (x.category && f.category !== x.category) return false;
  const applied = f.createdAt.toISOString().slice(0, 10);
  if (x.from && applied < x.from) return false;
  if (x.to && applied > x.to) return false;
  return true;
}

export function filterViews(views: FinancingView[], x: ListFilters) {
  const base = views.filter((f) => matches(f, x));
  const counts = Object.fromEntries((Object.keys(IN_TAB) as ListTab[]).map((t) => [t, base.filter(IN_TAB[t]).length])) as Record<ListTab, number>;
  return { rows: base.filter(IN_TAB[tabOf(x.tab)]), counts };
}
