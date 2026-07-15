import YourHotel from '@/components/YourHotel';
import AppShell from '@/components/AppShell';
import { requireActiveUser, displayName, isAdminView } from '@/lib/require-access';
import { DEMO_HOTEL } from '@/lib/your-hotel-demo';

// "Your Hotel" — the member's own-hotel mirror. Gated exactly like /dashboard:
// no session → /login; logged in but no active trial/subscription → /start-trial.
//
// Ships with EXAMPLE DATA (a fictional hotel, labelled as such in the UI) until
// hotel claiming + the pipeline's full-history scrape land — see the header
// comment in lib/your-hotel-demo.ts for the wiring plan.
export const metadata = {
  title: 'Content Radar — Your hotel',
};

export default async function YourHotelPage() {
  const { user } = await requireActiveUser();

  return (
    <AppShell
      userName={displayName(user)}
      userEmail={user?.email ?? null}
      isAdmin={isAdminView(user)}
      footerNote={`Example data · last updated ${DEMO_HOTEL.lastUpdated}`}
    >
      <main style={{ minHeight: '100vh' }}>
        <YourHotel hotel={DEMO_HOTEL} />
      </main>
    </AppShell>
  );
}
