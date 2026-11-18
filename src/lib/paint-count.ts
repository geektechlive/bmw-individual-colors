/** "paint" for exactly one, "paints" otherwise. Kept tiny: client components import it. */
export const paintNoun = (n: number): 'paint' | 'paints' => (n === 1 ? 'paint' : 'paints');
