/** Plain calendar dates as YYYY-MM-DD strings. */

export function todayInLagos(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Lagos' }).format(now);
}

const asUtc = (d: string) => new Date(d + 'T00:00:00Z');

export function addDays(d: string, days: number): string {
  const x = asUtc(d);
  x.setUTCDate(x.getUTCDate() + days);
  return x.toISOString().slice(0, 10);
}

export function daysBetween(from: string, to: string): number {
  return Math.round((asUtc(to).getTime() - asUtc(from).getTime()) / 86400000);
}

/** The given day of the month, `months` after the month of `d`. */
export function monthlyDate(d: string, months: number, day: number): string {
  const x = asUtc(d);
  return new Date(Date.UTC(x.getUTCFullYear(), x.getUTCMonth() + months, day)).toISOString().slice(0, 10);
}

export const monthKey = (d: string) => d.slice(0, 7);

/** The last `count` month keys, ending with the month of `today`. */
export function lastMonths(today: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => monthKey(monthlyDate(today, i - count + 1, 1)));
}

export function formatDate(d: string, style: 'short' | 'long' = 'long'): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'UTC', day: 'numeric', month: 'short', ...(style === 'long' ? { year: 'numeric' } : {}),
  }).format(asUtc(d));
}

export const monthLabel = (key: string) =>
  new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', month: 'short' }).format(asUtc(key + '-01'));

export function formatDateTimeLagos(t: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Lagos', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(t);
}

export function ordinal(n: number): string {
  const tens = n % 100;
  if (tens >= 11 && tens <= 13) return `${n}th`;
  return `${n}${['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`;
}
