import AppShell from '@/components/AppShell';
import AccountFrame from '@/components/AccountFrame';
import EmptyState from '@/components/EmptyState';
import { requireActiveUser, displayName } from '@/lib/require-access';

// PLACEHOLDER PAGE (intentional). Real, gated route in the sidebar with a
// finished empty state — but NO watchlist storage or logic behind it yet.
// Following specific hotels is a separate brief; do not wire persistence here.
export const metadata = {
  title: 'Content Radar — Watchlist',
};

export default async function WatchlistPage() {
  const { user } = await requireActiveUser();

  return (
    <AppShell userName={displayName(user)} userEmail={user?.email ?? null}>
      <AccountFrame
        eyebrow="Your library"
        title="Watchlist"
        sub="Follow the hotels you most want to learn from and keep their best content close."
      >
        <EmptyState
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" stroke="var(--signal-deep)" strokeWidth="1.7" strokeLinejoin="round" />
              <circle cx="12" cy="12" r="2.6" stroke="var(--signal-deep)" strokeWidth="1.7" />
            </svg>
          }
          title="Your watchlist is empty"
          body="Watchlists are coming soon. Soon you’ll be able to follow specific hotels from the leaderboard and track their breakouts as they happen."
          ctaHref="/dashboard"
          ctaLabel="Open the leaderboard"
        />
      </AccountFrame>
    </AppShell>
  );
}
