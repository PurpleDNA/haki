import { daysBetween } from './dates';

export interface Due {
  number: number;
  dueOn: string;
  amountKobo: number;
}

export interface Paid {
  paidOn: string;
  amountKobo: number;
  /** Breaks ties between payments on the same date. */
  createdAt?: Date | string;
}

export type InstalmentStatus = 'paid' | 'part_paid' | 'overdue' | 'due' | 'upcoming';

export interface AllocatedInstalment extends Due {
  paidKobo: number;
  remainingKobo: number;
  /** Date of the payment that finished this instalment. */
  settledOn: string | null;
  status: InstalmentStatus;
  daysLate: number;
}

/** How close an unpaid instalment must be to count as "due" rather than "upcoming". */
export const DUE_SOON_DAYS = 7;

/** Fills the oldest unpaid instalment first. Any excess rolls on to the next. */
export function allocate(dues: Due[], payments: Paid[], today: string): AllocatedInstalment[] {
  const ordered = [...payments].sort(
    (a, b) => a.paidOn.localeCompare(b.paidOn) || String(a.createdAt ?? '').localeCompare(String(b.createdAt ?? '')),
  );
  const rows = [...dues].sort((a, b) => a.number - b.number).map((d) => ({ ...d, paidKobo: 0, settledOn: null as string | null }));
  let i = 0;
  for (const p of ordered) {
    let left = p.amountKobo;
    while (left > 0 && i < rows.length) {
      const row = rows[i];
      const take = Math.min(left, row.amountKobo - row.paidKobo);
      row.paidKobo += take;
      left -= take;
      if (row.paidKobo === row.amountKobo) {
        row.settledOn = p.paidOn;
        i++;
      }
    }
  }
  return rows.map((r) => {
    const remainingKobo = r.amountKobo - r.paidKobo;
    const late = remainingKobo > 0 ? Math.max(0, daysBetween(r.dueOn, today)) : 0;
    let status: InstalmentStatus;
    if (remainingKobo === 0) status = 'paid';
    else if (late > 0) status = 'overdue';
    else if (r.paidKobo > 0) status = 'part_paid';
    else if (daysBetween(today, r.dueOn) <= DUE_SOON_DAYS) status = 'due';
    else status = 'upcoming';
    return { ...r, remainingKobo, status, daysLate: late };
  });
}
