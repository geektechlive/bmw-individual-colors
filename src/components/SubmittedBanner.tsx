'use client';

import { useState } from 'react';

export default function SubmittedBanner() {
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  return (
    <div
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
          Submission received
        </div>
        <div style={{ color: '#fde68a', fontSize: 13 }}>
          Your submission is in the queue and could take up to 5 minutes to appear. Please be patient.
        </div>
      </div>
      <button
        onClick={() => setVisible(false)}
        aria-label="Dismiss"
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
