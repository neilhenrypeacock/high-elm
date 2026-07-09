import type { NextRequest } from 'next/server';

// Minimal in-memory sliding-window rate limiter for the PUBLIC endpoints
// (/api/checkout, /api/auth/magic-link) — the ones a bot could use to spray
// Stripe sessions or spam magic-link emails.
//
// Serverless caveat, on purpose: the window lives in the lambda instance's
// memory, so limits reset on cold starts and aren't shared across concurrent
// instances. That still stops the cheap attack (a burst from one client
// hammering one warm instance) at zero cost and zero new vendors. If real
// abuse shows up, upgrade to Vercel WAF rate-limit rules (dashboard, no code)
// or a shared store (Upstash) — this module is the single place to swap.

type Window = { count: number; resetAt: number };
const windows = new Map<string, Window>();
const MAX_KEYS = 10_000; // memory guard — clear all rather than grow unbounded

export function clientIp(request: NextRequest): string {
  // Vercel sets x-forwarded-for; first hop is the client.
  const fwd = request.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return request.headers.get('x-real-ip') ?? 'unknown';
}

/** True when this key is within its limit; false → caller should 429. */
export function allowRequest(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  if (windows.size > MAX_KEYS) windows.clear();
  const w = windows.get(key);
  if (!w || now >= w.resetAt) {
    windows.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  w.count += 1;
  return w.count <= limit;
}
