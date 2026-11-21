// The 3D paint view (#96, ADR 0021): vanilla three.js, no framework. The card lifts off the
// page from its on-page rect, turns into the code-built speed shape once airborne, floats,
// spins under the finger and is lit by a softbox that follows the pointer. Closing reverses
// the flight and lands on the card's exact spot.
//
// This is the ONLY module that imports three. Its one importer is components/PaintViewerStage,
// which is loaded with next/dynamic and ssr: false, on intent, so three never reaches the server
// bundle (tests/unit/paint-3d-import-ban.test.ts, ADR 0021). Rendering runs only while open.

import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  DataTexture,
  DirectionalLight,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  NeutralToneMapping,
  PerspectiveCamera,
  PlaneGeometry,
  PMREMGenerator,
  RectAreaLight,
  Raycaster,
  RepeatWrapping,
  RGBAFormat,
  Scene,
  UnsignedByteType,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { FlakesTexture } from 'three/addons/textures/FlakesTexture.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import type { Finish } from '../paint-finish';
import { ease, lerp, smooth, stepMix, OPEN_MS, CLOSE_MS, SWAP_IN_MS, SWAP_OUT_MS, viewMetrics, rectToPose, targetPose, type Pose } from './flight';
import { FLAKE_REPEAT, materialParams } from './material';
import { buildSpeedShape, SPEED_SHAPE } from './speed-shape';

export type ClosedReason = 'user' | 'lost';

export interface ViewerOptions {
  hex: string;
  finish: Finish;
  /** The card's current on-page rect; read again on resize and on close, so it can move. */
  getStartRect: () => DOMRect;
  /** A boolean, or a function read every frame (the preference can change while open). */
  reducedMotion?: boolean | (() => boolean);
  /** The first frame is on screen: the page card can hide behind it. */
  onFirstFrame?: () => void;
  /** A close began (tap outside, close()): the page can start fading its scrim. */
  onCloseStart?: () => void;
  /** The view is fully closed and the render loop stopped. */
  onClosed?: (reason: ClosedReason) => void;
}

export interface PaintViewer {
  open(): void;
  close(): void;
  /** Close at once, without the landing flight. */
  forceClose(): void;
  readonly isOpen: boolean;
  dispose(): void;
}

const CAM_Z = 9;
const CAM_FOV = 20;
const SLAB_DEPTH = 0.07; // thickness of the flat card, relative to its height of 1
const START_YAW = -0.28; // the page card is tilted about -16 degrees in CSS
const INTRO_YAW = 0.42;
const INTRO_PITCH = -0.18;
const CAR_PITCH = 0.32;
const DRAG_RADIANS_PER_PX = 0.008;
const TAP_SLOP_PX = 6;
const KEY_STEP = 0.06;
const FOLLOW_IDLE_MS = 2500;
const SHADOW_SIZE = 128;

