// Pose math for the lift-off and landing of the 3D view (#96). Pure, so the start pose can be
// unit-tested against the card's on-page rect. World units: the camera sits at z, looking at
// the origin, and a unit-high slab at scale s is s world units tall.

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const ease = (x: number) => 1 - Math.pow(1 - x, 3);
export const smooth = (a: number, b: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export interface Pose {
  x: number;
  y: number;
  s: number;
}

export interface ViewMetrics {
  w: number;
  h: number;
  /** World units per CSS pixel at z = 0. */
  wpp: number;
  visW: number;
  visH: number;
}

export function viewMetrics(w: number, h: number, fovDeg: number, camZ: number): ViewMetrics {
  const visH = 2 * camZ * Math.tan((fovDeg * Math.PI) / 360);
  return { w, h, wpp: visH / h, visW: visH * (w / h), visH };
}

/** The pose that puts a unit-high slab exactly over a screen rect. */
export function rectToPose(rect: { left: number; top: number; width: number; height: number }, m: ViewMetrics): Pose {
  return {
    x: (rect.left + rect.width / 2 - m.w / 2) * m.wpp,
    y: -(rect.top + rect.height / 2 - m.h / 2) * m.wpp,
    s: rect.height * m.wpp,
  };
}

/** Where the shape floats once airborne: centred, a little above the middle, half the view wide. */
export function targetPose(m: ViewMetrics, refAspect = 1.6): Pose {
  const width = Math.min(m.visW * 0.5, m.visH * 0.5 * refAspect);
  return { x: 0, y: m.visH * 0.06, s: width / refAspect };
}
