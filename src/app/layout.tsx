import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import Link from 'next/link';
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
  title: 'BMW M Individual Colors Registry',
  description: 'Community-driven registry tracking BMW M3 and M4 Individual color builds.',
};

const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/entries', label: 'Entries' },
  { href: '/reports', label: 'Reports' },
  { href: '/submit', label: 'Submit' },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        {/* M-stripe top bar */}
        <div style={{ display: 'flex', height: 4, position: 'sticky', top: 0, zIndex: 51 }}>
          <div style={{ flex: 1, background: '#1C69D4' }} />
          <div style={{ flex: 1, background: '#862086' }} />
          <div style={{ flex: 1, background: '#E8002D' }} />
        </div>

        {/* Top Nav */}
        <header
          style={{
            background: '#070d14',
            borderBottom: '1px solid #1e2a3a',
            position: 'sticky',
            top: 4,
            zIndex: 50,
          }}
        >
          <div
            style={{
              maxWidth: 1280,
              margin: '0 auto',
              padding: '0 1.5rem',
              height: 56,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            {/* Logo / Site Title */}
            <Link
              href="/"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                textDecoration: 'none',
              }}
            >
              {/* M-stripe logo mark */}
              <div style={{ display: 'flex', gap: 2, flexShrink: 0, alignItems: 'stretch', height: 24 }}>
                {['#1C69D4', '#862086', '#E8002D'].map((color) => (
                  <div key={color} style={{ width: 4, height: '100%', background: color, borderRadius: 2 }} />
                ))}
              </div>
              <span
                style={{
                  fontSize: 15,
                  fontWeight: 800,
                  color: '#e2e8f0',
                  letterSpacing: '-0.01em',
                }}
              >
                BMW M Individual Colors
              </span>
            </Link>

            {/* Nav Links */}
            <nav style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {NAV_LINKS.map(({ href, label }) =>
                label === 'Submit' ? (
                  <Link
                    key={href}
                    href={href}
                    style={{
                      padding: '6px 14px',
                      background: '#1C69D4',
                      color: '#ffffff',
                      borderRadius: 6,
                      textDecoration: 'none',
                      fontSize: 13,
                      fontWeight: 700,
                      marginLeft: 8,
                    }}
                  >
                    {label}
                  </Link>
                ) : (
                  <Link
                    key={href}
                    href={href}
                    style={{
                      padding: '6px 12px',
                      color: '#94a3b8',
                      textDecoration: 'none',
                      fontSize: 14,
                      fontWeight: 500,
                      borderRadius: 6,
                    }}
                  >
                    {label}
                  </Link>
                )
              )}
            </nav>
          </div>
        </header>

        {/* Page Content */}
        <div style={{ flex: 1 }}>{children}</div>

        {/* Footer */}
        <footer
          style={{
            borderTop: '1px solid #1e2a3a',
            padding: '1.5rem',
            textAlign: 'center',
            color: '#374151',
            fontSize: 13,
            background: '#070d14',
          }}
        >
          BMW M Individual Colors Registry — Community project. Not affiliated with BMW AG.
        </footer>
      </body>
    </html>
  );
}
