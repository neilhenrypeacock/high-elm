# Content Radar — Read-only review findings

**Date:** 2026-07-15
**Reviewed at:** HEAD of `legal-pages-footer` (= `origin/main` @ `c67651c` + the Phase 2 legal-pages/​footer commit). This is the state after the Phase 2 build was committed, per brief.
**Scope:** the `hotel-dashboard/` Next.js app plus repo-level git/doc state, covering roughly the last two weeks of work (account shell, dashboard filters, Save/Watchlist, admin editor, go-live/auth, ops).
**Nature:** strictly read-only. No code, config, data, or git state was changed. This findings file is the only addition.

---

## Verdict

**The codebase is healthy. 0 critical, 0 important. Only minor doc-staleness and git-housekeeping items.**

- ✅ **Auth gate is closed and correct** — no bypass path survives in production (highest-priority check).
- ✅ **No dead or orphaned code** — every component and lib file is imported; the legacy files marked "removed" in the docs are genuinely gone; no leftover placeholder `/saved` or `/watchlist`.
- ✅ **Coupled constants in `lib/data.ts` intact** — `BASELINE_POSTS` / `HOTEL_ER_POSTS` still derive from `RECENT_POSTS`; `OUTLIER_THRESHOLD` unchanged.
- ✅ **Build / lint / tests pass** — production build succeeds, ESLint clean, 44/44 vitest tests pass.
- ✅ **No crossover/duplication that matters** — one small, currently-harmless code duplication noted below.

The minor items below are listed **in the order they should be addressed**. None block shipping.

---

## 🔴 Critical

None.

## 🟠 Important

None.

## 🟡 Minor (in fix order)

