// Check 2 — last scheduled scrape outcome, read from the GitHub Actions API.
// Catches "the workflow failed and nobody looked at the Actions tab", and the
// per-step detail shows WHICH stage died (scrape / freshness / insights /
// prune / storage) — a failed insight step also silently skips the prune.

import { SCRAPE_STALE_DAYS } from '../constants.js';
import { ageDays } from '../lib.js';

export const id = 'scrape-outcome';
export const name = 'Last scheduled scrape';

export function evaluate(latestRun, steps, now = Date.now()) {
  if (!latestRun) {
    return {
      status: 'warn',
      headline: 'Could not read the scrape history from GitHub (no token or no runs found).',
      details: ['The freshness check still guards the data itself; this is a visibility gap, not a data problem.'],
    };
  }
  const age = ageDays(latestRun.run_started_at ?? latestRun.created_at, now);
  const label = `${latestRun.name} on ${String(latestRun.run_started_at ?? '').slice(0, 16)} UTC (${age.toFixed(1)}d ago)`;
  const failedSteps = (steps ?? []).filter((s) => s.conclusion && s.conclusion !== 'success' && s.conclusion !== 'skipped');
  if (latestRun.conclusion !== 'success') {
    return {
      status: 'fail',
      headline: `The most recent scrape run FAILED: ${label}.`,
      details: [
        ...failedSteps.map((s) => `Failed step: "${s.name}" (${s.conclusion}).`),
        `Open the run: ${latestRun.html_url}`,
      ],
    };
  }
  if (age > SCRAPE_STALE_DAYS) {
    return {
      status: 'warn',
      headline: `No scheduled scrape has run for ${age.toFixed(1)} days (last: ${label}).`,
      details: ['GitHub disables cron schedules after 60 days of repo inactivity — check the Actions tab if this persists.'],
    };
  }
  return {
    status: 'ok',
    headline: `Last scrape succeeded: ${label}.`,
    details: [],
  };
}

async function latestScrapeRun(ghApi) {
  let best = null;
  for (const wf of ['weekly-scrape.yml', 'monthly-scrape.yml', 'full-scrape.yml']) {
    try {
      const res = await ghApi(`/actions/workflows/${wf}/runs?per_page=1&exclude_pull_requests=true`);
      const run = res?.workflow_runs?.[0];
      if (run && run.status === 'completed' && (!best || run.run_started_at > best.run_started_at)) best = run;
    } catch { /* a workflow may not exist yet; the others still count */ }
  }
  return best;
}

export async function run(ctx) {
  const gh = ctx.ghApi;
  const latest = await latestScrapeRun(gh);
  let steps = [];
  if (latest) {
    try {
      const jobs = await gh(`/actions/runs/${latest.id}/jobs`);
      steps = (jobs?.jobs ?? []).flatMap((j) => j.steps ?? []);
    } catch { /* step detail is a bonus, not a requirement */ }
  }
  ctx.shared.lastScrapeRun = latest; // row-deltas cross-references this
  return evaluate(latest, steps, ctx.now);
}
