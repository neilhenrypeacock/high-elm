# High Elm — Instagram Portfolio Dashboard

Read-only Next.js dashboard showing Instagram performance for 465 Forbes Five-Star hotels.

## How to start the dashboard

```bash
npm install
npm run dev
```

Then open http://localhost:3000

## What it shows

- **Summary cards** — hotels tracked, hotels with data, total posts, data freshness date
- **Hotel table** — sortable by followers, engagement rate, posts/week, or last posted date
- **Region filter** — narrow to a specific region
- **Search** — filter by hotel name or Instagram handle

**Engagement rate** = avg(likes + comments) across the hotel's posts in the last 30 days ÷ followers × 100. Posts with hidden like counts are excluded. Public data only — no reach or impressions.

## Environment variables

Create `.env.local` with:
```
SUPABASE_URL=https://dndefddhocxqczinfpfg.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service role key>
```

The service role key never goes to the browser — all Supabase queries run in server components.

## Deploying to Vercel

```bash
vercel --prod
```

Add the two env vars above in Vercel project settings. Do **not** use `NEXT_PUBLIC_` prefix on the service role key.

## Re-running a scrape

See `../instagram-pipeline/README.md`

---

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
