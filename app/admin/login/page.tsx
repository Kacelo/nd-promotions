'use client';

import { useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import '../admin.css';

export default function Login() {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const fd = new FormData(e.currentTarget);
    const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    const { error } = await supabase.auth.signInWithPassword({
      email: String(fd.get('email')),
      password: String(fd.get('password')),
    });
    if (error) {
      setError('Incorrect email or password.');
      setBusy(false);
      return;
    }
    window.location.href = '/admin';
  }

  return (
    <main className="admin-login">
      <form className="a-card" onSubmit={onSubmit}>
        <h1>Admin sign in</h1>
        {error && <div className="a-error">{error}</div>}
        <label className="a-label">Email<input className="a-input" name="email" type="email" autoComplete="username" required /></label>
        <label className="a-label">Password<input className="a-input" name="password" type="password" autoComplete="current-password" required /></label>
        <button className="a-btn primary" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
    </main>
  );
}
