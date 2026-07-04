import { redirect } from 'next/navigation';
import { getPortfolioData } from '@/lib/data';
import Dashboard from '@/components/Dashboard';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getSubscriptionByEmail, hasActiveAccess } from '@/lib/subscriptions';

// Gated: no session → /login; logged in but no active trial/subscription →
// /subscribe. Data fetching below (getPortfolioData) is unchanged — this only
// adds an access check in front of it.
export const metadata = {
  title: 'Content Radar — Dashboard',
};

// Local-dev escape hatch: set DISABLE_DASHBOARD_AUTH=true in .env.local to browse
// /dashboard without logging in. It is IGNORED in production (NODE_ENV is always
// 'production' on Vercel), so it can never accidentally leave the live gate open.
const authDisabled =
  process.env.NODE_ENV !== 'production' && process.env.DISABLE_DASHBOARD_AUTH === 'true';

export default async function DashboardPage() {
  if (!authDisabled) {
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
  }

  const data = await getPortfolioData();
  const regions = [...new Set(data.hotels.map(h => h.region).filter(Boolean) as string[])].sort();

  return (
    <main style={{ minHeight: '100vh' }}>
      <Dashboard data={data} regions={regions} />
    </main>
  );
}
