// health-check/render.js — turns check results into the one daily email.
// Content-first: reads fine as plain text; the HTML is the same text with
// minimal structure, no design system, no images.

const ICON = { ok: '✅', warn: '⚠️', fail: '🔴' };

export function subjectLine(results, now = Date.now()) {
  const d = new Date(now);
  const day = d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
  const fails = results.filter((r) => r.status === 'fail').length;
  const warns = results.filter((r) => r.status === 'warn').length;
  if (fails) return `🔴 Content Radar: ${fails + warns} issue${fails + warns === 1 ? '' : 's'} — ${day}`;
  if (warns) return `⚠️ Content Radar: ${warns} warning${warns === 1 ? '' : 's'} — ${day}`;
  return `✅ Content Radar healthy — ${day}`;
}

export function renderText(results, { runUrl, now = Date.now() } = {}) {
  const fails = results.filter((r) => r.status === 'fail');
  const warns = results.filter((r) => r.status === 'warn');
  const oks = results.filter((r) => r.status === 'ok');
  const lines = [];

  if (fails.length) lines.push(`${fails.length} thing(s) need attention today.`);
  else if (warns.length) lines.push(`Nothing broken, ${warns.length} thing(s) worth a look.`);
  else lines.push(`All ${results.length} checks green. Go think about customers.`);
  lines.push('');

  for (const r of [...fails, ...warns]) {
    lines.push(`${ICON[r.status]} ${r.name}`);
    lines.push(`   ${r.headline}`);
    for (const d of r.details) lines.push(`   · ${d}`);
    lines.push('');
  }

  if (oks.length) {
    lines.push(`— All clear (${oks.length}) —`);
    for (const r of oks) lines.push(`${ICON.ok} ${r.name}: ${r.headline}`);
    lines.push('');
  }

  lines.push(`Run: ${new Date(now).toISOString().slice(0, 16)} UTC${runUrl ? ` · ${runUrl}` : ''}`);
  lines.push('A missing morning email means the checker itself is broken — look at GitHub Actions.');
  return lines.join('\n');
}

export function renderHtml(results, opts = {}) {
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  // Same content as the text version, lightly structured. Anchor-ify bare URLs.
  const linkify = (s) => esc(s).replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1">$1</a>');
  const text = renderText(results, opts);
  return `<div style="font-family: -apple-system, Segoe UI, sans-serif; font-size:14px; line-height:1.55; color:#1D1B17; max-width:640px;"><pre style="white-space:pre-wrap; font-family:inherit; margin:0;">${linkify(text)}</pre></div>`;
}
