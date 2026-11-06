import { monthlyDate } from './dates';

export interface Terms {
  costKobo: number;
  profitKobo: number;
  downKobo: number;
  tenor: number;
}

export const salePrice = (t: Pick<Terms, 'costKobo' | 'profitKobo'>) => t.costKobo + t.profitKobo;

export const profitFromPercent = (costKobo: number, percent: number) => Math.round((costKobo * percent) / 100);

/** The smallest down payment allowed, as a share of the item's cost, rounded up to a whole kobo. */
export const minDownKobo = (basisKobo: number, minPercent: number) => Math.ceil((basisKobo * minPercent) / 100);

export interface ScheduledInstalment {
  number: number;
  dueOn: string;
  amountKobo: number;
}

/** Equal monthly amounts. Any rounding remainder goes on the last one. */
export function instalmentAmounts(t: Terms): number[] {
  const financed = salePrice(t) - t.downKobo;
  const each = Math.floor(financed / t.tenor);
  return Array.from({ length: t.tenor }, (_, i) => (i === t.tenor - 1 ? financed - each * (t.tenor - 1) : each));
}

/**
 * Number 0 is the down payment, due on acceptance. Instalments follow monthly on the chosen day,
 * starting the month after acceptance.
 */
export function buildSchedule(t: Terms, acceptedOn: string, paymentDay: number): ScheduledInstalment[] {
  const rows = instalmentAmounts(t).map((amountKobo, i) => ({
    number: i + 1, dueOn: monthlyDate(acceptedOn, i + 1, paymentDay), amountKobo,
  }));
  return t.downKobo > 0 ? [{ number: 0, dueOn: acceptedOn, amountKobo: t.downKobo }, ...rows] : rows;
}

export function validateTerms(t: Terms, minDownPercent: number): string | null {
  if (!Number.isSafeInteger(t.costKobo) || t.costKobo <= 0) return 'Enter the purchase cost.';
  if (t.profitKobo < 0) return 'Profit can’t be negative.';
  if (t.tenor < 1) return 'Choose a tenor.';
  if (t.downKobo >= salePrice(t)) return 'The down payment must be less than the sale price.';
  if (t.downKobo < minDownKobo(t.costKobo, minDownPercent)) return `The down payment must be at least ${minDownPercent}% of the cost.`;
  return null;
}
