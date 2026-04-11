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

  // Frozen individual colors
  "Frozen Cashmere Silver Metallic":  "#c4bfb8",
  "Frozen Dark Silver":               "#8a8a8a",
  "Frozen Maple":                     "#c4a87a",
  "Frozen Pure Grey":                 "#8a8a8a",
  "Frozen Preciosa Red Metallic":     "#c87272",
  "Preciosa Red Metallic":            "#b01c1c",

  // Additional Individual program colors
  "Almandine Brown Metallic":  "#6a3a2a",
  "Almeria Blue":              "#1e4a8c",
  "Cashmere Silver Metallic":  "#b4b0aa",
  "Cedar Brown":               "#6a3a1a",
  "Chianti Red":               "#8c1a1a",
  "Cinnabar Red":              "#b42a1a",
  "Como Blue Metallic":        "#1a3a6a",
  "Copper":                    "#aa5c1e",
  "Dolomite Grey":             "#9a9a9a",
  "Eridan Blue Metallic":      "#1e3d6e",
  "Gold Bronze":               "#aa7a2a",
  "Himalaya Grey":             "#8a8a8a",
  "Kyoto Green Metallic":      "#2a5a3a",
  "Lanzarote Bronze":          "#7a5a2a",
  "Macao Blue Metallic":       "#1a3a7a",
  "Mandalika Blue":            "#1a4a8c",
  "Monza Blue":                "#1a2a6a",
  "Mugello Blue":              "#1a3a7a",
  "Nurburgring Blue":          "#1a2a5c",
  "Picasso Red":               "#8c1a1a",
  "Pyrite Bronze":             "#7a5a1a",
  "Sepang Bronze":             "#8a6a2a",
  "Silicon Grey":              "#8a8a8a",
  "Smoked White":              "#ddd8d2",
  "Snowy White":               "#f0ede8",
  "Solar Orange":              "#d45a1a",
  "Stormwater":                "#6a7a8a",
  "Turbine Grey":              "#7a7a7a",
  "Verde Mantis":              "#4a8a2a",
  "Violett Petrol":            "#2a4a6a",
  "Wagon Green":               "#2a5a2a",
  "Zinnober Red":              "#b42a1a",
};

/**
 * For custom/unknown color names, infer a reasonable hex from keywords in the name.
 * "Frozen" variants get a muted/desaturated version of their base color.
 */
export function guessColorFromName(name: string): string {
  const n = name.toLowerCase();
  const isFrozen = n.includes('frozen') || n.includes('matte');

  if (/\bred\b|scarlet|crimson|carmine|corsa|ruby|preciosa|chianti|cinnabar|imola|zinnober|picasso|rosso/.test(n))
    return isFrozen ? '#c87878' : '#b01c1c';
  if (/\borange\b|sakhir|solar/.test(n))
    return isFrozen ? '#d4906a' : '#c2410c';
  if (/\byellow\b|dakar|speed\s*yellow/.test(n))
    return isFrozen ? '#d4c46a' : '#ca8a04';
  if (/\bgreen\b|verde|isle\s*of\s*man|brewster|racing\s*green|kyoto|mantis|wagon\s*green|irish\s*green|jack\s*green/.test(n))
    return isFrozen ? '#6a9c6a' : '#15803d';
  if (/\bblue\b|azure|cobalt|sapphire|portimao|tanzanite|enzian|gentian|marina|mauritius|riviera|snapper|voodoo|aegean|atlantis|eridan|laguna|monza|macao|mandalika|mugello|nurburgring|como|almeria/.test(n))
    return isFrozen ? '#6a7a9c' : '#1e3a8a';
  if (/\bpurple\b|\bviolet\b|\bwildberry\b|twilight/.test(n))
    return isFrozen ? '#8a6a9c' : '#6d28d9';
  if (/\bpink\b|\brose\b/.test(n))
    return isFrozen ? '#d49aaa' : '#db2777';
  if (/\bbronze\b|pyrite|sepang|lanzarote/.test(n))
    return '#8a6a2a';
  if (/\bgold\b|\bcopper\b/.test(n))
    return '#b45309';
  if (/\bbrown\b|\bsepia\b|\bcedar\b|almandine/.test(n))
    return '#7a4a2a';
  if (/\bsilver\b|cashmere/.test(n))
    return isFrozen ? '#c4bfb8' : '#9ca3af';
  if (/\bwhite\b|smoked\s*white|snowy/.test(n))
    return '#e0dbd5';
  if (/\bblack\b|cosmos|jerez/.test(n))
    return '#1a1a1a';
  if (/\bgrey\b|\bgray\b|nardo|oxide|dravit|grigio|gunmetal|fashion\s*grey|silicon|dolomite|turbine|himalaya|stormwater|lime\s*rock/.test(n))
    return isFrozen ? '#9a9a9a' : '#6b7280';

  return '#888888';
}

