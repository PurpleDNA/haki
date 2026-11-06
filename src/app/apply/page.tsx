import type { Metadata } from 'next';
import { db } from '@/server/db';
import { getSettings } from '@/server/settings';
import { ApplyForm } from './ApplyForm';

export const metadata: Metadata = { title: 'Apply' };
export const dynamic = 'force-dynamic';

export default async function ApplyPage() {
  const s = await getSettings(db());
  return <ApplyForm minDownPercent={Number(s.min_down_percent)} profitPercent={Number(s.default_profit_percent)} tenors={s.tenors} phone={s.phone} />;
}
