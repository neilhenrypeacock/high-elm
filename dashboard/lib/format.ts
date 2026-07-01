// Shared display formatting — one implementation, used by every component.

export function fmtFollowers(n: number | null): string {
  if (n === null || n <= 0) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return n.toLocaleString('en-GB');
}

/** "Tue 30 Jun · 14:02" */
export function fmtPostedAt(iso: string): string {
  const d = new Date(iso);
  const day  = d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
  return `${day} · ${time}`;
}

/** "30 Jun 2026" */
export function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function fmtNumber(n: number | null, decimals = 0): string {
  if (n === null) return '—';
  return n.toLocaleString('en-GB', { maximumFractionDigits: decimals });
}
