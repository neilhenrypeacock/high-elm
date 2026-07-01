import type { Metadata } from 'next';
import { Baloo_2, Hanken_Grotesk, Space_Mono } from 'next/font/google';
import './globals.css';

// Display numerals + wordmark only — never body text
const baloo = Baloo_2({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['700', '800'],
  display: 'swap',
});

// Everything readable — titles, paragraphs, table cells, buttons
const hanken = Hanken_Grotesk({
  subsets: ['latin'],
  variable: '--font-body',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

// All-caps micro-labels only — eyebrows, captions, column headers
const spaceMono = Space_Mono({
  subsets: ['latin'],
  variable: '--font-label',
  weight: ['400', '700'],
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
      <body className={`${baloo.variable} ${hanken.variable} ${spaceMono.variable}`}>
        {children}
      </body>
    </html>
  );
}
