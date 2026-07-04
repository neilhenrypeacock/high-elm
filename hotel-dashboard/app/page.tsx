import { getPortfolioData } from '@/lib/data';
import Landing from '@/components/Landing';

// Same live data as the dashboard — the taster must show identical numbers.
export const revalidate = 3600;

export const metadata = {
  title: 'Content Radar — Never run out of proven Instagram ideas',
  description:
    "Every week, Content Radar tracks the world's finest hotels and surfaces the exact posts beating their own engagement — the last 7 days, the last 30 days, and all time.",
};

export default async function Page() {
  const data = await getPortfolioData();

  return (
    <main style={{ minHeight: '100vh' }}>
      <Landing data={data} />
    </main>
  );
}
