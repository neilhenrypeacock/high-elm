import { LegalDoc, H2, P, UL, LI, B } from '@/components/LegalDoc';

export const metadata = {
  title: 'Privacy Policy — Hotel Content Radar',
  description:
    'How Hotel Content Radar collects, uses and protects your personal information — and the rights you have over it.',
};

export default function PrivacyPage() {
  return (
    <LegalDoc eyebrow="Legal" title="Privacy Policy" lastUpdated="Last updated: 15 July 2026">
      <P>
        This Privacy Policy explains what personal information Hotel Content Radar collects, why we
        collect it, and what rights you have over it. Hotel Content Radar is a product of High Elm
        Productions Ltd (“we”, “us”, “our”). We are the data controller responsible for your personal
        information.
      </P>
      <P>
        We’ve written this in plain English on purpose. If anything is unclear, email us at neil@highelmstudio.com and we’ll explain it properly.
      </P>

      <H2>Who we are</H2>
      <P>
        Hotel Content Radar is operated by High Elm Productions Ltd, a company registered in England and Wales, company number 15336186, registered
        office 6 The Fairland, Hingham, Norfolk NR9 4HN.
      </P>
      <P>
        We are registered with the UK’s Information Commissioner’s Office (ICO), registration number
        ZC112391.
      </P>
      <P>
        For any question about your data, or to exercise any of the rights described below, contact us
        at neil@highelmstudio.com.
      </P>

      <H2>What we collect and why</H2>
      <P>We collect only what we need to run the service. Specifically:</P>
      <P>
        <B>Your email address.</B> We use this to sign you in (we send a secure “magic link” to your
        inbox rather than asking you to remember a password) and to contact you about your account,
        your subscription, and the service. This is necessary to provide the service you’ve signed up
        for.
      </P>
      <P>
        <B>Payment information.</B> When you subscribe, your card details are collected and processed
        entirely by Stripe, our payment provider. We never see or store your full card number — Stripe
        handles that securely on their own systems. We keep a record of your subscription status (for
        example, whether your trial or subscription is active) so we know whether to give you access.
      </P>
      <P>
        <B>Basic usage information.</B> Like most websites, we may collect standard technical
        information such as your browser type and general activity on the site, to keep the service
        working, secure, and reliable.
      </P>
      <P>
        We do <B>not</B> sell your personal information to anyone, and we do not use it for advertising.
      </P>

      <H2>About the hotel data we show</H2>
      <P>
        Hotel Content Radar analyses <B>publicly available</B> Instagram content from luxury hotels —
        the posts, likes and comments that anyone can see on a public Instagram profile. We collect
        this public information about hotel accounts, not about you. We do not have access to private
        Instagram data, and we do not collect personal information about the individuals who run those
        hotel accounts beyond what is already public.
      </P>

      <H2>Who we share it with</H2>
      <P>
        We share personal information only with the service providers who help us run Hotel Content
        Radar, and only as far as they need it to do their job:
      </P>
      <UL>
        <LI>
          <B>Stripe</B> — payment processing.
        </LI>
        <LI>
          <B>Supabase</B> — secure database hosting for your account and subscription records.
        </LI>
        <LI>
          <B>Vercel</B> — website hosting.
        </LI>
        <LI>
          <B>Resend</B> — sending account and login emails.
        </LI>
      </UL>
      <P>
        Each of these is a reputable provider with its own security and data protection obligations. We
        may also share information if we are legally required to (for example, in response to a lawful
        request from an authority).
      </P>

      <H2>How long we keep it</H2>
      <P>
        We keep your account information for as long as you have an account with us, and for a
        reasonable period afterwards to meet our legal and accounting obligations. If you close your
        account and ask us to delete your data, we will do so except where we are legally required to
        keep certain records (such as billing history for tax purposes).
      </P>

      <H2>Your rights</H2>
      <P>Under UK data protection law you have the right to:</P>
      <UL>
        <LI>
          <B>Access</B> the personal information we hold about you.
        </LI>
        <LI>
          <B>Correct</B> it if it is wrong.
        </LI>
        <LI>
          <B>Delete</B> it (in certain circumstances).
        </LI>
        <LI>
          <B>Object to or restrict</B> how we use it.
        </LI>
        <LI>
          <B>Receive a copy</B> of it in a portable format.
        </LI>
      </UL>
      <P>
        To exercise any of these, email us at neil@highelmstudio.com. We’ll respond within the timeframe
        required by law (usually one month). You also have the right to complain to the Information
        Commissioner’s Office (ICO), the UK’s data protection regulator, at ico.org.uk.
      </P>

      <H2>Cookies</H2>
      <P>
        We use only the cookies necessary to keep you securely signed in and to make the service work.
        We do not use advertising or third-party tracking cookies.
      </P>

      <H2>Changes to this policy</H2>
      <P>
        If we make significant changes to this policy, we’ll update the date at the top and, where
        appropriate, let you know by email.
      </P>

      <H2>Contact us</H2>
      <P>Questions about your privacy or this policy? Email neil@highelmstudio.com.</P>
    </LegalDoc>
  );
}
