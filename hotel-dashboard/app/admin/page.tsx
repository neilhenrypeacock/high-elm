import { getPortfolioData } from '@/lib/data';
import AppShell from '@/components/AppShell';
import AdminEditor from '@/components/AdminEditor';
import { requireAdminUser, displayName, isAdminView } from '@/lib/require-access';

// Admin-only editorial page. requireAdminUser() enforces: logged in → active
// trial/subscription → on the admin allowlist; a normal member is redirected to
// /dashboard before this renders. The write path is /api/admin/insight (also
// admin-gated). getPortfolioData is the same read the dashboard uses.
export const metadata = {
  title: 'Content Radar — Admin',
};

export default async function AdminPage() {
  const { user } = await requireAdminUser();
  const data = await getPortfolioData();

  return (
    <AppShell
      userName={displayName(user)}
      userEmail={user?.email ?? null}
      isAdmin={isAdminView(user)}
      footerNote={`Updated weekly · ${data.week_ending_long}`}
    >
      <AdminEditor windows={data.standout} />
    </AppShell>
  );
}
