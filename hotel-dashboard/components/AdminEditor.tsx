'use client';

import { useMemo, useState } from 'react';
import { ImageWithFallback, TagChip } from './ContentRadar';
import { fmtPostedAt } from '@/lib/format';
import type { OutlierPost, TimeWindow } from '@/lib/data';

// Admin-only editorial surface: the in-app replacement for
// instagram-pipeline/set-insight.js. Lists the breakouts (per time window) and
// lets an admin write each card's Editor's note + toggle its Editor's Pick,
// saving straight to standout_posts via /api/admin/insight. Reuses the exact
// thumbnail (ImageWithFallback) + tag chips the live cards use, so what you edit
// here is what members see there.

const MEDIA_PLACEHOLDER = 'linear-gradient(135deg, #2b2824, #3c372e)';

const WINDOW_LABELS: Record<TimeWindow, string> = {
  '7d': 'This week',
  '30d': 'Last 30 days',
  all: 'All time',
};

type RowState = {
  note: string;
  pick: boolean;
  feature: boolean;
  savedNote: string;
  savedPick: boolean;
  savedFeature: boolean;
  status: 'idle' | 'saving' | 'saved' | 'error';
  message?: string;
};

function initialRow(p: OutlierPost): RowState {
  const note = p.post_insight ?? '';
  const pick = p.editors_pick === true;
  const feature = p.landing_pin === true;
  return { note, pick, feature, savedNote: note, savedPick: pick, savedFeature: feature, status: 'idle' };
}

export default function AdminEditor({
  windows,
}: {
  windows: Record<TimeWindow, OutlierPost[]>;
}) {
  const [win, setWin] = useState<TimeWindow>('7d');

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

  async function save(p: OutlierPost) {
    const row = rowFor(p);
    update(p.post_id, { status: 'saving', message: undefined }, row);
    try {
      const res = await fetch('/api/admin/insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          post_id: p.post_id,
          insight: row.note.trim() ? row.note : null,
          editors_pick: row.pick,
          landing_pin: row.feature,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        update(p.post_id, { status: 'error', message: data.error ?? 'Save failed.' }, row);
        return;
      }
      const savedNote = row.note.trim() ? row.note : '';
      update(
        p.post_id,
        { status: 'saved', savedNote, savedPick: row.pick, savedFeature: row.feature, note: savedNote },
        row,
      );
    } catch {
      update(p.post_id, { status: 'error', message: 'Network error.' }, row);
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
          Admin · Editorial
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
          Editor&rsquo;s notes &amp; picks
        </h1>
        <p style={{ fontSize: 14, color: 'var(--body-mid)', lineHeight: 1.5, margin: 0 }}>
          Write the note that shows under each breakout, flag the ones worth replicating, and
          <strong style={{ color: 'var(--ink)', fontWeight: 600 }}> feature</strong> the ones you want
          to lead the public homepage. Saves straight to the live site. Featured posts jump to the
          front of the homepage taster (over the automatic pick); everything applies to the post
          everywhere it appears.
        </p>
      </header>

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
          const seed = rows[p.post_id] ?? initialRow(p);
          const dirty = row.note !== row.savedNote || row.pick !== row.savedPick || row.feature !== row.savedFeature;
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
                    {p.multiplier.toFixed(1)}×
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

                <label
                  style={{
                    display: 'block',
                    fontSize: 10.5,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.12em',
                    color: 'var(--muted)',
                    marginBottom: 5,
                  }}
                >
                  Editor&rsquo;s note
                </label>
                <textarea
                  value={row.note}
                  onChange={(e) => update(p.post_id, { note: e.target.value, status: 'idle' }, seed)}
                  placeholder="What it is… Why it worked… Try this…"
                  rows={3}
                  style={{
                    width: '100%',
                    resize: 'vertical',
                    padding: '10px 12px',
                    borderRadius: 10,
                    border: '1px solid var(--line)',
                    background: 'var(--page)',
                    fontFamily: 'var(--font-body), sans-serif',
                    fontSize: 13.5,
                    lineHeight: 1.5,
                    color: 'var(--ink)',
                  }}
                />

                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 10, flexWrap: 'wrap' }}>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: 7, cursor: 'pointer', fontSize: 13.5, color: 'var(--ink)' }}>
                    <input
                      type="checkbox"
                      checked={row.pick}
                      onChange={(e) => update(p.post_id, { pick: e.target.checked, status: 'idle' }, seed)}
                      style={{ width: 16, height: 16, accentColor: 'var(--signal-deep)', cursor: 'pointer' }}
                    />
                    Editor&rsquo;s Pick
                  </label>

                  {/* Feature-on-homepage pin — forces this post to the front of the
                      public landing taster (hero + open cards). */}
                  <label
                    title="Force this post to the front of the public homepage taster"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 7, cursor: 'pointer', fontSize: 13.5, color: 'var(--ink)' }}
                  >
                    <input
                      type="checkbox"
                      checked={row.feature}
                      onChange={(e) => update(p.post_id, { feature: e.target.checked, status: 'idle' }, seed)}
                      style={{ width: 16, height: 16, accentColor: 'var(--signal-deep)', cursor: 'pointer' }}
                    />
                    Feature on homepage
                  </label>

                  <div style={{ flex: 1 }} />

                  {row.status === 'saved' && !dirty && (
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--signal-deep)' }}>Saved ✓</span>
                  )}
                  {row.status === 'error' && (
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: '#b4331f' }}>{row.message}</span>
                  )}
                  <button
                    type="button"
                    onClick={() => save(p)}
                    disabled={!dirty || row.status === 'saving'}
                    style={{
                      padding: '8px 16px',
                      borderRadius: 9,
                      border: 'none',
                      background: !dirty || row.status === 'saving' ? 'var(--line)' : 'var(--signal-deep)',
                      color: !dirty || row.status === 'saving' ? 'var(--muted)' : 'var(--surface)',
                      fontFamily: 'var(--font-body), sans-serif',
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: !dirty || row.status === 'saving' ? 'default' : 'pointer',
                    }}
                  >
                    {row.status === 'saving' ? 'Saving…' : 'Save'}
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </main>
  );
}
