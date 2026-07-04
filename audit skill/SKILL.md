---
name: site-audit
description: Run a comprehensive, luxury-niched website audit on a prospect site for High Elm Studio. Use this skill whenever Neil says "audit [URL]", "run a site audit", "site audit for X", "audit this site", or pastes a URL and asks for a review. The audit is Neil's sales prep tool first — internal pitch ammunition — and the polished HTML output doubles as a deliverable he can send to the prospect at his discretion. Pulls from named frameworks (Godin, Hormozi, Ogilvy, Schwartz, Miller, Cialdini, Krug, Nielsen, Morville, Dunford), benchmarks against luxury / established brands, and covers SEO, AEO, GEO, content, UX, and conversion. Outputs a branded HTML page (two-tier: WOW summary + deep dive) plus a downloadable Markdown file the prospect can paste into their own LLM to go deeper.
---

# High Elm Studio Site Audit Skill

## Purpose

Produce a comprehensive, prospect-specific website audit for High Elm Studio sales prep. The audit is **internal-first** (Neil's pitch ammunition) but **delivery-ready** (polished enough to send to the prospect). Subtle on the sales angle — diagnoses problems with rigour, lets Neil handle the pitch in conversation.

## When to trigger

Neil says any of:
- "audit [URL]"
- "run a site audit"
- "audit this site"
- "site audit for [company]"
- "do a full site review on X"
- Pastes a URL with audit intent

If a URL is provided alongside the trigger, use it directly. If not, ask for it before proceeding.

---

## Workflow

### Stage 1 — Intake (60 seconds, 3 questions)

Before fetching anything, ask Neil three short questions. Use `ask_user_input_v0` so he can tap answers on mobile.

1. **Relationship stage** — Cold prospect / Warm intro / First meeting done / Second meeting prep / Pilot or paid stage
2. **Pitch angle** — Which High Elm Studio capability does he most want positioned? (Concierge demo / Content systems / Internal AI tools / Custom AI infrastructure / No specific angle)
3. **Anything specific to probe** — Any concerns the prospect has flagged, or anything Neil wants surfaced. Free text.

If Neil skips or says "no specific angle", proceed without emphasis.

### Stage 2 — Research (autonomous, ~5–10 minutes)

Use `web_fetch` and `web_search`. Be thorough — this is the foundation.

**Prospect site:**
- Homepage
- 5–8 key pages: services / products, about, key landing pages, blog index, one sample blog post, contact, pricing or booking pages if present
- Note any prominent CTAs, hero copy, headline patterns, footer structure

**Luxury benchmarks (2–3 in the prospect's category):**
Use the benchmark map below. Fetch their equivalent pages so we can compare like-for-like.

**Search visibility:**
- Google search the brand name and 2–3 core terms (services they offer, location if relevant)
- Note what appears: organic listings, AI Overviews, knowledge panels, third-party mentions, review sites
- Run searches for "[brand] reviews", "[brand] vs [competitor]" to see how the wider web positions them

**AI visibility (the AEO/GEO layer):**
- Search Perplexity-style queries about the brand and category to gauge AI awareness
- Look for: third-party mentions, directory listings, Wikipedia / Wikidata presence, consistent facts across the web, authoritative citations
- Flag if the brand is invisible to AI or if AI gets facts wrong

**Performance:**
- Where possible, check Core Web Vitals via Google PageSpeed Insights (web_fetch the PSI URL)
- Note mobile experience explicitly

---

### Stage 3 — Analysis: The 10 Sections

Run through each section using the named framework. **Quote actual copy from the site** when critiquing — specifics are what make the audit credible.

#### 1. The 5-Second Test (Krug, Godin)
What does a visitor understand in 5 seconds of landing? Is it clear: who this is for, what they offer, why it matters? Does it pass Godin's "is this for me?" test for the target audience?

#### 2. Positioning & Awareness Match (Dunford, Schwartz)
- **Dunford's 5**: competitive alternatives, unique attributes, value, who cares, market category — are these clear?
- **Schwartz's awareness levels**: is the copy pitched at Unaware / Problem Aware / Solution Aware / Product Aware / Most Aware? Does the level match where the audience actually is?

#### 3. Headline & Hero (Ogilvy, Hormozi)
- **Ogilvy**: does the H1 do 80% of the work? Specifics or vague? Read like a real person wrote it?
- **Hormozi**: does the hero articulate the dream outcome the prospect is buying?

#### 4. Value Equation Breakdown (Hormozi)
Score each variable as it appears on the homepage. Use 1–10 scale, with brief justification:
- **Dream Outcome** — how clearly is the end-state articulated?
- **Perceived Likelihood** — how confident does the visitor feel this will work for them?
- **Time Delay** — how fast is the implied path to result?
- **Effort & Sacrifice** — how easy does it look to engage / buy / book?

#### 5. Hero or Guide? (StoryBrand)
Is the customer the hero of the website, or is the brand the hero? Most luxury brands lean too heavily on themselves and miss that the visitor wants to be reflected. Quote evidence both ways.

#### 6. Trust & Influence Stack (Cialdini)
Audit which of the seven principles are deployed and which are missing:
- Reciprocity — does the site give before asking?
- Social Proof — testimonials, press, named clients, reviews, numbers
- Authority — credentials, awards, founder visibility, expertise signals
- Scarcity — limited availability, time-bound, exclusivity
- Commitment — small early asks before big ones
- Liking — warmth, story, humanity in the writing
- Unity — shared identity with the audience

#### 7. UX & Usability (Nielsen, Morville)
- **Nielsen's 10 heuristics** — flag the violations only, not all 10
- **Morville's UX honeycomb** — useful, usable, desirable, findable, accessible, credible, valuable. Score each briefly.
- **Friction map** — where do users likely drop? Name the moments.

#### 8. Conversion Path
- Mobile experience (test the actual site on mobile dimensions)
- CTA clarity, placement, language
- Form design and length
- Booking / inquiry / checkout flow if applicable
- Trust signals near conversion points

#### 9. Technical SEO
- Core Web Vitals (LCP, INP, CLS)
- Schema markup — what's there, what's missing
- Indexability — robots, sitemap, canonicals
- Internal linking structure
- Mobile-first basics

#### 10. AEO + GEO Visibility (the new bit — emphasise this)
- **AEO** (Answer Engine Optimization): does each section of content work as a self-contained citable unit? Are answers given before context? Schema markup for FAQ / Article / Organization? E-E-A-T signals (named authors, credentials, evidence)?
- **GEO** (Generative Engine Optimization): brand consensus across the web — third-party mentions, directory listings, Wikipedia presence, consistent facts about the brand. Is the brand a recognised entity in the AI knowledge graph?
- **AI Visibility Test**: based on research, do Perplexity / ChatGPT / Claude / Gemini know about this brand? Are facts accurate? Where are the gaps?

---

### Stage 4 — Synthesis

After completing the 10 sections, produce four synthesis layers:

#### 4.1 Executive Summary
5–8 bullet points capturing the most important findings. This is the WOW summary that opens the deliverable.

#### 4.2 Top 10 Priority Actions
Ranked by Impact × Effort. Each tagged:
- **Quick Win** — under 1 week, immediate impact
- **Medium Project** — 2–6 weeks
- **Strategic Initiative** — long-term, structural

Each action must be specific. "Change H1 from '[exact current copy]' to '[suggested copy]'" beats "improve messaging".

#### 4.3 30 / 60 / 90 Day Roadmap
What to fix first, second, third. Sequenced for momentum (early wins build buy-in for later structural work).

#### 4.4 Diagnostic Notes — For Neil's Eyes Only
Candid, internal-only section. Includes:
- Commercial sophistication of the brand (1–10) and reasoning
- Which problems are most AI-solvable (the High Elm Fit Map)
- Specific angles to lean into during the pitch
- Any red flags or concerns about the prospect
- Tone Neil should bring to the conversation (educational / urgent / collaborative / etc.)

**This section MUST appear in the MD file but NOT in the HTML page.** It's pitch prep, not a prospect deliverable.

---

### Stage 5 — Output

#### 5.1 Branded HTML page

**File**: `/mnt/user-data/outputs/audit-[domain]/audit-[domain].html`

**Visual style**: Match High Elm Studio's current brand. Before writing the HTML, fetch `https://highelmstudio.com` and extract:
- Primary and secondary colours
- Typography (heading font, body font)
- Spacing rhythm
- Tone of any taglines or copy that informs voice

If the site is unreachable, default to: dark sophisticated palette (deep ink, warm off-white, single accent), serif display for headings, clean sans for body, generous whitespace, no gimmicks. Luxury restraint over visual fireworks.

**Structure of the HTML**:
1. **Header band** — High Elm Studio mark (subtle), prospect's brand name, "Site Audit", date
2. **WOW Summary** — Executive summary (the 5–8 bullets) and Top 10 Priority Actions, designed for visual impact and scannability. This is what makes the prospect stop and pay attention.
3. **Section divider** — clear visual transition: "Full audit below"
4. **Deep Dive** — the 10 sections in full, each with: section title, framework reference, findings (with quoted site copy), specific recommendations
5. **30/60/90 Roadmap** — visual, easy to read
6. **Footer** — single line: "If any of this would benefit from a conversation — neil@highelmstudio.com". No CTA buttons, no service descriptions, no pricing.

**The HTML must NOT include the Diagnostic Notes section.**

#### 5.2 Markdown file (downloadable)

**File**: `/mnt/user-data/outputs/audit-[domain]/audit-[domain].md`

Same content as the HTML PLUS the Diagnostic Notes section. Designed for the prospect to upload to ChatGPT / Claude / Perplexity to ask follow-up questions.

Structure:
- Clear `#` and `##` headers
- Quoted site copy in blockquotes
- Tables for scoring (Value Equation, UX Honeycomb, etc.)
- Plain text — no HTML tags

The MD file makes the audit a conversation, not a one-shot read.

#### 5.3 Share with Neil

Use `present_files` to surface both files. Include in the message:
- One-line summary of the most important finding
- One-line on the most pitch-relevant gap
- Reminder that Diagnostic Notes are in the MD only
- Confirm the HTML is prospect-ready

---

## Frameworks Reference

The audit pulls from these named thinkers. Cite them by name in findings — it educates the prospect and signals rigour.

- **Seth Godin** — "Is this for me?" / Purple Cow / Permission Marketing
- **Alex Hormozi** — Value Equation: (Dream Outcome × Perceived Likelihood) ÷ (Time Delay × Effort & Sacrifice)
- **David Ogilvy** — Headlines do 80% of the work; specifics beat generalities ("11.6 mpg" not "great efficiency"); copy that sounds human
- **Eugene Schwartz** — Five awareness levels: Unaware → Problem Aware → Solution Aware → Product Aware → Most Aware
- **Donald Miller** — StoryBrand: customer is hero, brand is guide
- **Robert Cialdini** — Seven principles of influence: reciprocity, commitment, social proof, authority, liking, scarcity, unity
- **Steve Krug** — "Don't Make Me Think"; cognitive load; the 5-second test
- **Jakob Nielsen** — 10 usability heuristics
- **Peter Morville** — UX Honeycomb: useful, usable, desirable, findable, accessible, credible, valuable
- **April Dunford** — Obviously Awesome: positioning is a deliberate choice across 5 components

---

## Luxury Benchmark Map

Pick 2–3 benchmarks based on the prospect's category. Fetch their equivalent pages to compare like-for-like.

- **Luxury hospitality / hotels**: Aman, Belmond, Six Senses, Rosewood, Soho House, The Newt
- **Luxury travel / tour operators**: Black Tomato, Pelorus, Wilderness Travel, Mr & Mrs Smith, Original Travel
- **Luxury property / real estate**: The Modern House, Inigo, Christie's International Real Estate, Knight Frank
- **Luxury retail / lifestyle**: Net-a-Porter, Mr Porter, Aesop, Goop
- **Luxury services / advisory**: Quintessentially, Athena Advisers, Knight Frank private office
- **Luxury food, drink & wellness**: The Newt, Soho Farmhouse, Berry Bros & Rudd, Bamford
- **Luxury events / experiences**: Harvest Series, Quintessentially Events, Banks Sadler

If the prospect is in another category, fetch 2–3 of the most established, design-led players in that space. Choose benchmarks that the prospect would recognise as aspirational, not unfair comparisons.

---

## Style Guidelines

- **Voice**: candid but composed. Senior consultant, not growth hacker. Luxury-appropriate. "The homepage hero would benefit from slowing down to match the audience's pace" — not "your CTA isn't urgent enough".
- **Specificity**: quote actual site copy when critiquing. "Change the H1 from '[X]' to '[Y]'" beats "improve homepage messaging".
- **Educate as you go**: when flagging something technical, briefly explain why it matters in plain English (1–2 sentences). The prospect should learn something, not just be diagnosed.
- **Honest balance**: if something is good, say so. The audit gains credibility from acknowledging what works. Don't manufacture problems for volume.
- **Subtle on High Elm**: do NOT pitch services in the HTML. No "and that's where we come in" phrasing. The audit is the demonstration; the pitch is Neil's job in conversation.
- **No padding**: every word earns its place. Short sentences. Plain English. No corporate-consultant filler.
- **Cite sources**: when referencing frameworks, name the thinker. When referencing data (e.g., a Core Web Vitals score), say where it came from.

---

## What Neil expects from this skill

1. **A draft he can review and send** — not a final version, but close enough that 10 minutes of light editing gets it ready
2. **Pitch ammunition for the next call** — the Diagnostic Notes section
3. **A deliverable that signals High Elm Studio's seriousness** without a single line of sales copy
4. **A portable MD file** the prospect can keep working with in their own LLM

---

## Failure modes to avoid

- **Generic findings** — if the audit reads like it could apply to any site, it's failed. Quote actual copy. Name actual pages.
- **SaaS / growth-hack tone** — "10x your conversions" energy will undermine the whole thing for a luxury audience
- **Over-pitching** — the moment the HTML reads like a sales document, credibility collapses
- **Skipping benchmarks** — without competitor comparison, "good" and "bad" are abstract
- **Skipping AEO/GEO** — this is the differentiated layer. Most agency audits don't cover it. Ours always does.
- **Mistaking depth for length** — the deep dive should be thorough, not bloated. Cut anything that doesn't change Neil's understanding of the site.
