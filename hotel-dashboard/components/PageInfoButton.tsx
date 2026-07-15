'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import PageInfoModal, { resolveInfoKey, type InfoKey } from './PageInfo';

// Inline "i" affordance for the gated account pages (Your hotel / Saved /
// Watchlist / Settings / Profile). Replaces the old "About this page" sidebar
// menu item: the explanation now lives next to the thing it explains, on demand.
// Resolves its own view from the route and opens the shared PageInfoModal — the
// same three-block "What this is / How it works / Why it helps" content the
// dashboard's per-view "i" buttons use.
export default function PageInfoButton({ infoKey }: { infoKey?: InfoKey }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const key = infoKey ?? resolveInfoKey(pathname, '');

  return (
    <>
      <button
        type="button"
        aria-label="About this page"
        onClick={() => setOpen(true)}
        title="About this page"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          flex: 'none',
          width: 24,
          height: 24,
          borderRadius: '50%',
          border: '1.6px solid var(--signal-deep)',
          background: 'transparent',
          color: 'var(--signal-deep)',
          cursor: 'pointer',
          padding: 0,
        }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="7.4" r="1.25" fill="currentColor" />
          <path d="M12 11v6.5" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" />
        </svg>
      </button>
      <PageInfoModal open={open} infoKey={key} onClose={() => setOpen(false)} />
    </>
  );
}
