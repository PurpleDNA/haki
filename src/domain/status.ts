export type FinancingStatus =
  | 'submitted' | 'under_review' | 'agreement_sent' | 'accepted' | 'active' | 'completed' | 'declined' | 'expired' | 'written_off';

/**
 * Where a financing may go next. Nothing leads from accepted, active or overdue back to declined:
 * once a borrower accepts, the sale stands, and the only exits are paying in full or an admin write-off.
 */
const NEXT: Record<FinancingStatus, FinancingStatus[]> = {
  submitted: ['under_review', 'declined'],
  under_review: ['agreement_sent', 'declined'],
  agreement_sent: ['accepted', 'expired'],
  expired: ['under_review', 'declined'],
  accepted: ['active', 'completed', 'written_off'],
  active: ['completed', 'written_off'],
  completed: ['active'], // Only when an admin voids a payment recorded in error.
  declined: [],
  written_off: [],
};

export const canMove = (from: FinancingStatus, to: FinancingStatus) => NEXT[from].includes(to);

export const STATUS_LABEL: Record<FinancingStatus, string> = {
  submitted: 'New application',
  under_review: 'Under review',
  agreement_sent: 'Agreement sent',
  accepted: 'Accepted',
  active: 'Active',
  completed: 'Completed',
  declined: 'Declined',
  expired: 'Expired',
  written_off: 'Written off',
};

/** Payments can only be taken once the borrower has accepted. */
export const takesPayments = (s: FinancingStatus) => s === 'accepted' || s === 'active';
/** Pricing is frozen as soon as an agreement goes out. */
export const canPrice = (s: FinancingStatus) => s === 'submitted' || s === 'under_review' || s === 'expired';

export const CATEGORY_LABEL = { travel: 'Travel', services: 'Services', goods: 'Goods' } as const;
export type Category = keyof typeof CATEGORY_LABEL;
export const METHOD_LABEL = { transfer: 'Bank transfer', cash: 'Cash', pos: 'POS' } as const;
export type Method = keyof typeof METHOD_LABEL;
