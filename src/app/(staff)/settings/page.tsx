import type { Metadata } from 'next';
import { requireAdmin } from '@/server/auth';
import { db } from '@/server/db';
import { DEFAULT_AGREEMENT, getSettings, launchGaps } from '@/server/settings';
import { AddStaff, SettingsForm, StaffRow } from './forms';

export const metadata: Metadata = { title: 'Settings' };

export default async function SettingsPage() {
  const me = await requireAdmin();
  const s = await getSettings(db());
  const staff = await db()<{ id: string; name: string; email: string; role: string; active: boolean }[]>`
    select id, name, email, role, active from staff order by active desc, name`;
  const gaps = launchGaps(s);
  return (
    <>
      <div className="top"><h1>Settings</h1></div>
      <div className="cols">
        <SettingsForm settings={s} defaultAgreement={DEFAULT_AGREEMENT} />
        <aside>
          {gaps.length > 0 && (
            <div className="card panel-card">
              <h3>Still needed before launch</h3>
              <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.9 }}>{gaps.map((g) => <li key={g}>{g}</li>)}</ul>
            </div>
          )}
          <div className="card panel-card">
            <h3>Staff</h3>
            {staff.map((p) => <StaffRow key={p.id} person={p} isMe={p.id === me.id} />)}
          </div>
          <AddStaff />
        </aside>
      </div>
    </>
  );
}
