import Link from 'next/link';
import Script from 'next/script';
import EntryForm from '../../components/EntryForm';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Submit Your Build — BMW Individual Colors Registry',
};

export default function SubmitPage() {
  return (
    <main style={{ maxWidth: 760, margin: '0 auto', padding: '2rem 1.5rem' }}>
      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" strategy="lazyOnload" />
      <div style={{ marginBottom: 24 }}>
        <Link
          href="/"
          style={{
            color: '#1C69D4',
            textDecoration: 'none',
            fontSize: 14,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          ← Back to Home
        </Link>
      </div>

      <h1
        style={{
          fontSize: 28,
          fontWeight: 800,
          color: '#e2e8f0',
          marginBottom: 4,
        }}
      >
        Submit Your Build
      </h1>
      <p style={{ color: '#94a3b8', fontSize: 14, marginBottom: 32 }}>
        Add your BMW M Individual color build to the community registry.
        Your submission helps track color popularity and distribution.
      </p>

      <div
        style={{
          background: '#0f1923',
          border: '1px solid #2d3f55',
          borderRadius: 12,
          padding: '2rem',
        }}
      >
        <EntryForm />
      </div>
    </main>
  );
}
