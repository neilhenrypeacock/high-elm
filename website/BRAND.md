# High Elm Studio — Brand Reference

> Complete brand reference for Claude Chat and AI-assisted asset creation.
> Paste this file into any Claude session to work on website assets, copy, or design.

---

## Identity

| | |
|---|---|
| **Brand name** | `high elm studio.` — always lowercase, always with trailing period |
| **Legal name** | High Elm Productions Ltd |
| **Company no.** | 15336186, registered in England & Wales |
| **Founder** | Neil Peacock |
| **Location** | London / Norfolk, UK |
| **Origin** | High Elm Farm, Norfolk — a real place, grounding the name |

### Tagline
> "Grounded thinking for an unsteady moment."

### What the business does
AI implementation and business systems consulting for established businesses. Not AI for AI's sake — AI for real operational leverage: time saved, revenue captured, communication made consistent.

### Core belief
"The businesses who communicate clearly, automate intelligently, and act decisively are the ones who pull ahead. AI is just the latest — and most powerful — tool to make that possible."

---

## Color System

All colors are defined as CSS custom properties. Always use hex values as shown.

| Token | Hex | Name | Primary use |
|---|---|---|---|
| `--sand` | `#F5F0E8` | Sand | Primary background, reversed text on dark |
| `--stone` | `#E0D8CC` | Stone | Secondary backgrounds, dividers, borders |
| `--mid` | `#C8BFB0` | Mid | Tertiary surfaces, subtle UI |
| `--ocean` | `#5B9BAA` | Ocean | **Primary accent** — logo, CTAs, highlights |
| `--ocean-lt` | `#8BBDC9` | Ocean Light | Hover states, secondary accents |
| `--ocean-d` | `#3D7A8A` | Ocean Dark | Strong emphasis, deep accents |
| `--storm` | `#243D4F` | Storm | Dark text on light, hover states |
| `--night` | `#111C26` | Night | Dark section backgrounds |
| `--ink` | `#0C1520` | Ink | Primary body text, darkest backgrounds |

