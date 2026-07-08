import AppShell from '@/components/AppShell';
import AccountFrame from '@/components/AccountFrame';
import EmptyState from '@/components/EmptyState';
import { requireActiveUser, displayName } from '@/lib/require-access';

// PLACEHOLDER PAGE (intentional). This is a real, gated route in the sidebar with
// a finished empty state — but there is NO save storage or logic behind it yet.
// Saving breakout posts is a separate brief; do not wire persistence in here.
export const metadata = {
  title: 'Content Radar — Saved',
};

export default async function SavedPage() {
  const { user } = await requireActiveUser();

  return (
    <AppShell userName={displayName(user)} userEmail={user?.email ?? null}>
      <AccountFrame
        eyebrow="Your library"
        title="Saved"
        sub="Keep the breakout posts worth coming back to — your own swipe file of proven ideas."
      >
        <EmptyState
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M6 4.5h12a1 1 0 0 1 1 1V20l-7-3.6L5 20V5.5a1 1 0 0 1 1-1z" stroke="var(--signal-deep)" strokeWidth="1.7" strokeLinejoin="round" />
            </svg>
          }
          title="Nothing saved yet"
          body="Saving is coming soon. Soon you’ll be able to bookmark any breakout post from the dashboard and find it here whenever you need inspiration."
          ctaHref="/dashboard"
          ctaLabel="Browse breakouts"
        />
      </AccountFrame>
    </AppShell>
  );
}
