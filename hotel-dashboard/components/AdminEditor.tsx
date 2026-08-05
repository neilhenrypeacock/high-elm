'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ImageWithFallback, TagChip } from './ContentRadar';
import { fmtPostedAt, fmtDate } from '@/lib/format';
import { formatMultiplier } from '@/lib/format-multiplier';
import type { DashboardData, OutlierPost, TimeWindow } from '@/lib/data';

// Admin-only weekly review. Lists the breakouts (per time window) so the week
// can be checked before it goes out, and offers exactly three per-post switches:
// feature on the homepage, remove the post, remove the hotel. Publishing is the
// one global button at the top.
//
// ⚠ There is deliberately NO note-writing here (removed 2026-08-05). The card
// copy members read is the AI insight written by the pipeline
// (instagram-pipeline/generate-insight.js, a step in scrape-pipeline.yml) —
// nothing is hand-written per post any more, so the Editor's note textarea and
// the Editor's Pick tick are both gone. Reuses the exact thumbnail
// (ImageWithFallback) + tag chips the live cards use, so what you review here
// is what members see there.

const MEDIA_PLACEHOLDER = 'linear-gradient(135deg, #2b2824, #3c372e)';

const WINDOW_LABELS: Record<TimeWindow, string> = {
  '7d': 'This week',
  '30d': 'Last 30 days',
  all: 'All time',
};

// Only the homepage pin is an editable per-post value now, and it saves the
// moment it's ticked — there is no Save button left to press.
type RowState = {
  feature: boolean;
  status: 'idle' | 'saving' | 'saved' | 'error';
  message?: string;
};

// ─── The Monday publish gate ──────────────────────────────────────────────────
// Sunday night's scrape lands invisible to members; this banner says how much is
// waiting and releases it. Publishing refreshes the page so the pending count
// and the member-facing figures both settle immediately.
function PublishBanner({ publish }: { publish: DashboardData['publish'] }) {
  const router = useRouter();
  const [status, setStatus] = useState<'idle' | 'publishing' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const pending = publish.pending;

  async function publishNow() {
    setStatus('publishing');
    setMessage(null);
    try {
      const res = await fetch('/api/admin/publish', { method: 'POST' });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setStatus('error');
        setMessage(d.error ?? 'Publish failed.');
        return;
      }
      setStatus('idle');
      router.refresh();
    } catch {
      setStatus('error');
      setMessage('Network error.');
    }
  }

  const waiting = pending > 0;
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        flexWrap: 'wrap',
        border: `1px solid ${waiting ? '#D8C48A' : 'var(--line)'}`,
        background: waiting ? '#FBF4E2' : 'var(--surface)',
        borderRadius: 12,
        padding: '14px 16px',
        margin: '18px 0 4px',
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>
          {waiting
            ? `${pending} post${pending === 1 ? '' : 's'} waiting to be published`
            : 'Everything is published'}
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--body-mid)', marginTop: 3 }}>
          {waiting
            ? 'Members can’t see these yet. Review the list below, hide anything that shouldn’t go out, then publish.'
            : `Members are seeing everything up to ${fmtDate(publish.cutoff)}.`}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {status === 'error' && (
          <span style={{ fontSize: 12.5, fontWeight: 600, color: '#b4331f' }}>{message}</span>
        )}
        <button
          type="button"
          onClick={publishNow}
          disabled={!waiting || status === 'publishing'}
          style={{
            padding: '10px 20px',
            borderRadius: 9,
            border: 'none',
            background: !waiting || status === 'publishing' ? 'var(--line)' : 'var(--signal-deep)',
            color: !waiting || status === 'publishing' ? 'var(--muted)' : 'var(--surface)',
            fontFamily: 'var(--font-body), sans-serif',
            fontSize: 13.5,
            fontWeight: 600,
            cursor: !waiting || status === 'publishing' ? 'default' : 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          {status === 'publishing' ? 'Publishing…' : 'Publish to members'}
        </button>
      </div>
    </div>
  );
}

