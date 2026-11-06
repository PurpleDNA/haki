'use client';

import { submitKeeping } from '@/components/submitKeeping';
import { useActionState, useEffect, useRef, useState } from 'react';
import { ordinal } from '@/domain/dates';
import { itemSchema, personalSchema, workSchema } from '@/domain/application';
import { naira, parseNaira } from '@/domain/money';
import { instalmentAmounts, minDownKobo, profitFromPercent, salePrice } from '@/domain/pricing';
import { CATEGORY_LABEL } from '@/domain/status';
import { applyAction } from './actions';

const STORE = 'haki-application';
const STEPS = ['Personal details', 'Work and income', 'What to finance', 'Plan and review'];

const EMPTY = {
  fullName: '', phone: '', email: '', address: '', dateOfBirth: '', nin: '',
  employmentType: '', employer: '', monthlyIncome: '', otherObligations: '0',
  category: '', description: '', vendorName: '', vendorContact: '', quoted: '',
  downPayment: '', paymentDay: '28',
};
type Answers = typeof EMPTY;
type Errors = Partial<Record<keyof Answers | 'statement' | 'consent', string>>;

const withCommas = (v: string) => {
  const [w, f] = v.replace(/[^\d.]/g, '').split('.');
  const whole = w ? Number(w).toLocaleString('en-NG') : '';
  return f !== undefined ? `${whole}.${f.slice(0, 2)}` : whole;
};

interface Props { minDownPercent: number; profitPercent: number; tenors: number[]; phone: string | null }

