import { redirect } from 'next/navigation';

// Consolidated into the single trial-start path. /subscribe used to be the
// "you don't have an active trial" card; that page is now /start-trial (which
// is context-aware — it starts the Stripe trial for a logged-in member). Kept
// as a permanent redirect so old links and the previous gate target still land
// in the right place.
export default function SubscribePage() {
  redirect('/start-trial');
}
