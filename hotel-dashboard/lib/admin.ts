import type { User } from '@supabase/supabase-js';

// Admin (founder) allowlist. The editorial write path — Editor's note + Editor's
// Pick on breakout cards — is restricted to these accounts. Membership is by
// EMAIL, checked against the live session, so a normal member can never reach
// the admin page or its write API even with an active subscription.
//
// Source of truth: the ADMIN_EMAILS env var (comma-separated) if set, otherwise
// the two founder accounts below. Matched case-insensitively. Keep this in sync
// with the founder rows in the subscriptions table.
const DEFAULT_ADMIN_EMAILS = ['neil@highelmstudio.com', 'nhpeacock@gmail.com'];

function adminEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS;
  const list = raw
    ? raw.split(',').map((s) => s.trim()).filter(Boolean)
    : DEFAULT_ADMIN_EMAILS;
  return list.map((e) => e.toLowerCase());
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return adminEmails().includes(email.toLowerCase());
}

export function isAdmin(user: User | null | undefined): boolean {
  return isAdminEmail(user?.email ?? null);
}
