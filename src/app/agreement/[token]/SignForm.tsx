'use client';

import { submitKeeping } from '@/components/submitKeeping';
import { useActionState, useState } from 'react';
import { acceptAction } from './actions';

export function SignForm({ token, sale, support }: { token: string; sale: string; support: string | null }) {
  const [state, action, pending] = useActionState(acceptAction, null);
  const [checks, setChecks] = useState([false, false, false]);
  const all = checks.every(Boolean);
  const items = [
    'I have read the agreement and I understand the price and payment dates.',
    `I agree to buy from Haki at the fixed price of ${sale}.`,
    'I understand this can’t be cancelled once accepted, and that I must pay in full even if I no longer need what I bought.',
  ];
  return (
    <form onSubmit={submitKeeping(action)}>
      <input type="hidden" name="token" value={token} />
      <div className="stack" style={{ gap: 12 }}>
        {items.map((text, i) => (
          <label className="check" key={text}>
            <input type="checkbox" checked={checks[i]} onChange={(e) => setChecks((c) => c.map((v, j) => (j === i ? e.target.checked : v)))} />
            <span>{text}</span>
          </label>
        ))}
      </div>
      {state?.error && <p className="error" role="alert" style={{ marginTop: 16, marginBottom: 0 }}>{state.error}</p>}
      <div className="sign">
        <div><label htmlFor="name">Type your full name to sign</label><input id="name" name="name" className="field" required autoComplete="name" /></div>
        <button className="btn pri" disabled={!all || pending}>{pending ? 'Accepting…' : 'Accept agreement'}</button>
      </div>
      <p className="fine">We’ll record the date, time and your IP address when you accept.{support ? ` Questions? Contact us on ${support}.` : ''}</p>
    </form>
  );
}
