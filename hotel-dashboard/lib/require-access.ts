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
// Development bypass: disable gating entirely for testing. Two modes:
//
// 1. Local dev: DISABLE_DASHBOARD_AUTH=true (NODE_ENV !== 'production' only)
//    — safe, can never open the live gate
//
// 2. Temporary production dev-mode: UNGATED_DEV_MODE=true
//    — intentionally allows ungated access even on production during development
//    — set via Vercel env var when you want to test the gated pages without login
//    — no session, so pages show their display-only states
//    — REMOVE THIS FLAG before going to real users
const localBypass =
  process.env.NODE_ENV !== 'production' && process.env.DISABLE_DASHBOARD_AUTH === 'true';

const prodDevMode =
  process.env.UNGATED_DEV_MODE === 'true';

const authDisabled = localBypass || prodDevMode;

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
