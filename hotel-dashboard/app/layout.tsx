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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${spaceGrotesk.variable} ${hanken.variable}`}>
        {children}
      </body>
    </html>
  );
}
