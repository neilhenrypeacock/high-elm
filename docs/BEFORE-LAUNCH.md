# Before launch — the running list

Short, and meant to stay short. Things that should be true before Content Radar
is sold to someone who isn't Neil. Tick them off here; the reasoning lives in
`HANDOFF-2026-08-06.md`.

Anything that is a *decision* rather than a task goes in §8 of the handoff, not
here.

---

## Open

- [ ] **Prove the session actually survives an hour.** Log in, leave it well
      over an hour without touching the site, come back and click between gated
      pages. Bounced to `/login` = the missing `middleware.ts` is real and needs
      writing (handoff §7b). No work to do until the test says so — it just
      needs elapsed time.

- [ ] **Check `ADMIN_EMAILS` in Vercel production.** The founding-places count
      excludes founder accounts using that allowlist. If the env var is set in
      Vercel and does *not* include `nhpeacock@gmail.com`, the 6 Aug test
      subscription counts as a real customer and the public site drops to
      "19 of 20 places left". If the var is unset the built-in defaults cover
      it and there is nothing to do. One look settles it:
      https://vercel.com/highelmstudio/dashboard/settings/environment-variables

- [ ] **Watch where the confirmation emails land.** The first one went to spam.
      Every auth record is correct, so this is new-domain reputation and should
      settle. If it hasn't after the first dozen real signups, revisit — do not
      change DNS before then (handoff §2).

- [ ] **Move the health digest off `onboarding@resend.dev`.** It currently sends
      from Resend's sandbox, which is what hid the signup outage for two days.
      Needs a new-account key in the `RESEND_API_KEY` GitHub secret plus
      `ALERT_FROM` set in the workflow env — note it is defaulted in *three*
      files, so a one-file edit leaves two still on the sandbox (handoff §8).

---

## Done

- [x] Signup works — probe clean *and* a real email received (6 Aug)
- [x] Real card end to end, `subscriptions` row written by the live webhook (6 Aug)
- [x] A member can cancel themselves via `/settings` → Stripe portal (6 Aug)
- [x] Vercel auto-deploy confirmed working, 37s and 44s on two merges (6 Aug)
- [x] Leaked deploy hook deleted (6 Aug)
- [x] `hello@hotelcontentradar.com` alias added, so replies don't bounce (6 Aug)
- [x] Founding places counted from the database instead of hand-edited, so the
      public number and the price a customer is charged both follow reality
      (6 Aug). Failure path tested by injecting a fault: the scarcity line
      disappears rather than guessing, and checkout refuses rather than
      charging the wrong price for life.
