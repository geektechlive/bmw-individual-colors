// The /design-check fixture page (tests/e2e/design.spec.ts) exists for development and the
// test matrix only. In a production build it must 404.
export function isDesignCheckEnabled(nodeEnv: string | undefined): boolean {
  return nodeEnv !== 'production';
}
