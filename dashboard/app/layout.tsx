import type { Metadata } from 'next';
import { Baloo_2, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const baloo = Baloo_2({
  subsets: ['latin'],
  variable: '--font-wordmark',
  weight: ['800'],
  display: 'swap',
});

const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  weight: ['400', '500', '700'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'High Elm Studio — The Content Radar',
  description: "Hotel posts ranked by how far each beat its own hotel's normal — not by account size.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${baloo.variable} ${mono.variable}`}>
        {children}
      </body>
    </html>
  );
}
