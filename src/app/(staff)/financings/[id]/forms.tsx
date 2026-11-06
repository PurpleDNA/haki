'use client';

import { submitKeeping } from '@/components/submitKeeping';
import { useActionState, useEffect, useRef, useState, useTransition } from 'react';
import { naira, parseNaira } from '@/domain/money';
import { instalmentAmounts, minDownKobo, profitFromPercent, salePrice, validateTerms } from '@/domain/pricing';
import {
  addNoteAction, declineAction, markPurchasedAction, sendAgreementAction, startReviewAction, voidPaymentAction, writeOffAction,
} from '../../actions';

const plain = (kobo: number) => (kobo / 100).toLocaleString('en-NG', { maximumFractionDigits: 2 });

export function StartReview({ id }: { id: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();
  return (
    <>
      {error && <p className="error">{error}</p>}
      <button className="btn pri" disabled={pending} onClick={() => start(async () => { setError((await startReviewAction(id))?.error); })}>Start review</button>
    </>
  );
}

export function PricingForm({ id, quotedKobo, requestedDownKobo, profitPercent, minDownPercent, tenors, expired }: {
  id: string; quotedKobo: number; requestedDownKobo: number; profitPercent: number; minDownPercent: number; tenors: number[]; expired: boolean;
}) {
  const [cost, setCost] = useState(plain(quotedKobo));
  const [mode, setMode] = useState<'percent' | 'flat'>('percent');
  const [profit, setProfit] = useState(String(profitPercent));
  const [down, setDown] = useState(plain(requestedDownKobo));
  const [tenor, setTenor] = useState(tenors[0]);
  const [state, action, pending] = useActionState(sendAgreementAction.bind(null, id), null);

  const costK = parseNaira(cost) ?? 0;
  const profitK = mode === 'percent' ? profitFromPercent(costK, Number(profit) || 0) : parseNaira(profit) ?? 0;
  const terms = { costKobo: costK, profitKobo: profitK, downKobo: parseNaira(down) ?? 0, tenor };
  const problem = validateTerms(terms, minDownPercent);

  return (
    <form className="card panel-card" onSubmit={submitKeeping(action)}>
      <h3>Price this financing</h3>
      {expired && <p className="notice" style={{ marginTop: 0 }}>The last agreement link expired without being accepted. Approving again creates a new one.</p>}
      {state?.error && <p className="error" role="alert">{state.error}</p>}
      <div className="stack">
        <div><label htmlFor="cost">Actual purchase cost</label><input id="cost" name="cost" className="field" inputMode="decimal" value={cost} onChange={(e) => setCost(e.target.value)} /><div className="hint">The vendor quoted {naira(quotedKobo)}</div></div>
        <div>
          <label htmlFor="profit">Profit</label>
          <div className="grid2" style={{ gridTemplateColumns: 'auto minmax(0,1fr)', gap: 10 }}>
            <select name="profitMode" className="field" aria-label="Profit type" value={mode} style={{ width: 130 }} onChange={(e) => {
              const next = e.target.value as 'percent' | 'flat';
              setMode(next);
              setProfit(next === 'percent' ? String(profitPercent) : plain(profitFromPercent(costK, profitPercent)));
            }}>
              <option value="percent">Percent</option><option value="flat">Flat ₦</option>
            </select>
            <input id="profit" name="profit" className="field" inputMode="decimal" value={profit} onChange={(e) => setProfit(e.target.value)} />
          </div>
        </div>
        <div className="grid2">
          <div><label htmlFor="down">Down payment</label><input id="down" name="down" className="field" inputMode="decimal" value={down} onChange={(e) => setDown(e.target.value)} /><div className="hint">At least {naira(minDownKobo(costK, minDownPercent))} ({minDownPercent}% of cost)</div></div>
          <div><label htmlFor="tenor">Tenor</label><select id="tenor" name="tenor" className="field" value={tenor} onChange={(e) => setTenor(Number(e.target.value))}>{tenors.map((t) => <option key={t} value={t}>{t} months</option>)}</select></div>
        </div>
      </div>
      <div className="applies" style={{ marginTop: 18 }}>
        {problem ?? <>Sale price <b>{naira(salePrice(terms))}</b>: {naira(terms.downKobo)} down, then {tenor} payments of <b>{naira(instalmentAmounts(terms)[0])}</b></>}
      </div>
      <button className="btn pri" disabled={pending || !!problem}>{pending ? 'Working…' : 'Approve and create agreement link'}</button>
    </form>
  );
}

export function PurchaseForm({ id, today, downPaid }: { id: string; today: string; downPaid: boolean }) {
  const [state, action, pending] = useActionState(markPurchasedAction.bind(null, id), null);
  return (
    <form className="card panel-card" onSubmit={submitKeeping(action)}>
      <h3>Buy the item</h3>
      <p className="ink2" style={{ marginTop: 0 }}>The borrower has accepted. Record the purchase once you’ve paid the vendor. This starts the active financing.</p>
      {!downPaid && <p className="notice">The down payment hasn’t been fully received yet. It’s safest to collect it before paying the vendor.</p>}
      {state?.error && <p className="error" role="alert">{state.error}</p>}
      <div className="grid2">
        <div><label htmlFor="purchasedOn">Purchase date</label><input id="purchasedOn" name="purchasedOn" type="date" className="field" defaultValue={today} max={today} required /></div>
        <div><label htmlFor="receipt">Vendor receipt (optional)</label><input id="receipt" name="receipt" type="file" className="field" accept=".pdf,.jpg,.jpeg,.png" /></div>
      </div>
      <button className="btn pri" style={{ marginTop: 18 }} disabled={pending}>Mark as purchased</button>
    </form>
  );
}

function ReasonForm({ title, button, placeholder, action }: { title: string; button: string; placeholder: string; action: (s: { ok?: boolean; error?: string } | null, f: FormData) => Promise<{ ok?: boolean; error?: string } | null> }) {
  const [state, run, pending] = useActionState(action, null);
  const [open, setOpen] = useState(false);
  if (!open) return <div style={{ marginBottom: 20 }}><button type="button" className="btn danger" onClick={() => setOpen(true)}>{button}</button></div>;
  return (
    <form className="card panel-card" onSubmit={submitKeeping(run)}>
      <h3>{title}</h3>
      {state?.error && <p className="error" role="alert">{state.error}</p>}
      <textarea name="reason" className="field" rows={3} placeholder={placeholder} aria-label="Reason" required />
      <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
        <button className="btn danger" disabled={pending}>{button}</button>
        <button type="button" className="btn" onClick={() => setOpen(false)}>Cancel</button>
      </div>
    </form>
  );
}

export const DeclineForm = ({ id }: { id: string }) => <ReasonForm title="Decline this application" button="Decline" placeholder="Why is it being declined?" action={declineAction.bind(null, id)} />;
export const WriteOffForm = ({ id }: { id: string }) => <ReasonForm title="Write off this financing" button="Write off" placeholder="Why is it being written off?" action={writeOffAction.bind(null, id)} />;

export function VoidButton({ id, paymentId }: { id: string; paymentId: string }) {
  const [pending, start] = useTransition();
  return (
    <button className="link" disabled={pending} onClick={() => {
      if (window.confirm('Reverse this payment? It goes back on the balance, and the record stays in the history.')) start(async () => { await voidPaymentAction(id, paymentId); });
    }}>Reverse</button>
  );
}

export function NoteForm({ id }: { id: string }) {
  const [state, action, pending] = useActionState(addNoteAction.bind(null, id), null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state?.ok) ref.current?.reset(); }, [state]);
  return (
    <form ref={ref} className="card panel-card" onSubmit={submitKeeping(action)}>
      <h3>Add a note</h3>
      {state?.error && <p className="error" role="alert">{state.error}</p>}
      <textarea name="note" className="field" rows={4} aria-label="Note" required />
      <button className="btn pri" style={{ marginTop: 12 }} disabled={pending}>Save note</button>
    </form>
  );
}
