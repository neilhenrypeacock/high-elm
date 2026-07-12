// "Your Hotel" — EXAMPLE DATA for the fictional hotel The Lansmere.
//
// This page ships ahead of hotel claiming: there is no user→hotel mapping yet,
// and the pipeline's full-history scrape (every post, not the rolling 30) is a
// separate pass in ../instagram-pipeline/. Until both land, the page renders
// this demo set and says so in the UI ("Example data").
//
// The shapes below are written to survive the real wiring: when lib/data.ts
// grows a getYourHotelData(), it should return these same interfaces populated
// from Supabase instead of from the constants at the bottom of this file.
//
// Honesty rules baked into the copy (do not weaken when wiring real data):
// - Public data only: likes + comments. Never reach/impressions/saves/shares.
// - "Best post" = best on record IN OUR DATA (hidden-likes posts can't count).
// - The single network-median line is the ONLY comparison — no rank, no top-10.

export type PostFormat = 'Reel' | 'Carousel' | 'Photo';

/** One of the hotel's own breakout posts (the hero cards). */
export interface YourBreakout {
  format: PostFormat;
  /** CSS gradient standing in for the post image until real scraping lands. */
  gradient: string;
  /** Short scene description shown over the media (alt-text-ish). */
  scene: string;
  /** First line of the caption. */
  caption: string;
  /** Display date, e.g. "3 Jul 2026". */
  posted: string;
  /** Engagement vs the hotel's own typical (median) post. */
  multiplier: number;
  likes: number;
  likesMultiple: number;
  comments: number;
  commentsMultiple: number;
  typicalLikes: number;
  typicalComments: number;
}

/** One of the hotel's posts inside a comparison period (compact row). */
export interface PeriodPost {
  format: PostFormat;
  gradient: string;
  caption: string;
  likes: number;
  comments: number;
  /** Engagement vs the hotel's typical post; >= BREAKOUT_HIGHLIGHT reads green. */
  vsTypical: number;
}

/** The network post that was breaking out during a comparison period. */
export interface TrendPost {
  format: PostFormat;
  gradient: string;
  scene: string;
  caption: string;
  hotelName: string;
  handle: string;
  place: string;
  /** vs THEIR OWN median — same definition as the dashboard's breakouts. */
  multiplier: number;
  likes: number;
  comments: number;
}

/** One selectable period (a week or a month) in the comparison section. */
export interface ComparisonPeriod {
  label: string;
  trend: TrendPost;
  yours: PeriodPost[];
  /** Plain-English lesson; `action` renders bold at the end. */
  insight: { text: string; action: string };
}

export interface GrowthSeries {
  /** Evenly-spaced samples, oldest → newest. */
  values: number[];
  min: number;
  max: number;
  /** Sparse x labels: index into `values` + label. */
  xLabels: { i: number; l: string }[];
  headline: string;
  delta: string;
  note: string;
  ariaLabel: string;
}

export interface YourHotelData {
  name: string;
  handle: string;
  location: string;
  accreditations: string[];
  lastUpdated: string;
  postCount: number;
  historySince: string;
  followers: number;
  stats: {
    posts90d: number;
    typicalEngagement: number; // median likes + comments
    bestOnRecord: number;      // best in our data
    bestPostUrl: string;
    engagementRate: number;    // %
  };
  benchmark: { er: number; networkMedianEr: number };
  breakouts: YourBreakout[];
  growth: { followers: GrowthSeries; er: GrowthSeries };
  comparison: { week: ComparisonPeriod[]; month: ComparisonPeriod[] };
  working: { strong: string; rest: string }[];
}

/** vsTypical at or above this renders as a green breakout in comparison rows. */
export const BREAKOUT_HIGHLIGHT = 1.2;

