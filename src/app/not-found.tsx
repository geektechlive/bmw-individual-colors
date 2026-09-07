import Link from 'next/link';

export default function NotFound() {
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
          fontSize: 'clamp(32px, 6vw, 56px)',
          fontWeight: 900,
          color: '#f1f5f9',
          letterSpacing: '-0.02em',
          marginBottom: 12,
        }}
      >
        404
      </h1>
      <p style={{ color: '#94a3b8', fontSize: 16, maxWidth: 420, marginBottom: 32, lineHeight: 1.6 }}>
        This page doesn&apos;t exist in the registry. It may have been moved, deleted, or never
        built.
      </p>
      <Link
        href="/"
        style={{
          padding: '12px 28px',
          background: '#1C69D4',
          color: '#ffffff',
          borderRadius: 8,
          textDecoration: 'none',
          fontWeight: 700,
          fontSize: 15,
        }}
      >
        Back to Home
      </Link>
    </main>
  );
}
