import type { Metadata } from 'next';
import { Space_Grotesk, Hanken_Grotesk } from 'next/font/google';
import './globals.css';

// Display numerals + the "content radar" wordmark only — never body text.
// Space Grotesk tops out at 700; inline 800 weights clamp to it (by design).
const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['500', '600', '700'],
  display: 'swap',
});

// Everything readable — titles, paragraphs, table cells, buttons — AND the
// all-caps micro-labels (--font-label is aliased to this family in globals.css).
const hanken = Hanken_Grotesk({
  subsets: ['latin'],
  variable: '--font-body',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Content Radar — powered by High Elm Studio',
  description:
    "Hotel posts ranked by how far each beat its own hotel's normal — not by account size.",
  icons: {
    icon: [{ url: '/brand/favicon.svg', type: 'image/svg+xml' }],
  },
};

// Applies the saved dark-mode choice to <html> before first paint, so gated
// pages don't flash light before the toggle's client code runs. Default (no
// stored choice) is light. Kept tiny and inlined on purpose. See app/globals.css
// (dark block) and components/ThemeToggle.tsx.
const themeInit = `(function(){try{var t=localStorage.getItem('cr-theme');if(t==='dark'||t==='light')document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // suppressHydrationWarning on <html>: the themeInit script sets data-theme on it
  // before hydration, so the server markup (no attribute) intentionally differs from
  // the client. The flag is scoped to this one element's own attributes.
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body className={`${spaceGrotesk.variable} ${hanken.variable}`}>
        {children}
      </body>
    </html>
  );
}
