'use client';

import { useRouter } from 'next/navigation';

export function RowLink({ href, children }: { href: string; children: React.ReactNode }) {
  const router = useRouter();
  return <tr className="row" onClick={() => router.push(href)}>{children}</tr>;
}
