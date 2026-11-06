import Link from 'next/link';
import { requireStaff } from '@/server/auth';
import { Icons } from '@/components/icons';
import { RailLinks } from './RailLinks';
import { logoutAction } from './actions';

export const dynamic = 'force-dynamic';

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const staff = await requireStaff();
  const initials = staff.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div className="shell">
      <aside className="rail">
        <Link href="/dashboard" className="rail-logo"><img src="/haki-logo.svg" alt="Haki" /></Link>
        <RailLinks admin={staff.role === 'admin'} />
        <div className="end">
          <form action={logoutAction}><button className="ri" aria-label="Sign out" title="Sign out">{Icons.out}</button></form>
          <div className="ava" title={staff.name}>{initials}</div>
        </div>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
