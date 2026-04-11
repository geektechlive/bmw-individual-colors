'use client';

import { useActionState, useEffect, useState } from 'react';
import { verifyForumUsername } from '../../actions';

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  background: '#1e2a3a',
  border: '1px solid #2d3f55',
  borderRadius: 6,
  color: '#e2e8f0',
  fontSize: 14,
  outline: 'none',
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 13,
  fontWeight: 600,
  color: '#94a3b8',
  marginBottom: 4,
};

interface Props {
  entryId: string;
}

export default function EditVerifyForm({ entryId }: Props) {
  const [state, action, isPending] = useActionState(verifyForumUsername, {});
  const [turnstileDone, setTurnstileDone] = useState(false);

  // Register global Turnstile callbacks once on mount
  useEffect(() => {
    (window as any).__tsSuccess = () => setTurnstileDone(true);
    (window as any).__tsExpired = () => setTurnstileDone(false);
    (window as any).__tsError = () => setTurnstileDone(false);
  }, []);

  // Reset the widget whenever the server returns an error so the user can retry.
  // setTurnstileDone(false) here is intentional — we're responding to an external
  // state change (server error) and there's no dependency cycle risk.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    if (state?.error && (window as any).turnstile) {
      (window as any).turnstile.reset('.cf-turnstile');
      setTurnstileDone(false);
    }
  }, [state?.error]);

  const canSubmit = !isPending && turnstileDone;

  return (
    <form action={action} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <input type="hidden" name="id" value={entryId} />

      <div>
        <p style={{ color: '#94a3b8', fontSize: 14, margin: '0 0 20px 0', lineHeight: 1.6 }}>
          To edit this entry, enter the forum username associated with it. This confirms you submitted the original entry.
        </p>
      </div>

      {state?.error && (
        <div style={{
          padding: '12px 16px',
          background: 'rgba(220,38,38,0.15)',
          border: '1px solid rgba(220,38,38,0.4)',
          borderRadius: 8,
          color: '#fca5a5',
          fontSize: 14,
        }}>
          {state.error}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <label style={labelStyle} htmlFor="forum_username">Forum Username *</label>
        <input
          type="text"
          id="forum_username"
          name="forum_username"
          placeholder="Your forum username on this entry"
          required
          autoComplete="off"
          style={inputStyle}
        />
      </div>

      <div
        className="cf-turnstile"
        data-sitekey="0x4AAAAAAC6yXfM_xBBaAkKj"
        data-theme="dark"
        data-callback="__tsSuccess"
        data-expired-callback="__tsExpired"
        data-error-callback="__tsError"
      />

      <button
        type="submit"
        disabled={!canSubmit}
        style={{
          padding: '12px 24px',
          background: canSubmit ? '#1C69D4' : '#374151',
          color: canSubmit ? '#ffffff' : '#6b7280',
          border: 'none',
          borderRadius: 8,
          fontSize: 15,
          fontWeight: 700,
          cursor: canSubmit ? 'pointer' : 'not-allowed',
          alignSelf: 'flex-start',
          transition: 'background 0.2s, color 0.2s',
        }}
      >
        {isPending ? 'Verifying...' : 'Verify & Edit'}
      </button>
    </form>
  );
}
