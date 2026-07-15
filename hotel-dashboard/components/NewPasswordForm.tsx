'use client';

import { useState } from 'react';

// Set a new password after following a recovery link. The recovery session was
// established by /auth/callback, so this reuses the session-gated
// /api/auth/password route and then sends the member into the app.

const inputStyle: React.CSSProperties = {
  width: '100%',
  fontSize: 15,
  fontFamily: 'var(--font-body), sans-serif',
  padding: '13px 16px',
  borderRadius: 10,
  border: '1px solid var(--line)',
  background: 'var(--page)',
  color: 'var(--ink)',
  boxSizing: 'border-box',
};

export default function NewPasswordForm() {
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [status, setStatus] = useState<'idle' | 'saving' | 'error'>('idle');
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('saving');
    setError('');
    try {
      const res = await fetch('/api/auth/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus('error');
        setError(data.error ?? 'Could not save the password. Try again.');
        return;
      }
      // Password set and we already hold a session — straight into the app;
      // the gate routes to /start-trial or /dashboard as appropriate.
      window.location.href = '/dashboard';
    } catch {
      setStatus('error');
      setError('Could not save the password. Try again.');
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: 22 }}>
      <div style={{ position: 'relative' }}>
        <input
          type={show ? 'text' : 'password'}
          required
          minLength={8}
          autoComplete="new-password"
          placeholder="New password (at least 8 characters)"
          value={password}
          onChange={e => { setPassword(e.target.value); setStatus('idle'); }}
          style={{ ...inputStyle, paddingRight: 64 }}
          aria-label="New password"
        />
        <button
          type="button"
          onClick={() => setShow(v => !v)}
          aria-pressed={show}
          style={{
            position: 'absolute',
            right: 10,
            top: '50%',
            transform: 'translateY(-50%)',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            fontFamily: 'var(--font-label), sans-serif',
            fontWeight: 600,
            fontSize: 10,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--body-mid)',
            padding: 6,
          }}
        >
          {show ? 'Hide' : 'Show'}
        </button>
      </div>
      <button
        type="submit"
        disabled={status === 'saving' || password.length < 8}
        className="cr-lift"
        style={{
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
          cursor: status === 'saving' || password.length < 8 ? 'default' : 'pointer',
          opacity: status === 'saving' || password.length < 8 ? 0.6 : 1,
        }}
      >
        {status === 'saving' ? 'Saving…' : 'Set new password'}
      </button>
      {error && <p style={{ fontSize: 13, color: '#B3453B', marginTop: 10 }}>{error}</p>}
    </form>
  );
}
