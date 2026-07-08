// Shared CTA/route constants for the app shell and public nav. These MATCH the
// values baked into components/Landing.tsx (TRIAL_HREF/LOGIN_HREF at its top) so
// there is one source of truth going forward — the landing keeps its own copy to
// avoid touching that (money) page, but new chrome imports from here.
export const TRIAL_HREF = '/start-trial';
export const LOGIN_HREF = '/login';
