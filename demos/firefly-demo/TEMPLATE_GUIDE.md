# Chat Demo Template Guide

This document is the handover reference for Claude instances preparing a `DEMO_BRIEF.md` for a new prospect.

**Template location:** `/Users/neilpeacock/Projects/high-elm/templates/chat-demo/`  
**Live reference:** https://chat-demo-wisprteam.vercel.app/chat.html

---

## How a new demo gets built

1. **Briefing Claude** (web/desktop) works with Neil to research the prospect, design the persona, write the system prompt, and output a `DEMO_BRIEF.md`.
2. **Claude Code** reads the brief, duplicates `templates/chat-demo/` to a new folder, fills in every placeholder, and deploys to Vercel.

The brief is the handoff between the two. It must be complete enough that Claude Code does not need to ask Neil anything.

---

## File structure

```
templates/chat-demo/
├── chat.html          ← the entire UI — all CSS, HTML, and JavaScript in one file
├── api/
│   ├── chat.js        ← Anthropic API proxy (no changes needed per prospect)
│   └── send-email.js  ← AI-generated email summary + team notification
├── vercel.json        ← routing (no changes needed)
└── .env.example       ← ANTHROPIC_API_KEY and RESEND_API_KEY
```

---

## Complete placeholder reference

Everything marked `[SQUARE BRACKETS]` or `// TEMPLATE:` needs to be filled in. Below is the complete list, grouped by file.

---

### `chat.html` — what to fill in

#### Brand identity

| Placeholder | Where in file | What to provide |
|---|---|---|
| `[BRAND_NAME]` | `<title>`, header `.hname`, throughout | Company name e.g. `Athena Advisers` |
| `[BRAND_TAGLINE]` | Header `.hsub` | Short descriptor e.g. `French Riviera · Est. 1977` |
| `[X]` in `aiAv()` | JS, `av.textContent` | Adviser initials e.g. `AT`, `MZ`, `HE` |
| `[BRAND_URL]` | `mkBookCta()` href | Company website e.g. `https://www.brand.com` |
| CSS `:root` colours | Lines 13–20 | See colour tokens section below |

#### Content

| Placeholder | Where in file | What to provide |
|---|---|---|
| `const L = []` | JS, inventory section | Full property/listing array (see format below) |
| `const SYS = \`\`` | JS, system prompt section | Full generated system prompt |
| `[Opening message here]` | `init()` at bottom | The AI's first message verbatim |
| Input placeholder `Ask anything…` | `.ibar input` | Context-specific e.g. `Ask about properties on the Côte d'Azur…` |
| Topbar descriptor `AI Concierge · Demo` | `.powered` div | e.g. `Luxury Property Intelligence · Demo` |

#### Profile panel

| Placeholder | Where in file | What to provide |
|---|---|---|
| `const profile = {...}` keys | JS state section | The profile fields the system prompt tracks. Must match `[PROFILE:key=value]` tags in system prompt |
| `PROFILE_LABELS` keys | JS | Human-readable labels for each profile key |
| `PROFILE_ORDER` array | JS | The order fields appear in the panel |
| `UI_STRINGS.en.labels` | JS | Same labels, in the language strings object |
| `UI_STRINGS.en.placeholder` | JS | Same as input placeholder above |

**Note on profile keys:** the system prompt emits `[PROFILE:key=value]` tags. Whatever keys are used in the system prompt must exactly match the keys in `const profile`, `PROFILE_LABELS`, `PROFILE_ORDER`, and `UI_STRINGS.en.labels`. If they don't match, the panel won't update.

#### Budget slider (if used)

| Placeholder | Where in file | What to provide |
|---|---|---|
| `BUDGET.min` | JS | Minimum value in the prospect's currency |
| `BUDGET.max` | JS | Maximum value |
| `BUDGET.step` | JS | Step increment |
| `BUDGET.default` | JS | Default slider position |
| `BUDGET.format` | JS | Currency formatter function e.g. `'£' + (n/1000000).toFixed(1) + 'm'` |
| Budget tick labels | `ticks.innerHTML` | e.g. `'<span>£500k</span><span>£2m</span><span>£10m</span><span>£30m</span>'` |

