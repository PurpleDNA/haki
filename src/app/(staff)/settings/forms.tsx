'use client';

import { submitKeeping } from '@/components/submitKeeping';
import { useActionState, useEffect, useRef, useState, useTransition } from 'react';
import type { Settings } from '@/server/settings';
import { addStaffAction, resetPasswordAction, saveSettingsAction, setStaffActiveAction } from '../actions';

export function SettingsForm({ settings: s, defaultAgreement }: { settings: Settings; defaultAgreement: string }) {
  const [state, action, pending] = useActionState(saveSettingsAction, null);
  const input = (name: keyof Settings, label: string, hint?: string) => (
    <div>
      <label htmlFor={name}>{label}</label>
      <input id={name} name={name} className="field" defaultValue={(s[name] as string | null) ?? ''} />
      {hint && <div className="hint">{hint}</div>}
    </div>
  );
  return (
    <form onSubmit={submitKeeping(action)}>
      <div className="card panel-card">
        <h3>Financing rules</h3>
        <div className="stack">
          <div className="grid2">
            <div><label htmlFor="default_profit_percent">Default profit (% of cost)</label><input id="default_profit_percent" name="default_profit_percent" className="field" inputMode="decimal" defaultValue={Number(s.default_profit_percent)} /></div>
            <div><label htmlFor="min_down_percent">Minimum down payment (% of cost)</label><input id="min_down_percent" name="min_down_percent" className="field" inputMode="decimal" defaultValue={Number(s.min_down_percent)} /></div>
          </div>
          <label className="check"><input type="checkbox" name="profit_rate_confirmed" defaultChecked={s.profit_rate_confirmed} /><span>This profit rate is confirmed, not a placeholder</span></label>
          <div><label htmlFor="tenors">Tenors offered (months)</label><input id="tenors" name="tenors" className="field" defaultValue={s.tenors.join(', ')} /><div className="hint">Separate several with commas, like 3, 6, 12</div></div>
        </div>
      </div>
      <div className="card panel-card">
        <h3>Company details</h3>
        <div className="stack">
          {input('company_name', 'Registered company name', 'Shown as the seller on agreements')}
          {input('rc_number', 'RC number')}
          {input('address', 'Office address')}
          <div className="grid2">{input('phone', 'Support phone')}{input('email', 'Support email')}</div>
          {input('alert_email', 'Send new application alerts to')}
        </div>
      </div>
      <div className="card panel-card">
        <h3>Bank account for borrower payments</h3>
        <div className="stack">
          {input('bank_name', 'Bank')}
          <div className="grid2">{input('bank_account_name', 'Account name')}{input('bank_account_number', 'Account number')}</div>
        </div>
      </div>
      <div className="card panel-card">
        <h3>Agreement wording</h3>
        <p className="ink2" style={{ marginTop: 0 }}>Leave this empty to use the draft placeholder. Paste the approved text here when it’s ready. You can use {'{{company}}'}, {'{{borrower}}'} and {'{{bank}}'}. Agreements already sent keep the wording they went out with.</p>
        <textarea name="agreement_text" className="field" rows={14} aria-label="Agreement wording" defaultValue={s.agreement_text ?? ''} placeholder={defaultAgreement} />
      </div>
      {state?.error && <p className="error" role="alert">{state.error}</p>}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <button className="btn pri" disabled={pending}>{pending ? 'Saving…' : 'Save settings'}</button>
        {state?.ok && <span className="ok-msg">Saved</span>}
      </div>
    </form>
  );
}

export function StaffRow({ person: p, isMe }: { person: { id: string; name: string; email: string; role: string; active: boolean }; isMe: boolean }) {
  const [pending, start] = useTransition();
  const [resetting, setResetting] = useState(false);
  const [state, action] = useActionState(resetPasswordAction.bind(null, p.id), null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (state?.ok) setResetting(false);
  }, [state]);
  return (
    <div className="li" style={{ display: 'block' }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'baseline' }}>
        <b style={{ opacity: p.active ? 1 : 0.5 }}>{p.name}</b><span className="muted" style={{ fontSize: 12 }}>{p.role === 'admin' ? 'Admin' : 'Staff'}{p.active ? '' : ', deactivated'}</span>
      </div>
      <div className="muted" style={{ fontSize: 12.5, overflowWrap: 'anywhere' }}>{p.email}</div>
      <div style={{ display: 'flex', gap: 14, marginTop: 6, fontSize: 12.5 }}>
        <button type="button" className="link" onClick={() => setResetting((x) => !x)}>Reset password</button>
        {!isMe && <button type="button" className="link" disabled={pending} onClick={() => start(async () => { await setStaffActiveAction(p.id, !p.active); })}>{p.active ? 'Deactivate' : 'Reactivate'}</button>}
      </div>
      {resetting && (
        <form onSubmit={submitKeeping(action)} style={{ marginTop: 10, display: 'flex', gap: 8 }}>
          <input name="password" type="password" className="field" aria-label="New password" placeholder="New password" autoComplete="new-password" required />
          <button className="btn">Save</button>
        </form>
      )}
      {state?.error && <div className="err">{state.error}</div>}
    </div>
  );
}

export function AddStaff() {
  const [state, action, pending] = useActionState(addStaffAction, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state?.ok) ref.current?.reset(); }, [state]);
  return (
    <form ref={ref} className="card panel-card" onSubmit={submitKeeping(action)}>
      <h3>Add staff</h3>
      {state?.error && <p className="error" role="alert">{state.error}</p>}
      <div className="stack" style={{ gap: 12 }}>
        <div><label htmlFor="sname">Name</label><input id="sname" name="name" className="field" required /></div>
        <div><label htmlFor="semail">Email</label><input id="semail" name="email" type="email" className="field" autoComplete="off" required /></div>
        <div><label htmlFor="srole">Role</label><select id="srole" name="role" className="field"><option value="staff">Staff</option><option value="admin">Admin</option></select></div>
        <div><label htmlFor="spass">Temporary password</label><input id="spass" name="password" type="password" className="field" autoComplete="new-password" minLength={10} required /></div>
        <button className="btn pri" disabled={pending}>Add staff</button>
      </div>
    </form>
  );
}
