'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useId, useState, type CSSProperties } from 'react';

const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/entries', label: 'Entries' },
  { href: '/reports', label: 'Reports' },
  { href: '/colors', label: 'Colors' },
  { href: '/map', label: 'Map' },
  { href: '/submit', label: 'Submit' },
];

export default function NavLinks() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const menuId = useId();

  // Close the mobile menu on Escape.
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const renderLink = (href: string, label: string, isMobile: boolean) => {
    const isActive = pathname === href;

    if (label === 'Submit') {
      const style: CSSProperties = {
        padding: '6px 14px',
        background: '#1C69D4',
        color: '#ffffff',
        borderRadius: 6,
        textDecoration: 'none',
        fontSize: 13,
        fontWeight: 700,
        marginLeft: isMobile ? 0 : 8,
        display: isMobile ? 'block' : 'inline-block',
        textAlign: isMobile ? 'center' : undefined,
      };

      return (
        <Link key={href} href={href} onClick={() => setIsOpen(false)} style={style}>
          {label}
        </Link>
      );
    }

    const style: CSSProperties = {
      padding: isMobile ? '10px 12px' : '6px 12px',
      color: isActive ? '#e2e8f0' : '#94a3b8',
      textDecoration: 'none',
      fontSize: 14,
      fontWeight: 500,
      borderRadius: 6,
      borderBottom: !isMobile && isActive ? '2px solid #1C69D4' : undefined,
      borderLeft: isMobile && isActive ? '2px solid #1C69D4' : undefined,
      paddingBottom: !isMobile && isActive ? '4px' : undefined,
    };

    return (
      <Link key={href} href={href} onClick={() => setIsOpen(false)} style={style}>
        {label}
      </Link>
    );
  };

  return (
    <>
      <nav className="nav-desktop" aria-label="Primary">
        {NAV_LINKS.map(({ href, label }) => renderLink(href, label, false))}
      </nav>

      <button
        type="button"
        className="nav-toggle"
        aria-label="Menu"
        aria-expanded={isOpen}
        aria-controls={menuId}
        onClick={() => setIsOpen((open) => !open)}
      >
        <span className="nav-toggle-bar" />
        <span className="nav-toggle-bar" />
        <span className="nav-toggle-bar" />
      </button>

      <nav
        id={menuId}
        className={`nav-mobile${isOpen ? ' nav-mobile--open' : ''}`}
        aria-label="Primary"
      >
        {NAV_LINKS.map(({ href, label }) => renderLink(href, label, true))}
      </nav>
    </>
  );
}
