import parser from "@typescript-eslint/parser";
import betterTailwindcss from "eslint-plugin-better-tailwindcss";

const off = { create: () => ({}) };

const variants = "^(?:.*:)?";
const colorUtilities = "(?:bg|text|border(?:-[trblxyse])?|ring|ring-offset|outline|fill|stroke|divide|from|via|to|decoration|caret|accent|placeholder|shadow|inset-shadow|inset-ring|drop-shadow)";
const palette = "(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|white|black)";

/** What the CSS guidelines forbid in a class list. Each message names the fix. */
const restrict = [
  {
    pattern: `${variants}-?${colorUtilities}-${palette}(?:-\\d+)?(?:/\\d+)?$`,
    message: "Raw palette colour. Use a semantic token (text-text-primary, bg-background-primary-default, …) or add one in packages/ui/src/oa.css or packages/ui/src/boardui/theme.css.",
  },
  { pattern: `${variants}[\\w-]+-\\[#`, message: "Arbitrary colour. Add a semantic token instead." },
  {
    pattern: `(?:^|:)dark:(?:[^:]+:)*${colorUtilities}-(?!clip-)`,
    message: "Theme colours belong in a token redefined under .dark, not in a dark: class.",
  },
  { pattern: "^!|!$", message: "No !important. Fix the specificity or the class order instead." },
  { pattern: `${variants}transition-all$`, message: "Name the transitioned properties (transition-colors, transition-[opacity,translate], …)." },
  { pattern: `${variants}outline-none$`, fix: "outline-hidden", message: "outline-none removes the outline in forced colours. Use outline-hidden." },
  { pattern: `${variants}(?:h|min-h|max-h|size)-screen$|\\d(?:vh)\\b`, message: "Use svh (or dvh when the element must follow the browser bar), never vh." },
  {
    pattern: `${variants}(?:font-(?:semibold|bold|extrabold|black)|text-[\\w-]+-(?:semibold|bold))$`,
    message: "OA weight stops at 500. Use a -medium style.",
  },
  { pattern: `${variants}(?:animate|ease|duration|delay)-\\[`, message: "Motion values come from tokens (--animate-*, --ease-*, --duration-*)." },
];

const tailwind = (entryPoint) => ({
  "better-tailwindcss": { entryPoint, detectComponentClasses: true },
});

/**
 * Tailwind class rules for the CSS guidelines. The TypeScript parser is here so
 * TSX parses; there are no type-aware rules. The stub rules exist because copied
 * components already carry disable comments for them, and this repo did not ship
 * an ESLint config.
 */
export default [
  {
    ignores: ["**/node_modules/**", "**/.tmp/**", "**/.turbo/**", "**/dist/**", "**/.output/**", "**/openspec/**"],
  },
  {
    files: ["apps/**/*.{ts,tsx}", "packages/**/*.{ts,tsx}"],
    languageOptions: {
      parser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    linterOptions: {
      reportUnusedDisableDirectives: "off",
    },
    plugins: {
      "better-tailwindcss": betterTailwindcss,
      "react-hooks": {
        rules: {
          "exhaustive-deps": off,
          "incompatible-library": off,
        },
      },
      "@typescript-eslint": {
        rules: {
          "no-unused-vars": off,
          "no-explicit-any": off,
        },
      },
    },
    settings: tailwind("apps/web/src/styles.css"),
    rules: {
      "better-tailwindcss/enforce-consistent-class-order": "error",
      "better-tailwindcss/enforce-canonical-classes": "error",
      "better-tailwindcss/no-duplicate-classes": "error",
      "better-tailwindcss/no-conflicting-classes": "error",
      "better-tailwindcss/no-unknown-classes": "error",
      "better-tailwindcss/no-restricted-classes": ["error", { restrict }],
    },
  },
  {
    files: ["apps/docs/**/*.{ts,tsx}"],
    settings: tailwind("apps/docs/src/styles.css"),
    rules: {
      // Plain-CSS hooks in docs.css and Fumadocs' prose opt-out, not Tailwind utilities.
      "better-tailwindcss/no-unknown-classes": ["error", { ignore: ["^docs-portal$", "^docs-diagram$", "^not-prose$"] }],
    },
  },
];