### M1 — `hotel-dashboard/CLAUDE.md` file structure is stale (highest-value doc fix)
**Where:** `hotel-dashboard/CLAUDE.md`, "File structure" + `components/` sections.
**What:** The docs predate several shipped features and omit them entirely:
- The **`/admin`** route (`app/admin/page.tsx`, gated via `requireAdminUser`) and its components `AdminEditor.tsx`, `AdminPill.tsx` — not listed at all.
- The account-shell / chrome layer: `AppShell.tsx`, `AppFooter.tsx`, `PublicChrome.tsx`, plus `AccountFrame.tsx`, `SaveToggle.tsx`, `EmptyState.tsx`, `PageInfo.tsx`/`PageInfoButton.tsx`, the auth forms (`LoginForm`/`SignupForm`/`TrialSignupForm`/`SetPasswordForm`/`ProfileForm`) and `ThemeToggle.tsx` — the `components/` section still lists only the original ~7 major components.
- The new public **`/privacy`** and **`/terms`** pages + `components/LegalDoc.tsx` (expected — added in this session's Phase 2).

**Why it matters:** The docs are the onboarding contract; a structure section that silently omits a whole gated route (`/admin`) and the entire account-shell erodes trust in the rest of the file. No runtime impact.
**Recommended fix (separate brief):** Refresh the "File structure" + key-component list — add `/admin`, the chrome/account components, and the new `/privacy`,`/terms`,`LegalDoc.tsx`. One-line descriptions are enough.

### M2 — `hotel-dashboard/README.md` marketing-pages list + auth wording stale
**Where:** `hotel-dashboard/README.md:3`.
**What:** (a) "Public marketing pages at `/`, `/how-it-works`, `/about`" now also includes `/privacy` and `/terms`. (b) "gated behind a Supabase **magic-link** session" predates BETA mode — auth is now **email+password primary**, magic link fallback (`lib/auth-mode.ts`, `STRIPE_DISABLED`).
**Why it matters:** Minor; README describes the intended launch shape, but the auth line is misleading during beta. No runtime impact.
**Recommended fix (separate brief):** Add `/privacy`,`/terms` to the marketing list; note the beta password-auth mode (or soften "magic-link" to "Supabase session").

### M3 — `hasVisibleLikes` business rule re-implemented in `Landing.tsx`
**Where:** `components/Landing.tsx:74` vs `lib/data.ts:207`.
**What:** `lib/data.ts` exports the canonical `hasVisibleLikes(p: { likes_count })` (the "hidden likes → exclude `null` **and** `-1`" invariant). `Landing.tsx` reimplements it locally as `const hasVisibleLikes = (n) => n !== -1 && n !== null` — even though it already imports types from `@/lib/data`.
**Why it matters:** The two definitions agree **today**, so there's no current bug. But the hidden-likes rule is a documented data invariant; a future change to it in `lib/data.ts` would silently *not* propagate to the public landing taster, quietly showing "0 likes" where likes are hidden. A latent drift risk on the money page.
**Recommended fix (separate brief, low priority):** Have `Landing.tsx` derive its check from the shared helper (e.g. export a scalar variant `hasVisibleLikesCount(n)` from `lib/data.ts` and use it in both places). Touch the landing page carefully — it's the conversion page.

### M4 — Repeated layout/typography style constants across components
**Where:** `INNER` (9 files), the `--font-label`/`--font-display` fallback strings (~8 files), and `eyebrow`/`eyebrowLink` (5 files: `PublicChrome`, `LegalDoc`, `Landing`, `about`, `how-it-works`).
**What:** Each page/component re-declares near-identical style objects. All values currently agree.
**Why it matters:** Purely a DRY/maintainability observation — no bug, and per-page ownership of layout width is a defensible pattern. Flagged only for completeness.
**Recommended fix (optional):** A shared `lib/styles.ts` (or `lib/layout.ts`) for the truly-identical tokens if this ever drifts. Not worth doing pre-emptively.

### M5 — Git housekeeping: undeleted post-merge remote branches + parallel insight branches
**Where:** repo remotes.
**What:**
- `git branch -r --merged origin/main` reports none, but several remote branches' work has clearly **squash-merged** into main (so `--merged` can't see it): `admin-editor` (landed as #20/#21, in main history), and the dashboard-feed refresh (landed as #22). These remote branches were never deleted → orphaned.
- Two parallel **insight-job** branches look like competing/superseded approaches: `feature/ai-insight-opus` (2026-07-12) and `pipeline-insight-sonnet` (2026-07-15, "run on Sonnet 5"). Likely the Opus one is superseded by the Sonnet one — worth confirming the canonical one and pruning the other.
- `landing-copy-400-refresh` (2026-07-15) is an **open, unmerged** branch that unifies the hotel count to "400+". Not a defect in HEAD, but note it conflicts with the current **"200+/~205"** copy across the site/docs — when it lands, the count references will need a sweep. (The new `/privacy`,`/terms` pages contain no hotel counts, so they're unaffected.)

**Why it matters:** Pure housekeeping; no code impact. Orphaned branches make the branch list noisy and obscure what's actually in flight.
**Recommended fix (separate, your call):** After confirming each is merged/superseded, `git push origin --delete <branch>` for `admin-editor` and the merged feed branch; decide Opus-vs-Sonnet insight and prune the loser.

### M6 — `demos/` embedded-repo dirty state (known cosmetic — no action)
**Where:** repo root `git status` shows `m demos/athena`, `demos/athena-portugal`, `demos/safari-edit`, `? demos/bramble-ski`, `m outreach`.
**What:** Embedded Git repos inside the monorepo report as modified/untracked submodule-ish entries.
**Why it matters:** **Not a defect** — flagged as expected per the brief. No action.

---

## Explicit confirmations (the checklist items)

| Check | Result | Evidence |
|---|---|---|
| **Auth gate — no bypass in prod** | ✅ | `UNGATED_DEV_MODE` appears only in a *comment* in `lib/require-access.ts:16`; the sole bypass `DISABLE_DASHBOARD_AUTH` is hard-guarded `NODE_ENV !== 'production' && …` (`require-access.ts:18-19`). |
| **Gated routes redirect to `/login` when logged out** | ✅ | No middleware; every gated page (`dashboard`, `hotel`, `profile`, `settings`, `saved`, `watchlist`) calls `requireActiveUser()`, `/admin` calls `requireAdminUser()`. `requireActiveUser` → `redirect('/login')` on no session (`require-access.ts:36-38`). Page-gating map verified: exactly those 7 routes gated; `/`,`/about`,`/how-it-works`,`/login`,`/subscribe`,`/start-trial`,`/privacy`,`/terms` public. |
| **API routes gated** | ✅ | `profile`/`saves`/`watchlist` → `checkApiAccess`; `admin/insight` → `checkAdminApiAccess`; `billing-portal` deliberately session-only (401 on no session); `webhooks/stripe` signature-verified; `checkout` returns 503 under `STRIPE_DISABLED`; auth endpoints public by design. |
| **No dead/redundant code** | ✅ | All 30 components + 17 lib files imported; `insights` table not queried anywhere (dead per docs, correctly unused); `StandoutPosts`/`TrendPanel`/`FilteredDashboard`/`TopHotels` confirmed deleted; no orphan `/saved`,`/watchlist` placeholders. |
| **Coupled constants intact (READ ONLY)** | ✅ | `lib/data.ts`: `RECENT_POSTS=30` (l.9), `HOTEL_ER_POSTS=RECENT_POSTS` (l.10), `OUTLIER_THRESHOLD=2` (l.11), `BASELINE_POSTS=RECENT_POSTS` (l.49) — coupling to the single `RECENT_POSTS` source is intact and consistent. **`lib/data.ts` not modified.** |
| **Build health** | ✅ | `npm run build` succeeds (`/privacy`,`/terms` prerender as ○ Static); `npm run lint` clean; `npm test` 44/44 pass. |
| **Git/worktree residue** | ⚠️ minor (M5) | Two worktrees (main + this review's `legal-pages-footer`), both clean; orphaned post-merge remote branches noted in M5. |
| **Docs still true** | ⚠️ minor (M1/M2) | `hotel-dashboard/CLAUDE.md` + `README.md` staleness noted; `instagram-pipeline/CLAUDE.md` auth/constants claims spot-checked accurate. |

---

## Out of scope (not touched)
`lib/data.ts` / the metrics layer, breakout logic, leaderboard, dashboard views, `lib/require-access.ts`, Stripe/webhook/subscription code, and existing `/saved`,`/watchlist`,`/profile`,`/settings` behaviour were **inspected read-only only**. Any fixes for M1–M5 should be a separate, approved brief — diagnosis and treatment are deliberately kept apart.
