'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main
      style={{
        minHeight: '60vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '4rem 1.5rem',
        background: '#0a1420',
      }}
    >
      <div
        style={{
          display: 'flex',
          gap: 2,
          marginBottom: 24,
        }}
      >
        {['#1C69D4', '#862086', '#E8002D'].map((color) => (
          <div key={color} style={{ width: 6, height: 32, background: color, borderRadius: 3 }} />
        ))}
      </div>
      <h1
        style={{
          fontSize: 'clamp(24px, 5vw, 36px)',
          fontWeight: 900,
          color: '#f1f5f9',
          letterSpacing: '-0.02em',
          marginBottom: 12,
        }}
      >
        Something went wrong
      </h1>
      <p style={{ color: '#94a3b8', fontSize: 16, maxWidth: 420, marginBottom: 32, lineHeight: 1.6 }}>
        An unexpected error occurred while loading this page. You can try again or head back
        home.
      </p>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
        <button
          type="button"
          onClick={() => reset()}
          style={{
            padding: '12px 28px',
            background: '#1C69D4',
            color: '#ffffff',
            border: 'none',
            borderRadius: 8,
            fontWeight: 700,
            fontSize: 15,
            cursor: 'pointer',
          }}
        >
          Try again
        </button>
        <Link
          href="/"
          style={{
            padding: '12px 28px',
            background: 'transparent',
            color: '#e2e8f0',
            border: '1px solid #2d3f55',
            borderRadius: 8,
            textDecoration: 'none',
            fontWeight: 600,
            fontSize: 15,
          }}
        >
          Back to Home
        </Link>
      </div>
    </main>
  );
}
