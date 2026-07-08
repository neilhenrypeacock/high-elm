'use client';

import { useState } from 'react';

// Editable profile fields. Name + hotel/company persist to Supabase Auth
// user_metadata via /api/profile. Email is display-only (login identity + Stripe
// key). When `editable` is false (local dev-bypass with no real session) the
// inputs are disabled and a note explains why — we never fake a save.

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

export default function ProfileForm({
  initialName,
  initialHotel,
  email,
  editable,
}: {
  initialName: string;
  initialHotel: string;
  email: string;
  editable: boolean;
}) {
  const [name, setName] = useState(initialName);
  const [hotel, setHotel] = useState(initialHotel);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [error, setError] = useState('');

  const dirty = name !== initialName || hotel !== initialHotel;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('saving');
    setError('');
    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: name, hotel_name: hotel }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus('error');
        setError(data.error ?? 'Could not save. Try again.');
        return;
      }
      setStatus('saved');
    } catch {
      setStatus('error');
      setError('Could not save. Try again.');
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
      }}
    >
      <div style={{ marginBottom: 22 }}>
        <label htmlFor="pf-name" style={fieldLabel}>Your name</label>
        <input
          id="pf-name"
          type="text"
          value={name}
          disabled={!editable}
          placeholder="e.g. Alex Morgan"
          onChange={(e) => { setName(e.target.value); setStatus('idle'); }}
          style={{ ...inputStyle, opacity: editable ? 1 : 0.6 }}
        />
      </div>

      <div style={{ marginBottom: 22 }}>
        <label htmlFor="pf-hotel" style={fieldLabel}>Hotel / company name</label>
        <input
          id="pf-hotel"
          type="text"
          value={hotel}
          disabled={!editable}
          placeholder="e.g. The Lanesborough"
          onChange={(e) => { setHotel(e.target.value); setStatus('idle'); }}
          style={{ ...inputStyle, opacity: editable ? 1 : 0.6 }}
        />
      </div>

      <div style={{ marginBottom: 4 }}>
        <label htmlFor="pf-email" style={fieldLabel}>Email</label>
        <div
          id="pf-email"
          style={{
            ...inputStyle,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            background: 'var(--surface-alt-2)',
            color: 'var(--body-soft)',
          }}
        >
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {email || '—'}
          </span>
          <span
            style={{
              flex: 'none',
              fontFamily: 'var(--font-label), sans-serif',
              fontWeight: 600,
              fontSize: 10,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--body-mid)',
            }}
          >
            Read-only
          </span>
        </div>
        <p style={{ fontSize: 12.5, color: 'var(--body-mid)', margin: '9px 2px 0', lineHeight: 1.55 }}>
          Your email is your login and billing identity, so it can’t be changed here. Email
          hello@highelm.studio if you need to move your account to a new address.
        </p>
      </div>

      {editable ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 26 }}>
          <button
            type="submit"
            disabled={status === 'saving' || !dirty}
            className="cr-lift"
            style={{
              fontFamily: 'var(--font-body), sans-serif',
              fontSize: 14,
              fontWeight: 600,
              color: '#F7F6F2',
              background: 'var(--ink)',
              border: '1px solid var(--ink)',
              borderRadius: 10,
              padding: '12px 26px',
              cursor: status === 'saving' || !dirty ? 'default' : 'pointer',
              opacity: status === 'saving' || !dirty ? 0.55 : 1,
            }}
          >
            {status === 'saving' ? 'Saving…' : 'Save changes'}
          </button>
          {status === 'saved' && !dirty && (
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--signal-deep)' }}>Saved ✓</span>
          )}
          {status === 'error' && (
            <span style={{ fontSize: 13, color: '#B3453B' }}>{error}</span>
          )}
        </div>
      ) : (
        <p style={{ fontSize: 12.5, color: 'var(--body-mid)', margin: '22px 0 0', lineHeight: 1.55 }}>
          Editing is disabled in this local preview because there’s no signed-in session.
          On the live site your changes save to your account.
        </p>
      )}
    </form>
  );
}
