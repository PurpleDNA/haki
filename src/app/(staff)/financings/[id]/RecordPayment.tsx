'use client';

import { submitKeeping } from '@/components/submitKeeping';
import { useActionState, useEffect, useState } from 'react';
import { Icons } from '@/components/icons';
import type { AllocatedInstalment } from '@/domain/allocation';
import { formatDate } from '@/domain/dates';
import { naira, parseNaira } from '@/domain/money';
import { METHOD_LABEL } from '@/domain/status';
import { recordPaymentAction } from '../../actions';

/** Describes in words where a payment will go, oldest first. */
function appliesTo(amount: number, instalments: AllocatedInstalment[]) {
  let left = amount;
  const parts: string[] = [];
  for (const i of instalments) {
    if (left <= 0) break;
    if (i.remainingKobo === 0) continue;
    const name = i.number === 0 ? 'the down payment' : `the ${formatDate(i.dueOn, 'short')} instalment`;
    parts.push(left >= i.remainingKobo ? `clears ${name}` : `pays ${naira(left)} towards ${name}`);
    left -= i.remainingKobo;
  }
  return parts.join(', then ');
}

export function RecordPayment({ id, today, instalments, balanceKobo }: { id: string; today: string; instalments: AllocatedInstalment[]; balanceKobo: number }) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [state, action, pending] = useActionState(recordPaymentAction.bind(null, id), null);
  useEffect(() => {
    if (state?.ok) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOpen(false);
      setAmount('');
    }
  }, [state]);
  const kobo = parseNaira(amount) ?? 0;
  const over = kobo > balanceKobo;

  return (
    <>
      <button type="button" className="btn pri" onClick={() => setOpen(true)}>+ Record payment</button>
      {open && (
        <div className="scrim">
          <form className="modal" onSubmit={submitKeeping(action)}>
            <div className="mh"><h3>Record a payment</h3><button type="button" className="btn sm" aria-label="Close" onClick={() => setOpen(false)} style={{ width: 40, padding: 0 }}>{Icons.x}</button></div>
            {state?.error && <p className="error" role="alert">{state.error}</p>}
            <div className="f">
              <label htmlFor="amount">Amount received</label>
              <input id="amount" name="amount" className="field amt" inputMode="decimal" placeholder="₦" autoFocus value={amount} onChange={(e) => setAmount(e.target.value)} required />
              <div className="hint">Balance {naira(balanceKobo)}</div>
            </div>
            {kobo > 0 && <div className="applies" style={over ? { background: '#fde7e2', color: '#a83420' } : undefined}>{over ? 'That’s more than the remaining balance.' : `This ${appliesTo(kobo, instalments)}.`}</div>}
            <div className="two">
              <div className="f"><label htmlFor="paidOn">Date</label><input id="paidOn" name="paidOn" type="date" className="field" defaultValue={today} max={today} required /></div>
              <div className="f"><label htmlFor="method">Method</label><select id="method" name="method" className="field">{Object.entries(METHOD_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
            </div>
            <div className="f"><label htmlFor="reference">Reference (optional)</label><input id="reference" name="reference" className="field" /></div>
            <div className="f"><label htmlFor="receipt">Receipt (optional)</label><input id="receipt" name="receipt" type="file" className="field" accept=".pdf,.jpg,.jpeg,.png" /></div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" className="btn" style={{ flex: 1 }} onClick={() => setOpen(false)}>Cancel</button>
              <button className="btn pri" style={{ flex: 2 }} disabled={pending || over || kobo <= 0}>{pending ? 'Saving…' : 'Save payment'}</button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
