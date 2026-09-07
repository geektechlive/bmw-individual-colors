'use client';

import { useState } from 'react';

interface Props {
  title?: string;
  body?: string;
}

export default function SubmittedBanner({ title, body }: Props) {
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  return (
    <div
      data-testid="submitted-banner"
      style={{
        background: 'rgba(202, 138, 4, 0.15)',
        border: '2px solid #ca8a04',
        borderRadius: 10,
        padding: '16px 20px',
        marginBottom: 24,
        display: 'flex',
        alignItems: 'center',
        gap: 16,
      }}
    >
      <div style={{ flex: 1 }}>
        <div style={{ color: '#fbbf24', fontSize: 15, fontWeight: 700, marginBottom: 2 }}>
          {title ?? 'Submission received'}
        </div>
        <div style={{ color: '#fde68a', fontSize: 13 }}>
          {body ?? "It should appear in the table right away; if you don't see it, refresh in a moment."}
        </div>
      </div>
      <button
        onClick={() => setVisible(false)}
        aria-label="Dismiss"
        data-testid="submitted-banner-dismiss"
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: '#ca8a04',
          fontSize: 20,
          lineHeight: 1,
          padding: '4px 8px',
          flexShrink: 0,
        }}
      >
        ×
      </button>
    </div>
  );
}
