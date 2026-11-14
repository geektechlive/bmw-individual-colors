/** Pure keyboard rules for ColorCombobox, kept apart so they can be unit tested. */

/**
 * The option Enter should choose, or null to leave the typed text alone. Only an option
 * highlighted with the arrow keys counts: the mouse hovering a row must not hijack Enter.
 */
export function optionToPick(isOpen: boolean, activeIndex: number, options: readonly string[]): string | null {
  if (!isOpen || activeIndex < 0) return null;
  return options[activeIndex] ?? null;
}

/** The next keyboard-highlighted index after an arrow key. `-1` means none. */
export function stepActive(current: number, delta: 1 | -1, count: number, isOpen: boolean): number {
  if (count === 0) return -1;
  if (!isOpen) return delta === 1 ? 0 : count - 1;
  if (delta === 1) return (current + 1) % count;
  return current <= 0 ? count - 1 : current - 1;
}
