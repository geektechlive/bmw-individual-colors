/** Pure keyboard rules for ColorCombobox, kept apart so they can be unit tested. */

/**
 * The option Enter should choose, or null to leave the typed text alone. Only an option
 * highlighted with the arrow keys counts: the mouse hovering a row must not hijack Enter.
 */
export function optionToPick(isOpen: boolean, activeIndex: number, options: readonly string[]): string | null {
  if (!isOpen || activeIndex < 0) return null;
  return options[activeIndex] ?? null;
}

/**
 * The option the home paint search opens on Enter, as an index into `names`, or -1 for none.
 * A highlighted option wins; otherwise the exact name match (ignoring case), else the first
 * match. `names` are the already-filtered options, so an empty list means nothing to open.
 * With nothing typed and nothing highlighted there is no paint to guess at, so it is -1 too.
 */
export function enterIndex(activeIndex: number, query: string, names: readonly string[]): number {
  if (names.length === 0) return -1;
  if (activeIndex >= 0 && activeIndex < names.length) return activeIndex;
  const typed = query.trim().toLowerCase();
  if (typed === '') return -1;
  const exact = names.findIndex((n) => n.toLowerCase() === typed);
  return exact >= 0 ? exact : 0;
}

/**
 * True while an IME is composing text (Japanese, Chinese, Korean input), where the arrow keys
 * pick candidates and must not drive the list. Used for the arrows only: Enter is not guarded,
 * because Android keyboards report Enter as keyCode 229 or composing right after a Latin word.
 */
export function isComposing(e: { keyCode: number; nativeEvent: { isComposing: boolean } }): boolean {
  return e.nativeEvent.isComposing || e.keyCode === 229;
}

/** The next keyboard-highlighted index after an arrow key. `-1` means none. */
export function stepActive(current: number, delta: 1 | -1, count: number, isOpen: boolean): number {
  if (count === 0) return -1;
  if (!isOpen) return delta === 1 ? 0 : count - 1;
  if (delta === 1) return (current + 1) % count;
  return current <= 0 ? count - 1 : current - 1;
}

/**
 * `items` with the one whose name equals the query (ignoring case and outer spaces) moved to the
 * front, the rest keeping their order. The home search highlights its first option, so typing a
 * full paint name must put that paint first (#88). Returns a new array.
 */
export function exactFirst<T>(items: readonly T[], getName: (item: T) => string, query: string): T[] {
  const typed = query.trim().toLowerCase();
  const at = typed === '' ? -1 : items.findIndex((item) => getName(item).toLowerCase() === typed);
  if (at <= 0) return [...items];
  return [items[at], ...items.slice(0, at), ...items.slice(at + 1)];
}
