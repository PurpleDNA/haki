'use client';

import { useState } from 'react';
import { Icons } from './icons';

/** Copies a link. A path is resolved against the current address. */
export function CopyButton({ value, label }: { value: string; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <button type="button" className="btn" onClick={async () => {
      await navigator.clipboard.writeText(new URL(value, window.location.origin).toString());
      setDone(true);
      setTimeout(() => setDone(false), 1800);
    }}>
      {done ? Icons.check : Icons.link}{done ? 'Copied' : label}
    </button>
  );
}
