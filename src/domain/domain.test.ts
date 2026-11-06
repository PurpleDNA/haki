import { describe, expect, it } from 'vitest';
import { allocate } from './allocation';
import { lastMonths, monthlyDate } from './dates';
import { naira, parseNaira } from './money';
import { dashboard, view, type FinancingRow } from './portfolio';
import { buildSchedule, instalmentAmounts, minDownKobo, validateTerms } from './pricing';
import { canMove } from './status';

const N = (n: number) => n * 100;

describe('money', () => {
  it('parses naira into kobo', () => {
    expect(parseNaira('1,250,000')).toBe(125000000);
    expect(parseNaira('₦ 10.5')).toBe(1050);
    expect(parseNaira('0.07')).toBe(7);
  });
  it('rejects invalid amounts', () => {
    for (const bad of ['', '-5', 'abc', '1.234', '1e5']) expect(parseNaira(bad)).toBeNull();
  });
  it('formats naira', () => {
    expect(naira(125000000)).toBe('₦1,250,000');
    expect(naira(1050)).toBe('₦10.50');
  });
});

describe('pricing', () => {
  it('matches the PRD example, with the remainder on the last instalment', () => {
    const a = instalmentAmounts({ costKobo: N(8000000), profitKobo: N(1600000), downKobo: N(2000000), tenor: 12 });
    expect(a[0]).toBe(63333333);
    expect(a[11]).toBe(63333337);
    expect(a.reduce((x, y) => x + y)).toBe(N(7600000));
  });
  it('schedules the down payment on acceptance and instalments from the next month', () => {
    const s = buildSchedule({ costKobo: N(900), profitKobo: N(100), downKobo: N(250), tenor: 3 }, '2026-11-20', 28);
    expect(s.map((x) => [x.number, x.dueOn, x.amountKobo])).toEqual([
      [0, '2026-11-20', N(250)], [1, '2026-12-28', N(250)], [2, '2027-01-28', N(250)], [3, '2027-02-28', N(250)],
    ]);
  });
  it('never drops a date on a short February', () => {
    expect(monthlyDate('2027-01-31', 1, 28)).toBe('2027-02-28');
  });
  it('enforces the 25% minimum down payment on the cost', () => {
    const t = { costKobo: N(1000), profitKobo: N(0), tenor: 3 };
    expect(minDownKobo(N(1000), 25)).toBe(N(250));
    expect(validateTerms({ ...t, downKobo: N(249) }, 25)).toMatch(/25%/);
    expect(validateTerms({ ...t, downKobo: N(250) }, 25)).toBeNull();
    expect(validateTerms({ ...t, downKobo: N(1000) }, 25)).toMatch(/less than/);
  });
});

describe('allocation', () => {
  const dues = [
    { number: 0, dueOn: '2026-01-01', amountKobo: 100 },
    { number: 1, dueOn: '2026-02-28', amountKobo: 100 },
    { number: 2, dueOn: '2026-03-28', amountKobo: 100 },
  ];
  it('fills the oldest first and rolls excess forward', () => {
    const r = allocate(dues, [{ paidOn: '2026-01-01', amountKobo: 250 }], '2026-02-01');
    expect(r.map((x) => x.paidKobo)).toEqual([100, 100, 50]);
    expect(r[1].settledOn).toBe('2026-01-01');
  });
  it('marks late instalments overdue from the day after they fall due, with no added charge', () => {
    const on = allocate(dues, [{ paidOn: '2026-01-01', amountKobo: 100 }], '2026-02-28')[1];
    expect(on.status).toBe('due');
    const after = allocate(dues, [{ paidOn: '2026-01-01', amountKobo: 100 }], '2026-03-01')[1];
    expect(after.status).toBe('overdue');
    expect(after.daysLate).toBe(1);
    expect(after.amountKobo).toBe(100);
  });
  it('allows full early settlement at the full price, with no discount', () => {
    const r = allocate(dues, [{ paidOn: '2026-01-02', amountKobo: 300 }], '2026-01-03');
    expect(r.every((x) => x.status === 'paid')).toBe(true);
  });
  it('labels a partly paid future instalment and the far future', () => {
    const r = allocate(dues, [{ paidOn: '2026-01-01', amountKobo: 150 }], '2026-01-02');
    expect(r.map((x) => x.status)).toEqual(['paid', 'part_paid', 'upcoming']);
  });
});

describe('status rules', () => {
  it('has no way back once a borrower accepts', () => {
    for (const from of ['accepted', 'active'] as const) {
      for (const to of ['declined', 'expired', 'under_review', 'submitted', 'agreement_sent'] as const) {
        expect(canMove(from, to)).toBe(false);
      }
    }
  });
  it('lets an expired agreement go back to review', () => {
    expect(canMove('expired', 'under_review')).toBe(true);
  });
});

describe('dashboard', () => {
  const base = (over: Partial<FinancingRow>): FinancingRow => ({
    id: 'x', reference: 'r', status: 'active', name: 'A', phone: '1', category: 'goods', description: 'd', quotedKobo: 400,
    costKobo: 400, profitKobo: 0, purchasedOn: '2026-10-05', createdAt: new Date('2026-10-01'), dues: [], payments: [], ...over,
  });
  const dues = [
    { number: 0, dueOn: '2026-10-01', amountKobo: 100 },
    { number: 1, dueOn: '2026-10-28', amountKobo: 100 },
    { number: 2, dueOn: '2026-11-28', amountKobo: 100 },
    { number: 3, dueOn: '2026-12-28', amountKobo: 100 },
  ];
  it('adds up outstanding, overdue and collections', () => {
    const today = '2026-11-06';
    const f = view(base({ dues, payments: [{ paidOn: '2026-10-01', amountKobo: 150 }, { paidOn: '2026-11-01', amountKobo: 10 }] }), today);
    const d = dashboard([f], today);
    expect(d.outstandingKobo).toBe(240);
    expect(d.overdueKobo).toBe(40);
    expect(d.overdueCount).toBe(1);
    expect(d.collectedThisMonthKobo).toBe(10);
    expect(d.collectedChangePercent).toBe(-93);
    expect(d.financedKobo).toBe(400);
    expect(d.onTimePercent).toBe(0);
  });
  it('handles an empty book', () => {
    const d = dashboard([], '2026-11-06');
    expect(d.series).toHaveLength(12);
    expect(d.onTimePercent).toBeNull();
    expect(d.outstandingKobo).toBe(0);
  });
  it('ends the series on the current month', () => {
    expect(lastMonths('2026-11-06', 3)).toEqual(['2026-09', '2026-10', '2026-11']);
  });
});
