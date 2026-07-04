'use client';

import { useEffect } from 'react';
import Lockup from '@/components/Lockup';

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error('Dashboard failed to load:', error);
  }, [error]);

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 28,
        padding: 40,
        textAlign: 'center',
      }}
    >
      <Lockup variant="primary" size={30} />
      <div>
        <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)', marginBottom: 8 }}>
          The radar is momentarily offline.
        </p>
        <p style={{ fontSize: 14, color: 'var(--body-soft)', maxWidth: 420, lineHeight: 1.7 }}>
          We couldn&rsquo;t reach the data this time. It&rsquo;s usually temporary — try again in a
          moment.
        </p>
      </div>
      <button
        onClick={reset}
        style={{
          background: 'var(--ink)',
          color: 'var(--surface)',
          border: 'none',
          borderRadius: 10,
          padding: '11px 26px',
          fontSize: 13,
          fontWeight: 500,
          fontFamily: 'inherit',
          cursor: 'pointer',
        }}
      >
        Try again
      </button>
    </main>
  );
}
