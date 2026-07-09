import { redirect } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { createServerSupabaseClient } from './supabase-server';
import { getSubscriptionByEmail, hasActiveAccess, type Subscription } from './subscriptions';

// Same gate app/dashboard/page.tsx uses, factored out so every gated page
// (dashboard, profile, settings, saved, watchlist) enforces access identically:
//   no session            → /login
//   session, no active sub → /subscribe
// Returns the authenticated user + their subscription row for the page to render.
//
// Development bypass: DISABLE_DASHBOARD_AUTH=true disables gating for local
// testing. Guarded on NODE_ENV so it can never open the live gate — this is
// the ONLY bypass; no env var can disable auth in production. (The old
// UNGATED_DEV_MODE production flag was removed 2026-07-09 after the audit
// found it serving the full dashboard publicly.)
const authDisabled =
  process.env.NODE_ENV !== 'production' && process.env.DISABLE_DASHBOARD_AUTH === 'true';

export interface AccessContext {
  user: User | null;
  subscription: Subscription | null;
}

export async function requireActiveUser(): Promise<AccessContext> {
  if (authDisabled) {
    return { user: null, subscription: null };
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    redirect('/login');
  }

  const subscription = await getSubscriptionByEmail(user.email);
  if (!hasActiveAccess(subscription)) {
    redirect('/subscribe');
  }

  return { user, subscription };
}

// API-route variant of the same gate. Routes return JSON errors instead of
// redirecting, so this reports a status + message rather than calling
// redirect(). 401 = no session; 403 = session but no active trial/subscription.
// Returns the member's cookie-backed client so RLS runs AS the member.
export type ApiAccess =
  | { ok: true; supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>; user: User }
  | { ok: false; status: 401 | 403; error: string };

export async function checkApiAccess(): Promise<ApiAccess> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return { ok: false, status: 401, error: 'Not signed in.' };
  }

  const subscription = await getSubscriptionByEmail(user.email);
  if (!hasActiveAccess(subscription)) {
    return { ok: false, status: 403, error: 'No active subscription.' };
  }

  return { ok: true, supabase, user };
}

// The member's display name, resolved consistently everywhere: their saved
// full_name (Supabase Auth user_metadata) → the local part of their email → a
// neutral fallback for the dev-bypass case where there is no user at all.
export function displayName(user: User | null): string {
  const meta = (user?.user_metadata ?? {}) as Record<string, unknown>;
  const fullName = typeof meta.full_name === 'string' ? meta.full_name.trim() : '';
  if (fullName) return fullName;
  if (user?.email) return user.email.split('@')[0];
  return 'Your account';
}

export function hotelName(user: User | null): string {
  const meta = (user?.user_metadata ?? {}) as Record<string, unknown>;
  return typeof meta.hotel_name === 'string' ? meta.hotel_name.trim() : '';
}