export function getColorHex(colorName: string): string {
  return BMW_COLORS[colorName] ?? guessColorFromName(colorName);
}

export const COLOR_FAMILY_MAP: Record<string, string> = {
  // Blues
  "Aegean Blue": "Blues", "Atlantis Blue Metallic": "Blues", "Black Blue": "Blues",
  "Daytona Beach Blue": "Blues", "Enzian Blue": "Blues", "Eridan Blue": "Blues",
  "Frozen Portimao Blue": "Blues", "Gentian Blue Metallic": "Blues",
  "Marina Bay Blue": "Blues", "Mauritius Blue": "Blues", "Mexico Blue": "Blues",
  "Midnight Blue": "Blues", "Marhon Blue": "Blues", "Portimao Blue": "Blues",
  "Riviera Blue": "Blues", "San Marino Blue": "Blues", "Santorini Blue": "Blues",
  "Snapper Rocks Blue": "Blues", "Tanzanite Blue": "Blues", "Tanzanite Blue II": "Blues",
  "Velvet Blue": "Blues", "Violet Blue": "Blues", "Voodoo Blue": "Blues",
  "Blue Bay Lagoon Metallic": "Blues", "Borusan Turkish Blue": "Blues",
  "Laguna Seca Blue": "Blues", "Santorini Blue II": "Blues",
  // Greens
  "Brewster Green": "Greens", "British Racing Green": "Greens",
  "Isle of Man Green": "Greens", "Jack Green": "Greens",
  "Oxford Green II Metallic": "Greens", "Verde Ermes": "Greens",
  "Agave": "Greens", "Anglesey Green Metallic": "Greens",
  "Goodwood Green Pearl": "Greens", "Irish Green": "Greens", "Lime Green": "Greens",
  // Reds & Oranges
  "Fire Orange": "Reds & Oranges", "Fire Orange III": "Reds & Oranges",
  "Frozen Orange II": "Reds & Oranges", "Imola Red": "Reds & Oranges",
  "Rosso Corsa": "Reds & Oranges", "Sunset Orange": "Reds & Oranges",
  "Sakhir Orange III": "Reds & Oranges", "Ruby Star Neo": "Reds & Oranges",
  // Yellows
  "Speed Yellow": "Yellows", "Dakar Yellow": "Yellows", "Dakar Yellow II": "Yellows",
  // Purples
  "Twilight Purple": "Purples", "Wildberry": "Purples",
  "Techno Violet Metallic": "Purples", "Daytona Violet": "Purples",
  // Reds & Oranges (additional)
  "Frozen Preciosa Red Metallic": "Reds & Oranges", "Preciosa Red Metallic": "Reds & Oranges",
  "Chianti Red": "Reds & Oranges", "Cinnabar Red": "Reds & Oranges",
  "Picasso Red": "Reds & Oranges", "Zinnober Red": "Reds & Oranges",
  "Solar Orange": "Reds & Oranges",
  // Greens (additional)
  "Kyoto Green Metallic": "Greens", "Verde Mantis": "Greens", "Wagon Green": "Greens",
  // Blues (additional)
  "Almeria Blue": "Blues", "Como Blue Metallic": "Blues", "Macao Blue Metallic": "Blues",
  "Mandalika Blue": "Blues", "Monza Blue": "Blues", "Mugello Blue": "Blues",
  "Nurburgring Blue": "Blues", "Violett Petrol": "Blues",
  // Greys & Blacks (additional)
  "Cashmere Silver Metallic": "Greys & Blacks", "Frozen Cashmere Silver Metallic": "Greys & Blacks",
  "Dolomite Grey": "Greys & Blacks", "Frozen Dark Silver": "Greys & Blacks",
  "Frozen Pure Grey": "Greys & Blacks", "Himalaya Grey": "Greys & Blacks",
  "Silicon Grey": "Greys & Blacks", "Smoked White": "Greys & Blacks",
  "Snowy White": "Greys & Blacks", "Stormwater": "Greys & Blacks",
  "Turbine Grey": "Greys & Blacks",
  // Browns & Metallic (map to Greys & Blacks for now)
  "Almandine Brown Metallic": "Greys & Blacks", "Cedar Brown": "Greys & Blacks",
  "Copper": "Greys & Blacks", "Gold Bronze": "Greys & Blacks",
  "Lanzarote Bronze": "Greys & Blacks", "Pyrite Bronze": "Greys & Blacks",
  "Sepang Bronze": "Greys & Blacks",
  // Yellows (additional)
  "Frozen Maple": "Yellows",
  // Greys & Blacks
  "Chalk": "Greys & Blacks", "Cosmos Black": "Greys & Blacks",
  "Dravit Grey Metallic": "Greys & Blacks", "Fashion Grey": "Greys & Blacks",
  "Frozen Black": "Greys & Blacks", "Frozen Dark Grey": "Greys & Blacks",
  "Frozen Deep Grey": "Greys & Blacks", "Grey Black": "Greys & Blacks",
  "Grigio Telesto": "Greys & Blacks", "Gunmetal Gray II": "Greys & Blacks",
  "Jerez Black": "Greys & Blacks", "Lime Rock Grey": "Greys & Blacks",
  "Mora Metallic": "Greys & Blacks", "Nardo Grey": "Greys & Blacks",
  "Oxide Grey": "Greys & Blacks", "Thunder": "Greys & Blacks",
  "Sepia Metallic III": "Greys & Blacks",
};

