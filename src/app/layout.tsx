import type { Metadata } from 'next';
import { Archivo, Barlow_Condensed, JetBrains_Mono } from 'next/font/google';
import Link from 'next/link';
import Script from 'next/script';
import './globals.css';
import styles from './layout.module.css';
import NavLinks from './NavLinks';

// Three families, one job each (ADR 0016): Archivo for headings and text (with its
// width axis for wide headings), JetBrains Mono for numbers and labels, and Barlow
// Condensed italic for paint names only. next/font self-hosts and subsets them.
const archivo = Archivo({
  variable: '--font-archivo-src',
  subsets: ['latin'],
  axes: ['wdth'],
});

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-jetbrains-src',
  subsets: ['latin'],
  preload: false,
});

const barlowCondensed = Barlow_Condensed({
  variable: '--font-barlow-src',
  subsets: ['latin'],
  weight: '700',
  style: 'italic',
  preload: false,
});

const SITE_DESCRIPTION =
  'Community-driven registry tracking BMW M3 and M4 Individual color builds.';

export const metadata: Metadata = {
  metadataBase: new URL('https://mcolors.geektechlive.com'),
  title: {
    default: 'BMW M Individual Colors Registry',
    template: '%s | BMW M Individual Colors Registry',
  },
  description: SITE_DESCRIPTION,
  // Plain files in public/ are served as static assets before the Worker runs.
  // As app/ metadata routes they rendered through Next (~0.5 s CPU) and their
  // ?<hash> URLs bypassed the edge cache (#25).
  icons: {
    icon: [{ url: '/favicon.ico', sizes: 'any' }, { url: '/icon.png', type: 'image/png' }],
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    type: 'website',
    siteName: 'BMW M Individual Colors Registry',
    url: '/',
    title: 'BMW M Individual Colors Registry',
    description: SITE_DESCRIPTION,
    images: ['/icon.png'],
  },
  twitter: {
    card: 'summary',
    title: 'BMW M Individual Colors Registry',
    description: SITE_DESCRIPTION,
    images: ['/icon.png'],
  },
  alternates: {
    canonical: '/',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${archivo.variable} ${jetbrainsMono.variable} ${barlowCondensed.variable}`}
    >
      <body>
        <Script
          src="https://challenges.cloudflare.com/turnstile/v0/api.js"
          strategy="afterInteractive"
        />
        <div className={`stripe ${styles.topStripe}`} aria-hidden="true">
          <span />
          <span />
          <span />
        </div>

        <header className={styles.header}>
          <div className={styles.headerInner}>
            <Link href="/" className={styles.logo}>
              <span className={styles.logoBars} aria-hidden="true">
                <span />
                <span />
                <span />
              </span>
              <span className={styles.logoText}>BMW M Individual Colors</span>
            </Link>
            <NavLinks />
          </div>
        </header>

        <div className={styles.main}>{children}</div>

        <footer className={styles.footer}>
          BMW M Individual Colors Registry. A community project, not affiliated with BMW AG.
        </footer>
      </body>
    </html>
  );
}
