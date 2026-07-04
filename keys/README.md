# High Elm — API Keys & Credentials

Central reference for all credentials used across High Elm projects.
Never commit any of the actual `.env` files that contain live keys.

---

## Supabase

**Project:** High Elm main database (hotels, instagram pipeline)
**Dashboard:** https://supabase.com/dashboard

| Variable | Where to find it |
|---|---|
| `SUPABASE_URL` | Project Settings → API → Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Project Settings → API → service_role (secret) |
| `SUPABASE_ANON_KEY` | Project Settings → API → anon (public) |

Live keys stored in: `keys/.env.supabase`

---

## Apify

**Purpose:** Instagram data collection (public posts, profile stats)
**Dashboard:** https://console.apify.com

| Variable | Value / Where to find it |
|---|---|
| `APIFY_TOKEN` | Apify Console → Settings → Integrations → API tokens |
| `APIFY_ACTOR_ID` | `apify/instagram-post-scraper` |

Live keys stored in: `keys/.env.apify`

---

## Other services (add as needed)

| Service | Used in | Keys file |
|---|---|---|
| Anthropic | demos/, outreach/ | — |
| Vercel Blob | outreach/ | — |
| Instantly | outreach/ | — |
