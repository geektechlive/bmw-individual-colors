// The paint-shop "speed shape", built in code (#96, ADR 0021): one smooth sculpted body on a
// flat base, the sample shape paint shops use. No wheels, no glass, no real car's lines, so
// there is no model file and no license. A loft whose top follows a height field: a body slab,
// four fender humps, a teardrop cabin bubble and a soft hood bulge.
//
// Plain typed arrays only (no three.js), so it is unit-tested; viewer.ts wraps them.

export const SPEED_SHAPE = {
  /** Length along x. */
  L: 4.5,
  /** Loft grid: rings along the length, segments around each ring. */
  NU: 240,
  NV: 180,
  /** Display scale and vertical centring used by the viewer. */
  SCALE: 0.42,
  CENTER_Y: -0.5,
} as const;

/** Catmull-Rom through [x, value] points with ascending x. */
export function spline(pts: ReadonlyArray<readonly [number, number]>): (x: number) => number {
  return (x) => {
    if (x <= pts[0][0]) return pts[0][1];
    for (let i = 0; i < pts.length - 1; i++) {
      const [x1, y1] = pts[i];
      const [x2, y2] = pts[i + 1];
      if (x > x2) continue;
      const [x0, y0] = pts[Math.max(0, i - 1)];
      const [x3, y3] = pts[Math.min(pts.length - 1, i + 2)];
      const t = (x - x1) / (x2 - x1);
      const t2 = t * t;
      const t3 = t2 * t;
      const span = x2 - x1;
      const m1 = ((y2 - y0) / (x2 - x0)) * span;
      const m2 = ((y3 - y1) / (x3 - x1)) * span;
      return (2 * t3 - 3 * t2 + 1) * y1 + (t3 - 2 * t2 + t) * m1 + (-2 * t3 + 3 * t2) * y2 + (t3 - t2) * m2;
    }
    return pts[pts.length - 1][1];
  };
}

const spow = (v: number, e: number) => Math.sign(v) * Math.pow(Math.abs(v), e);

export interface SpeedShapeData {
  positions: Float32Array;
  uvs: Float32Array;
  /** 32-bit: the grid has more than 65k vertices. */
  indices: Uint32Array;
  vertexCount: number;
}

export function buildSpeedShape(): SpeedShapeData {
  const { L, NU, NV } = SPEED_SHAPE;
  const N = 4; // superellipse exponent of each ring
  const halfW = spline([[-2.25, 0.5], [-2.0, 0.74], [-1.45, 0.92], [-0.75, 0.84], [0.1, 0.82], [0.95, 0.88], [1.45, 0.96], [2.0, 0.86], [2.25, 0.66]]);
  const slab = spline([[-2.25, 0.3], [-1.9, 0.4], [-1.2, 0.5], [0.0, 0.56], [1.3, 0.6], [2.0, 0.56], [2.25, 0.46]]);
  const g = (dx: number, sx: number, dz: number, sz: number) => Math.exp(-(dx * dx) / sx - (dz * dz) / sz);
  const height = (x: number, zn: number) => {
    const xn = x / (L / 2);
    const az = Math.abs(zn);
    const front = 0.2 * g(xn + 0.55, 0.08, az - 0.64, 0.1);
    const rear = 0.25 * g(xn - 0.5, 0.09, az - 0.66, 0.1);
    const cabinSx = xn < 0.02 ? 0.09 : 0.26; // short screen, long fastback
    const cabin = 0.42 * g(xn - 0.02, cabinSx, zn, 0.24);
    const hood = 0.05 * g(xn + 0.58, 0.1, zn, 0.09);
    return slab(x) + front + rear + cabin + hood;
  };

  const vertexCount = (NU + 1) * (NV + 1);
  const positions = new Float32Array(vertexCount * 3);
  const uvs = new Float32Array(vertexCount * 2);
  let o = 0;
  let q = 0;
  for (let i = 0; i <= NU; i++) {
    const u = i / NU;
    const x = -L / 2 + L * u;
    const cap = Math.pow(1 - Math.pow(Math.abs(2 * u - 1), 8), 0.22); // rounds the nose and tail closed
    const w = halfW(x) * cap;
    for (let j = 0; j <= NV; j++) {
      const th = -Math.PI / 2 + (2 * Math.PI * j) / NV; // seam on the underside
      const s = Math.sin(th);
      const zn = spow(Math.cos(th), 2 / N);
      const y = s >= 0
        ? height(x, zn) * cap * spow(s, 2 / N) // upper: sides rise steeply, top follows the height field
        : 0.05 * spow(s, 2 / N); // lower: a flat base with a small rounded edge
      positions[o++] = x;
      positions[o++] = y;
      positions[o++] = w * zn;
      uvs[q++] = u * 1.2;
      uvs[q++] = (j / NV) * 2.1;
    }
  }

  const indices = new Uint32Array(NU * NV * 6);
  let k = 0;
  const at = (i: number, j: number) => i * (NV + 1) + j;
  for (let i = 0; i < NU; i++) {
    for (let j = 0; j < NV; j++) {
      const a = at(i, j);
      const b = at(i + 1, j);
      const c = at(i + 1, j + 1);
      const d = at(i, j + 1);
      indices[k++] = a; indices[k++] = b; indices[k++] = d;
      indices[k++] = b; indices[k++] = c; indices[k++] = d;
    }
  }
  return { positions, uvs, indices, vertexCount };
}
