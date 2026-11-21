'use client';

import { Component, useCallback, useRef, useState, type ReactNode } from 'react';
import dynamic from 'next/dynamic';
import type { Finish } from '../lib/paint-finish';
import type { StageApi } from './PaintViewerStage';
import styles from './PaintViewer.module.css';

// The paint page's spray card as a button that opens the 3D view (#96, ADR 0021). The stage
// (dialog, canvas and three.js, ~700 KB) is a separate chunk that is neither rendered on the
// server nor fetched on page load: hover, focus or pointer-down on the card mounts it. Nothing
// here imports three.js (tests/unit/paint-3d-import-ban.test.ts).
const Stage = dynamic(() => import('./PaintViewerStage'), { ssr: false });

const MSG_LOAD = 'Could not load the 3D view. Check the connection and reload the page.';
const MSG_NO_WEBGL = "This browser can't show 3D here (WebGL is unavailable). The flat card is what you see.";
const LOAD_TIMEOUT_MS = 20000;

/** A chunk that fails to load (offline, or a stale tab after a deploy) throws during render;
 *  catch it here so the page stays and the card can say what happened. */
class StageBoundary extends Component<{ onError: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onError();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

interface Props {
  name: string;
  hex: string;
  finish: Finish;
  /** BMW paint code, when the paint has one. */
  code: string | null;
  /** The page's card styles (the spray card). */
  className: string;
  /** The card's face: swatch, sticker and strip. */
  children: ReactNode;
}

export default function PaintViewer({ name, hex, finish, code, className, children }: Props) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const stageReady = useRef<Promise<StageApi | null> | null>(null);
  const resolveStage = useRef<((api: StageApi | null) => void) | null>(null);
  const busyRef = useRef(false);
  const [armed, setArmed] = useState(false);
  const [notice, setNotice] = useState('');

  // Mounting the stage is what loads three.js; one promise says when it is ready.
  const arm = useCallback((): Promise<StageApi | null> => {
    if (!stageReady.current) {
      stageReady.current = new Promise<StageApi | null>((resolve) => { resolveStage.current = resolve; });
      setArmed(true);
    }
    return stageReady.current;
  }, []);

  const preload = useCallback(() => { void arm(); }, [arm]);
  const onReady = useCallback((api: StageApi) => { resolveStage.current?.(api); }, []);
  const onClosed = useCallback(() => { busyRef.current = false; }, []);
  const onLoadFailed = useCallback(() => {
    resolveStage.current?.(null); // wakes a waiting tap, which shows the message
    stageReady.current = null;
    resolveStage.current = null;
    setArmed(false);
  }, []);

  async function openView() {
    if (busyRef.current) return;
    busyRef.current = true;
    setNotice('');
    const api = await Promise.race([
      arm(),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), LOAD_TIMEOUT_MS)),
    ]);
    if (!api) {
      setNotice(MSG_LOAD);
      busyRef.current = false;
      return;
    }
    if (api.open() === 'no-webgl') {
      setNotice(MSG_NO_WEBGL);
      busyRef.current = false;
    }
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className={`${className} ${styles.card}`}
        aria-haspopup="dialog"
        onPointerEnter={preload}
        onPointerDown={preload}
        onFocus={preload}
        onClick={openView}
      >
        {/* The name comes from this text, not aria-label: the card's visible sticker text is
            decorative and would trip axe's label-content-name-mismatch. */}
        <span className="sr-only">View {name} in 3D</span>
        {children}
        <span className={styles.hint} aria-hidden="true">View in 3D</span>
      </button>
      <p className={styles.notice} role="status">{notice}</p>
      {armed && (
        <StageBoundary onError={onLoadFailed}>
          <Stage
            name={name}
            hex={hex}
            finish={finish}
            code={code}
            buttonRef={buttonRef}
            onReady={onReady}
            onNotice={setNotice}
            onClosed={onClosed}
          />
        </StageBoundary>
      )}
    </>
  );
}
