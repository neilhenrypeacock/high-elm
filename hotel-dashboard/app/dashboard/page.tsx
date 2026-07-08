import { getPortfolioData } from '@/lib/data';
import Dashboard from '@/components/Dashboard';
import AppShell from '@/components/AppShell';
import WelcomeOverlay from '@/components/WelcomeOverlay';
import { requireActiveUser, displayName } from '@/lib/require-access';

// Gated: no session → /login; logged in but no active trial/subscription →
// /subscribe. The gate + data fetching (getPortfolioData) are UNCHANGED — this
// only wraps the existing <Dashboard> in the account shell (left sidebar) and
// adds the one-time welcome overlay. Nothing inside Dashboard.tsx is touched, so
// the dashboard renders identically inside the shell's content column.
export const metadata = {
  title: 'Content Radar — Dashboard',
};

export default async function DashboardPage() {
  const { user } = await requireActiveUser();

  const data = await getPortfolioData();
  const regions = [...new Set(data.hotels.map(h => h.region).filter(Boolean) as string[])].sort();

  return (
    <AppShell userName={displayName(user)} userEmail={user?.email ?? null}>
      <main style={{ minHeight: '100vh' }}>
        <Dashboard data={data} regions={regions} />
      </main>
      <WelcomeOverlay />
    </AppShell>
  );
}
