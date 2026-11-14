import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Design lint for TSX (#40, ADR 0016). Styles live in CSS Modules; inline `style` is only
// for per-item custom properties (use cssVars() from src/lib/css-vars.ts). Color literals
// live only in the token files, paint data and the share-image renderers (Satori needs
// inline styles).
const HEX_COLOR = '/^#(?:[0-9a-fA-F]{3}){1,2}(?:[0-9a-fA-F]{2})?$/';
const designLint = {
  files: ['src/**/*.{ts,tsx}'],
  ignores: ['src/lib/colors.ts', 'src/app/design-check/fixtures.ts', 'src/lib/design-tokens.ts', 'src/app/**/opengraph-image.tsx'],
  rules: {
    'no-restricted-syntax': [
      'error',
      {
        selector: "JSXAttribute[name.name='style'] > JSXExpressionContainer > ObjectExpression > Property[key.type='Identifier']",
        message: 'Inline styles are only for custom properties. Put styles in a CSS Module, or pass --vars with cssVars().',
      },
      {
        selector: `Literal[value=${HEX_COLOR}]`,
        message: 'Color literal. Use a token: CSS var(--name), or TOKENS from src/lib/design-tokens.ts where var() cannot work (SVG attributes).',
      },
      {
        selector: 'Literal[value=/^(?:rgba?|hsla?)\\(/]',
        message: 'Color literal. Use a token.',
      },
      {
        selector: 'TemplateElement[value.raw=/#[0-9a-fA-F]{6}\\b|(?:rgba?|hsla?)\\(/]',
        message: 'Color literal in a template string. Use a token.',
      },
    ],
  },
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  designLint,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Build artifacts and deployment output:
    ".open-next/**",
    ".vercel/**",
    // Claude Code worktrees:
    ".claude/**",
    // Wrangler local dev temp files:
    ".wrangler/**",
  ]),
]);

export default eslintConfig;
