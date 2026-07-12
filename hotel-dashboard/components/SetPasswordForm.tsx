'use client';

import { useState } from 'react';

// Set or change the account password from the Profile page — how magic-link-era
// accounts (like the founder ones) add a password. Same card styling as
// ProfileForm above it.

const fieldLabel: React.CSSProperties = {
  display: 'block',
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

export default function SetPasswordForm({ editable }: { editable: boolean }) {
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
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
      setStatus('saved');
      setPassword('');
    } catch {
      setStatus('error');
      setError('Could not save the password. Try again.');
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--line)',
        borderRadius: 14,
        boxShadow: 'var(--shadow-card)',
        padding: '30px 30px 26px',
        marginTop: 16,
      }}
    >
      <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)', margin: '0 0 6px' }}>Password</h2>
      <p style={{ fontSize: 13, color: 'var(--body-mid)', lineHeight: 1.6, margin: '0 0 20px' }}>
        Set a password to log in directly — the emailed login link keeps working either way.
      </p>

      <label htmlFor="sp-password" style={fieldLabel}>New password</label>
      <div style={{ position: 'relative' }}>
        <input
          id="sp-password"
          type={show ? 'text' : 'password'}
          required
          minLength={8}
          autoComplete="new-password"
          placeholder="At least 8 characters"
          value={password}
          disabled={!editable}
          onChange={e => { setPassword(e.target.value); setStatus('idle'); }}
          style={{ ...inputStyle, paddingRight: 64, opacity: editable ? 1 : 0.6 }}
        />
        <button
          type="button"
          onClick={() => setShow(v => !v)}
          aria-pressed={show}
          disabled={!editable}
          style={{
            position: 'absolute',
            right: 10,
            top: '50%',
            transform: 'translateY(-50%)',
            border: 'none',
            background: 'transparent',
            cursor: editable ? 'pointer' : 'default',
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

      {editable ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 22 }}>
          <button
            type="submit"
            disabled={status === 'saving' || password.length < 8}
            className="cr-lift"
            style={{
              fontFamily: 'var(--font-body), sans-serif',
              fontSize: 14,
              fontWeight: 600,
              color: '#F7F6F2',
              background: 'var(--fill-strong)',
              border: '1px solid var(--fill-strong)',
              borderRadius: 10,
              padding: '12px 26px',
              cursor: status === 'saving' || password.length < 8 ? 'default' : 'pointer',
              opacity: status === 'saving' || password.length < 8 ? 0.55 : 1,
            }}
          >
            {status === 'saving' ? 'Saving…' : 'Save password'}
          </button>
          {status === 'saved' && (
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--signal-deep)' }}>Password set ✓</span>
          )}
          {status === 'error' && <span style={{ fontSize: 13, color: 'var(--error)' }}>{error}</span>}
        </div>
      ) : (
        <p style={{ fontSize: 12.5, color: 'var(--body-mid)', margin: '20px 0 0', lineHeight: 1.55 }}>
          Password changes are disabled in this local preview because there&rsquo;s no signed-in session.
        </p>
      )}
    </form>
  );
}
