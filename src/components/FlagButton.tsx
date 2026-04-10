'use client';

import { useState, useTransition } from 'react';
import { flagEntry } from '../app/actions';

export default function FlagButton({ id }: { id: string }) {
  const [flagged, setFlagged] = useState(false);
  const [pending, startTransition] = useTransition();

  if (flagged) {
    return <span style={{ color: '#64748b', fontSize: 11 }}>Flagged</span>;
  }

  return (
    <button
      onClick={() => startTransition(async () => {
        await flagEntry(id);
        setFlagged(true);
      })}
      disabled={pending}
      title="Flag this entry as incorrect"
      style={{
        background: 'none', border: 'none', cursor: pending ? 'wait' : 'pointer',
        color: '#475569', fontSize: 12, padding: '2px 4px', borderRadius: 4,
        transition: 'color 0.15s', lineHeight: 1,
      }}
      onMouseEnter={(e) => (e.currentTarget.style.color = '#f87171')}
      onMouseLeave={(e) => (e.currentTarget.style.color = '#475569')}
    >
      🚩
    </button>
  );
}