// ─── Gradients (match the dashboard's warm placeholder idiom) ────────────────
const G = {
  sunrise:  'linear-gradient(158deg,#f6c88b 0%,#e79a6c 32%,#8a6a7e 60%,#2f3550 100%)',
  garden:   'linear-gradient(155deg,#e4e6c9 0%,#bcc99c 38%,#84a071 72%,#4d6b52 100%)',
  pastry:   'linear-gradient(160deg,#f1dba9 0%,#d9a86a 44%,#a86f43 74%,#4f3320 100%)',
  dusk:     'linear-gradient(160deg,#e9b877 0%,#b47a45 40%,#6e4630 72%,#281a13 100%)',
  lavender: 'linear-gradient(158deg,#f3cf9a 0%,#dd9a86 40%,#7a6f9e 72%,#33324f 100%)',
  coast:    'linear-gradient(158deg,#f0d29a 0%,#dc9a63 42%,#3d7d86 82%,#22303a 100%)',
  suite:    'linear-gradient(158deg,#efd7b0 0%,#c99a6b 45%,#7a5740 78%,#2f2118 100%)',
  caldera:  'linear-gradient(158deg,#f4d4a0 0%,#e29a7a 38%,#6f6fa0 72%,#2c2b46 100%)',
  como:     'linear-gradient(158deg,#f0d29a 0%,#d99a63 42%,#4a7d70 82%,#22322c 100%)',
  cream:    'linear-gradient(150deg,#e7ddc7,#c3b393)',
  rose:     'linear-gradient(150deg,#e6d7cf,#b79a8f)',
  sage:     'linear-gradient(150deg,#dfe2c6,#9fb083)',
  sageSoft: 'linear-gradient(150deg,#dfe2c6,#a6b487)',
  amber:    'linear-gradient(150deg,#e6c79a,#b6774a)',
  gold:     'linear-gradient(150deg,#f0d6a6,#d09a5f)',
  sand:     'linear-gradient(150deg,#e8ddc6,#c9b48c)',
  pool:     'linear-gradient(150deg,#cfe0dd,#8bb4ae)',
  peach:    'linear-gradient(150deg,#f2c78d,#d98f78)',
};

// ─── The hotel's own breakouts (hero section) ────────────────────────────────
const BREAKOUTS: YourBreakout[] = [
  {
    format: 'Reel', gradient: G.sunrise, scene: 'Rooftop pool at first light',
    caption: 'Sunrise on the rooftop, and the whole city still asleep.',
    posted: '3 Jul 2026', multiplier: 3.5,
    likes: 6240, likesMultiple: 3.5, comments: 287, commentsMultiple: 3.3,
    typicalLikes: 1760, typicalComments: 88,
  },
  {
    format: 'Carousel', gradient: G.garden, scene: 'The Garden Suite terrace',
    caption: 'Inside the Garden Suite — a private terrace above the rooftops.',
    posted: '27 Jun 2026', multiplier: 2.8,
    likes: 4980, likesMultiple: 2.8, comments: 214, commentsMultiple: 2.4,
    typicalLikes: 1760, typicalComments: 88,
  },
  {
    format: 'Reel', gradient: G.pastry, scene: 'The pastry kitchen, pre-dawn',
    caption: 'How the pastry team folds 200 layers before sunrise.',
    posted: '21 Jun 2026', multiplier: 2.6,
    likes: 4410, likesMultiple: 2.5, comments: 356, commentsMultiple: 4.0,
    typicalLikes: 1760, typicalComments: 88,
  },
  {
    format: 'Photo', gradient: G.dusk, scene: 'A corner table at dusk',
    caption: 'A corner table, candlelight, and the last of the evening light.',
    posted: '14 Jun 2026', multiplier: 2.1,
    likes: 3720, likesMultiple: 2.1, comments: 168, commentsMultiple: 1.9,
    typicalLikes: 1760, typicalComments: 88,
  },
];

