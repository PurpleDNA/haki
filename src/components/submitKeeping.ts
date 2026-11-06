import { startTransition, type FormEvent } from 'react';

/**
 * React clears a form after an `action={...}` submit, even when the server refuses it, which would
 * wipe the email on a wrong password or a chosen file on a failed upload. Submitting this way keeps them.
 */
export const submitKeeping = (action: (form: FormData) => void) => (e: FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  const form = new FormData(e.currentTarget);
  startTransition(() => action(form));
};
