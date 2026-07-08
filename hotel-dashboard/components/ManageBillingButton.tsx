'use client';

import { useState } from 'react';

// Redirects the member to the Stripe Customer Portal. If the portal isn't
// enabled in Stripe (or there's no customer), we show the error inline rather
// than bouncing the member to a broken page.
export default function ManageBillingButton({ disabled }: { disabled?: boolean }) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [error, setError] = useState('');

  async function openPortal() {
    setStatus('loading');
    setError('');
    try {
      const res = await fetch('/api/billing-portal', { method: 'POST' });
      const data = await res.json();
      if (!res.ok || !data.url) {
        setStatus('error');
        setError(data.error ?? 'Could not open billing right now.');
        return;
      }
      window.location.href = data.url;
    } catch {
      setStatus('error');
      setError('Could not open billing right now.');
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={openPortal}
        disabled={disabled || status === 'loading'}
        className="cr-lift"
        style={{
          fontFamily: 'var(--font-body), sans-serif',
          fontSize: 14,
          fontWeight: 600,
          color: 'var(--ink)',
          background: 'var(--surface)',
          border: '1px solid var(--line-strong)',
          borderRadius: 10,
          padding: '12px 24px',
          cursor: disabled || status === 'loading' ? 'default' : 'pointer',
          opacity: disabled ? 0.55 : 1,
        }}
      >
        {status === 'loading' ? 'Opening…' : 'Manage billing'}
      </button>
      {status === 'error' && (
        <p style={{ fontSize: 13, color: '#B3453B', margin: '12px 0 0', lineHeight: 1.55 }}>{error}</p>
      )}
    </div>
  );
}
