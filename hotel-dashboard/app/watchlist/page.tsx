import AppShell from '@/components/AppShell';
import AccountFrame from '@/components/AccountFrame';
import EmptyState from '@/components/EmptyState';
import WatchlistTable from '@/components/WatchlistTable';
import { requireActiveUser, displayName, isAdminView } from '@/lib/require-access';
import { getWatchlistEntries } from '@/lib/saves';
import { getPortfolioData, type HotelRow } from '@/lib/data';
import { accreditationsFor } from '@/lib/accreditations';

// Real, gated route: the hotels the member follows. Rows come from
// watchlist_hotels (RLS-scoped), re-joined to live leaderboard data for fresh
// stats; a watchlisted hotel no longer in the tracked set falls back to a lean
// row built from the stored name. Branded empty state when genuinely empty.
export const metadata = {
  title: 'Content Radar — Watchlist',
};

export default async function WatchlistPage() {
  const { user } = await requireActiveUser();
  const entries = user ? await getWatchlistEntries() : [];

  let hotels: HotelRow[] = [];
  if (entries.length > 0) {
    const data = await getPortfolioData();
    const byHandle = new Map(data.hotels.map(h => [h.instagram_handle, h]));
    hotels = entries.map(e => {
      const live = byHandle.get(e.instagram_handle);
      if (live) return live;
      // Fallback: watchlisted hotel isn't in the current tracked set.
      return {
        name: e.hotel_name ?? e.instagram_handle,
        region: null,
        country: null,
        instagram_handle: e.instagram_handle,
        followers_count: null,
        engagement_rate: null,
        recent_rate: { d30: null, d90: null },
        posts_per_week: null,
        last_posted: null,
        er_flag_reason: null,
        accreditations: accreditationsFor(e.instagram_handle),
      } satisfies HotelRow;
    });
  }

  return (
    <AppShell userName={displayName(user)} userEmail={user?.email ?? null} isAdmin={isAdminView(user)}>
      <AccountFrame
        eyebrow="Your library"
        title="Watchlist"
        sub="Follow the hotels you most want to learn from and keep their best content close."
      >
        {hotels.length === 0 ? (
          <EmptyState
            icon={
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" stroke="var(--signal-deep)" strokeWidth="1.7" strokeLinejoin="round" />
                <circle cx="12" cy="12" r="2.6" stroke="var(--signal-deep)" strokeWidth="1.7" />
              </svg>
            }
            title="Your watchlist is empty"
            body="Follow any hotel from the leaderboard and it lands here — track the accounts you most want to learn from in one place."
            ctaHref="/dashboard#leaderboard"
            ctaLabel="Open the leaderboard"
          />
        ) : (
          <WatchlistTable initialHotels={hotels} />
        )}
      </AccountFrame>
    </AppShell>
  );
}