// ─── Comparison periods ──────────────────────────────────────────────────────
const WEEKS: ComparisonPeriod[] = [
  {
    label: 'Week of 3 Jul',
    trend: {
      format: 'Reel', gradient: G.lavender, scene: 'Lavender terrace at dawn',
      caption: 'First light on the lavender terrace, and not a soul in sight.',
      hotelName: 'Château Lumière', handle: 'chateaulumiere', place: 'Provence, France',
      multiplier: 4.8, likes: 14200, comments: 640,
    },
    yours: [
      { format: 'Photo', gradient: G.cream, caption: 'Afternoon light in the drawing room', likes: 1690, comments: 74, vsTypical: 0.9 },
      { format: 'Photo', gradient: G.rose, caption: 'This week’s lobby florals', likes: 1540, comments: 61, vsTypical: 0.8 },
      { format: 'Carousel', gradient: G.sage, caption: 'Suite tour: the Garden Suite', likes: 2210, comments: 98, vsTypical: 1.2 },
    ],
    insight: {
      text: 'Sunrise Reels with real movement were breaking out this week. Your three were mid-day stills — beautiful, but they sat near your typical. Your only video, the suite tour, was also your best of the week.',
      action: 'Film first light, and let it move.',
    },
  },
  {
    label: 'Week of 12 Jun',
    trend: {
      format: 'Reel', gradient: G.coast, scene: 'The chef plates the day’s catch',
      caption: 'The chef plates the day’s first catch, six floors above the sea.',
      hotelName: 'The Verazza', handle: 'theverazza', place: 'Amalfi Coast, Italy',
      multiplier: 3.9, likes: 11800, comments: 902,
    },
    yours: [
      { format: 'Photo', gradient: G.sand, caption: 'Our new terrace menu', likes: 1610, comments: 58, vsTypical: 0.9 },
      { format: 'Reel', gradient: G.amber, caption: 'Negroni hour on the roof', likes: 3240, comments: 187, vsTypical: 1.8 },
      { format: 'Photo', gradient: G.pool, caption: 'Poolside, mid-afternoon', likes: 1480, comments: 49, vsTypical: 0.8 },
    ],
    insight: {
      text: 'The breakout was a chef at work — a person, a process, a story. Your Negroni Reel used the same recipe and nearly doubled your typical.',
      action: 'Put your people and your craft on camera.',
    },
  },
  {
    label: 'Week of 22 May',
    trend: {
      format: 'Carousel', gradient: G.suite, scene: 'A suite, 6am to midnight',
      caption: 'A day in the life of a suite: 6am to midnight, in ten frames.',
      hotelName: 'Marisol Palace', handle: 'marisolpalace', place: 'Mallorca, Spain',
      multiplier: 3.4, likes: 9600, comments: 430,
    },
    yours: [
      { format: 'Carousel', gradient: G.cream, caption: 'Five reasons to visit this summer', likes: 1720, comments: 66, vsTypical: 0.9 },
      { format: 'Photo', gradient: G.gold, caption: 'Golden hour on the bay', likes: 2050, comments: 88, vsTypical: 1.1 },
      { format: 'Photo', gradient: G.sageSoft, caption: 'The spa, newly reopened', likes: 1390, comments: 52, vsTypical: 0.7 },
    ],
    insight: {
      text: 'Narrative carousels — a real sequence, not a list — were pulling ahead. Your "five reasons" carousel was a list, and it landed flat.',
      action: 'Tell one story across the frames; don’t itemise.',
    },
  },
];

