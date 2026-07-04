'use client';

import { useState } from 'react';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle');
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
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

  if (status === 'sent') {
    return (
      <p style={{ fontSize: 14, color: 'var(--body-strong)', lineHeight: 1.7, marginTop: 20 }}>
        Check your email for a link to log in.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: 20 }}>
      <input
        type="email"
        required
        placeholder="you@hotel.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{
          width: '100%',
          fontSize: 14,
          fontFamily: 'var(--font-body), sans-serif',
          padding: '13px 16px',
          borderRadius: 10,
          border: '1px solid var(--line)',
          background: 'var(--page)',
          color: 'var(--ink)',
          boxSizing: 'border-box',
        }}
      />
      <button
        type="submit"
        disabled={status === 'loading'}
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
          cursor: status === 'loading' ? 'default' : 'pointer',
          opacity: status === 'loading' ? 0.7 : 1,
        }}
      >
        {status === 'loading' ? 'Sending…' : 'Email me a login link'}
      </button>
      {error && <p style={{ fontSize: 13, color: '#B3453B', marginTop: 10 }}>{error}</p>}
    </form>
  );
}
