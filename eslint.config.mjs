import parser from "@typescript-eslint/parser";
import betterTailwindcss from "eslint-plugin-better-tailwindcss";

const off = { create: () => ({}) };

/**
 * Class order only. The TypeScript parser is here so TSX parses; there are no
 * type-aware rules. The stub rules exist because copied components already
 * carry disable comments for them, and this repo did not ship an ESLint config.
 */
export default [
  {
    ignores: ["**/node_modules/**", "**/.tmp/**", "**/.turbo/**", "**/dist/**", "**/.output/**", "**/openspec/**"],
  },
  {
    files: ["apps/**/*.{tsx,jsx}", "packages/**/*.{tsx,jsx}"],
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
    rules: {
      "react-hooks/exhaustive-deps": "off",
      "react-hooks/incompatible-library": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "better-tailwindcss/enforce-consistent-class-order": [
        "warn",
        { entryPoint: "apps/web/src/styles.css" },
      ],
    },
  },
];
