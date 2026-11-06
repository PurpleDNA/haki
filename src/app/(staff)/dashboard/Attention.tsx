'use client';

import Link from 'next/link';
import { useState } from 'react';

interface Row { id: string; name: string; description: string; amount: string; note: React.ReactNode }

export function Attention({ overdue, applications }: { overdue: Row[]; applications: Row[] }) {
  const [tab, setTab] = useState<'overdue' | 'new'>(overdue.length || !applications.length ? 'overdue' : 'new');
  const rows = tab === 'overdue' ? overdue : applications;
  return (
    <div className="card" style={{ marginTop: 24 }}>
      <div className="hd">
        <h3>Needs attention</h3><span className="sp" />
        <div className="seg" role="tablist">
          <button type="button" role="tab" aria-selected={tab === 'overdue'} className={tab === 'overdue' ? 'on' : ''} onClick={() => setTab('overdue')}>Overdue · {overdue.length}</button>
          <button type="button" role="tab" aria-selected={tab === 'new'} className={tab === 'new' ? 'on' : ''} onClick={() => setTab('new')}>New applications · {applications.length}</button>
        </div>
      </div>
      <div className="cb" style={{ paddingTop: 6 }}>
        {rows.length === 0 && <div className="empty">{tab === 'overdue' ? 'Nothing is overdue.' : 'No new applications.'}</div>}
        {rows.slice(0, 6).map((r) => (
          <Link key={r.id} href={`/financings/${r.id}`} className="li">
            <div className="ini">{r.name.split(' ').map((w) => w[0]).join('').slice(0, 2)}</div>
            <div className="t"><b>{r.name}</b><small>{r.description}</small></div>
            <div className="a"><b className="num">{r.amount}</b>{r.note}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
