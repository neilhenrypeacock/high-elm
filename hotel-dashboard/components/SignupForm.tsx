'use client';

import { useState } from 'react';
import Link from 'next/link';

// Beta account creation (STRIPE_DISABLED mode) — name, hotel, email, password
// → POST /api/auth/signup creates the account + 14-day trial and signs the
// visitor in, then we hand over to the dashboard (WelcomeOverlay greets them).
// A brief full-card success beat replaces the form so the redirect never feels
// like a hang.

const fieldLabel: React.CSSProperties = {
  display: 'block',
  textAlign: 'left',
  fontFamily: 'var(--font-label), sans-serif',
  fontWeight: 600,
  fontSize: 11,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: 'var(--body-mid)',
  marginBottom: 8,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  fontSize: 15,
  fontFamily: 'var(--font-body), sans-serif',
  padding: '12px 14px',
  borderRadius: 10,
  border: '1px solid var(--line)',
  background: 'var(--page)',
  color: 'var(--ink)',
  boxSizing: 'border-box',
};

export default function SignupForm() {
  const [name, setName] = useState('');
  const [hotel, setHotel] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [error, setError] = useState('');
  const [exists, setExists] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('loading');
    setError('');
    setExists(false);

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: name, hotel_name: hotel, email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setStatus('error');
        setError(data.error ?? 'Something went wrong. Try again.');
        setExists(data.code === 'exists');
        return;
      }

      // Session cookie is set — brief success beat, then into the dashboard.
      setStatus('done');
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 900);
    } catch {
      setStatus('error');
      setError('Something went wrong. Try again.');
    }
  }

  if (status === 'done') {
    return (
      <div style={{ padding: '34px 0 20px' }} role="status">
        <div
          aria-hidden="true"
          style={{
            width: 52,
            height: 52,
            margin: '0 auto',
            borderRadius: '50%',
            background: 'var(--top3-tint)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M20 6.5 9.4 17 4 11.7" stroke="var(--signal-deep)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)', margin: '18px 0 0' }}>
          You&rsquo;re in — trial started
        </p>
        <p style={{ fontSize: 13, color: 'var(--body-mid)', margin: '6px 0 0' }}>
          Opening your dashboard…
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: 26, textAlign: 'left' }}>
      <div style={{ marginBottom: 18 }}>
        <label htmlFor="su-name" style={fieldLabel}>Your name</label>
        <input
          id="su-name"
          type="text"
          required
          autoComplete="name"
          placeholder="e.g. Alex Morgan"
          value={name}
          onChange={e => setName(e.target.value)}
          style={inputStyle}
        />
      </div>

      <div style={{ marginBottom: 18 }}>
        <label htmlFor="su-hotel" style={fieldLabel}>
          Hotel / company <span style={{ color: 'var(--faint)', textTransform: 'none', letterSpacing: 0 }}>(optional)</span>
        </label>
        <input
          id="su-hotel"
          type="text"
          autoComplete="organization"
          placeholder="e.g. The Lanesborough"
          value={hotel}
          onChange={e => setHotel(e.target.value)}
          style={inputStyle}
        />
      </div>

      <div style={{ marginBottom: 18 }}>
        <label htmlFor="su-email" style={fieldLabel}>Work email</label>
        <input
          id="su-email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@hotel.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          style={inputStyle}
        />
      </div>

      <div style={{ marginBottom: 6 }}>
        <label htmlFor="su-password" style={fieldLabel}>Choose a password</label>
        <div style={{ position: 'relative' }}>
          <input
            id="su-password"
            type={showPassword ? 'text' : 'password'}
            required
            minLength={8}
            autoComplete="new-password"
            placeholder="At least 8 characters"
            value={password}
            onChange={e => setPassword(e.target.value)}
            style={{ ...inputStyle, paddingRight: 64 }}
          />
          <button
            type="button"
            onClick={() => setShowPassword(v => !v)}
            aria-pressed={showPassword}
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
            {showPassword ? 'Hide' : 'Show'}
          </button>
        </div>
      </div>

      <button
        type="submit"
        disabled={status === 'loading'}
        className="cr-lift"
        style={{
          width: '100%',
          marginTop: 16,
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
        {status === 'loading' ? 'Creating your account…' : 'Create account & start trial'}
      </button>

      {error && (
        <p style={{ fontSize: 13, color: '#B3453B', marginTop: 10, textAlign: 'center' }}>
          {error}
          {exists && (
            <>
              {' '}
              <Link href="/login" className="cr-link" style={{ color: 'var(--signal-deep)', fontWeight: 600, textDecoration: 'none' }}>
                Log in →
              </Link>
            </>
          )}
        </p>
      )}

      <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 14, lineHeight: 1.6, textAlign: 'center' }}>
        14 days free · no card needed during the beta · full dashboard access
      </p>
    </form>
  );
}
