import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Icons } from '@/components/icons';
import { Pill } from '@/components/Pill';
import { formatDate, formatDateTimeLagos, ordinal, todayInLagos } from '@/domain/dates';
import { naira } from '@/domain/money';
import { CATEGORY_LABEL, METHOD_LABEL, canPrice, takesPayments } from '@/domain/status';
import { requireStaff } from '@/server/auth';
import { db } from '@/server/db';
import { loadDetail } from '@/server/financings';
import { getSettings } from '@/server/settings';
import { CopyButton } from '@/components/CopyButton';
import { DeclineForm, NoteForm, PricingForm, PurchaseForm, StartReview, VoidButton, WriteOffForm } from './forms';
import { RecordPayment } from './RecordPayment';

export const metadata: Metadata = { title: 'Financing' };

const TABS = [['summary', 'Summary'], ['pricing', 'Pricing and approval'], ['plan', 'Payment plan'], ['payments', 'Payments'], ['activity', 'Activity']] as const;
const DOC_LABEL: Record<string, string> = { bank_statement: 'Bank statement', receipt: 'Payment receipt', purchase_receipt: 'Purchase receipt' };
const EMPLOYMENT: Record<string, string> = { employed: 'Employed', self_employed: 'Self-employed', business_owner: 'Business owner', other: 'Other' };

