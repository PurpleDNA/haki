import { z } from 'zod';
import { parseNaira } from './money';

export const normalisePhone = (input: string) => {
  const d = input.replace(/[^\d+]/g, '').replace(/^\+?234/, '0');
  return /^0\d{10}$/.test(d) ? d : null;
};

const required = (label: string, max = 200) => z.string().trim().min(1, `Enter ${label}.`).max(max, `${label} is too long.`);

const naira = (label: string) => z.string().superRefine((v, ctx) => {
  if (parseNaira(v) === null) ctx.addIssue({ code: 'custom', message: `Enter ${label} as an amount.` });
});

export const personalSchema = z.object({
  fullName: required('your full name'),
  phone: z.string().refine((v) => normalisePhone(v) !== null, 'Enter a valid Nigerian phone number.'),
  email: z.email('Enter a valid email address.').max(200),
  address: required('your home address', 400),
  dateOfBirth: z.iso.date('Enter your date of birth.'),
  nin: z.string().regex(/^\d{11}$/, 'Your NIN should be 11 digits.'),
});

export const workSchema = z.object({
  employmentType: z.enum(['employed', 'self_employed', 'business_owner', 'other'], 'Choose your employment type.'),
  employer: required('your employer or business name'),
  monthlyIncome: naira('your monthly income'),
  otherObligations: naira('your other monthly commitments'),
});

export const itemSchema = z.object({
  category: z.enum(['travel', 'services', 'goods'], 'Choose what you want to finance.'),
  description: required('a description', 500),
  vendorName: required('the vendor’s name'),
  vendorContact: z.string().trim().max(200),
  quoted: naira('the vendor’s price').refine((v) => (parseNaira(v) ?? 0) > 0, 'Enter the vendor’s price.'),
});

export const planSchema = z.object({
  downPayment: naira('your down payment'),
  tenor: z.coerce.number().int().positive(),
  paymentDay: z.coerce.number().int().min(1, 'Choose a payment day.').max(28, 'Choose a payment day.'),
  consent: z.literal(true, 'Please agree before submitting.'),
});

export const applicationSchema = personalSchema.extend(workSchema.shape).extend(itemSchema.shape).extend(planSchema.shape);
export type ApplicationInput = z.infer<typeof applicationSchema>;

export const STATEMENT_MAX_BYTES = 4 * 1024 * 1024;

/** Checks a file's real contents, because a browser-supplied type can say anything. */
export function sniffDocument(b: Uint8Array): 'application/pdf' | 'image/jpeg' | 'image/png' | null {
  if (b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46) return 'application/pdf';
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'image/png';
  return null;
}
