import AppShell from '@/components/AppShell';
import AccountFrame from '@/components/AccountFrame';
import ManageBillingButton from '@/components/ManageBillingButton';
import ThemeToggle from '@/components/ThemeToggle';
import { requireActiveUser, displayName, isAdminView } from '@/lib/require-access';
import type { SubscriptionStatus } from '@/lib/subscriptions';
import { fmtDate } from '@/lib/format';

export const metadata = {
  title: 'Content Radar — Settings',
};

const STATUS_LABEL: Record<SubscriptionStatus, string> = {
  trialing: 'Free trial',
  active: 'Active',
  past_due: 'Payment due',
  canceled: 'Canceled',
};

const STATUS_TONE: Record<SubscriptionStatus, string> = {
  trialing: 'var(--signal-deep)',
  active: 'var(--signal-deep)',
  past_due: 'var(--error)',
  canceled: 'var(--body-mid)',
};

const cardStyle: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--line)',
  borderRadius: 14,
  boxShadow: 'var(--shadow-card)',
  padding: '26px 28px',
};

const rowLabel: React.CSSProperties = {
  fontFamily: 'var(--font-label), sans-serif',
  fontWeight: 600,
  fontSize: 11,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: 'var(--body-mid)',
};

function CardTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{ fontFamily: 'var(--font-body), sans-serif', fontWeight: 700, fontSize: 18, color: 'var(--ink)', margin: '0 0 4px' }}>
      {children}
    </h2>
  );
}

export default async function SettingsPage() {
  const { user, subscription } = await requireActiveUser();
  const status = subscription?.status;

  return (
    <AppShell userName={displayName(user)} userEmail={user?.email ?? null} isAdmin={isAdminView(user)}>
      <AccountFrame eyebrow="Account" title="Settings" sub="Your membership and billing.">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* ── Membership (display-only) ── */}
          <section style={cardStyle}>
            <CardTitle>Membership</CardTitle>
            <p style={{ fontSize: 13.5, color: 'var(--body-soft)', margin: '0 0 20px', lineHeight: 1.6 }}>
              Your current plan and status.
            </p>

            {status ? (
              <div style={{ display: 'grid', gap: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                  <span style={rowLabel}>Plan</span>
                  <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)' }}>Content Radar</span>
                </div>
                <div style={{ height: 1, background: 'var(--line-soft)' }} />
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                  <span style={rowLabel}>Status</span>
                  <span style={{ fontSize: 15, fontWeight: 600, color: STATUS_TONE[status] }}>
                    {STATUS_LABEL[status]}
                  </span>
                </div>
                {status === 'trialing' && subscription?.trial_end && (
                  <>
                    <div style={{ height: 1, background: 'var(--line-soft)' }} />
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                      <span style={rowLabel}>Trial ends</span>
                      <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)' }}>
                        {fmtDate(subscription.trial_end)}
                      </span>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <p style={{ fontSize: 13.5, color: 'var(--body-mid)', lineHeight: 1.6 }}>
                No active membership is loaded in this local preview (no signed-in session). On the
                live site your plan and status show here.
              </p>
            )}
          </section>

          {/* ── Billing (Stripe Customer Portal) ── */}
          <section style={cardStyle}>
            <CardTitle>Billing</CardTitle>
            <p style={{ fontSize: 13.5, color: 'var(--body-soft)', margin: '0 0 20px', lineHeight: 1.6 }}>
              Update your card, download invoices, or cancel — all in Stripe’s secure portal.
            </p>
            <ManageBillingButton disabled={!subscription?.stripe_customer_id} />
          </section>

          {/* ── Appearance ── */}
          <section style={cardStyle}>
            <CardTitle>Appearance</CardTitle>
            <p style={{ fontSize: 13.5, color: 'var(--body-soft)', margin: '0 0 20px', lineHeight: 1.6 }}>
              How Content Radar looks on this device.
            </p>
            <ThemeToggle />
          </section>
        </div>
      </AccountFrame>
    </AppShell>
  );
}
