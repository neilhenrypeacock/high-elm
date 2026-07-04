# Firefly Collection Demo — Full Context

## What this is
A single-page AI concierge demo for Firefly Collection (luxury ski chalets), built by High Elm Studio. It's a self-contained HTML file (`chat.html`) + two Vercel serverless functions. Deployed at https://firefly-demo.vercel.app

---

## File structure

```
demos/firefly-demo/
├── chat.html          ← all UI, CSS, JS config, system prompt
├── vercel.json        ← Vercel config (rewrite + function timeout)
├── api/
│   ├── chat.js        ← proxies requests to Anthropic API
│   └── send-email.js  ← no-op stub (email removed)
└── .vercel/           ← project link (do not edit)
```

---

## vercel.json

```json
{
  "functions": { "api/chat.js": { "maxDuration": 30 } },
  "rewrites": [{ "source": "/", "destination": "/chat.html" }]
}
```

---

## api/chat.js

Proxies to Anthropic. Appends `profile` JSON to the system prompt before each call.

```js
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { model, max_tokens, system, messages, profile } = req.body;
  const systemWithProfile = profile
    ? system + '\n\n---\nCurrent conversation profile:\n' + JSON.stringify(profile, null, 2)
    : system;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({ model, max_tokens, system: systemWithProfile, messages }),
  });

  let data;
  try { data = await response.json(); }
  catch { data = { error: { message: 'Upstream error — please try again.' } }; }
  res.status(response.status).json(data);
}
```

---

## api/send-email.js

Stripped to a no-op (email removed from this build):

```js
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  return res.status(200).json({ ok: true });
}
```

---

## chat.html — CSS variables (`:root`)

```css
--navy: #222222;       /* header, buttons, profile panel */
--navy-dark: #111111;  /* hover */
--gold: #f48700;       /* Firefly orange accent */
--gold-dark: #d4702a;  /* accent hover */
--sand: #f0ece5;       /* input / ui element background */
--white: #FFFFFF;
--text: #1a1a1a;
--muted: #7a7068;
--border: rgba(27,58,92,0.12);
--border-light: rgba(27,58,92,0.10);
```

---

## chat.html — Body / layout CSS

```css
body {
  font-family: 'Montserrat', sans-serif;
  background: #d8d2c8;      /* page background — warm stone */
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  overscroll-behavior: none;
  padding: 32px 20px;
}
.wrapper { width: 100%; max-width: 1100px; position: relative; z-index: 1; }
.chat-row { display: flex; gap: 16px; align-items: flex-start; }
.shell { flex: 1; min-width: 0; }
.shell (card) {
  background: #fff;
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 8px 60px rgba(27,58,92,0.10);
  display: flex; flex-direction: column;
  height: 700px;
}
.profile-panel { width: 260px; flex-shrink: 0; height: 700px; border-radius: 20px; background: #222; ... }
@media (max-width: 820px) { .profile-panel { display: none; } .wrapper { max-width: 780px; } }
```

The intended layout: white card (shell) + dark navy panel (profile) side by side, floating on a `#d8d2c8` warm stone background. At viewports ≤820px the profile panel hides.

---

## THE RENDERING ISSUE

The user reports the demo looks like a full-width page, not a floating card. Specifically:

- On a wide desktop browser, the card appears to fill the full viewport width with minimal visible background
- Expected: a clearly floating card with visible warm stone background on all sides
- Actual: the card appears edge-to-edge

Possible causes to investigate:
1. **Viewport width close to wrapper max-width (1100px):** At 1200px viewport, only ~50px of background is visible on each side. Very little visual separation.
2. **Profile panel hidden at narrow widths:** Below 820px, the `.profile-panel` hides and `.wrapper` max-width drops to 780px. At 900px viewport, background is only ~60px on each side.
3. **The `--sand` value used for `body` previously** was `#fdfeff` (near-white), making card and background indistinguishable. Fixed to `#d8d2c8` but may not have propagated if user is seeing a cached version.
4. **Cache:** Vercel deployment may be cached in user's browser. Hard refresh (`Cmd+Shift+R`) needed.

---

## Fonts

```html
<link href="https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=Montserrat:wght@400;600&family=Open+Sans:wght@300;400;600;700&display=swap" rel="stylesheet">
<link href="https://fonts.googleapis.com/css2?family=League+Spartan:wght@400;600&display=swap" rel="stylesheet">
```

- Display/headings: Libre Baskerville (serif)
- Body/nav/buttons: Montserrat
- League Spartan: loaded but not actively used in main UI

---

## Splash screen

- Background: `#F5F0E8` (warm cream)
- Navy leaf SVG (fill `#222222`) with faint white vein lines
- Text: "A demo built for" / italic "Firefly Collection"
- Pill buttons: WhatsApp (+44 7786 572258) + email (neil@highelm.studio)
- `onclick="dismissSplash()"` — sets `sessionStorage.setItem('firefly-splash-seen', 'true')`
- Fade out on click (`.fade` class → `opacity: 0`) then `display: none` after 500ms

