import AppShell from '@/components/AppShell';
import AccountFrame from '@/components/AccountFrame';
import EmptyState from '@/components/EmptyState';
import SavedPostsList from '@/components/SavedPostsList';
import { requireActiveUser, displayName, isAdminView } from '@/lib/require-access';
import { getSavedPosts } from '@/lib/saves';

// Real, gated route: the member's saved breakout posts (a swipe file). Rows come
// from saved_posts (RLS-scoped to the user). The branded empty state shows only
// when the list is genuinely empty.
export const metadata = {
  title: 'Content Radar — Saved',
};

export default async function SavedPage() {
  const { user } = await requireActiveUser();
  const posts = user ? await getSavedPosts() : [];

  return (
    <AppShell userName={displayName(user)} userEmail={user?.email ?? null} isAdmin={isAdminView(user)}>
      <AccountFrame
        eyebrow="Your library"
        title="Saved"
        sub="Keep the breakout posts worth coming back to — your own swipe file of proven ideas."
      >
        {posts.length === 0 ? (
          <EmptyState
            icon={
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M6 4.5h12a1 1 0 0 1 1 1V20l-7-3.6L5 20V5.5a1 1 0 0 1 1-1z" stroke="var(--signal-deep)" strokeWidth="1.7" strokeLinejoin="round" />
              </svg>
            }
            title="Nothing saved yet"
            body="Bookmark any breakout post from the dashboard and it lands here — your own library of ideas that are proven to work."
            ctaHref="/dashboard"
            ctaLabel="Browse breakouts"
          />
        ) : (
          <SavedPostsList initialPosts={posts} />
        )}
      </AccountFrame>
    </AppShell>
  );
}
