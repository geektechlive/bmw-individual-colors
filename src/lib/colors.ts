// BMW Individual Program colors — G80/G82 M3/M4 era
// Hex values are best-match approximations for visualization purposes.
export const BMW_COLORS: Record<string, string> = {
  // Blues
  "Aegean Blue":               "#1a3d6b",
  "Atlantis Blue Metallic":    "#1a4b8c",
  "Black Blue":                "#0d1a2e",
  "Daytona Beach Blue":        "#1e5f8c",
  "Enzian Blue":               "#1a2a5c",
  "Eridan Blue":               "#1e3d6e",
  "Frozen Portimao Blue":      "#1e3a8a",
  "Gentian Blue Metallic":     "#1c3a7a",
  "Marina Bay Blue":           "#1e5c8c",
  "Mauritius Blue":            "#1e4a8c",
  "Mexico Blue":               "#1e5c9c",
  "Midnight Blue":             "#1a2a4a",
  "Marhon Blue":               "#1e4c7c",
  "Portimao Blue":             "#1e3a8c",
  "Riviera Blue":              "#1e6a9c",
  "San Marino Blue":           "#1e4c8c",
  "Santorini Blue":            "#1c3d6e",
  "Snapper Rocks Blue":        "#1e6aac",
  "Tanzanite Blue":            "#1e3a7c",
  "Tanzanite Blue II":         "#1a3070",
  "Velvet Blue":               "#1a2a5c",
  "Violet Blue":               "#2a1a5c",
  "Voodoo Blue":               "#1b3a6b",

  // Greens
  "Brewster Green":            "#1e3d20",
  "British Racing Green":      "#1a3c2f",
  "Isle of Man Green":         "#1a5c2a",
  "Jack Green":                "#1a5c2a",
  "Oxford Green II Metallic":  "#2a4a2a",
  "Verde Ermes":               "#2a5a2a",

  // Reds & Oranges
  "Fire Orange":               "#c45c1e",
  "Fire Orange III":           "#c44c0e",
  "Frozen Orange II":          "#d4661e",
  "Imola Red":                 "#a51c1c",
  "Rosso Corsa":               "#c41c1c",
  "Sunset Orange":             "#d45c1e",
  "Speed Yellow":              "#e8c820",

  // Yellows
  "Dakar Yellow":              "#e8c840",
  "Dakar Yellow II":           "#e0bc30",

  // Purples
  "Twilight Purple":           "#5a3a7a",
  "Wildberry":                 "#7a1a4a",

  // Greys & Blacks
  "Chalk":                     "#d4cfc9",
  "Cosmos Black":              "#1a1a1a",
  "Dravit Grey Metallic":      "#5c5c6a",
  "Fashion Grey":              "#9e9e9e",
  "Frozen Black":              "#2a2a2a",
  "Frozen Dark Grey":          "#4a4a4a",
  "Frozen Deep Grey":          "#3a3a3a",
  "Grey Black":                "#2a2a2a",
  "Grigio Telesto":            "#7a7a8a",
  "Gunmetal Gray II":          "#5a5a5a",
  "Jerez Black":               "#1a1a2a",
  "Lime Rock Grey":            "#8a8a7a",
  "Mora Metallic":             "#6a3a5a",
  "Nardo Grey":                "#9a9a9a",
  "Oxide Grey":                "#7a7a7a",
  "Thunder":                   "#3a3a3a",

  // Others
  "Lime Green":                "#4a8a1a",

  // MY2024 additions
  "Techno Violet Metallic":    "#4a2a7a",

  // MY2027 additions
  "Agave":                     "#3a6a3a",
  "Anglesey Green Metallic":   "#1e4a2a",
  "Blue Bay Lagoon Metallic":  "#1a6a8c",
  "Borusan Turkish Blue":      "#1a4a8c",
  "Daytona Violet":            "#4a1a6a",
  "Goodwood Green Pearl":      "#1a3a2a",
  "Irish Green":               "#1a6a2a",
  "Laguna Seca Blue":          "#1e5a9c",
  "Ruby Star Neo":             "#8c1a2a",
  "Sakhir Orange III":         "#c45a1a",
  "Santorini Blue II":         "#1a3560",
  "Sepia Metallic III":        "#7a5a3a",
};

export function getColorHex(colorName: string): string {
  return BMW_COLORS[colorName] ?? "#888888";
}

/** Returns true if the hex color is light enough that white text would be hard to read. */
export function isLightColor(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.5;
}