#### Language switcher

The template ships with English only. Add more `<div class="lang-opt">` entries with `data-lang` and `data-instruction` attributes if multi-language is needed. Also add matching entries to `UI_STRINGS`.

---

### `api/send-email.js` — what to fill in

| Placeholder | What to provide |
|---|---|
| `const PROPERTIES = []` | Same array as `const L` in `chat.html` |
| `[BRAND_NAME]` (multiple) | Company name throughout email HTML |
| `[BRAND_TAGLINE]` | Company descriptor in email header |
| `[BRAND_URL]` | Company website in email footer and adviser card |
| `[X]` adviser initial | Single letter initial in adviser avatar div |
| `[One or two sentences about the brand…]` | Short brand bio for the email adviser card |
| `[FROM_EMAIL]` | Verified Resend sender e.g. `Athena AI <hello@athena.com>` |
| `[NOTIFY_EMAIL]` | Client's team inbox for lead notifications |
| AI analysis system prompt | The `system:` field in the Anthropic call — update `[BRAND_NAME]` references |

**Note:** `send-email.js` uses Claude to analyse the conversation and generate a personalised summary before sending. The system prompt inside it is brief (not the main `SYS`) — it just extracts structured data from the conversation history.

---

## The tag system

The AI uses special tags in its responses to trigger UI components. Claude Code must ensure the system prompt uses these tags exactly as specified.

| Tag | What it does | When to use |
|---|---|---|
| `[PROFILE:key=value]` | Silently updates the profile panel. Never shown to user. | Whenever the AI learns something new about the buyer. Can chain: `[PROFILE:budget=€3m\|timeline=6 months]` |
| `[SHOW:1,3,5]` | Renders property/listing cards using IDs from `const L` | At the recommendation stage only. Use 2–3 IDs max. |
| `[CHOICES:A\|B\|C]` | Renders clickable option pills | For simple single-choice questions at any stage |
| `[MULTISELECT:A\|B\|C]` | Renders selectable chip buttons | For multi-preference questions (property type, travel style) |
| `[BUDGET]` | Renders the interactive budget slider | Once per conversation, at the qualification stage |
| `[COLLECT]` | Renders the email + name capture form | At Stage 7 (capture) only |
| `[BOOK]` | Renders the booking/contact CTA button | After `[COLLECT]` is submitted |

**Important:** tags are stripped from the visible message before display. The AI can emit them mid-paragraph — only the surrounding text appears to the user.

---

## CSS colour tokens

The template uses five CSS variables. Replace the hex values in `:root` — do not rename the variables.

| Variable | Default | Purpose |
|---|---|---|
| `--navy` | `#1B3A5C` | Primary dark — header bg, buttons, profile panel bg, user message bubbles |
| `--navy-dark` | `#122840` | Hover state for navy elements |
| `--gold` | `#C9A96E` | Accent — typing dots, tag labels, active borders, submit buttons, send beacon on hover |
| `--gold-dark` | `#A8884A` | Hover state for gold elements |
| `--sand` | `#F8F5F0` | Page background, input field background |

