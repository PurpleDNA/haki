'use client';

import { submitKeeping } from '@/components/submitKeeping';
import { useActionState } from 'react';
import { loginAction } from './actions';

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, null);
  return (
    <form onSubmit={submitKeeping(action)} className="stack">
      {state?.error && <p className="error" role="alert" style={{ margin: 0 }}>{state.error}</p>}
      <div><label htmlFor="email">Email</label><input id="email" name="email" type="email" className="field" autoComplete="username" required /></div>
      <div><label htmlFor="password">Password</label><input id="password" name="password" type="password" className="field" autoComplete="current-password" required /></div>
      <button className="btn pri" disabled={pending}>{pending ? 'Signing in…' : 'Sign in'}</button>
    </form>
  );
}
