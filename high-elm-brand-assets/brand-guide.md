# High Elm Studio — Brand Aesthetic

## Positioning
AI implementation for established businesses. Grounded, calm, intelligent. The antidote to the high-contrast, techno-aggressive aesthetic of most AI companies.

---

## Colour Palette — Palette C: Storm & Sand

| Name | Hex | Usage |
|---|---|---|
| Sand | `#F5F0E8` | Primary light background |
| Stone | `#E0D8CC` | Secondary light surface, chat backgrounds |
| Mid | `#C8BFB0` | Borders, dividers, placeholders |
| Ocean | `#5B9BAA` | Accent — eyebrows, labels, section tags |
| Ocean Light | `#8BBDC9` | Accent on dark — headings, highlights |
| Ocean Deep | `#3D7A8A` | CTAs, interactive elements, hover states |
| Storm | `#243D4F` | Dark mid-tone — body text on light, dark sections |
| Night | `#111C26` | Primary dark background |
| Ink | `#0C1520` | Deepest dark — footer, richest sections |

### Section Colour Rhythm (as you scroll)
1. **Hero** — Sand `#F5F0E8`
2. **Statement** — Sand `#F5F0E8`
3. **Services** — Night `#111C26`
4. **Chat** — Stone `#E0D8CC`
5. **Neil** — Ink `#0C1520`
6. **Close** — Ocean Deep `#3D7A8A`
7. **Footer** — Ink `#0C1520`

---

## Typography

### Display — Spectral Italic
Used exclusively for large hero headlines and section openers. Never in body copy, never upright, never heavy.

- **Font:** Spectral
- **Style:** Italic only
- **Weight:** 300 (Light)
- **Size:** `clamp(58px, 8vw, 112px)` hero / `clamp(38px, 4.5vw, 62px)` sections
- **Letter spacing:** `-0.01em` to `-0.02em`
- **Line height:** `1.05` hero / `1.1` sections
- **Source:** Google Fonts — `Spectral:ital,wght@1,300;1,400`

### Body / UI — Okine (placeholder: Plus Jakarta Sans)
Everything else. Navigation, body copy, labels, buttons, chat interface, captions.

- **Font:** Okine by MadeType *(paid, ~$30–40 from madetype.co)*
- **Placeholder:** Plus Jakarta Sans *(Google Fonts, near-identical rounded geometry)*
- **Weights used:** 200 (thin body), 300 (regular body), 400 (labels, buttons), 500 (emphasis)
- **Size:** 11px labels / 14px body / 16px lead text
- **Letter spacing:** `0.04em` body / `0.14–0.20em` uppercase labels
- **Line height:** `1.8–1.95` body
- **Source (placeholder):** Google Fonts — `Plus+Jakarta+Sans:wght@200;300;400;500`

### Typographic Rules
- Spectral italic is used **only** for headlines — 2–4 lines maximum
- All other type is Okine / Jakarta Sans
- Labels and navigation are always **uppercase with wide tracking** (`letter-spacing: 0.14–0.20em`)
- No bold weights in body copy — emphasis is created with `font-weight: 400` against a `200` base
- Sentence case throughout — never all caps for headlines

---

## Motion & Animation

- **Entry animation:** `riseIn` — opacity 0→1, translateY 22px→0, cubic-bezier(0.16,1,0.3,1)
- **Scroll reveal:** Elements fade up as they enter viewport, threshold 0.1
- **Stagger delays:** 0.1s / 0.22s / 0.34s between sibling reveals
- **Nav:** Transitions from transparent to `rgba(245,240,232,0.94)` with blur on scroll
- **Hover — buttons:** Gap between text and arrow widens (14px→20px)
- **Hover — service cards:** Subtle background lift + top border gradient appears
- **Live dot:** Breathing pulse animation, 2.4s ease-in-out infinite
- **Noise texture:** SVG fractalNoise overlay at 0.025 opacity — adds tactility, stops surfaces feeling flat

---

## Layout Principles

- **Gutter:** `64px` left and right on all sections
- **Section padding:** `120px` top and bottom
- **Grid:** Two-column for statement + Neil sections (narrative left, visual right), three-column for services
- **Asymmetry:** Hero headline left-aligned, subhead bottom-left, CTA bottom-right
- **Negative space:** Generous. Nothing crowded.

---

## Tone of Voice (for reference)

- Calm and direct. Never exclamatory.
- Speaks to the client's felt experience first, solution second.
- Short sentences carry more weight than long ones here.
- No jargon. No AI buzzwords.
- First person — "we" for the studio, "I" for Neil.

---

## Key Copy Lines (locked)

| Element | Copy |
|---|---|
| Hero headline | *The ground moved. We help businesses find their footing.* |
| Subhead | We work with established businesses to find, build and embed AI that earns its place — one clear step at a time. |
| CTA | Shall we begin → |
| Services | Discover · Build · Grow |
| Footer tagline | *Grounded thinking for an unsteady moment.* |

---

## Files

| File | Description |
|---|---|
| `high-elm-studio-v2.html` | Full homepage mockup — current working version |
| `high-elm-studio-brand.md` | This document |

---

## To Do

- [ ] Purchase Okine from madetype.co and self-host font files
- [ ] Swap `Plus Jakarta Sans` for `Okine` throughout
- [ ] Build real chatbot (AI-powered, lead capture, auto-response)
- [ ] Write Services, About, and Contact pages
- [ ] Choose hosting (Netlify recommended — free, fast, simple)
- [ ] Connect custom domain
