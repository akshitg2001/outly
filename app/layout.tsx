import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://outly-planner.akshitg2001.chatgpt.site'),
  title: 'Outly — AI outing planner',
  description: 'Personalised, bookable local outing plans in seconds.',
  openGraph: {
    title: 'Outly — AI outing planner',
    description: 'Plan less. Go out better. Bookable local outings, made for you.',
    images: [{ url: '/og.png', width: 1680, height: 945, alt: 'Outly — Plan less. Go out better.' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Outly — AI outing planner',
    description: 'Plan less. Go out better. Bookable local outings, made for you.',
    images: ['/og.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
