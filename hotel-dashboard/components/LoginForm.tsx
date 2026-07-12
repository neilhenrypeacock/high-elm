'use client';

import { useState } from 'react';

// Login: email + password is the primary path; "email me a link" (the original
// magic-link flow) stays one click away — it's how password-less accounts from
// the magic-link era get in, and the recovery path for a forgotten password.

const inputStyle: React.CSSProperties = {
  width: '100%',
  fontSize: 14,
  fontFamily: 'var(--font-body), sans-serif',
  padding: '13px 16px',
  borderRadius: 10,
  border: '1px solid var(--line)',
  background: 'var(--page)',
  color: 'var(--ink)',
  boxSizing: 'border-box',
};

const primaryButton = (busy: boolean): React.CSSProperties => ({
  width: '100%',
  marginTop: 12,
  fontSize: 14,
  fontWeight: 600,
  fontFamily: 'var(--font-body), sans-serif',
  color: '#F7F6F2',
  background: 'var(--ink)',
  border: '1px solid var(--ink)',
  borderRadius: 10,
  padding: '13px 26px',
  cursor: busy ? 'default' : 'pointer',
  opacity: busy ? 0.7 : 1,
});

export default function LoginForm() {
  const [mode, setMode] = useState<'password' | 'link'>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle');
  const [error, setError] = useState('');

  const busy = status === 'loading';

  async function submitPassword(e: React.FormEvent) {
    e.preventDefault();
    setStatus('loading');
    setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus('error');
        setError(data.error ?? 'Something went wrong. Try again.');
        return;
      }
      window.location.href = '/dashboard';
    } catch {
      setStatus('error');
      setError('Something went wrong. Try again.');
    }
  }

  async function submitLink(e: React.FormEvent) {
    e.preventDefault();
    setStatus('loading');
    setError('');
    try {
      const res = await fetch('/api/auth/magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus('error');
        setError(data.error ?? 'Something went wrong. Try again.');
        return;
      }
      setStatus('sent');
    } catch {
      setStatus('error');
      setError('Something went wrong. Try again.');
    }
  }

  function switchMode(next: 'password' | 'link') {
    setMode(next);
    setStatus('idle');
    setError('');
  }

  if (status === 'sent') {
    return (
      <p style={{ fontSize: 14, color: 'var(--body-strong)', lineHeight: 1.7, marginTop: 20 }}>
        Check your email for a link to log in.
      </p>
    );
  }

  if (mode === 'link') {
    return (
      <form onSubmit={submitLink} style={{ marginTop: 20 }}>
        <input
          type="email"
          required
          autoComplete="email"
          placeholder="you@hotel.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          style={inputStyle}
        />
        <button type="submit" disabled={busy} className="cr-lift" style={primaryButton(busy)}>
          {busy ? 'Sending…' : 'Email me a login link'}
        </button>
        {error && <p style={{ fontSize: 13, color: '#B3453B', marginTop: 10 }}>{error}</p>}
        <p style={{ marginTop: 16 }}>
          <button
            type="button"
            onClick={() => switchMode('password')}
            className="cr-link"
            style={{ fontSize: 12.5, fontWeight: 500, fontFamily: 'inherit', color: 'var(--signal-deep)', background: 'transparent', border: 'none', cursor: 'pointer' }}
          >
            ← Log in with a password instead
          </button>
        </p>
      </form>
    );
  }

  return (
    <form onSubmit={submitPassword} style={{ marginTop: 20 }}>
      <input
        type="email"
        required
        autoComplete="email"
        placeholder="you@hotel.com"
        value={email}
        onChange={e => setEmail(e.target.value)}
        style={inputStyle}
        aria-label="Email"
      />
      <input
        type="password"
        required
        autoComplete="current-password"
        placeholder="Your password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        style={{ ...inputStyle, marginTop: 10 }}
        aria-label="Password"
      />
      <button type="submit" disabled={busy} className="cr-lift" style={primaryButton(busy)}>
        {busy ? 'Logging in…' : 'Log in'}
      </button>
      {error && <p style={{ fontSize: 13, color: '#B3453B', marginTop: 10 }}>{error}</p>}
      <p style={{ marginTop: 16, fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.6 }}>
        No password yet, or forgotten it?{' '}
        <button
          type="button"
          onClick={() => switchMode('link')}
          className="cr-link"
          style={{ fontSize: 12.5, fontWeight: 600, fontFamily: 'inherit', color: 'var(--signal-deep)', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          Email me a login link
        </button>
        {' '}— you can set a password from your profile once you&rsquo;re in.
      </p>
    </form>
  );
}
