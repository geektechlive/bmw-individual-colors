'use client';

import { useCallback, useEffect, useId, useRef, useState, type RefObject } from 'react';
import { mountPaintViewer, type PaintViewer as Viewer } from '../lib/paint-3d/viewer';
import type { Finish } from '../lib/paint-finish';
import styles from './PaintViewer.module.css';

// The 3D view itself: dialog, canvas and HUD around the three.js viewer (#96, ADR 0021).
// This file statically imports the viewer (and so three.js), so it is only ever loaded through
// next/dynamic with ssr: false from PaintViewer.tsx, on intent. That keeps three.js out of the
// server bundle as well as out of the page load (tests/unit/paint-3d-import-ban.test.ts).

export type OpenResult = 'ok' | 'no-webgl';
export interface StageApi {
  open(): OpenResult;
}

const MSG_LOST = 'The browser reset its graphics, so the 3D view closed. Tap the card to open it again.';

interface Props {
  name: string;
  hex: string;
  finish: Finish;
  code: string | null;
  /** The page's card: where the flight starts and lands, and where focus returns. */
  buttonRef: RefObject<HTMLButtonElement | null>;
  /** Called once, when the viewer code has loaded and the stage is mounted. */
  onReady: (api: StageApi) => void;
  /** The view closed on its own (lost graphics context): say why on the page. */
  onNotice: (message: string) => void;
  /** The view fully closed; the page can accept another tap. */
  onClosed: () => void;
}

export default function PaintViewerStage({ name, hex, finish, code, buttonRef, onReady, onNotice, onClosed }: Props) {
  const nameId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewerRef = useRef<Viewer | null>(null);
  const [hudOn, setHudOn] = useState(false);
  const [canvasKey, setCanvasKey] = useState(0);

  const handleClosed = useCallback((reason: 'user' | 'lost') => {
    const button = buttonRef.current;
    setHudOn(false);
    button?.removeAttribute('data-lifted'); // visible again before it takes focus
    dialogRef.current?.close();
    button?.focus({ preventScroll: true });
    if (reason === 'lost') {
      viewerRef.current?.dispose();
      viewerRef.current = null;
      setCanvasKey((k) => k + 1); // a lost context cannot be reused: a fresh canvas next time
      onNotice(MSG_LOST);
    }
    onClosed();
  }, [buttonRef, onNotice, onClosed]);

  const open = useCallback((): OpenResult => {
    const canvas = canvasRef.current;
    const dialog = dialogRef.current;
    const button = buttonRef.current;
    if (!canvas || !dialog || !button) return 'no-webgl';
    if (!viewerRef.current) {
      try {
        viewerRef.current = mountPaintViewer(canvas, {
          hex,
          finish,
          getStartRect: () => button.getBoundingClientRect(),
          onFirstFrame: () => button.setAttribute('data-lifted', ''),
          onCloseStart: () => setHudOn(false),
          onClosed: handleClosed,
        });
      } catch {
        return 'no-webgl'; // no WebGL: the dialog never opens
      }
    }
    dialog.showModal();
    setHudOn(true);
    viewerRef.current.open();
    dialog.querySelector<HTMLElement>('button')?.focus({ preventScroll: true });
    return 'ok';
  }, [buttonRef, hex, finish, handleClosed]);

  useEffect(() => {
    onReady({ open });
  }, [onReady, open]);

  useEffect(() => () => {
    viewerRef.current?.dispose();
    viewerRef.current = null;
  }, []);

  const meta = [code, finish].filter(Boolean).join(' · ');

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-labelledby={nameId}
      onCancel={(e) => { e.preventDefault(); viewerRef.current?.close(); }}
      onClose={() => { if (viewerRef.current?.isOpen) viewerRef.current.forceClose(); }}
    >
      <div className={styles.scrim} data-on={hudOn ? '' : undefined} />
      <canvas key={canvasKey} ref={canvasRef} className={styles.canvas} role="img" aria-label={`${name}, 3D paint sample`} />
      <div className={styles.hud} data-on={hudOn ? '' : undefined}>
        <div className={styles.title}>
          <p id={nameId} className={`paint-name ${styles.name}`}>{name}</p>
          <span className={styles.meta}>{meta}</span>
          <span className={styles.meta}>Drag to turn · arrow keys · Esc to close</span>
        </div>
        <button type="button" className={styles.close} aria-label="Close 3D view" onClick={() => viewerRef.current?.close()}>
          <span aria-hidden="true">✕</span>
        </button>
      </div>
    </dialog>
  );
}
