# Follow-up brief — Phase 3 minor fixes (Content Radar)

**Created:** 2026-07-15
**Source:** `review-findings-2026-07-15.md` (read-only review). This brief is the approved, scoped treatment for the minor findings — diagnosis and treatment were deliberately split.
**Branch/PR:** do this on a fresh feature branch off `main` → PR (worktree + PR workflow). One pass; review after.
**Severity of everything here:** 🟡 minor. Nothing is urgent or blocking. Pick and choose — each item is independent.

## Hard boundaries (do NOT touch)
- `lib/data.ts` and the entire metrics/data layer, breakout logic, leaderboard, dashboard views.
- `lib/require-access.ts` and any auth / Stripe / webhook / subscription code.
- Existing `/dashboard`, `/saved`, `/watchlist`, `/profile`, `/settings`, `/admin` behaviour.
- The new `/privacy`, `/terms` pages and their copy/placeholders.
If a fix seems to require touching any of the above, stop and flag it.

---

## F1 — Refresh `hotel-dashboard/CLAUDE.md` (docs, from finding M1)
The "File structure" + key-component sections are stale. Update them to reflect reality:
- Add the **`/admin`** route (`app/admin/page.tsx`, gated via `requireAdminUser`) and its components `AdminEditor.tsx`, `AdminPill.tsx`.
- Add the account-shell / chrome layer omitted today: `AppShell.tsx`, `AppFooter.tsx`, `PublicChrome.tsx`, `AccountFrame.tsx`, `SaveToggle.tsx`, `EmptyState.tsx`, `PageInfo.tsx`/`PageInfoButton.tsx`, the auth forms (`LoginForm`/`SignupForm`/`TrialSignupForm`/`SetPasswordForm`/`ProfileForm`), `ThemeToggle.tsx`, `WelcomeOverlay.tsx`, `ManageBillingButton.tsx`.
- Add the new public **`/privacy`**, **`/terms`** routes + `components/LegalDoc.tsx`.
One-line descriptions each; match the existing terse style. Doc-only change — no code.

## F2 — Refresh `hotel-dashboard/README.md` (docs, from finding M2)
- Line 3 marketing-pages list: add `/privacy` and `/terms`.
- The "gated behind a Supabase **magic-link** session" wording predates BETA mode. Soften to reflect that beta auth is **email+password primary** with magic-link fallback (`lib/auth-mode.ts`, `STRIPE_DISABLED`), or generalise to "a Supabase session + active trial/subscription".
Doc-only change.

## F3 — De-duplicate the `hasVisibleLikes` rule (code, from finding M3)
`components/Landing.tsx:74` re-implements the hidden-likes invariant locally: `const hasVisibleLikes = (n) => n !== -1 && n !== null`. The canonical version is exported from `lib/data.ts:207` (object form). They agree today, but the rule could drift on the money page.
- Preferred: export a small scalar helper from `lib/data.ts` (e.g. `hasVisibleLikesCount(n: number | null)`), have the object `hasVisibleLikes` delegate to it, and import it in `Landing.tsx` so there's one source of truth.
- Landing is the conversion page — verify the taster still renders identically (same posts shown/hidden) after the change. Run build + the taster in preview.
- Keep the change surgical; don't restyle or refactor anything else on Landing.

## F4 — Git housekeeping (no code; your call, from finding M5)
- Prune orphaned post-merge remote branches once you confirm each is merged: `admin-editor` (landed as #20/#21) and the dashboard-feed refresh branch (landed as #22) — `git push origin --delete <branch>`.
- Decide the canonical **insight-job** branch between `feature/ai-insight-opus` and `pipeline-insight-sonnet` and delete the superseded one.
- `landing-copy-400-refresh` is an open, unmerged branch that changes the hotel count **200+ → 400+**. When/if it lands, do a repo-wide sweep of the "200+/~205" copy in the site + docs to match. (The new legal pages contain no counts, so they're unaffected.) Not part of this brief — just noted so it isn't forgotten.

## Out of scope / deliberately skipped
- **F-none: style-constant duplication (M4)** — `INNER`/font/eyebrow objects repeated across components. Acceptable per-component pattern; leave as-is unless it actually drifts.
- **demos/ submodule dirty state (M6)** — cosmetic, no action (confirmed).

## Done when
- Chosen items implemented on a feature branch → PR.
- `npm run build` passes, `npm run lint` clean, `npm test` green.
- No files outside the items above changed; the hard boundaries untouched (confirm via `git diff`).
