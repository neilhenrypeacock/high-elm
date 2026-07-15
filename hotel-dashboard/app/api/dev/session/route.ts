import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '../../../../lib/supabase-server';
import { getSubscriptionByEmail } from '../../../../lib/subscriptions';
import { isAdmin } from '../../../../lib/admin';

// Read-only session readout for the floating DevMenu. Returns ONLY the current
// requester's own session + trial state (never anyone else's) — the same class
// of self-data as /api/profile — so it is safe to serve unconditionally. The
// menu that consumes it self-gates on the client (see components/DevMenu.tsx).
export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.json({ signedIn: false });
  }

  const subscription = await getSubscriptionByEmail(user.email);
  const trialEndsInDays =
    subscription?.trial_end != null
      ? Math.ceil((new Date(subscription.trial_end).getTime() - Date.now()) / 86_400_000)
      : null;

  return NextResponse.json({
    signedIn: true,
    email: user.email,
    admin: isAdmin(user),
    status: subscription?.status ?? null,
    trialEndsInDays,
  });
}
