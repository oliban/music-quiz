import type { Metadata } from "next";
import { Geist, Geist_Mono, Audiowide, Righteous, VT323 } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { Providers } from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const audiowide = Audiowide({
  weight: "400",
  variable: "--font-audiowide",
  subsets: ["latin"],
});

const righteous = Righteous({
  weight: "400",
  variable: "--font-righteous",
  subsets: ["latin"],
});

const vt323 = VT323({
  weight: "400",
  variable: "--font-vt323",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Mixtape Duel",
  description: "2-player music showdown powered by Spotify playlists",
  metadataBase: new URL('https://mixtape-duel.fly.dev'),
  openGraph: {
    title: "Mixtape Duel",
    description: "2-player music showdown powered by Spotify playlists. Two teams. One playlist. Ultimate showdown.",
    url: 'https://mixtape-duel.fly.dev',
    siteName: 'Mixtape Duel',
    images: [
      {
        url: 'https://mixtape-duel.fly.dev/hero-image.png',
        width: 800,
        height: 600,
        alt: 'Mixtape Duel - Music quiz game',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Mixtape Duel',
    description: '2-player music showdown powered by Spotify playlists. Two teams. One playlist. Ultimate showdown.',
    images: ['https://mixtape-duel.fly.dev/hero-image.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${audiowide.variable} ${righteous.variable} ${vt323.variable} antialiased`}
      >
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-QJDVVCY7HL"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-QJDVVCY7HL');
          `}
        </Script>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
