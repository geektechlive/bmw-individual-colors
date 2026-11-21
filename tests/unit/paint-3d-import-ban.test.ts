import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

// #96, ADR 0021: three.js is about 700 KB and the Worker has 10 ms of CPU per request. It may
// only be reached through a dynamic import() from client code, on intent. The one file that
// imports it is src/lib/paint-3d/viewer.ts; only PaintViewerStage.tsx imports that, and the stage
// is reached only through next/dynamic with ssr: false (else the server bundle gets three).

const SRC = join(__dirname, '..', '..', 'src');
const VIEWER = join('lib', 'paint-3d', 'viewer.ts');
const STAGE = join('components', 'PaintViewerStage.tsx');

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx)$/.test(name) ? [path] : [];
  });
}

/** Static import / export-from / require statements, as [specifier, isTypeOnly]. */
function staticImports(code: string): Array<[string, boolean]> {
  const out: Array<[string, boolean]> = [];
  const re = /(?:^|\n)\s*(import|export)(\s+type)?\b[^;]*?\bfrom\s+['"]([^'"]+)['"]|(?:^|\n)\s*import\s+['"]([^'"]+)['"]|\brequire\(\s*['"]([^'"]+)['"]\s*\)/g;
  for (const m of code.matchAll(re)) out.push([m[3] ?? m[4] ?? m[5], Boolean(m[2])]);
  return out;
}

const files = sourceFiles(SRC);

test('only paint-3d/viewer.ts imports three at runtime', () => {
  const offenders = files
    .filter((f) => relative(SRC, f) !== VIEWER)
    .filter((f) => staticImports(readFileSync(f, 'utf8')).some(([spec, typeOnly]) => !typeOnly && /^three(\/|$)/.test(spec)));
  assert.deepEqual(offenders.map((f) => relative(SRC, f)), []);
});

test('only the stage component imports paint-3d/viewer statically', () => {
  const offenders = files
    .filter((f) => relative(SRC, f) !== STAGE)
    .filter((f) => staticImports(readFileSync(f, 'utf8')).some(([spec, typeOnly]) => !typeOnly && /paint-3d\/viewer$/.test(spec)));
  assert.deepEqual(offenders.map((f) => relative(SRC, f)), []);
});

test('nothing imports the stage component statically (only next/dynamic or a type import)', () => {
  const offenders = files.filter((f) =>
    staticImports(readFileSync(f, 'utf8')).some(([spec, typeOnly]) => !typeOnly && /PaintViewerStage$/.test(spec)),
  );
  assert.deepEqual(offenders.map((f) => relative(SRC, f)), []);
});

test('the island loads the stage with next/dynamic and ssr: false, so the server bundle never has three', () => {
  const island = readFileSync(join(SRC, 'components', 'PaintViewer.tsx'), 'utf8');
  assert.match(island, /^'use client';/);
  assert.match(island, /dynamic\(\s*\(\)\s*=>\s*import\(\s*['"]\.\/PaintViewerStage['"]\s*\)\s*,\s*\{\s*ssr:\s*false\s*\}\s*\)/);
});

test('the import scanner sees what it should (self-check)', () => {
  const sample = `import * as THREE from 'three';\nimport type { X } from "three";\nexport { y } from 'three/addons/a.js';\nconst z = await import('three');\nimport 'three';`;
  assert.deepEqual(staticImports(sample), [
    ['three', false],
    ['three', true],
    ['three/addons/a.js', false],
    ['three', false],
  ]);
});

test('the viewer file itself does import three (the ban would be vacuous otherwise)', () => {
  const code = readFileSync(join(SRC, VIEWER), 'utf8');
  assert.ok(staticImports(code).some(([spec]) => spec === 'three'));
});