---

## Header

- Logo: `<img src="https://fd505970.delivery.rocketcdn.me/wp-content/themes/FDRY-version-2/images/Firefly-logo-nobg.svg">` with CSS `filter: brightness(0) invert(1)` (white)
- Text fallback if image fails: `FIREFLY COLLECTION`
- Tagline: `Luxury Ski Chalets · Est. 2011` with gold pulsing dot
- Topbar (above card): `Alpine Concierge · Demo`
- Badge: `AI Concierge`
- Avatar: `FC` (navy circle, gold text)

---

## JS Config

```js
const GROUP_OPTIONS = [
  { key: 'solo',       label: 'Solo',         steppers: [] },
  { key: 'couple',     label: 'Couple',        steppers: [] },
  { key: 'friends',    label: 'Friends',       steppers: [{ key: 'count', label: 'How many?', min: 3, max: 16 }] },
  { key: 'family',     label: 'Family',        steppers: [
    { key: 'adults', label: 'Adults', min: 1, max: 8 },
    { key: 'kids',   label: 'Kids',   min: 0, max: 8 }
  ]},
  { key: 'family_dog', label: 'Family + Dog',  steppers: [
    { key: 'adults', label: 'Adults', min: 1, max: 8 },
    { key: 'kids',   label: 'Kids',   min: 0, max: 8 },
    { key: 'dogs',   label: 'Dogs',   min: 1, max: 3 }
  ]}
];

const WHEN_MONTHS = ['December', 'January', 'February', 'March', 'April'];
const WHEN_SEASONS = ['Christmas', 'New Year', 'January', 'February half-term', 'March', 'Easter'];
const WHEN_DURATION_RANGE = { min: 3, max: 14, default: 7 };

const WHERE_DESTINATIONS = [
  { key: 'val-disere',      label: "Val d'Isère" },
  { key: 'verbier',         label: 'Verbier' },
  { key: 'courchevel-1850', label: 'Courchevel 1850' },
  { key: 'meribel',         label: 'Méribel' },
  { key: 'lech',            label: 'Lech' },
  { key: 'st-anton',        label: 'St Anton' },
  { key: 'zermatt',         label: 'Zermatt' },
  { key: 'chamonix',        label: 'Chamonix' },
  { key: 'megeve',          label: 'Megève' },
  { key: 'dolomites',       label: 'Dolomites' },
  { key: 'open',            label: 'Open to suggestions' }
];

const BUDGET_BANDS = [
  { key: 'low',  label: '£20k–£50k',  min: 20000,  max: 50000  },
  { key: 'mid',  label: '£50k–£100k', min: 50000,  max: 100000 },
  { key: 'high', label: '£100k+',     min: 100000, max: 250000 }
];
const BUDGET_SLIDER = {
  step: 2500,
  format: (n) => '£' + (n / 1000).toFixed(0) + 'k/week'
};

const PROPERTY_MATCH_ENABLED = false;
```

---

## AI model

`claude-sonnet-4-20250514`, `max_tokens: 600`

---

## 6-step flow tags

The AI emits special tags that the frontend parses and renders as interactive UI:

| Tag | What it renders |
|---|---|
| `[GROUP:]` | Group type cards (Solo/Couple/Friends/Family/Family+Dog) + steppers |
| `[WHEN:]` | Date picker (exact / approximate / flexible) + duration slider |
| `[WHERE:]` | Destination multi-select pill cards |
| `[MULTISELECT:A\|B\|C]` | Multi-select chips (priorities step) |
| `[BUDGET:]` | Budget band cards + optional slider |
| `[NOTES:placeholder]` | Free-text textarea |
| `[COLLECT]` | Email capture form |
| `[SHOW:id1,id2]` | Property cards from inventory |
| `[PROFILE:key=value]` | Silently updates the profile panel |

---

## Opening message

"Whether it's Christmas in Val d'Isère, New Year in Verbier or a milestone week in Lech — tell me what you've got in mind and I'll point you in the right direction."

---

## Deployment

- Vercel project: `firefly-demo` under `wisprteam`
- Production URL: https://firefly-demo.vercel.app
- Env var required: `ANTHROPIC_API_KEY` (set in Vercel dashboard)
- No `RESEND_API_KEY` needed (email removed)

---

## What to ask Claude to diagnose

"The page at https://firefly-demo.vercel.app should show a floating white card on a warm stone background (`#d8d2c8`). On a wide desktop browser the user reports the card looks full-width / edge-to-edge rather than floating. Here is the full layout CSS. Can you identify why the card might not appear to float, and suggest a fix that makes it clearly look like a card at all common desktop viewport widths (1280px, 1440px, 1920px)?"
