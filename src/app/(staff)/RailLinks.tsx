'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icons } from '@/components/icons';

export function RailLinks({ admin }: { admin: boolean }) {
  const path = usePathname();
  const item = (href: string, label: string, icon: React.ReactNode) => (
    <Link href={href} className={`ri ${path.startsWith(href) ? 'on' : ''}`} aria-label={label} title={label}>{icon}</Link>
  );
  return (
    <>
      {item('/dashboard', 'Dashboard', Icons.dash)}
      {item('/financings', 'Financings', Icons.fin)}
      {admin && item('/settings', 'Settings', Icons.gear)}
    </>
  );
}