// Monthly post counts (12 + 11 + 11) deliberately sum to stats.posts90d (34)
// so the numbers reconcile if a reader goes looking.
const MONTHS: ComparisonPeriod[] = [
  {
    label: 'July 2026',
    trend: {
      format: 'Reel', gradient: G.caldera, scene: 'The caldera at sunrise',
      caption: 'Thirty seconds of sunrise, and nothing else.',
      hotelName: 'The Grand Selene', handle: 'grandselene', place: 'Santorini, Greece',
      multiplier: 5.6, likes: 18400, comments: 780,
    },
    yours: [
      { format: 'Reel', gradient: G.peach, caption: 'Sunrise on the rooftop', likes: 6240, comments: 287, vsTypical: 3.5 },
      { format: 'Carousel', gradient: G.sage, caption: 'Suite tour: the Garden Suite', likes: 2210, comments: 98, vsTypical: 1.2 },
      { format: 'Reel', gradient: G.amber, caption: 'Behind the bar: the house martini', likes: 1980, comments: 96, vsTypical: 1.1 },
      { format: 'Photo', gradient: G.gold, caption: 'Golden hour from suite 501', likes: 1830, comments: 79, vsTypical: 1.0 },
      { format: 'Carousel', gradient: G.sand, caption: 'The new tasting menu, course by course', likes: 1720, comments: 70, vsTypical: 0.9 },
      { format: 'Photo', gradient: G.cream, caption: 'Afternoon in the drawing room', likes: 1690, comments: 74, vsTypical: 0.9 },
      { format: 'Photo', gradient: G.pool, caption: 'Cabana season on the terrace', likes: 1610, comments: 58, vsTypical: 0.9 },
      { format: 'Reel', gradient: G.sageSoft, caption: 'A walk through the garden at dusk', likes: 1540, comments: 63, vsTypical: 0.8 },
      { format: 'Photo', gradient: G.rose, caption: 'This week’s lobby florals', likes: 1540, comments: 61, vsTypical: 0.8 },
      { format: 'Photo', gradient: G.pool, caption: 'The pool, empty and still', likes: 1450, comments: 55, vsTypical: 0.8 },
      { format: 'Photo', gradient: G.sand, caption: 'Breakfast, served', likes: 1360, comments: 49, vsTypical: 0.7 },
      { format: 'Photo', gradient: G.rose, caption: 'Fresh peonies at reception', likes: 1290, comments: 44, vsTypical: 0.7 },
    ],
    insight: {
      text: 'Sunrise, in motion, was the story of July across luxury hotels. Your best post of the month rode exactly that wave — 3.5× your typical. That wasn’t luck; it’s repeatable.',
      action: 'Make first light a weekly habit, not a one-off.',
    },
  },
  {
    label: 'June 2026',
    trend: {
      format: 'Reel', gradient: G.como, scene: 'The pasta room at dawn',
      caption: 'The pasta room at 6am — flour everywhere, and worth it.',
      hotelName: 'Villa Aurelia', handle: 'villa.aurelia', place: 'Lake Como, Italy',
      multiplier: 4.7, likes: 15900, comments: 1020,
    },
    yours: [
      { format: 'Reel', gradient: G.amber, caption: 'Negroni hour on the roof', likes: 3240, comments: 187, vsTypical: 1.8 },
      { format: 'Photo', gradient: G.gold, caption: 'Aperitivo on the terrace', likes: 1990, comments: 92, vsTypical: 1.1 },
      { format: 'Reel', gradient: G.peach, caption: 'The florist sets the lobby', likes: 1720, comments: 84, vsTypical: 1.0 },
      { format: 'Carousel', gradient: G.sage, caption: 'Inside the spa’s new hammam', likes: 1880, comments: 77, vsTypical: 1.0 },
      { format: 'Carousel', gradient: G.sageSoft, caption: 'Five garden-view suites, compared', likes: 1560, comments: 60, vsTypical: 0.9 },
      { format: 'Photo', gradient: G.amber, caption: 'The bar at golden hour', likes: 1590, comments: 64, vsTypical: 0.9 },
      { format: 'Photo', gradient: G.sand, caption: 'Our new terrace menu', likes: 1610, comments: 58, vsTypical: 0.9 },
      { format: 'Photo', gradient: G.cream, caption: 'Room 212, made up for arrival', likes: 1440, comments: 52, vsTypical: 0.8 },
      { format: 'Photo', gradient: G.pool, caption: 'Poolside, mid-afternoon', likes: 1480, comments: 49, vsTypical: 0.8 },
      { format: 'Photo', gradient: G.sand, caption: 'Morning coffee, courtyard', likes: 1360, comments: 47, vsTypical: 0.7 },
      { format: 'Photo', gradient: G.rose, caption: 'Rain on the terrace', likes: 1300, comments: 43, vsTypical: 0.7 },
    ],
    insight: {
      text: 'June belonged to people and process — chefs, bartenders, hands at work. Your Negroni Reel was your one post in that vein, and it nearly doubled your typical.',
      action: 'Put more faces and more craft on camera.',
    },
  },
  {
    label: 'May 2026',
    trend: {
      format: 'Carousel', gradient: G.suite, scene: 'A suite, dawn to dusk',
      caption: 'A suite, dawn to dusk, in ten unhurried frames.',
      hotelName: 'Marisol Palace', handle: 'marisolpalace', place: 'Mallorca, Spain',
      multiplier: 4.1, likes: 12700, comments: 560,
    },
    yours: [
      { format: 'Reel', gradient: G.amber, caption: 'The rooftop, just before service', likes: 1900, comments: 90, vsTypical: 1.1 },
      { format: 'Photo', gradient: G.gold, caption: 'Golden hour on the bay', likes: 2050, comments: 88, vsTypical: 1.1 },
      { format: 'Reel', gradient: G.peach, caption: 'Cocktail of the month: the Mayfair', likes: 1750, comments: 82, vsTypical: 1.0 },
      { format: 'Carousel', gradient: G.sage, caption: 'A suite with a view, room by room', likes: 1680, comments: 64, vsTypical: 0.9 },
      { format: 'Carousel', gradient: G.cream, caption: 'Five reasons to visit this summer', likes: 1720, comments: 66, vsTypical: 0.9 },
      { format: 'Photo', gradient: G.sand, caption: 'Afternoon tea, the conservatory', likes: 1520, comments: 58, vsTypical: 0.9 },
      { format: 'Photo', gradient: G.sageSoft, caption: 'Bluebells along the drive', likes: 1470, comments: 55, vsTypical: 0.8 },
      { format: 'Photo', gradient: G.cream, caption: 'The library at dusk', likes: 1410, comments: 50, vsTypical: 0.8 },
      { format: 'Photo', gradient: G.rose, caption: 'First roses of the season', likes: 1340, comments: 48, vsTypical: 0.8 },
      { format: 'Photo', gradient: G.pool, caption: 'Poolside cabanas, ready', likes: 1360, comments: 46, vsTypical: 0.7 },
      { format: 'Photo', gradient: G.sageSoft, caption: 'The spa, newly reopened', likes: 1390, comments: 52, vsTypical: 0.7 },
    ],
    insight: {
      text: 'May rewarded narrative — sequences that take you somewhere. Your strongest May post was a single golden-hour frame; picture it as frame one of ten.',
      action: 'Build the story out.',
    },
  },
];

