import { getPortfolioData } from '@/lib/data';
import { getFoundingState } from '@/lib/founding';
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

  // A missing count means the scarcity line is left off the page entirely
  // rather than guessed at — see lib/founding.ts. The rest of the landing page
  // is unaffected, so a counting failure costs a line, not the page.
  let placesLeft: number | null = null;
  try {
    placesLeft = (await getFoundingState()).left;
  } catch (err) {
    console.error('Landing page could not count founding places — omitting the places-left line:', err);
  }

  return (
    <main style={{ minHeight: '100vh' }}>
      <Landing data={data} placesLeft={placesLeft} />
    </main>
  );
}
