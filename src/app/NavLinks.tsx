'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/entries', label: 'Entries' },
  { href: '/reports', label: 'Reports' },
  { href: '/colors', label: 'Colors' },
  { href: '/submit', label: 'Submit' },
];

export default function NavLinks() {
  const pathname = usePathname();

  return (
    <nav style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      {NAV_LINKS.map(({ href, label }) => {
        const isActive = pathname === href;

        if (label === 'Submit') {
          return (
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
          );
        }

        return (
          <Link
            key={href}
            href={href}
            style={{
              padding: '6px 12px',
              color: isActive ? '#e2e8f0' : '#94a3b8',
              textDecoration: 'none',
              fontSize: 14,
              fontWeight: 500,
              borderRadius: 6,
              borderBottom: isActive ? '2px solid #1C69D4' : undefined,
              paddingBottom: isActive ? '4px' : '6px',
            }}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
