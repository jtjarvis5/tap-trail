'use client';

import { useState } from 'react';
import { getSupabase } from '@/lib/supabase';

export default function AuthScreen() {
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    const supabase = getSupabase();
    if (mode === 'in') {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password });
      if (err) setError(err.message);
    } else {
      const { data, error: err } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin },
      });
      if (err) setError(err.message);
      else if (!data.session) setNotice('Check your email to confirm your account, then sign in.');
    }
    setBusy(false);
  }

  return (
    <main className="auth">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icon.svg" alt="" width={56} height={56} style={{ borderRadius: 14 }} />
      <h1>Tap Trail</h1>
      <p className="muted" style={{ marginTop: 0 }}>
        Every pint, everywhere you drink it.
      </p>
      <form onSubmit={submit} className="stack card">
        <div>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            autoComplete={mode === 'in' ? 'current-password' : 'new-password'}
            minLength={8}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {error && <div className="error" role="alert">{error}</div>}
        {notice && <div className="notice" role="status">{notice}</div>}
        <button className="primary" type="submit" disabled={busy} style={{ width: '100%' }}>
          {busy ? 'One moment…' : mode === 'in' ? 'Sign in' : 'Create account'}
        </button>
        <button
          type="button"
          className="ghost"
          style={{ width: '100%' }}
          onClick={() => {
            setMode(mode === 'in' ? 'up' : 'in');
            setError('');
            setNotice('');
          }}
        >
          {mode === 'in' ? 'New here? Create an account' : 'Have an account? Sign in'}
        </button>
      </form>
    </main>
  );
}
