// How each paint finish reacts to light in the 3D view (#96, ADR 0021). Pure data, so the
// mapping is unit-tested without WebGL; viewer.ts copies a result onto a MeshPhysicalMaterial.
// Values are the approved prototype's.

import type { Finish } from '../paint-finish';

export interface MaterialParams {
  color: string;
  metalness: number;
  roughness: number;
  clearcoat: number;
  clearcoatRoughness: number;
  iridescence: number;
  iridescenceIOR: number;
  iridescenceThicknessRange: [number, number];
  sheen: number;
  sheenRoughness: number;
  /** Normal-map strength of the metal-flake texture; null when the finish has no flakes. */
  flakeScale: number | null;
}

/** Flake texture tiling: fine, because real flake is too small to read as dots at arm's length. */
export const FLAKE_REPEAT: readonly [number, number] = [18, 11];

const BASE = {
  metalness: 0,
  roughness: 0.42,
  clearcoat: 1,
  clearcoatRoughness: 0.02,
  iridescence: 0,
  iridescenceIOR: 1.3,
  iridescenceThicknessRange: [100, 400] as [number, number],
  sheen: 0,
  sheenRoughness: 1,
  flakeScale: null as number | null,
};

export function materialParams(finish: Finish, hex: string): MaterialParams {
  switch (finish) {
    case 'metallic':
      return { ...BASE, color: hex, metalness: 0.72, roughness: 0.32, clearcoatRoughness: 0.03, flakeScale: 0.07 };
    case 'pearl':
      return {
        ...BASE,
        color: hex,
        metalness: 0.55,
        roughness: 0.3,
        clearcoatRoughness: 0.03,
        iridescence: 0.85,
        iridescenceIOR: 1.5,
        iridescenceThicknessRange: [260, 620],
        flakeScale: 0.05,
      };
    case 'frozen':
      return { ...BASE, color: hex, metalness: 0.5, roughness: 0.58, clearcoat: 0, clearcoatRoughness: 0, sheen: 0.35, sheenRoughness: 0.6, flakeScale: 0.03 };
    case 'solid':
    default:
      return { ...BASE, color: hex };
  }
}