export function getColorFamily(colorName: string): string {
  if (COLOR_FAMILY_MAP[colorName]) return COLOR_FAMILY_MAP[colorName];
  const n = colorName.toLowerCase();
  if (/\bred\b|scarlet|crimson|carmine|corsa|ruby|preciosa|chianti|cinnabar|imola|zinnober|picasso|rosso/.test(n)) return 'Reds & Oranges';
  if (/\borange\b|sakhir|solar/.test(n)) return 'Reds & Oranges';
  if (/\byellow\b|dakar|speed\s*yellow/.test(n)) return 'Yellows';
  if (/\bgreen\b|verde|isle\s*of\s*man|brewster|racing\s*green|kyoto|mantis|wagon\s*green|irish\s*green|jack\s*green/.test(n)) return 'Greens';
  if (/\bblue\b|azure|cobalt|sapphire|portimao|tanzanite|enzian|gentian|marina|mauritius|riviera|snapper|voodoo|aegean|atlantis|eridan|laguna|monza|macao|mandalika|mugello|nurburgring|como|almeria/.test(n)) return 'Blues';
  if (/\bpurple\b|\bviolet\b|\bwildberry\b|twilight/.test(n)) return 'Purples';
  if (/\bpink\b|\brose\b/.test(n)) return 'Purples';
  if (/\bblack\b|\bwhite\b|\bsilver\b|\bgrey\b|\bgray\b|\bbronze\b|\bgold\b|\bbrown\b|\bsepia\b|\bcopper\b/.test(n)) return 'Greys & Blacks';
  return 'Other';
}

export function colorToSlug(colorName: string): string {
  return colorName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function slugToColor(slug: string): string | null {
  const normalized = slug.toLowerCase();
  return Object.keys(BMW_COLORS).find(
    name => colorToSlug(name) === normalized
  ) ?? null;
}

/** Returns true if the hex color is light enough that white text would be hard to read. */
export function isLightColor(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.5;
}