export default async function DetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  const staff = await requireStaff();
  const { id } = await params;
  const today = todayInLagos();
  const d = await loadDetail(db(), id, today);
  if (!d) notFound();
  const { record: f, view: v } = d;
  const admin = staff.role === 'admin';
  const live = v.instalments.length > 0;
  const { tab: raw } = await searchParams;
  const tab = TABS.some(([k]) => k === raw) ? raw! : live ? 'plan' : canPrice(f.status) || f.status === 'agreement_sent' ? 'pricing' : 'summary';
  const a = f.applicant;
  const initials = a.fullName.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  const pct = v.saleKobo && live ? Math.round((v.paidKobo / v.saleKobo) * 100) : 0;
  const unpaid = v.instalments.filter((i) => i.remainingKobo > 0);
  const settled = v.instalments.filter((i) => i.remainingKobo === 0);
  const settings = await getSettings(db());
  const instalmentsLeft = unpaid.filter((i) => i.number > 0).length;

  const terms = f.cost_kobo !== null && (
    <div className="terms">
      <div className="k">Sale price, fixed</div>
      <div className="n num">{naira(v.saleKobo!)}</div>
      <dl>
        <dt>Cost</dt><dd>{naira(f.cost_kobo)}</dd>
        <dt>Profit</dt><dd>{naira(f.profit_kobo!)}</dd>
        <dt>Down payment</dt><dd>{naira(f.down_kobo!)}</dd>
        <dt>Instalments</dt><dd>{f.tenor} monthly</dd>
      </dl>
      <div className="note">This price never changes. Late payments add no charges, and an accepted agreement can’t be cancelled.</div>
    </div>
  );
  const contacts = (
    <div className="card who">
      <h3>Contacts</h3>
      <div className="r"><span>Phone</span><b>{f.phone}</b></div>
      <div className="r"><span>Email</span><b>{a.email}</b></div>
      <div className="r"><span>Vendor</span><b>{f.vendor_name}</b></div>
      {f.vendor_contact && <div className="r"><span>Vendor contact</span><b>{f.vendor_contact}</b></div>}
    </div>
  );

  return (
    <>
      <Link className="crumb" href="/financings">{Icons.back}Financings</Link>
      <div className="dhead">
        <div className="bigava">{initials}</div>
        <div>
          <h1>{a.fullName}</h1>
          <div className="meta">{f.reference} · {f.description.length > 60 ? `${f.description.slice(0, 57)}…` : f.description} <Pill status={f.status} overdue={v.isOverdue} /></div>
        </div>
        <span className="sp" />
        {takesPayments(f.status) && v.balanceKobo !== null && v.balanceKobo > 0 && <RecordPayment id={f.id} today={today} instalments={v.instalments} balanceKobo={v.balanceKobo} />}
      </div>
      <nav className="tabs">{TABS.map(([k, label]) => <Link key={k} href={`/financings/${f.id}?tab=${k}`} className={tab === k ? 'on' : ''}>{label}</Link>)}</nav>

      {tab === 'summary' && (
        <div className="cols">
          <div>
            <div className="card panel-card kv">
              <h3>Personal details</h3>
              <div className="r"><span>Date of birth</span><b>{formatDate(a.dateOfBirth)}</b></div>
              <div className="r"><span>NIN</span><b>{a.nin}</b></div>
              <div className="r"><span>Home address</span><b>{a.address}</b></div>
            </div>
            <div className="card panel-card kv">
              <h3>Work and income</h3>
              <div className="r"><span>Employment</span><b>{EMPLOYMENT[a.employmentType] ?? a.employmentType}</b></div>
              <div className="r"><span>Employer or business</span><b>{a.employer}</b></div>
              <div className="r"><span>Monthly income</span><b>{naira(a.monthlyIncomeKobo)}</b></div>
              <div className="r"><span>Other commitments</span><b>{naira(a.otherObligationsKobo)}</b></div>
            </div>
            <div className="card panel-card kv">
              <h3>What they want financed</h3>
              <div className="r"><span>Type</span><b>{CATEGORY_LABEL[f.category]}</b></div>
              <div className="r"><span>Description</span><b>{f.description}</b></div>
              <div className="r"><span>Vendor’s price</span><b>{naira(f.quoted_kobo)}</b></div>
              <div className="r"><span>Down payment offered</span><b>{naira(f.requested_down_kobo)}</b></div>
              <div className="r"><span>Payment day</span><b>{ordinal(f.payment_day)} of each month</b></div>
            </div>
            <div className="card panel-card">
              <h3>Documents</h3>
              {d.documents.map((doc) => (
                <div className="li" key={doc.id}>
                  <div className="t"><b>{DOC_LABEL[doc.kind]}</b><small>{doc.filename}</small></div>
                  <a className="btn sm" href={`/documents/${doc.id}`}>{Icons.down}Download</a>
                </div>
              ))}
              {f.accepted_at && f.agreement_token && (
                <div className="li">
                  <div className="t"><b>Signed agreement</b><small>Accepted by {f.accepted_name}, {formatDateTimeLagos(f.accepted_at)}, IP {f.accepted_ip}</small></div>
                  <a className="btn sm" href={`/agreement/${f.agreement_token}/pdf`}>{Icons.down}Download</a>
                </div>
              )}
            </div>
          </div>
          <aside>
            {terms}
            {contacts}
            {d.history.length > 0 && (
              <div className="card who">
                <h3>Other financings, same phone</h3>
                {d.history.map((h) => <Link key={h.id} className="r" href={`/financings/${h.id}`}><b>{h.reference}</b><Pill status={h.status} /></Link>)}
              </div>
            )}
          </aside>
        </div>
      )}

      {tab === 'pricing' && (
        <div className="cols">
          <div>
            {f.status === 'submitted' && <div className="card panel-card"><h3>New application</h3><p className="ink2" style={{ marginTop: 0 }}>Check the details and the bank statement before pricing it.</p><StartReview id={f.id} /></div>}
            {canPrice(f.status) && (
              <PricingForm id={f.id} quotedKobo={f.quoted_kobo} requestedDownKobo={f.requested_down_kobo} profitPercent={Number(settings.default_profit_percent)}
                minDownPercent={Number(settings.min_down_percent)} tenors={settings.tenors} expired={f.status === 'expired'} />
            )}
            {f.status === 'agreement_sent' && f.agreement_token && (
              <div className="card panel-card">
                <h3>Waiting for the borrower to accept</h3>
                <p className="ink2" style={{ marginTop: 0 }}>Send this private link by email or WhatsApp. It expires on {formatDateTimeLagos(f.agreement_expires_at!)}. The price is frozen while it’s out.</p>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <CopyButton value={`/agreement/${f.agreement_token}`} label="Copy agreement link" />
                  <a className="btn" href={`/agreement/${f.agreement_token}`} target="_blank" rel="noreferrer">Preview</a>
                </div>
              </div>
            )}
            {f.status === 'accepted' && <PurchaseForm id={f.id} today={today} downPaid={v.instalments[0]?.remainingKobo === 0} />}
            {f.status === 'declined' && <div className="card panel-card"><h3>Declined</h3><p className="ink2" style={{ margin: 0 }}>{f.decline_reason}</p></div>}
            {f.purchased_on && <div className="card panel-card kv"><h3>Purchase</h3><div className="r"><span>Bought from vendor on</span><b>{formatDate(f.purchased_on)}</b></div></div>}
            {(f.status === 'submitted' || canPrice(f.status)) && <DeclineForm id={f.id} />}
            {admin && (f.status === 'accepted' || f.status === 'active') && <WriteOffForm id={f.id} />}
          </div>
          <aside>{terms}{contacts}</aside>
        </div>
      )}

      {tab === 'plan' && (
        !live ? <div className="card panel-card"><div className="empty">The payment plan is created when the borrower accepts the agreement.</div></div> : (
          <div className="cols">
            <div>
              <div className="card hero">
                <div className="k">Balance remaining</div>
                <div className="n num">{naira(v.balanceKobo ?? 0)}<small>of {naira(v.saleKobo!)}</small></div>
                <div className="pbar"><i style={{ width: `${pct}%` }} /></div>
                <div className="pl"><span>{naira(v.paidKobo)} paid, including the down payment</span><b style={{ color: 'var(--ink)' }}>{pct}%</b></div>
                <div className="facts">
                  <div><div className="k muted">Next payment</div><b className="num">{v.next ? `${naira(v.next.remainingKobo)} · ${formatDate(v.next.dueOn, 'short')}` : 'None'}</b></div>
                  <div><div className="k muted">Overdue</div><b className={`num ${v.overdueKobo ? 'late' : ''}`}>{naira(v.overdueKobo)}</b></div>
                  <div><div className="k muted">Instalments left</div><b>{instalmentsLeft} of {f.tenor}</b></div>
                </div>
              </div>
              <div className="card sched">
                <div className="hd"><h3>Instalments</h3></div>
                {settled.length > 0 && (
                  <div className="in">
                    <div className="c" style={{ background: '#e3f3ec', color: '#0b6b4f' }}>{Icons.check}</div>
                    <div className="t"><b>{settled.length} paid</b><small>{settled.map((i) => (i.number === 0 ? 'Down payment' : `#${i.number}`)).join(', ')}</small></div>
                  </div>
                )}
                {unpaid.map((i) => {
                  const over = v.isOverdue && i.status === 'overdue';
                  const soon = i.status === 'due';
                  return (
                    <div className="in" key={i.number}>
                      <div className="c" style={over ? { background: '#fde7e2', color: '#a83420' } : soon ? { background: '#fff2d6', color: '#8a5a00' } : undefined}>{i.number === 0 ? 'D' : i.number}</div>
                      <div className="t"><b>{formatDate(i.dueOn)}</b><small>{i.number === 0 ? 'Down payment' : i.paidKobo ? `${naira(i.paidKobo)} of ${naira(i.amountKobo)} paid` : over ? 'Overdue' : soon ? 'Due soon' : 'Upcoming'}</small></div>
                      <div className="a"><b className="num">{naira(i.remainingKobo)}{i.paidKobo ? ' left' : ''}</b>{over && <small className="late">{i.daysLate} day{i.daysLate === 1 ? '' : 's'} late</small>}</div>
                    </div>
                  );
                })}
                {unpaid.length === 0 && <div className="empty">Fully paid.</div>}
              </div>
            </div>
            <aside>{terms}{contacts}</aside>
          </div>
        )
      )}

      {tab === 'payments' && (
        <div className="card" style={{ overflow: 'hidden' }}>
          <div className="tablewrap">
            <table>
              <thead><tr><th>Date</th><th className="r">Amount</th><th>Method</th><th>Reference</th><th>Recorded by</th><th>Receipt</th>{admin && <th />}</tr></thead>
              <tbody>
                {d.payments.map((p) => (
                  <tr key={p.id} className={p.voided_at ? 'void' : ''}>
                    <td>{formatDate(p.paid_on)}</td>
                    <td className="r num"><b>{naira(p.amount_kobo)}</b></td>
                    <td>{METHOD_LABEL[p.method]}</td>
                    <td>{p.reference ?? '—'}</td>
                    <td>{p.recorded_by_name ?? '—'}</td>
                    <td className="keep">{p.receipt_id ? <a className="link" href={`/documents/${p.receipt_id}`}>Download</a> : '—'}</td>
                    {admin && <td className="r keep">{p.voided_at ? <span className="muted">Reversed</span> : <VoidButton id={f.id} paymentId={p.id} />}</td>}
                  </tr>
                ))}
                {d.payments.length === 0 && <tr><td colSpan={7}><div className="empty">No payments yet.</div></td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'activity' && (
        <div className="cols">
          <div className="card panel-card">
            <h3>Activity</h3>
            <ul className="activity">
              {d.activity.map((e) => (
                <li key={e.id}>
                  <b>{e.action}</b>
                  {typeof e.detail?.reason === 'string' && <div className="note-text">{e.detail.reason}</div>}
                  {typeof e.detail?.note === 'string' && <div className="note-text">{e.detail.note}</div>}
                  {typeof e.detail?.amountKobo === 'number' && <div className="note-text">{naira(e.detail.amountKobo)}</div>}
                  <small>{e.actor} · {formatDateTimeLagos(e.created_at)}</small>
                </li>
              ))}
            </ul>
          </div>
          <aside><NoteForm id={f.id} /></aside>
        </div>
      )}
    </>
  );
}