### Color usage rules
- **Light sections**: background `--sand` (#F5F0E8), text `--ink` (#0C1520)
- **Dark sections**: background `--night` (#111C26) or `--ink` (#0C1520), text `--sand` (#F5F0E8)
- **Accent**: `--ocean` (#5B9BAA) for the logo mark, CTA buttons, key highlights only
- **Never** use pure black (#000000) or pure white (#FFFFFF)
- Subtle texture: SVG Perlin noise overlay at opacity 0.022 is used site-wide

### CSS variables declaration
```css
:root {
  --sand:     #F5F0E8;
  --stone:    #E0D8CC;
  --mid:      #C8BFB0;
  --ocean:    #5B9BAA;
  --ocean-lt: #8BBDC9;
  --ocean-d:  #3D7A8A;
  --storm:    #243D4F;
  --night:    #111C26;
  --ink:      #0C1520;
}
```

---

## Typography

Three fonts. Each has a specific role — do not mix them.

### Font 1 — Cormorant Garamond (Display / Editorial)
- **Role**: Headlines, section titles, editorial emphasis
- **Weights used**: 300 (light), 300 italic
- **Style**: Italic is the signature style — use liberally in headlines
- **Key sizes**: `clamp(54px, 8vw, 110px)` for hero headlines
- **Line height**: 0.94–0.96 for large display type
- **Letter spacing**: -0.01em to -0.02em
- **Google Fonts**: `Cormorant+Garamond:ital,wght@0,300;1,300`

### Font 2 — Raleway (Body)
- **Role**: Body copy, paragraphs, longer explanatory text
- **Weights used**: 200 (extra-light), 300 (light)
- **Key sizes**: 16–18px for body, up to 22px for lead paragraphs
- **Line height**: 1.85–1.95 for readability
- **Letter spacing**: 0 to 0.01em
- **Google Fonts**: `Raleway:wght@200;300`

### Font 3 — League Spartan (UI / Interface)
- **Role**: Navigation, buttons, labels, captions, all interactive UI
- **Weights used**: 300 (light), 400 (regular), 600 (semibold)
- **Transform**: lowercase (the brand always presents UI in lowercase)
- **Key sizes**: 11–13px labels, 14–18px navigation, 18px buttons
- **Letter spacing**: -0.01em to -0.05em (tighter = heavier weight)
- **Google Fonts**: `League+Spartan:wght@300;400;600`

### Google Fonts import
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;1,300&family=League+Spartan:wght@300;400;600&family=Raleway:wght@200;300&display=swap" rel="stylesheet">
```

---

## Logo System

### The mark
An elm leaf — organic form, hand-drawn aesthetic. Represents High Elm Farm, Norfolk (the brand's origin). The leaf has a central vein and four pairs of lateral veins.

**Leaf path** (SVG, viewBox 0 0 60 100):
```svg
M30,4 Q42,9 50,20 Q58,32 59,47 Q60,62 55,74 Q48,86 30,93 Q12,86 5,74 Q0,62 1,47 Q2,32 10,20 Q18,9 30,4Z
```

### Logo mark — full SVG code

**Primary (for light backgrounds):**
```svg
<svg viewBox="0 0 60 100" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M30,4 Q42,9 50,20 Q58,32 59,47 Q60,62 55,74 Q48,86 30,93 Q12,86 5,74 Q0,62 1,47 Q2,32 10,20 Q18,9 30,4Z" fill="#5B9BAA"/>
  <line x1="30" y1="5" x2="30" y2="92" stroke="#F5F0E8" stroke-width="1.2" stroke-linecap="round" opacity="0.6"/>
  <line x1="30" y1="25" x2="44" y2="32" stroke="#F5F0E8" stroke-width="0.7" opacity="0.5"/>
  <line x1="30" y1="40" x2="49" y2="48" stroke="#F5F0E8" stroke-width="0.7" opacity="0.5"/>
  <line x1="30" y1="55" x2="50" y2="62" stroke="#F5F0E8" stroke-width="0.7" opacity="0.5"/>
  <line x1="30" y1="70" x2="46" y2="76" stroke="#F5F0E8" stroke-width="0.7" opacity="0.5"/>
  <line x1="30" y1="25" x2="16" y2="32" stroke="#F5F0E8" stroke-width="0.7" opacity="0.5"/>
  <line x1="30" y1="40" x2="11" y2="48" stroke="#F5F0E8" stroke-width="0.7" opacity="0.5"/>
  <line x1="30" y1="55" x2="10" y2="62" stroke="#F5F0E8" stroke-width="0.7" opacity="0.5"/>
  <line x1="30" y1="70" x2="14" y2="76" stroke="#F5F0E8" stroke-width="0.7" opacity="0.5"/>
</svg>
```

**Reversed (for dark backgrounds):**
```svg
<svg viewBox="0 0 60 100" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M30,4 Q42,9 50,20 Q58,32 59,47 Q60,62 55,74 Q48,86 30,93 Q12,86 5,74 Q0,62 1,47 Q2,32 10,20 Q18,9 30,4Z" fill="#F5F0E8"/>
  <line x1="30" y1="5" x2="30" y2="92" stroke="#5B9BAA" stroke-width="1.2" stroke-linecap="round" opacity="0.7"/>
  <line x1="30" y1="25" x2="44" y2="32" stroke="#5B9BAA" stroke-width="0.7" opacity="0.55"/>
  <line x1="30" y1="40" x2="49" y2="48" stroke="#5B9BAA" stroke-width="0.7" opacity="0.55"/>
  <line x1="30" y1="55" x2="50" y2="62" stroke="#5B9BAA" stroke-width="0.7" opacity="0.55"/>
  <line x1="30" y1="70" x2="46" y2="76" stroke="#5B9BAA" stroke-width="0.7" opacity="0.55"/>
  <line x1="30" y1="25" x2="16" y2="32" stroke="#5B9BAA" stroke-width="0.7" opacity="0.55"/>
  <line x1="30" y1="40" x2="11" y2="48" stroke="#5B9BAA" stroke-width="0.7" opacity="0.55"/>
  <line x1="30" y1="55" x2="10" y2="62" stroke="#5B9BAA" stroke-width="0.7" opacity="0.55"/>
  <line x1="30" y1="70" x2="14" y2="76" stroke="#5B9BAA" stroke-width="0.7" opacity="0.55"/>
</svg>
```

### Logo wordmark
- Text: `high elm studio.` (lowercase, with period — this is part of the mark)
- Font: League Spartan, weight 600
- Letter spacing: -0.05em
- Color (primary): `#0C1520` (--ink)
- Color (reversed): `#F5F0E8` (--sand)

### Logo sizes (inline HTML)
```css
.leaf-nav    { width: 13px; }   /* navigation bar */
.leaf-footer { width: 11px; }   /* footer */
.leaf-section { width: 18px; }  /* section label accents */
.leaf-cta    { width: 22px; }   /* call to action blocks */
```

### Logo files (in brand/ directory)
| File | Use |
|---|---|
| `brand/logo-mark.svg` | Leaf icon only, teal on transparent |
| `brand/logo-mark-reversed.svg` | Leaf icon only, sand on transparent (for dark bg) |
| `brand/logo-wordmark.svg` | Horizontal lockup, primary |
| `brand/logo-wordmark-reversed.svg` | Horizontal lockup, reversed |
| `brand/logo-stacked.svg` | Leaf above wordmark, square format |

### Logo do / don't
- **Do**: Use on `--sand`, `--stone` backgrounds (primary) or `--night`, `--ink` (reversed)
- **Do**: Maintain the aspect ratio — never stretch or skew the leaf
- **Do**: Keep veining lines — they are part of the mark's identity
- **Don't**: Recolour the leaf in non-brand colours
- **Don't**: Use the primary (teal) leaf on very dark backgrounds — use reversed variant
- **Don't**: Add drop shadows, gradients, or effects to the logo
- **Don't**: Write the brand name as "High Elm Studio" (capitalised) or without the trailing period

---

## Tone of Voice

### Character
Measured, confident, quietly expert. The brand sounds like someone who has done the work, not someone selling the work. No hype, no jargon, no tech-speak unless it serves the reader.

### Four principles

**1. Plain over clever**
Say what you mean. The insight is in the clarity, not the complexity.
- "We help businesses find where AI creates real leverage." ✓
- "We leverage cutting-edge AI solutions to transform your enterprise workflow." ✗

**2. Concrete over abstract**
Name the thing. "Hours your team gets back" beats "operational efficiency gains."

**3. Confident, not arrogant**
Never apologetic or hedging, but never boasting. Lead with understanding, not credentials.

**4. Human over corporate**
Write as Neil would talk in a meeting — direct, warm, intelligent. Not like a brochure.

### Vocabulary

**Use freely:**
- grounded, steady, clear, practical, honest, leverage, genuine, directly, exactly
- "your business", "your team", "the work"

**Use sparingly (only when precise):**
- automate, AI, system, workflow, prompt, build

**Never use:**
- "cutting-edge", "bleeding-edge", "revolutionary", "game-changing"
- "leverage" as a verb (only as a noun: "creates leverage")
- "solutions" (say what the thing actually does)
- "synergy", "ecosystem", "seamless", "robust"
- Exclamation marks

### Sentence rhythm
Vary between short punchy sentences and longer explanatory ones. Short sentences land the point. Longer sentences do the explaining. Never more than two long sentences in a row.

---

## Key Messaging

### Hero headline (current)
> "The ground moved.
> We help businesses find their footing."

### Tagline
> "Grounded thinking for an unsteady moment."

### What we do (one sentence)
> "We find where AI creates genuine leverage in your business — and build it so your team can actually use it."

### Who it's for
> "Businesses with operational complexity, a team, and a sense there's a better way — but no internal tech person to figure it out."

### The engagement positioning
> "The first conversation is free — no obligation. Just an honest conversation about what's possible for your business."

### Core value statement
> "Every business has access to this. Most just don't know where their version of it begins. That's the conversation we start."

### Closing line
> "The gap is growing. Let's close it."

### Founder bio (short)
> "Twelve years of stories told well. Now built to last."

### Services — three pillars

**1. Story Automations**
Your brand's voice, values, and experience mapped into intelligent systems — guest welcome journeys, client onboarding flows, follow-up sequences that sound like your brand.
*"The foundation of every high-performing AI system."*

**2. Communication Design**
Designing the architecture of communication — sequence, tone, trigger, timing. This is where brand thinking meets systems thinking.
*"Where brand thinking meets systems thinking."*

**3. Bridging the Gap**
Translating business knowledge into clear, structured language for AI. Moving from vague briefs to precise inputs.
*"Simple inputs · extraordinary outputs."*

### Engagement model (three steps)
1. **Free Conversation** — chat-based discussion, no pitch
2. **Free Presentation** — Neil reviews the conversation and presents: findings, AI opportunities, financial value, exact build specifications, reviewed on a 30–45 min call
3. **Build (Paid)** — if both parties want to work together

### Target industries
- Luxury hotels & hospitality
- Property & real estate
- Festivals & events
- Wellness, fitness & health
- Rural & agricultural businesses
- Professional services
- Experience & travel

---

## Layout & Spacing

### Spacing scale
```css
/* Section padding */
padding: 100px 64px;         /* desktop */
padding: 80px 32px;          /* tablet */
padding: 64px 20px;          /* mobile */

/* Navigation */
padding: 36px 64px;          /* normal */
padding: 20px 64px;          /* scrolled */

/* Grid gap */
gap: 2px;                    /* tight grid lines */
gap: 60px;                   /* section content gap */
gap: 80px;                   /* major section separation */
```

### Border radius
Minimal — `1–2px` only. The brand uses almost no rounding. Sharp edges convey precision.

### Grid patterns
- 3-column grid for major content sections
- 2-column grid for content + sidebar layouts
- Single column on mobile
- Uses CSS Grid throughout

---

## Animations

### Reveal on scroll
Elements enter with `opacity: 0 → 1` and `translateY(24px) → 0`.

```css
.reveal {
  opacity: 0;
  transform: translateY(24px);
  transition: opacity 0.9s cubic-bezier(0.16, 1, 0.3, 1),
              transform 0.9s cubic-bezier(0.16, 1, 0.3, 1);
}
.reveal.visible {
  opacity: 1;
  transform: translateY(0);
}
/* Stagger delays */
.d1 { transition-delay: 0.10s; }
.d2 { transition-delay: 0.22s; }
.d3 { transition-delay: 0.34s; }
```

### Page entrance
```css
@keyframes riseIn {
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
}
/* Applied at 0.9s–1.2s, cubic-bezier(0.16, 1, 0.3, 1) */
```

---

## Component Patterns

### Primary button (dark)
```html
<button class="btn-begin">shall we begin →</button>
```
```css
.btn-begin {
  background: var(--night);
  color: var(--sand);
  font-family: 'League Spartan', sans-serif;
  font-size: 14px;
  font-weight: 400;
  letter-spacing: -0.01em;
  padding: 18px 36px;
  border: none;
  cursor: pointer;
  transition: background 0.25s;
}
```

### Outline button (light)
```css
.btn-begin-outline {
  background: transparent;
  color: var(--sand);
  border: 1px solid rgba(245, 240, 232, 0.3);
  /* Same font/size as primary */
}
```

### Section label pattern
```html
<div class="section-label">
  <svg class="leaf-section" viewBox="0 0 60 100"><!-- leaf mark --></svg>
  the thread
</div>
```
Text: League Spartan 300, 11px, letter-spacing 0.08em, uppercase or lowercase.

### Page label (eyebrow)
```css
.page-label {
  font-family: 'League Spartan', sans-serif;
  font-size: 11px;
  font-weight: 300;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--ocean);
}
```

---

## Background Texture (Site-Wide)

A subtle Perlin noise SVG texture is applied at `opacity: 0.022` over the entire site to add warmth and prevent flatness.

```html
<!-- In <body>, fixed position, pointer-events: none -->
<svg style="position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9999;opacity:0.022;" xmlns="http://www.w3.org/2000/svg">
  <filter id="noise">
    <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch"/>
    <feColorMatrix type="saturate" values="0"/>
  </filter>
  <rect width="100%" height="100%" filter="url(#noise)"/>
</svg>
```

---

## File Structure

```
high-elm-studio/
├── index.html              Main site (home + about pages)
├── how-it-works.html       Process explanation
├── services.html           Service detail
├── chat.html               Diagnostic chatbot
├── privacy.html
├── terms.html
├── cookies.html
├── favicon.svg             Leaf mark (12 lines)
├── BRAND.md                ← this file
└── brand/
    ├── logo-mark.svg           Leaf only, primary
    ├── logo-mark-reversed.svg  Leaf only, reversed
    ├── logo-wordmark.svg       Horizontal lockup, primary
    ├── logo-wordmark-reversed.svg  Horizontal lockup, reversed
    ├── logo-stacked.svg        Stacked format
    └── guidelines.html         Visual brand guidelines
```

---

*High Elm Productions Ltd · Company #15336186 · England & Wales*
