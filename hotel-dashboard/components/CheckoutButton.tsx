'use client';

import { useState } from 'react';

// The trial-start action for a logged-in member: POST /api/checkout (which
// reads their session email) and redirect to the returned Stripe Checkout URL.
// On a completed checkout Stripe returns them to /dashboard.
export default function CheckoutButton() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [error, setError] = useState('');

  async function startCheckout() {
    setStatus('loading');
    setError('');
    try {
      const res = await fetch('/api/checkout', { method: 'POST' });
      const data = await res.json();
      if (!res.ok || !data.url) {
        setStatus('error');
        setError(data.error ?? 'Could not start checkout. Try again.');
        return;
      }
      window.location.href = data.url;
    } catch {
      setStatus('error');
      setError('Could not start checkout. Try again.');
    }
  }

  return (
    <div style={{ marginTop: 26 }}>
      <button
        type="button"
        onClick={startCheckout}
        disabled={status === 'loading'}
        className="cr-lift"
        style={{
          display: 'inline-block',
          fontSize: 14,
          fontWeight: 600,
          fontFamily: 'var(--font-body), sans-serif',
          textDecoration: 'none',
          color: '#F7F6F2',
          background: 'var(--ink)',
          border: '1px solid var(--ink)',
          borderRadius: 10,
          padding: '13px 26px',
          cursor: status === 'loading' ? 'default' : 'pointer',
          opacity: status === 'loading' ? 0.7 : 1,
        }}
      >
        {status === 'loading' ? 'Taking you to checkout…' : 'Start my free trial'}
      </button>
      {error && <p style={{ fontSize: 13, color: '#B3453B', marginTop: 12 }}>{error}</p>}
    </div>
  );
}
