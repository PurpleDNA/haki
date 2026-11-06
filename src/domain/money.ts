/** Turns "1,250,000.50" into kobo. Returns null if it isn't a valid non-negative amount. */
export function parseNaira(input: string): number | null {
  const clean = input.replace(/[₦,\s]/g, '');
  if (!/^\d+(\.\d{1,2})?$/.test(clean)) return null;
  const [whole, frac = ''] = clean.split('.');
  const kobo = Number(whole) * 100 + Number(frac.padEnd(2, '0'));
  return Number.isSafeInteger(kobo) ? kobo : null;
}

const fmt0 = new Intl.NumberFormat('en-NG', { maximumFractionDigits: 0 });
const fmt2 = new Intl.NumberFormat('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function naira(kobo: number): string {
  return '₦' + (kobo % 100 === 0 ? fmt0.format(kobo / 100) : fmt2.format(kobo / 100));
}

export function nairaShort(kobo: number): string {
  const n = kobo / 100;
  if (Math.abs(n) >= 1e6) return '₦' + (n / 1e6).toFixed(1) + 'M';
  if (Math.abs(n) >= 1e3) return '₦' + Math.round(n / 1e3) + 'K';
  return '₦' + Math.round(n);
}
