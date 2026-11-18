/**
 * Keyboard rules for the paint wall, kept apart so they can be unit tested (#82). The wall is
 * one Tab stop; these keys move between its strips. Returns the strip index to focus next, or
 * null when the key is not one the wall handles. The ends stop rather than wrap.
 */
export function wallStepIndex(current: number, key: string, count: number): number | null {
  if (count <= 0) return null;
  const last = count - 1;
  switch (key) {
    case 'ArrowRight':
      return Math.min(current + 1, last);
    case 'ArrowLeft':
      return Math.max(current - 1, 0);
    case 'Home':
      return 0;
    case 'End':
      return last;
    default:
      return null;
  }
}
