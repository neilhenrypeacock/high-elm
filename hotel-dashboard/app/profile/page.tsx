import AppShell from '@/components/AppShell';
import AccountFrame from '@/components/AccountFrame';
import ProfileForm from '@/components/ProfileForm';
import SetPasswordForm from '@/components/SetPasswordForm';
import { requireActiveUser, displayName, hotelName } from '@/lib/require-access';

export const metadata = {
  title: 'Content Radar — Profile',
};

export default async function ProfilePage() {
  const { user } = await requireActiveUser();
  const meta = (user?.user_metadata ?? {}) as Record<string, unknown>;
  const initialName = typeof meta.full_name === 'string' ? meta.full_name : '';

  return (
    <AppShell userName={displayName(user)} userEmail={user?.email ?? null}>
      <AccountFrame
        eyebrow="Account"
        title="Profile"
        sub="Your details for Content Radar. Your name and hotel help us tailor what you see."
      >
        <ProfileForm
          initialName={initialName}
          initialHotel={hotelName(user)}
          email={user?.email ?? ''}
          editable={!!user}
        />
        <SetPasswordForm editable={!!user} />
      </AccountFrame>
    </AppShell>
  );
}
