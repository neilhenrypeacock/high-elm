import { LegalDoc, H2, P, UL, LI, B } from '@/components/LegalDoc';

export const metadata = {
  title: 'Terms of Service — Hotel Content Radar',
  description:
    'The terms of the agreement between you and High Elm Productions Ltd when you use Hotel Content Radar.',
};

export default function TermsPage() {
  return (
    <LegalDoc eyebrow="Legal" title="Terms of Service" lastUpdated="Last updated: [DATE]">
      <P>
        These terms are the agreement between you and us when you use Hotel Content Radar. Please read
        them — by subscribing to or using the service, you agree to them.
      </P>
      <P>
        Hotel Content Radar is a product of High Elm Productions Ltd (“we”, “us”, “our”), a company
        registered in [England and Wales / Scotland / Northern Ireland — CONFIRM], company number
        [COMPANY NUMBER], registered office [REGISTERED ADDRESS].
      </P>

      <H2>What Hotel Content Radar is</H2>
      <P>
        Hotel Content Radar is a subscription tool for people who manage social media for hotels. It
        tracks the publicly visible Instagram performance of a curated list of luxury hotels,
        highlights posts that have performed unusually well for their own account, and provides a
        regularly refreshed library of content inspiration.
      </P>
      <P>
        The service is designed to give you <B>proven ideas and insight</B> — a starting point for your
        own content decisions. It is an inspiration and analysis tool, not a guarantee of any
        particular outcome (see “No guarantee of results” below).
      </P>

      <H2>Your account</H2>
      <P>
        To use the paid features you need an account. You’re responsible for keeping access to the
        email address you sign up with secure, since we use it to sign you in. Please give us accurate
        information and keep it up to date. The service is intended for business use by hotel and
        hospitality professionals.
      </P>

      <H2>Free trial, subscription and payment</H2>
      <P>
        We may offer a free trial. If you start a trial, you may be asked to provide card details up
        front. Unless you cancel before the trial ends, your paid subscription will begin automatically
        and your card will be charged the then-current subscription fee.
      </P>
      <P>
        Subscriptions renew automatically each billing period until you cancel. You can cancel at any
        time through your account’s billing settings; your cancellation takes effect at the end of the
        current billing period, and you keep access until then. Fees are stated on our website and may
        change — if we change them, we’ll give you reasonable notice and any change will apply from your
        next billing period.
      </P>
      <P>
        Payments are handled by Stripe. By subscribing you also agree to Stripe’s terms as they apply to
        the payment.
      </P>

      <H2>Refunds</H2>
      <P>
        [CONFIRM YOUR REFUND POSITION. A common, simple stance for a monthly SaaS with a free trial:
        “Because we offer a free trial so you can evaluate the service before paying, we do not
        generally offer refunds for subscription periods already started. If something has gone wrong,
        contact us and we’ll do our best to put it right.” Adjust to whatever policy you actually want
        to stand behind — and note that this does not override any refund rights you may be required to
        give under law.]
      </P>

      <H2>No guarantee of results</H2>
      <P>
        This is important, so we’re stating it plainly. Hotel Content Radar shows you what content has
        performed well for <B>other</B> hotels, and how posts have performed relative to a hotel’s own
        typical engagement. We do <B>not</B> promise, guarantee, or warrant that using the service — or
        copying, adapting, or drawing on any content or idea surfaced by it — will improve your own
        engagement, following, bookings, or any other result. Social media performance depends on many
        factors outside our control. You use the insight and ideas at your own discretion.
      </P>

      <H2>About the data we show</H2>
      <P>
        Our analysis is based on <B>publicly available</B> Instagram data. Because we can only see what
        is public, we measure public engagement (such as likes and comments). We do <B>not</B> have
        access to private metrics such as reach, impressions, saves or shares, and our figures do not
        include them. Any “best” or “top” post is the best <B>within the data we hold</B>, not
        necessarily the best of all time.
      </P>
      <P>
        We work hard to keep the data accurate and current, but we provide it “as is” and cannot
        guarantee it is complete, error-free, or up to date at every moment. Instagram is a third-party
        platform we do not control, and changes on their side may affect what we can see.
      </P>

      <H2>Acceptable use</H2>
      <P>
        You agree to use Hotel Content Radar for your own legitimate business purposes and not to:
      </P>
      <UL>
        <LI>share your account access or resell the service without our permission;</LI>
        <LI>
          copy, scrape, or extract the service’s data in bulk to build or feed a competing product;
        </LI>
        <LI>
          attempt to break, overload, reverse-engineer, or gain unauthorised access to the service;
        </LI>
        <LI>use the service in any way that is unlawful or infringes anyone else’s rights.</LI>
      </UL>
      <P>
        The content ideas and insights we provide are for your inspiration. If you choose to reproduce
        or adapt another hotel’s content, you are responsible for ensuring you have the right to do so —
        that’s your call, not ours.
      </P>

      <H2>Our intellectual property</H2>
      <P>
        The Hotel Content Radar service — its design, software, curated hotel selection, analysis,
        written insights and branding — belongs to us. Subscribing gives you the right to use the
        service; it does not transfer ownership of any of it to you.
      </P>

      <H2>Independence and third-party brands</H2>
      <P>
        Hotel Content Radar is an independent product. We are not affiliated with, endorsed by, or
        partnered with Instagram, Meta, Forbes, Condé Nast, Michelin, or any of the hotels,
        publications, or rating organisations we reference. Where we name such brands or accolades, we
        do so descriptively, to identify the hotels and standards we cover.
      </P>

      <H2>Limiting our liability</H2>
      <P>
        Nothing in these terms limits our liability where the law does not allow it to be limited (for
        example, for death or personal injury caused by our negligence, or for fraud).
      </P>
      <P>
        Subject to that, and to the fullest extent permitted by law: we provide the service “as is”; we
        are not liable for indirect or consequential losses, or for lost profits, revenue, or business
        opportunities; and our total liability to you for any claim connected to the service is limited
        to the amount you paid us in the twelve months before the claim arose.
      </P>

      <H2>Suspending or ending access</H2>
      <P>
        You can stop using the service and cancel at any time. We may suspend or end your access if you
        breach these terms, if we’re required to by law, or if we stop offering the service — in which
        case, if you’ve paid in advance for a period you can no longer use, we’ll refund the unused
        portion where appropriate.
      </P>

      <H2>Changes to these terms</H2>
      <P>
        We may update these terms from time to time. If we make significant changes, we’ll update the
        date at the top and, where appropriate, notify you. Continuing to use the service after a change
        means you accept the updated terms.
      </P>

      <H2>Governing law</H2>
      <P>
        These terms are governed by the laws of [England and Wales / Scotland / Northern Ireland —
        CONFIRM], and any disputes will be subject to the courts of that jurisdiction.
      </P>

      <H2>Contact us</H2>
      <P>Questions about these terms? Email [CONTACT EMAIL].</P>
    </LegalDoc>
  );
}