The email template in `send-email.js` uses hardcoded hex values (email clients don't support CSS variables). If brand colours change, update both the CSS variables in `chat.html` AND the hex values in the email HTML.

---

## `const L` — inventory format

Each listing object must have these exact fields:

```javascript
const L = [
  {
    id: 1,                          // integer, must be unique, used in [SHOW:] tags
    name: "Property Name",          // display name
    location: "Area, Region",       // shown under name and as card image placeholder
    price: "€2,500,000",            // formatted string with currency symbol
    beds: "4 bedrooms",             // bedroom count (or equivalent for non-property)
    size: "280m²",                  // size or key spec
    tag: "Exclusive",               // small label above the name (e.g. "Rare", "New", "Off-market")
    desc: "One or two sentences...",// 20–35 words. First sentence atmosphere, second fact.
    url: "https://..."              // link for "View listing →" — company website or specific page
  },
  // ...
];
```

The same array (without `beds`/`size`/`tag` if not relevant) goes into `send-email.js` as `const PROPERTIES`.

---

## The opening message

The opening message is set in `init()` at the bottom of the script:

```javascript
const opening = '[Opening message here]';
addMsg('ai', opening);
hist.push({ role: 'assistant', content: opening });
```

This must exactly match what the system prompt instructs the AI to say at Stage 1. The briefing Claude should write the opening message verbatim. It is typically one sentence of atmosphere + one question.

---

## Deployment

New demo folders follow the pattern `high-elm/demos/[company-slug]/`. After filling all placeholders:

```bash
cd /Users/neilpeacock/Projects/high-elm/demos/[company-slug]
vercel --prod
```

Vercel will auto-detect the `vercel.json` routing. Set `ANTHROPIC_API_KEY` and `RESEND_API_KEY` in the Vercel project environment variables.

---

## The `DEMO_BRIEF.md` format

The briefing Claude outputs this file. Claude Code reads it and builds the demo from it. Every section is required — if a section is incomplete, Claude Code will have to guess or ask, which defeats the purpose.

---

```markdown
# DEMO_BRIEF — [Company Name]

## Build instructions
Duplicate `/Users/neilpeacock/Projects/high-elm/templates/chat-demo/` to
`/Users/neilpeacock/Projects/high-elm/demos/[company-slug]/`.
Fill in every placeholder below. Deploy with `vercel --prod` from that folder.

---

## Brand tokens

Primary colour (--navy):     #______  [used for header, buttons, profile panel]
Navy dark (--navy-dark):     #______  [hover state — usually 10–15% darker]
Accent colour (--gold):      #______  [used for dots, tags, active borders]
Accent dark (--gold-dark):   #______  [hover state for accent]
Background (--sand):         #______  [page and input bg — usually a warm off-white]

Display font:     [Font Name] — [Google Fonts URL]
Body/UI font:     [Font Name] — [Google Fonts URL]

Logo URL: [direct .png or .svg URL, or "none — use text only"]

---

## Header

Brand name (.hname):          [Company Name]
Tagline (.hsub):              [descriptor · Est. year  OR  sector · location]
Input placeholder:            [e.g. "Ask about ski properties in the Alps…"]
Topbar descriptor (.powered): [e.g. "Alpine Property Intelligence · Demo"]
Adviser initials (aiAv):      [2 letters e.g. AT]
Brand URL (mkBookCta href):   [https://www.company.com]

---

## Profile panel

Profile fields (must match [PROFILE:] tags in system prompt exactly):

| key | label | order |
|---|---|---|
| [key1] | [Label] | 1 |
| [key2] | [Label] | 2 |
| [key3] | [Label] | 3 |
| [key4] | [Label] | 4 |
| [key5] | [Label] | 5 |
| [key6] | [Label] | 6 |
| [key7] | [Label] | 7 |
| [key8] | [Label] | 8 |

---

## Budget slider

min:      [number — e.g. 500000]
max:      [number — e.g. 30000000]
step:     [number — e.g. 250000]
default:  [number — starting position]
format:   [describe the format e.g. "£Xm / £Xk — use £ symbol"]
ticks:    [4 labels e.g. "£500k · £2m · £10m · £30m"]

---

## Inventory (const L)

[Paste as JavaScript array, ready to drop in. Each object must have: id, name, location, price, beds, size, tag, desc, url.]

```javascript
const L = [
  { id: 1, name: "", location: "", price: "", beds: "", size: "", tag: "", desc: "", url: "" },
  ...
];
```

---

## Email system (send-email.js)

From name + email:    [Brand Name <verified@sender.com>]
Notify email:         [team@company.com]
Email subject:        [e.g. "Your Athena property summary"]
Adviser initial (avatar): [single letter]
Brand bio (2 sentences):  [for the email adviser card]

---

## Multi-language

[ ] English only (default — remove lang-wrap from header)
[ ] Multi-language — languages needed: [list]
    If multi-language: provide UI_STRINGS entries for each language

---

## Opening message

[Paste verbatim. This is the first thing the AI says. One sentence of atmosphere + one question.]

---

## System prompt

[Paste the full system prompt here — the complete const SYS content, ready to drop in between the backticks.]

```