export function ApplyForm({ minDownPercent, profitPercent, tenors, phone }: Props) {
  const [step, setStep] = useState(0);
  const [a, setA] = useState<Answers>(EMPTY);
  const [tenor, setTenor] = useState(tenors[0]);
  const [errors, setErrors] = useState<Errors>({});
  const [consent, setConsent] = useState(false);
  const [statementName, setStatementName] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const [state, action, pending] = useActionState(applyAction, null);
  const loaded = useRef(false);

  // Saved in the browser, so a refresh doesn't lose answers. The NIN is left out because the device may be
  // shared, and uploaded files can't be kept this way, so a refresh goes back to the first step to re-enter them.
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORE) ?? 'null');
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (saved) setA({ ...EMPTY, ...saved.answers });
    } catch { /* A corrupt save just means starting afresh. */ }
    loaded.current = true;
  }, []);
  useEffect(() => {
    if (!loaded.current) return;
    if (state?.reference) localStorage.removeItem(STORE);
    else localStorage.setItem(STORE, JSON.stringify({ answers: { ...a, nin: '' }, step: a.nin ? step : 0 }));
  }, [a, step, state]);

  const set = (k: keyof Answers) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setA((x) => ({ ...x, [k]: e.target.value }));
    setErrors((x) => ({ ...x, [k]: undefined }));
  };
  const setMoney = (k: keyof Answers) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setA((x) => ({ ...x, [k]: withCommas(e.target.value) }));
    setErrors((x) => ({ ...x, [k]: undefined }));
  };

  const quoted = parseNaira(a.quoted) ?? 0;
  const minDown = minDownKobo(quoted, minDownPercent);
  const down = parseNaira(a.downPayment) ?? 0;
  const profit = profitFromPercent(quoted, profitPercent);
  const terms = { costKobo: quoted, profitKobo: profit, downKobo: down, tenor };
  const estimateOk = quoted > 0 && down >= minDown && down < quoted;
  const monthly = estimateOk ? instalmentAmounts(terms)[0] : 0;

  function check(): boolean {
    const schema = [personalSchema, workSchema, itemSchema][step];
    const next: Errors = {};
    if (schema) {
      const r = schema.safeParse(a);
      if (!r.success) for (const i of r.error.issues) { const k = i.path[0] as keyof Answers; next[k] ??= i.message; }
    }
    if (step === 1 && !fileRef.current?.files?.length) next.statement = 'Please upload your bank statement.';
    if (step === 3) {
      if (!a.downPayment || down < minDown) next.downPayment = `At least ${naira(minDown)} (${minDownPercent}% of the vendor’s price).`;
      else if (down >= quoted) next.downPayment = 'This must be less than the vendor’s price.';
      if (!consent) next.consent = 'Please agree before submitting.';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  if (state?.reference) {
    return (
      <div className="center">
        <div className="cardbox mid">
          <img src="/haki-logo.svg" alt="Haki" />
          <h1>Application received</h1>
          <p>Thank you{state.name ? `, ${state.name}` : ''}. We’ll check your details and contact you within 2 working days. Keep this reference number.</p>
          <div className="bigref">{state.reference}</div>
        </div>
      </div>
    );
  }

  const field = (k: keyof Answers, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}, hint?: string) => (
    <div>
      <label htmlFor={k}>{label}</label>
      <input id={k} className="field" value={a[k]} onChange={set(k)} aria-invalid={!!errors[k]} {...props} />
      {errors[k] ? <div className="err">{errors[k]}</div> : hint ? <div className="hint">{hint}</div> : null}
    </div>
  );
  const money = (k: keyof Answers, label: string, hint?: string) => (
    <div>
      <label htmlFor={k}>{label}</label>
      <input id={k} className="field" inputMode="decimal" placeholder="₦" value={a[k]} onChange={setMoney(k)} aria-invalid={!!errors[k]} />
      {errors[k] ? <div className="err">{errors[k]}</div> : hint ? <div className="hint">{hint}</div> : null}
    </div>
  );

  return (
    <>
      <div className="mtop"><img src="/haki-logo.svg" alt="Haki" /><span>{phone ? `Need help? ${phone}` : ''}</span></div>
      <div className="apply">
        <section className="apanel">
          <div><span className="logo-tile"><img src="/haki-logo.svg" alt="Haki" /></span></div>
          <h1>Finance what you need, at a price that never grows.</h1>
          <p className="lead">Travel, services or goods. We buy it for you, then sell it to you at one fixed price you agree to upfront. No interest, ever.</p>
          <ol className="steps">
            {STEPS.map((s, i) => (
              <li key={s} className={i < step ? 'done' : i === step ? 'on' : ''}><span className="n">{i < step ? '✓' : i + 1}</span>{s}</li>
            ))}
          </ol>
          <div className="how" style={{ marginTop: 32 }}>
            <h3>How it works</h3>
            <ol><li>Tell us what you need and who sells it</li><li>We check it and buy it from the vendor</li><li>You pay us in fixed monthly instalments</li></ol>
          </div>
        </section>

        <form className="formside" onSubmit={(e) => { if (check()) submitKeeping(action)(e); else e.preventDefault(); }}>
          <div className="prog">Step {step + 1} of {STEPS.length}<div className="bar"><i style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} /></div></div>
          <input type="hidden" name="answers" value={JSON.stringify({ ...a, tenor, consent })} />
          <input className="hp" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" />

          <div hidden={step !== 0}>
            <h2>About you</h2>
            <p className="intro">We use this to confirm who you are.</p>
            <div className="stack">
              {field('fullName', 'Full name', { autoComplete: 'name' })}
              <div className="grid2">
                {field('phone', 'Phone number', { inputMode: 'tel', autoComplete: 'tel' })}
                {field('email', 'Email', { type: 'email', autoComplete: 'email' })}
              </div>
              {field('address', 'Home address', { autoComplete: 'street-address' })}
              <div className="grid2">
                {field('dateOfBirth', 'Date of birth', { type: 'date', autoComplete: 'bday' })}
                {field('nin', 'NIN', { inputMode: 'numeric', maxLength: 11 }, 'Your 11-digit National Identification Number')}
              </div>
            </div>
          </div>

          <div hidden={step !== 1}>
            <h2>Work and income</h2>
            <p className="intro">This helps us offer a plan you can comfortably pay.</p>
            <div className="stack">
              <div>
                <label htmlFor="employmentType">Employment type</label>
                <select id="employmentType" className="field" value={a.employmentType} onChange={set('employmentType')} aria-invalid={!!errors.employmentType}>
                  <option value="">Choose one</option>
                  <option value="employed">Employed</option>
                  <option value="self_employed">Self-employed</option>
                  <option value="business_owner">Business owner</option>
                  <option value="other">Other</option>
                </select>
                {errors.employmentType && <div className="err">{errors.employmentType}</div>}
              </div>
              {field('employer', 'Employer or business name')}
              <div className="grid2">
                {money('monthlyIncome', 'Monthly income')}
                {money('otherObligations', 'Other monthly commitments', 'Enter 0 if you have none')}
              </div>
              <div>
                <label htmlFor="statement">Bank statement</label>
                <input ref={fileRef} id="statement" name="statement" type="file" className="field" accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => { setStatementName(e.target.files?.[0]?.name ?? ''); setErrors((x) => ({ ...x, statement: undefined })); }} />
                {errors.statement ? <div className="err">{errors.statement}</div> : <div className="hint">PDF, JPG or PNG, up to 4 MB</div>}
              </div>
            </div>
          </div>

          <div hidden={step !== 2}>
            <h2>What to finance</h2>
            <p className="intro">Tell us what you need and who sells it.</p>
            <div className="stack">
              <div>
                <label>What kind of purchase is it?</label>
                <div className="choice">
                  {Object.entries(CATEGORY_LABEL).map(([k, label]) => (
                    <label key={k}><input type="radio" name="category_choice" value={k} checked={a.category === k} onChange={set('category')} />{label}</label>
                  ))}
                </div>
                {errors.category && <div className="err">{errors.category}</div>}
              </div>
              {field('description', 'Describe it', {}, 'For example: return flight to Dubai on 12 March for two people')}
              <div className="grid2">
                {field('vendorName', 'Vendor’s name')}
                {field('vendorContact', 'Vendor’s phone or email (optional)')}
              </div>
              {money('quoted', 'Vendor’s price', 'The amount the vendor quoted you')}
            </div>
          </div>

          <div hidden={step !== 3}>
            <h2>Your plan</h2>
            <p className="intro">Check your plan and submit your application.</p>
            <div className="stack">
              <div className="grid2">
                {money('downPayment', 'Down payment', quoted ? `At least ${naira(minDown)} (${minDownPercent}%)` : `At least ${minDownPercent}% of the vendor’s price`)}
                <div>
                  <label htmlFor="paymentDay">Monthly payment day</label>
                  <select id="paymentDay" className="field" value={a.paymentDay} onChange={set('paymentDay')}>
                    {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => <option key={d} value={d}>{ordinal(d)} of each month</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label htmlFor="tenor">Payment period</label>
                {tenors.length === 1
                  ? <div className="field" id="tenor" style={{ display: 'flex', alignItems: 'center', background: '#f6f8f3' }}>{tenor} months</div>
                  : <select id="tenor" className="field" value={tenor} onChange={(e) => setTenor(Number(e.target.value))}>{tenors.map((t) => <option key={t} value={t}>{t} months</option>)}</select>}
              </div>
            </div>
            {estimateOk && (
              <div className="est">
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#2d4f45', marginBottom: 8 }}>Estimated monthly payment</div>
                  <div className="big">{naira(monthly)}<small> / month</small></div>
                </div>
                <dl>
                  <dt>Vendor’s price</dt><dd>{naira(quoted)}</dd>
                  <dt>Our profit (fixed)</dt><dd>{naira(profit)}</dd>
                  <dt>Total you pay</dt><dd>{naira(salePrice(terms))}</dd>
                </dl>
                <p>This is an estimate. We’ll confirm the exact price, and it won’t change after you accept.</p>
              </div>
            )}
            <div className="review kv">
              <div className="r"><span>Name</span><b>{a.fullName}</b></div>
              <div className="r"><span>Phone</span><b>{a.phone}</b></div>
              <div className="r"><span>Purchase</span><b>{a.description}</b></div>
              <div className="r"><span>Vendor</span><b>{a.vendorName}</b></div>
              <div className="r"><span>Bank statement</span><b>{statementName || 'Not attached'}</b></div>
            </div>
            <div style={{ marginTop: 20 }}>
              <label className="check">
                <input type="checkbox" checked={consent} onChange={(e) => { setConsent(e.target.checked); setErrors((x) => ({ ...x, consent: undefined })); }} />
                <span>My details are true. I agree that Haki may use them, including my NIN and bank statement, to assess and manage this financing.</span>
              </label>
              {errors.consent && <div className="err">{errors.consent}</div>}
            </div>
          </div>

          {state?.error && <p className="error" role="alert" style={{ marginTop: 20, marginBottom: 0 }}>{state.error}</p>}
          <div className="actions">
            <span className="saved">✓ Progress saved on this device</span>
            {step > 0 && <button type="button" className="btn" onClick={() => setStep(step - 1)}>Back</button>}
            {step < STEPS.length - 1
              ? <button type="button" className="btn pri" onClick={() => { if (check()) { setStep(step + 1); window.scrollTo(0, 0); } }}>Continue →</button>
              : <button className="btn pri" disabled={pending}>{pending ? 'Submitting…' : 'Submit application'}</button>}
          </div>
        </form>
      </div>
    </>
  );
}
