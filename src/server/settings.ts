import type { Db } from './db';

export interface Settings {
  company_name: string | null;
  rc_number: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  bank_name: string | null;
  bank_account_name: string | null;
  bank_account_number: string | null;
  alert_email: string | null;
  default_profit_percent: string;
  profit_rate_confirmed: boolean;
  min_down_percent: string;
  tenors: number[];
  agreement_text: string | null;
}

export async function getSettings(db: Db): Promise<Settings> {
  const [row] = await db<Settings[]>`select * from settings where id = 1`;
  return row;
}

/** Placeholder wording until the client's adviser and lawyer supply the approved text. */
export const DEFAULT_AGREEMENT = `DRAFT WORDING. This text is a placeholder until it has been approved.

1. The sale
{{company}} (the Seller) will buy the item described above from the vendor and sell it to {{borrower}} (the Buyer) at the sale price stated in this agreement. The Seller's profit is disclosed above and forms part of that price.

2. Fixed price
The sale price is fixed. It will not increase for any reason, including late payment. No interest is charged.

3. Payment
The Buyer will pay the down payment and each instalment on the dates in the payment schedule, into the account below:
{{bank}}

4. Late payment
If a payment is late, the amount owed stays the same and the Buyer must still pay it. No fee or penalty is added.

5. Paying early
The Buyer may pay any or all of the balance early. The full sale price remains payable, and no discount applies.

6. No cancellation
Once this agreement is accepted, it cannot be cancelled and no refund is due. The Buyer must pay the full sale price even if a trip or service is cancelled, or the Buyer no longer wants or uses the item.

7. Accuracy of information
The Buyer confirms that the details given in the application are true and complete.`;

/** What must still come from the client before launch. */
export function launchGaps(s: Settings): string[] {
  const gaps: string[] = [];
  if (!s.company_name) gaps.push('Registered company name');
  if (!s.rc_number) gaps.push('RC number');
  if (!s.address) gaps.push('Office address');
  if (!s.phone) gaps.push('Support phone number');
  if (!s.email) gaps.push('Support email');
  if (!s.bank_name || !s.bank_account_name || !s.bank_account_number) gaps.push('Bank account for borrower payments');
  if (!s.alert_email) gaps.push('Email for new application alerts');
  if (!s.profit_rate_confirmed) gaps.push('Confirmed profit rate');
  if (!s.agreement_text) gaps.push('Approved agreement, T&Cs and privacy text');
  return gaps;
}

export const orPlaceholder = (v: string | null, label: string) => v || `[${label} to be confirmed]`;

export function bankDetails(s: Settings) {
  if (!s.bank_name || !s.bank_account_name || !s.bank_account_number) return '[Bank account to be confirmed]';
  return `${s.bank_account_name}, ${s.bank_name}, ${s.bank_account_number}`;
}

export function renderAgreement(s: Settings, borrower: string) {
  return (s.agreement_text || DEFAULT_AGREEMENT)
    .replaceAll('{{company}}', orPlaceholder(s.company_name, 'Company name'))
    .replaceAll('{{borrower}}', borrower)
    .replaceAll('{{bank}}', bankDetails(s));
}
