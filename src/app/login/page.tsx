import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { currentStaff } from '@/server/auth';
import { LoginForm } from './LoginForm';

export const metadata: Metadata = { title: 'Sign in' };

export default async function LoginPage() {
  if (await currentStaff()) redirect('/dashboard');
  return (
    <div className="center">
      <div className="cardbox">
        <img src="/haki-logo.svg" alt="Haki" />
        <h1>Staff sign in</h1>
        <LoginForm />
      </div>
    </div>
  );
}
