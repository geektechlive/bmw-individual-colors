// Design lint for CSS (#40, ADR 0016): colors and font sizes come from tokens only.
// src/styles/tokens.css is the one place literals are allowed.
const NO_COLOR_FUNCTIONS = ['rgb', 'rgba', 'hsl', 'hsla', 'hwb', 'lab', 'lch', 'oklab', 'oklch'];

/** @type {import('stylelint').Config} */
const config = {
  rules: {
    'color-no-hex': [true, { message: 'Use a color token from src/styles/tokens.css.' }],
    'color-named': ['never', { message: 'Use a color token from src/styles/tokens.css.' }],
    'function-disallowed-list': [NO_COLOR_FUNCTIONS, { message: 'Use a color token (color-mix with tokens is fine).' }],
    'declaration-property-value-allowed-list': [
      { 'font-size': ['/^var\\(--t-[a-z0-9-]+\\)$/', 'inherit', '100%'] },
      { message: 'Font sizes come from the --t-* scale (nothing under 11px).' },
    ],
  },
  overrides: [
    {
      files: ['src/styles/tokens.css'],
      rules: {
        'color-no-hex': null,
        'color-named': null,
        'function-disallowed-list': null,
        'declaration-property-value-allowed-list': null,
      },
    },
  ],
};

export default config;
