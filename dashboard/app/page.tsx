import { getPortfolioData } from '@/lib/data';
import Dashboard from '@/components/Dashboard';

// Data refreshes weekly via the pipeline — revalidate hourly instead of
// refetching the whole posts table on every request.
export const revalidate = 3600;

export default async function Page() {
  const data = await getPortfolioData();
  const regions = [...new Set(data.hotels.map(h => h.region).filter(Boolean) as string[])].sort();

  return (
    <main style={{ minHeight: '100vh' }}>
      <Dashboard data={data} regions={regions} />
    </main>
  );
}
