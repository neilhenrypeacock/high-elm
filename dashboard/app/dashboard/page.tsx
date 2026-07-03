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

export default async function DashboardPage() {
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

  const data = await getPortfolioData();
  const regions = [...new Set(data.hotels.map(h => h.region).filter(Boolean) as string[])].sort();

  return (
    <main style={{ minHeight: '100vh' }}>
      <Dashboard data={data} regions={regions} />
    </main>
  );
}
