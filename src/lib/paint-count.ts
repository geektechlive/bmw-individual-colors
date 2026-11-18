/** "paint" for exactly one, "paints" otherwise. Kept tiny: client components import it. */
export const paintNoun = (n: number): 'paint' | 'paints' => (n === 1 ? 'paint' : 'paints');

/** What the home search announces: "29 paints" or "1 paint". Nothing for no match (that has its own text). */
export const matchCountText = (n: number): string => (n > 0 ? `${n} ${paintNoun(n)}` : '');