export function mountPaintViewer(canvas: HTMLCanvasElement, opts: ViewerOptions): PaintViewer {
  const reduced = () => {
    const r = opts.reducedMotion;
    if (typeof r === 'function') return r();
    return r ?? matchMedia('(prefers-reduced-motion: reduce)').matches;
  };

  // Throws when WebGL is unavailable; the caller shows the fallback message.
  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.toneMapping = NeutralToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.setClearColor(0x000000, 0);

  const scene = new Scene();
  const pmrem = new PMREMGenerator(renderer);
  const envTarget = pmrem.fromScene(new RoomEnvironment(), 0.04);
  scene.environment = envTarget.texture;
  scene.environmentIntensity = 0.65;

  const camera = new PerspectiveCamera(CAM_FOV, 1, 0.1, 60);
  camera.position.set(0, 0, CAM_Z);

  RectAreaLightUniformsLib.init();
  // A long softbox strip: on clear coat it reads as a streak of light, not a flashlight dot.
  const softbox = new RectAreaLight(0xffffff, 9, 5, 0.45);
  const key = new DirectionalLight(0xffffff, 0.35);
  scene.add(softbox, key, key.target);

  // Material from the finish.
  const params = materialParams(opts.finish, opts.hex);
  const flakeTex = new CanvasTexture(new FlakesTexture(512, 512));
  flakeTex.wrapS = flakeTex.wrapT = RepeatWrapping;
  flakeTex.repeat.set(FLAKE_REPEAT[0], FLAKE_REPEAT[1]);
  const material = new MeshPhysicalMaterial({
    color: params.color,
    metalness: params.metalness,
    roughness: params.roughness,
    clearcoat: params.clearcoat,
    clearcoatRoughness: params.clearcoatRoughness,
    iridescence: params.iridescence,
    iridescenceIOR: params.iridescenceIOR,
    iridescenceThicknessRange: params.iridescenceThicknessRange,
    sheen: params.sheen,
    sheenRoughness: params.sheenRoughness,
  });
  material.sheenColor.set(0xffffff);
  if (params.flakeScale !== null) {
    material.normalMap = flakeTex;
    material.normalScale.set(params.flakeScale, params.flakeScale);
  }

  // The flying card: a unit-high slab, stretched to the card's aspect on open.
  const slabGeo = new BoxGeometry(1, 1, SLAB_DEPTH, 24, 24, 1);
  const slab = new Mesh(slabGeo, material);

  // The speed shape.
  const data = buildSpeedShape();
  const carGeo = new BufferGeometry();
  carGeo.setAttribute('position', new BufferAttribute(data.positions, 3));
  carGeo.setAttribute('uv', new BufferAttribute(data.uvs, 2));
  carGeo.setIndex(new BufferAttribute(data.indices, 1));
  carGeo.computeVertexNormals();
  const carInner = new Group();
  carInner.add(new Mesh(carGeo, material));
  carInner.position.y = SPEED_SHAPE.CENTER_Y; // centre the shape on the card's pivot
  carInner.rotation.y = 0.35; // front three-quarter
  const carShape = new Group();
  carShape.add(carInner);
  carShape.scale.setScalar(SPEED_SHAPE.SCALE);
  const car = new Group();
  car.add(carShape);
  car.visible = false;

  // Soft shadow on the dimmed page, from a generated alpha gradient (no color strings).
  const shadowPx = new Uint8Array(SHADOW_SIZE * SHADOW_SIZE * 4);
  for (let y = 0; y < SHADOW_SIZE; y++) {
    for (let x = 0; x < SHADOW_SIZE; x++) {
      const d = Math.hypot(x - SHADOW_SIZE / 2 + 0.5, y - SHADOW_SIZE / 2 + 0.5) / (SHADOW_SIZE / 2);
      const t = Math.max(0, Math.min(1, (d - 0.06) / 0.94));
      shadowPx[(y * SHADOW_SIZE + x) * 4 + 3] = Math.round(217 * (1 - t));
    }
  }
  const shadowTex = new DataTexture(shadowPx, SHADOW_SIZE, SHADOW_SIZE, RGBAFormat, UnsignedByteType);
  shadowTex.needsUpdate = true;
  const shadowGeo = new PlaneGeometry(2.4, 2.4);
  const shadowMat = new MeshBasicMaterial({ map: shadowTex, color: 0x000000, transparent: true, depthWrite: false, opacity: 0 });
  const shadow = new Mesh(shadowGeo, shadowMat);

  const root = new Group(); // flight: position and scale
  const spin = new Group(); // tilt, user rotation, float
  spin.add(slab, car);
  root.add(spin);
  scene.add(shadow, root);

  const st = {
    open: false,
    dead: false,
    firstFrame: false,
    p: 0,
    dir: 0 as 0 | 1 | -1,
    t0: 0,
    dur: OPEN_MS,
    carMix: 0,
    carTarget: 0,
    /** Timestamp of the previous frame, for the time-based swap (#97); 0 = none yet. */
    lastFrame: 0,
    aspect: 0.714,
    yaw: 0,
    pitch: 0,
    vYaw: 0,
    vPitch: 0,
    closeYaw: 0,
    closePitch: 0,
    light: { x: 0.6, y: 0.5, follow: false, lastMove: 0 },
    start: { x: 0, y: 0, s: 1 } as Pose,
    target: { x: 0, y: 0, s: 1 } as Pose,
    dragging: null as null | { id: number; x: number; y: number; moved: number; onShape: boolean },
    shownYaw: '',
  };
  const lightPos = new Vector3();
  const raycaster = new Raycaster();
  const ndc = new Vector2();

  const metrics = () => viewMetrics(window.innerWidth, window.innerHeight, CAM_FOV, CAM_Z);
  const introPitch = () => INTRO_PITCH + (CAR_PITCH - INTRO_PITCH) * smooth(0, 1, st.carMix);

  function resize() {
    if (st.dead) return;
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    if (st.open) {
      st.target = targetPose(metrics());
      st.start = rectToPose(opts.getStartRect(), metrics());
    }
  }

  function finishClose(reason: ClosedReason) {
    const wasOpen = st.open;
    st.open = false;
    st.dir = 0;
    st.dragging = null;
    delete canvas.dataset.on;
    delete canvas.dataset.dragging;
    renderer.setAnimationLoop(null);
    if (!st.dead) renderer.clear();
    if (wasOpen || reason === 'lost') opts.onClosed?.(reason);
  }

  function open() {
    if (st.open || st.dead) return;
    const rect = opts.getStartRect();
    st.aspect = rect.width / Math.max(1, rect.height);
    slab.scale.set(st.aspect, 1, 1);
    resize();
    Object.assign(st, { open: true, firstFrame: false, yaw: 0, pitch: 0, vYaw: 0, vPitch: 0, carMix: 0, carTarget: 1, lastFrame: 0, dir: 1, p: 0 });
    st.start = rectToPose(rect, metrics());
    st.target = targetPose(metrics());
    st.t0 = performance.now();
    st.dur = reduced() ? 1 : OPEN_MS;
    canvas.dataset.on = '';
    if (reduced()) {
      canvas.style.opacity = '0';
      requestAnimationFrame(() => { canvas.style.opacity = '1'; });
    }
    renderer.setAnimationLoop(tick);
  }

  function close() {
    if (!st.open || st.dir === -1 || st.dead) return;
    opts.onCloseStart?.();
    st.closeYaw = INTRO_YAW + st.yaw;
    st.closePitch = introPitch() + st.pitch;
    st.carTarget = 0; // the shape swaps back to the card as it lands
    st.start = rectToPose(opts.getStartRect(), metrics());
    st.dir = -1;
    st.t0 = performance.now();
    st.dur = reduced() ? 1 : CLOSE_MS;
  }

  function forceClose() {
    if (!st.open) return;
    opts.onCloseStart?.();
    finishClose('user');
  }

  function tick(now: number) {
    if (st.dead) return;
    const t = now / 1000;
    const rm = reduced();

    if (st.dir) {
      // Clamped both ways: a frame timestamp can precede the performance.now() of the click.
      const raw = Math.max(0, Math.min(1, (now - st.t0) / st.dur));
      st.p = st.dir === 1 ? ease(raw) : 1 - ease(raw);
      if (raw >= 1) {
        if (st.dir === -1) { finishClose('user'); return; }
        st.dir = 0;
      }
    }
    const p = st.p;
    const a = st.start;
    const b = st.target;
    const idle = st.open && !st.dir && !st.dragging && !rm;

    // Position and scale: flat on the card, full depth in the air.
    const floatY = idle ? Math.sin(t * 1.3) * 0.035 * b.s : 0;
    root.position.set(lerp(a.x, b.x, p), lerp(a.y, b.y, p) + floatY, lerp(0, 0.3, p));
    const sc = lerp(a.s, b.s, p);
    root.scale.set(sc, sc, sc * lerp(0.12, 1, p));

    // Rotation: the card's own tilt, the intro tilt, and the user's drag with inertia.
    if (!st.dragging) {
      st.yaw += st.vYaw;
      st.pitch += st.vPitch;
      st.vYaw *= 0.93;
      st.vPitch *= 0.93;
    }
    st.pitch = Math.max(-0.9, Math.min(0.9, st.pitch));
    if (st.dir === -1) {
      spin.rotation.set(st.closePitch * p, lerp(START_YAW, st.closeYaw, p), 0);
    } else {
      const drift = idle ? Math.sin(t * 0.6) * 0.06 : 0;
      spin.rotation.set(introPitch() * p + st.pitch, lerp(START_YAW, INTRO_YAW, p) + st.yaw + drift, 0);
    }

    // Card and shape swap by scale: one shrinks away as the other grows in. The shape waits
    // until the card is most of the way off the page. Timed in milliseconds (#97), so it runs
    // the same on 60 Hz and 120 Hz screens; a long gap (tab switch) counts as one frame.
    const dt = st.lastFrame ? Math.min(now - st.lastFrame, 50) : 16;
    st.lastFrame = now;
    const carGo = st.dir === 1 ? (p > 0.7 ? st.carTarget : 0) : st.carTarget;
    const swapMs = rm ? 0 : carGo > st.carMix ? SWAP_IN_MS : SWAP_OUT_MS;
    st.carMix = stepMix(st.carMix, carGo, dt, swapMs);
    const cm = smooth(0, 1, st.carMix);
    const flat = Math.max(0.001, 1 - cm);
    slab.visible = cm < 0.995;
    slab.scale.set(st.aspect * flat, flat, flat);
    car.visible = cm > 0.005;
    car.scale.setScalar(Math.max(0.001, cm));

    // Light: follows the pointer or finger; sweeps slowly when left alone.
    const L = st.light;
    let lx = L.x;
    let ly = L.y;
    if (!L.follow || now - L.lastMove > FOLLOW_IDLE_MS) {
      if (!rm) { lx = Math.sin(t * 0.45) * 0.9; ly = 0.45 + Math.cos(t * 0.31) * 0.25; }
    }
    const m = metrics();
    lightPos.set(lx * m.visW * 0.7, ly * m.visH * 0.7, 3.2);
    softbox.position.copy(lightPos);
    softbox.lookAt(root.position);
    key.position.copy(lightPos);
    key.target.position.copy(root.position);

    // Shadow on the page, offset away from the light.
    shadow.position.set(root.position.x - lx * 0.25 * sc, root.position.y - 0.28 * sc, -0.4);
    shadow.scale.setScalar(sc * lerp(0.9, 1.15, p));
    shadowMat.opacity = 0.75 * p;

    renderer.render(scene, camera);

    const yawText = st.yaw.toFixed(3);
    if (yawText !== st.shownYaw) { st.shownYaw = yawText; canvas.dataset.yaw = yawText; } // test hook
    if (!st.firstFrame) { st.firstFrame = true; opts.onFirstFrame?.(); }
  }

  // ---------- Input ----------
  function setLight(e: PointerEvent) {
    st.light.x = (e.clientX / window.innerWidth) * 2 - 1;
    st.light.y = -((e.clientY / window.innerHeight) * 2 - 1);
    st.light.follow = true;
    st.light.lastMove = performance.now();
  }
  function hitsShape(e: PointerEvent) {
    ndc.set((e.clientX / window.innerWidth) * 2 - 1, -((e.clientY / window.innerHeight) * 2 - 1));
    raycaster.setFromCamera(ndc, camera);
    return raycaster.intersectObject(st.carMix > 0.5 ? car : slab, true).length > 0;
  }
  const onDown = (e: PointerEvent) => {
    if (!st.open || st.dir === -1) return;
    canvas.setPointerCapture(e.pointerId);
    st.dragging = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: 0, onShape: hitsShape(e) };
    st.vYaw = st.vPitch = 0;
    canvas.dataset.dragging = '';
    setLight(e);
  };
  const onMove = (e: PointerEvent) => {
    if (!st.open) return;
    setLight(e);
    const d = st.dragging;
    if (!d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    d.x = e.clientX;
    d.y = e.clientY;
    d.moved += Math.abs(dx) + Math.abs(dy);
    st.yaw += dx * DRAG_RADIANS_PER_PX;
    st.pitch += dy * DRAG_RADIANS_PER_PX;
    st.vYaw = dx * DRAG_RADIANS_PER_PX;
    st.vPitch = dy * DRAG_RADIANS_PER_PX;
  };
  const onUp = (e: PointerEvent) => {
    const d = st.dragging;
    if (!d || d.id !== e.pointerId) return;
    st.dragging = null;
    delete canvas.dataset.dragging;
    if (d.moved < TAP_SLOP_PX && !d.onShape && e.type === 'pointerup') close(); // a tap off the shape closes
  };
  const onKey = (e: KeyboardEvent) => {
    if (!st.open) return;
    if (e.key === 'ArrowLeft') st.vYaw = -KEY_STEP;
    else if (e.key === 'ArrowRight') st.vYaw = KEY_STEP;
    else if (e.key === 'ArrowUp') st.vPitch = -KEY_STEP;
    else if (e.key === 'ArrowDown') st.vPitch = KEY_STEP;
    else return;
    e.preventDefault();
  };
  const onVisibility = () => {
    if (st.dead || !st.open) return;
    renderer.setAnimationLoop(document.hidden ? null : tick);
  };
  const onLost = (e: Event) => {
    e.preventDefault();
    st.dead = true;
    finishClose('lost');
  };

  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onUp);
  canvas.addEventListener('webglcontextlost', onLost);
  window.addEventListener('keydown', onKey);
  window.addEventListener('resize', resize);
  document.addEventListener('visibilitychange', onVisibility);

  let disposed = false;
  function dispose() {
    if (disposed) return;
    disposed = true;
    st.dead = true;
    st.open = false;
    renderer.setAnimationLoop(null);
    canvas.removeEventListener('pointerdown', onDown);
    canvas.removeEventListener('pointermove', onMove);
    canvas.removeEventListener('pointerup', onUp);
    canvas.removeEventListener('pointercancel', onUp);
    canvas.removeEventListener('webglcontextlost', onLost);
    window.removeEventListener('keydown', onKey);
    window.removeEventListener('resize', resize);
    document.removeEventListener('visibilitychange', onVisibility);
    for (const geo of [slabGeo, carGeo, shadowGeo]) geo.dispose();
    for (const tex of [flakeTex, shadowTex, envTarget.texture]) tex.dispose();
    material.dispose();
    shadowMat.dispose();
    pmrem.dispose();
    renderer.dispose();
  }

  resize();
  return { open, close, forceClose, get isOpen() { return st.open; }, dispose };
}
