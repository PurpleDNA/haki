import { allocate, type AllocatedInstalment, type Due, type Paid } from './allocation';
import { addDays, lastMonths, monthKey, daysBetween } from './dates';
import type { Category, FinancingStatus } from './status';

export interface FinancingRow {
  id: string;
  reference: string;
  status: FinancingStatus;
  name: string;
  phone: string;
  category: Category;
  description: string;
  quotedKobo: number;
  costKobo: number | null;
  profitKobo: number | null;
  purchasedOn: string | null;
  createdAt: Date;
  dues: Due[];
  payments: Paid[];
}

export interface FinancingView extends FinancingRow {
  instalments: AllocatedInstalment[];
  saleKobo: number | null;
  paidKobo: number;
  balanceKobo: number | null;
  overdueKobo: number;
  daysOverdue: number;
  next: AllocatedInstalment | null;
  /** The status staff see: active with missed payments reads as overdue. */
  isOverdue: boolean;
}

const LIVE: FinancingStatus[] = ['accepted', 'active'];

export function view(f: FinancingRow, today: string): FinancingView {
  const instalments = allocate(f.dues, f.payments, today);
  const hasPrice = f.costKobo !== null && f.profitKobo !== null;
  const saleKobo = hasPrice ? f.costKobo! + f.profitKobo! : null;
  const paidKobo = f.payments.reduce((s, p) => s + p.amountKobo, 0);
  const owing = f.dues.length > 0 && saleKobo !== null;
  const counted = f.status === 'active';
  const overdue = counted ? instalments.filter((i) => i.status === 'overdue') : [];
  return {
    ...f,
    instalments,
    saleKobo,
    paidKobo,
    balanceKobo: owing && f.status !== 'written_off' ? saleKobo! - paidKobo : null,
    overdueKobo: overdue.reduce((s, i) => s + i.remainingKobo, 0),
    daysOverdue: overdue.reduce((m, i) => Math.max(m, i.daysLate), 0),
    next: LIVE.includes(f.status) ? instalments.find((i) => i.remainingKobo > 0) ?? null : null,
    isOverdue: overdue.length > 0,
  };
}

export interface MonthPoint {
  month: string;
  collectedKobo: number;
  disbursedKobo: number;
  /** Share of instalments due that month that were settled by their due date. Null if none fell due. */
  onTimePercent: number | null;
}

export function monthlySeries(views: FinancingView[], today: string, months: number): MonthPoint[] {
  const keys = lastMonths(today, months);
  const points = new Map(keys.map((month) => [month, { month, collectedKobo: 0, disbursedKobo: 0, due: 0, onTime: 0 }]));
  for (const f of views) {
    if (f.purchasedOn && f.costKobo) {
      const p = points.get(monthKey(f.purchasedOn));
      if (p) p.disbursedKobo += f.costKobo;
    }
    for (const pay of f.payments) {
      const p = points.get(monthKey(pay.paidOn));
      if (p) p.collectedKobo += pay.amountKobo;
    }
    if (f.status === 'written_off') continue;
    for (const i of f.instalments) {
      if (i.number === 0 || i.dueOn > today) continue;
      const p = points.get(monthKey(i.dueOn));
      if (!p) continue;
      p.due++;
      if (i.settledOn && i.settledOn <= i.dueOn) p.onTime++;
    }
  }
  return keys.map((k) => {
    const { month, collectedKobo, disbursedKobo, due, onTime } = points.get(k)!;
    return { month, collectedKobo, disbursedKobo, onTimePercent: due ? Math.round((onTime / due) * 100) : null };
  });
}

export interface Dashboard {
  outstandingKobo: number;
  liveCount: number;
  collectedThisMonthKobo: number;
  collectedChangePercent: number | null;
  overdueKobo: number;
  overdueCount: number;
  activeCount: number;
  financedKobo: number;
  onTimePercent: number | null;
  series: MonthPoint[];
  overdue: FinancingView[];
  newApplications: FinancingView[];
  dueThisWeek: { financing: FinancingView; instalment: AllocatedInstalment }[];
  dueThisWeekKobo: number;
}

export function dashboard(views: FinancingView[], today: string): Dashboard {
  const live = views.filter((f) => LIVE.includes(f.status));
  const overdue = live.filter((f) => f.isOverdue).sort((a, b) => b.daysOverdue - a.daysOverdue);
  const series = monthlySeries(views, today, 12);
  const [prev, cur] = series.slice(-2);
  const weekEnd = addDays(today, 7);
  const dueThisWeek = live
    .filter((f) => f.status === 'active')
    .flatMap((financing) => financing.instalments
      .filter((i) => i.remainingKobo > 0 && i.dueOn >= today && i.dueOn <= weekEnd)
      .map((instalment) => ({ financing, instalment })))
    .sort((a, b) => daysBetween(b.instalment.dueOn, a.instalment.dueOn));

  let due = 0;
  let onTime = 0;
  for (const f of views) {
    if (f.status === 'written_off') continue;
    for (const i of f.instalments) {
      if (i.number === 0 || i.dueOn > today) continue;
      due++;
      if (i.settledOn && i.settledOn <= i.dueOn) onTime++;
    }
  }

  return {
    outstandingKobo: live.reduce((s, f) => s + (f.balanceKobo ?? 0), 0),
    liveCount: live.length,
    collectedThisMonthKobo: cur.collectedKobo,
    collectedChangePercent: prev.collectedKobo ? Math.round(((cur.collectedKobo - prev.collectedKobo) / prev.collectedKobo) * 100) : null,
    overdueKobo: overdue.reduce((s, f) => s + f.overdueKobo, 0),
    overdueCount: overdue.length,
    activeCount: live.length,
    financedKobo: views.filter((f) => f.purchasedOn).reduce((s, f) => s + (f.costKobo ?? 0), 0),
    onTimePercent: due ? Math.round((onTime / due) * 100) : null,
    series,
    overdue,
    newApplications: views.filter((f) => f.status === 'submitted').sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
    dueThisWeek,
    dueThisWeekKobo: dueThisWeek.reduce((s, d) => s + d.instalment.remainingKobo, 0),
  };
}