// ─── Hidden roster ────────────────────────────────────────────────────────────
// Hidden posts and hotels are excluded from every figure, so they can't appear
// in the list below — this is the only place they can be seen and undone.
function HiddenRoster({ hidden }: { hidden: DashboardData['hidden'] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const total = hidden.posts.length + hidden.hotels.length;
  if (total === 0) return null;

  async function unhide(kind: 'post' | 'hotel', id: string) {
    setBusy(id);
    const [url, body] =
      kind === 'post'
        ? ['/api/admin/insight', { post_id: id, hidden: false }]
        : ['/api/admin/hotel', { instagram_handle: id, hidden: false }];
    try {
      const res = await fetch(url as string, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) router.refresh();
    } finally {
      setBusy(null);
    }
  }

  const chip = (label: string, sub: string, id: string, kind: 'post' | 'hotel') => (
    <span
      key={`${kind}-${id}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 9,
        background: 'var(--surface)',
        border: '1px solid var(--line)',
        borderRadius: 999,
        padding: '6px 8px 6px 13px',
        fontSize: 12.5,
        color: 'var(--body-strong)',
      }}
    >
      <span>
        {label} <span style={{ color: 'var(--muted)' }}>· {sub}</span>
      </span>
      <button
        type="button"
        onClick={() => unhide(kind, id)}
        disabled={busy === id}
        style={{
          border: 'none',
          background: 'var(--top3-tint)',
          color: 'var(--signal-deep)',
          borderRadius: 999,
          padding: '3px 10px',
          fontSize: 11.5,
          fontWeight: 600,
          fontFamily: 'inherit',
          cursor: busy === id ? 'default' : 'pointer',
        }}
      >
        {busy === id ? '…' : 'Un-hide'}
      </button>
    </span>
  );

  return (
    <section
      style={{
        border: '1px solid var(--line)',
        background: 'var(--page)',
        borderRadius: 12,
        padding: '14px 16px',
        margin: '14px 0 4px',
      }}
    >
      <div
        style={{
          fontFamily: 'var(--font-body), sans-serif',
          fontSize: 10.5,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.12em',
          color: 'var(--muted)',
          marginBottom: 10,
        }}
      >
        Hidden from members · {total}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {hidden.hotels.map(h => chip(h.name, 'whole hotel', h.instagram_handle, 'hotel'))}
        {hidden.posts.map(p => chip(p.hotel_name, fmtPostedAt(p.posted_at), p.post_id, 'post'))}
      </div>
    </section>
  );
}

// One switch. The two removal ticks never render as checked: ticking one takes
// the card out of the list entirely (a removed post is excluded from the data
// itself, so it can't be drawn back with its box ticked) and it reappears in
// the "Hidden from members" chips above, which is where it gets undone.
function Tick({
  label,
  title,
  checked,
  disabled,
  danger,
  onChange,
}: {
  label: string;
  title: string;
  checked: boolean;
  disabled: boolean;
  danger?: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <label
      title={title}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 7,
        cursor: disabled ? 'default' : 'pointer',
        fontSize: 13.5,
        color: danger ? '#b4331f' : 'var(--ink)',
        opacity: disabled ? 0.55 : 1,
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        style={{
          width: 16,
          height: 16,
          accentColor: danger ? '#b4331f' : 'var(--signal-deep)',
          cursor: disabled ? 'default' : 'pointer',
        }}
      />
      {label}
    </label>
  );
}

function initialRow(p: OutlierPost): RowState {
  return { feature: p.landing_pin === true, status: 'idle' };
}

export default function AdminEditor({
  windows,
  publish,
  hidden,
}: {
  windows: Record<TimeWindow, OutlierPost[]>;
  publish: DashboardData['publish'];
  hidden: DashboardData['hidden'];
}) {
  const router = useRouter();
  const [win, setWin] = useState<TimeWindow>('7d');
  // Which card is mid-hide. Hiding removes the post from the data entirely, so
  // the page is refreshed afterwards and the card disappears from this list —
  // it reappears in the Hidden roster above, where it can be undone.
  const [hiding, setHiding] = useState<string | null>(null);

  // Removing one post is a tick, not a decision to defend: it's reversible and
  // the post reappears as a chip in "Hidden from members" directly above, so
  // there's no confirm step. Removing a whole HOTEL still confirms — that one
  // pulls every post it has out of the leaderboard and every portfolio figure.
  async function hidePost(p: OutlierPost) {
    setHiding(p.post_id);
    try {
      const res = await fetch('/api/admin/insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ post_id: p.post_id, hidden: true }),
      });
      if (res.ok) router.refresh();
    } finally {
      setHiding(null);
    }
  }

  async function hideHotel(p: OutlierPost) {
    if (!confirm(`Hide ${p.hotel_name} entirely?\n\nEvery post from @${p.instagram_handle} leaves the leaderboard, the breakouts and all the portfolio figures. The pipeline keeps scraping it, so nothing is lost and you can un-hide it at any time.`)) return;
    setHiding(p.post_id);
    try {
      const res = await fetch('/api/admin/hotel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instagram_handle: p.instagram_handle, hidden: true }),
      });
      if (res.ok) router.refresh();
    } finally {
      setHiding(null);
    }
  }

  // One editable row per post_id (a co-post shares a post_id across grids; the
  // note is written by post_id, so we edit it once). Keyed by post_id.
  const posts = useMemo(() => {
    const seen = new Set<string>();
    return windows[win].filter((p) => {
      if (seen.has(p.post_id)) return false;
      seen.add(p.post_id);
      return true;
    });
  }, [windows, win]);

  // Row state is keyed by post_id and seeded lazily from the current window's
  // posts; edits persist across window switches within the session.
  const [rows, setRows] = useState<Record<string, RowState>>({});

  const rowFor = (p: OutlierPost): RowState => rows[p.post_id] ?? initialRow(p);

  const update = (post_id: string, patch: Partial<RowState>, seed: RowState) =>
    setRows((prev) => ({ ...prev, [post_id]: { ...(prev[post_id] ?? seed), ...patch } }));

  // The homepage pin saves on the tick itself. The box moves immediately and is
  // put back if the write fails, so the checkbox never claims a state the
  // database doesn't hold.
  async function toggleFeature(p: OutlierPost, next: boolean) {
    const row = rowFor(p);
    update(p.post_id, { feature: next, status: 'saving', message: undefined }, row);
    try {
      const res = await fetch('/api/admin/insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ post_id: p.post_id, landing_pin: next }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        update(p.post_id, { feature: !next, status: 'error', message: data.error ?? 'Save failed.' }, row);
        return;
      }
      update(p.post_id, { feature: next, status: 'saved' }, row);
    } catch {
      update(p.post_id, { feature: !next, status: 'error', message: 'Network error.' }, row);
    }
  }

  return (
    <main style={{ maxWidth: 900, margin: '0 auto', padding: '32px 40px 96px' }}>
      <header style={{ marginBottom: 8 }}>
        <div
          style={{
            fontFamily: 'var(--font-body), sans-serif',
            fontSize: 11,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.14em',
            color: 'var(--signal-deep)',
          }}
        >
          Admin · Weekly review
        </div>
        <h1
          style={{
            fontFamily: "var(--font-display), 'Space Grotesk', sans-serif",
            fontWeight: 700,
            fontSize: 28,
            letterSpacing: '-0.02em',
            color: 'var(--ink)',
            margin: '4px 0 6px',
          }}
        >
          Review this week
        </h1>
        <p style={{ fontSize: 14, color: 'var(--body-mid)', lineHeight: 1.5, margin: 0 }}>
          Read down the week&rsquo;s breakouts, take out anything that shouldn&rsquo;t go out, and
          feature the ones you want leading the public homepage. Then hit
          <strong style={{ color: 'var(--ink)', fontWeight: 600 }}> Publish to members</strong>. Every
          switch saves to the live site as you tick it, and applies to the post everywhere it
          appears. The &ldquo;why it worked&rdquo; copy on each card is written by the AI at scrape
          time &mdash; there&rsquo;s nothing to write here.
        </p>
      </header>

      <PublishBanner publish={publish} />
      <HiddenRoster hidden={hidden} />

      {/* Window toggle */}
      <div role="tablist" aria-label="Time window" style={{ display: 'flex', gap: 6, margin: '20px 0 18px' }}>
        {(Object.keys(WINDOW_LABELS) as TimeWindow[]).map((w) => {
          const active = w === win;
          return (
            <button
              key={w}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setWin(w)}
              style={{
                padding: '7px 14px',
                borderRadius: 999,
                border: `1px solid ${active ? 'var(--signal-deep)' : 'var(--line)'}`,
                background: active ? 'var(--signal-deep)' : 'var(--surface)',
                color: active ? 'var(--surface)' : 'var(--body-mid)',
                fontFamily: 'var(--font-body), sans-serif',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {WINDOW_LABELS[w]}
            </button>
          );
        })}
      </div>

      {posts.length === 0 && (
        <p style={{ fontSize: 14, color: 'var(--body-mid)' }}>No breakouts in this window.</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {posts.map((p, i) => {
          const row = rowFor(p);
          const busy = hiding === p.post_id;
          return (
            <article
              key={p.post_id}
              style={{
                display: 'grid',
                gridTemplateColumns: '84px 1fr',
                gap: 16,
                border: '1px solid var(--line)',
                borderRadius: 14,
                background: 'var(--surface)',
                padding: 14,
              }}
            >
              {/* Thumbnail */}
              <div
                style={{
                  position: 'relative',
                  width: 84,
                  height: 108,
                  borderRadius: 10,
                  overflow: 'hidden',
                  background: MEDIA_PLACEHOLDER,
                }}
              >
                <ImageWithFallback
                  src={p.image_url}
                  alt={p.hotel_name}
                  fallback={MEDIA_PLACEHOLDER}
                  blur={12}
                  elevated={false}
                />
              </div>

              {/* Body */}
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)' }}>#{i + 1}</span>
                  <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>{p.hotel_name}</span>
                  <span style={{ fontSize: 12.5, color: 'var(--body-mid)' }}>@{p.instagram_handle}</span>
                  <span
                    style={{
                      fontFamily: "var(--font-display), 'Space Grotesk', sans-serif",
                      fontWeight: 700,
                      fontSize: 13,
                      color: 'var(--signal-deep)',
                    }}
                  >
                    {formatMultiplier(p.multiplier)}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--muted)' }}>· {fmtPostedAt(p.posted_at)}</span>
                  {row.feature && (
                    <span
                      style={{
                        fontFamily: 'var(--font-body), sans-serif',
                        fontSize: 10.5,
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em',
                        color: 'var(--signal-deep)',
                        background: 'var(--top3-tint)',
                        border: '1px solid #BFD8CC',
                        borderRadius: 999,
                        padding: '2px 9px',
                      }}
                    >
                      ★ Featured
                    </span>
                  )}
                  {p.post_url && (
                    <a
                      href={p.post_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: 12, fontWeight: 600, color: 'var(--signal-deep)', textDecoration: 'none' }}
                    >
                      View ↗
                    </a>
                  )}
                </div>

                {(p.type || p.driver_tag || p.theme_tag) && (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '8px 0 10px', alignItems: 'center' }}>
                    <TagChip type={p.type} />
                    {[p.driver_tag, p.theme_tag].filter(Boolean).map((t) => (
                      <span
                        key={t}
                        style={{
                          fontFamily: 'var(--font-body), sans-serif',
                          fontSize: 11,
                          fontWeight: 600,
                          color: 'var(--body-mid)',
                          background: 'var(--page)',
                          border: '1px solid var(--line)',
                          borderRadius: 999,
                          padding: '3px 9px',
                        }}
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}

                {/* The three switches. Each one IS the action — it saves the
                    moment it's ticked, so there's no Save button. */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginTop: 12, flexWrap: 'wrap' }}>
                  <Tick
                    label="Feature on homepage"
                    title="Force this post to the front of the public homepage taster"
                    checked={row.feature}
                    disabled={busy || row.status === 'saving'}
                    onChange={(next) => toggleFeature(p, next)}
                  />
                  <Tick
                    label="Remove post"
                    title="Members never see it, and it leaves every figure. Un-hide it from the list at the top."
                    checked={false}
                    disabled={busy}
                    danger
                    onChange={() => hidePost(p)}
                  />
                  <Tick
                    label="Remove hotel"
                    title={`Take every post from @${p.instagram_handle} out of the dashboard`}
                    checked={false}
                    disabled={busy}
                    danger
                    onChange={() => hideHotel(p)}
                  />

                  <div style={{ flex: 1 }} />

                  {busy && <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--muted)' }}>Removing…</span>}
                  {!busy && row.status === 'saving' && (
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--muted)' }}>Saving…</span>
                  )}
                  {!busy && row.status === 'saved' && (
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--signal-deep)' }}>Saved ✓</span>
                  )}
                  {!busy && row.status === 'error' && (
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: '#b4331f' }}>{row.message}</span>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </main>
  );
}
