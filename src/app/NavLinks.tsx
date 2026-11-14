'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useId, useState } from 'react';
import styles from './NavLinks.module.css';

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

    if (href === '/submit') {
      const className = isMobile ? `${styles.cta} ${styles.ctaMobile}` : styles.cta;
      return (
        <Link key={href} href={href} onClick={() => setIsOpen(false)} className={className}>
          {label}
        </Link>
      );
    }

    const className = [styles.link, isMobile && styles.mobile, isActive && styles.active]
      .filter(Boolean)
      .join(' ');

    return (
      <Link
        key={href}
        href={href}
        onClick={() => setIsOpen(false)}
        className={className}
        aria-current={isActive ? 'page' : undefined}
      >
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
