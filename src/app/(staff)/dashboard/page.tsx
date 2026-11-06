import type { Metadata } from 'next';
import Link from 'next/link';
import { CopyButton } from '@/components/CopyButton';
import { Icons } from '@/components/icons';
import { formatDate, todayInLagos } from '@/domain/dates';
import { naira, nairaShort } from '@/domain/money';
import { dashboard, monthlySeries } from '@/domain/portfolio';
import { requireStaff } from '@/server/auth';
import { db } from '@/server/db';
import { loadViews } from '@/server/financings';
import { Attention } from './Attention';
import { ChartCard } from './ChartCard';

export const metadata: Metadata = { title: 'Dashboard' };

export default async function DashboardPage() {
  const staff = await requireStaff();
  const today = todayInLagos();
  const views = await loadViews(db(), today);
  const d = dashboard(views, today);
  const hour = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Lagos', hour: 'numeric', hour12: false }).format(new Date()));
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const longDay = new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Lagos', weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());
  const row = (f: (typeof views)[number], amount: number, note: React.ReactNode) => (
    { id: f.id, name: f.name, description: f.description, amount: naira(amount), note }
  );

  return (
    <>
      <div className="top">
        <div><h1>{greeting}, {staff.name.split(' ')[0]}</h1><div className="sub">Here’s how the book looks today, {longDay}.</div></div>
        <span className="sp" />
        <form action="/financings" className="search">{Icons.search}<input name="q" placeholder="Search financings" aria-label="Search financings" /></form>
        <CopyButton value="/apply" label="Copy apply link" />
      </div>
      <div className="dgrid">
        <div>
          <div className="kpis">
            <div className="card kpi"><div className="ico">{Icons.wallet}</div><div className="v num">{nairaShort(d.outstandingKobo)}</div><div className="l">Outstanding across {d.liveCount} financing{d.liveCount === 1 ? '' : 's'}</div></div>
            <div className="card kpi">
              <div className="ico" style={{ background: '#e3f3ec', color: '#0b6b4f' }}>{Icons.inflow}</div>
              <div className="v num">{nairaShort(d.collectedThisMonthKobo)}</div>
              <div className="l">Collected this month
                {d.collectedChangePercent !== null && <span className="tag" style={{ color: d.collectedChangePercent >= 0 ? '#0b6b4f' : '#a83420' }}>{d.collectedChangePercent >= 0 ? '+' : ''}{d.collectedChangePercent}%</span>}
              </div>
            </div>
            <div className="card kpi"><div className="ico" style={{ background: '#fde7e2', color: '#a83420' }}>{Icons.alert}</div><div className="v num">{nairaShort(d.overdueKobo)}</div><div className="l">Overdue on {d.overdueCount} financing{d.overdueCount === 1 ? '' : 's'}</div></div>
          </div>
          <ChartCard series={{ 6: monthlySeries(views, today, 6), 12: d.series }} />
          <Attention
            overdue={d.overdue.map((f) => row(f, f.overdueKobo, <small className="late">{f.daysOverdue} day{f.daysOverdue === 1 ? '' : 's'} late</small>))}
            applications={d.newApplications.map((f) => row(f, f.quotedKobo, <small className="muted">{f.reference}</small>))}
          />
        </div>
        <aside>
          <div className="dark">
            <div className="k">Active financings</div>
            <div className="n num">{d.activeCount}</div>
            <div style={{ fontSize: 13, color: '#a9c4bb' }}>{nairaShort(d.financedKobo)} financed to date</div>
            <div className="track"><i style={{ width: `${d.onTimePercent ?? 0}%` }} /></div>
            <div className="row2"><span>On-time collection</span><b style={{ color: 'var(--lime)' }}>{d.onTimePercent === null ? 'No data yet' : `${d.onTimePercent}%`}</b></div>
            <Link className="btn" href="/financings">View all financings</Link>
          </div>
          <div className="card rcard">
            <h3>Due this week <span className="num">{naira(d.dueThisWeekKobo)}</span></h3>
            {d.dueThisWeek.length === 0 && <div className="empty">Nothing due in the next 7 days.</div>}
            {d.dueThisWeek.slice(0, 6).map(({ financing: f, instalment: i }) => (
              <Link key={`${f.id}-${i.number}`} href={`/financings/${f.id}`} className="li">
                <div className="ini">{f.name.split(' ').map((w) => w[0]).join('').slice(0, 2)}</div>
                <div className="t"><b>{f.name}</b><small>{formatDate(i.dueOn, 'short')}</small></div>
                <div className="a"><b className="num">{naira(i.remainingKobo)}</b></div>
              </Link>
            ))}
          </div>
        </aside>
      </div>
    </>
  );
}