// ─── The demo hotel ──────────────────────────────────────────────────────────
export const DEMO_HOTEL: YourHotelData = {
  name: 'The Lansmere',
  handle: 'thelansmere',
  location: 'Mayfair, London',
  accreditations: ['Forbes Five-Star', 'Condé Nast Gold List', 'Michelin Keys'],
  lastUpdated: '9 Jul 2026',
  postCount: 612,
  historySince: 'Mar 2021',
  followers: 62400,
  stats: {
    posts90d: 34,
    typicalEngagement: 1850,
    bestOnRecord: 6527,
    bestPostUrl: 'https://www.instagram.com/thelansmere/',
    engagementRate: 3.1,
  },
  benchmark: { er: 3.1, networkMedianEr: 2.4 },
  breakouts: BREAKOUTS,
  growth: {
    followers: {
      values: [31, 34.5, 38.2, 41, 44.6, 48.2, 51.4, 53.9, 56.2, 58.4, 60.1, 61.2, 61.9, 62.4],
      min: 28, max: 66,
      xLabels: [{ i: 0, l: '2021' }, { i: 3, l: "'22" }, { i: 5, l: "'23" }, { i: 8, l: "'24" }, { i: 11, l: "'25" }, { i: 13, l: "'26" }],
      headline: '62.4k', delta: '+31.4k since 2021',
      note: 'You’ve nearly doubled your audience since 2021 — a steady climb, no bought spikes.',
      ariaLabel: 'Followers grew from about 31 thousand in 2021 to 62.4 thousand in 2026',
    },
    er: {
      values: [2.2, 2.4, 2.5, 2.7, 2.6, 2.8, 2.9, 3.0, 2.9, 3.1, 3.0, 3.2, 3.1, 3.1],
      min: 2.0, max: 3.4,
      xLabels: [{ i: 0, l: '2021' }, { i: 3, l: "'22" }, { i: 5, l: "'23" }, { i: 8, l: "'24" }, { i: 11, l: "'25" }, { i: 13, l: "'26" }],
      headline: '3.1%', delta: 'up from 2.2%',
      note: 'Rare at your size: your engagement rate rose as you grew, instead of thinning out.',
      ariaLabel: 'Engagement rate rose from 2.2 percent in 2021 to 3.1 percent in 2026',
    },
  },
  comparison: { week: WEEKS, month: MONTHS },
  working: [
    {
      strong: 'Your breakouts skew toward video.',
      rest: 'Three of your four standout posts this quarter were Reels — motion is carrying your best work.',
    },
    {
      strong: 'Rooms and food travel furthest.',
      rest: 'Suites, the terrace and the pastry kitchen all beat your typical post, while wide landscape shots tend to land closer to average.',
    },
    {
      strong: 'Early light is doing the heavy lifting.',
      rest: 'Sunrise and golden-hour scenes keep showing up among your strongest posts.',
    },
  ],
};
