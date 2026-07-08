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
// The local-dev escape hatch mirrors the dashboard's exactly: DISABLE_DASHBOARD_AUTH
// only works when NODE_ENV !== 'production', so it can never open the live gate. In
// that mode there is no real session, so `user` is null and pages fall back to
// display-only behaviour (see ProfileForm's read-only note).
const localBypass =
  process.env.NODE_ENV !== 'production' && process.env.DISABLE_DASHBOARD_AUTH === 'true';

// Preview-only REVIEW bypass. Lets the gated pages render on Vercel PREVIEW
// deploys — which are themselves behind Vercel team SSO, so only the team can
// reach them — without a real magic-link login, so the account shell can be
// reviewed on a hosted URL. It can NEVER fire on production: VERCEL_ENV is
// 'production' there, and it's additionally gated behind an explicit env flag so
// it's off unless deliberately switched on for a review. Like the local bypass,
// `user` is null in this mode, so pages show their display-only states.
const previewBypass =
  process.env.VERCEL_ENV === 'preview' && process.env.PREVIEW_SHOW_GATED === 'true';

const authDisabled = localBypass || previewBypass;

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
