import { getPortfolioData } from '@/lib/data';
import FilteredDashboard from '@/components/FilteredDashboard';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const data    = await getPortfolioData();
  const regions = [...new Set(data.hotels.map(h => h.region).filter(Boolean) as string[])].sort();

  return (
    <main style={{ minHeight: '100vh' }}>
      <FilteredDashboard data={data} regions={regions} />
    </main>
  );
}
