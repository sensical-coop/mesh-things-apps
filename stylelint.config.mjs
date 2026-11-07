/** @type {import('stylelint').Config} */
export default {
  extends: ["stylelint-config-standard"],
  ignoreFiles: [
    "**/node_modules/**",
    "**/.tmp/**",
    "**/.turbo/**",
    "**/dist/**",
    "**/.output/**",
    "**/.agents/**",
    "**/.cursor/**",
    /* Vendored isometric kit CSS. */
    "apps/onboarding/src/iso/iso.css",
  ],
  rules: {
    "at-rule-no-unknown": [
      true,
      {
        ignoreAtRules: [
          "theme",
          "source",
          "utility",
          "variant",
          "custom-variant",
          "apply",
          "reference",
          "config",
          "plugin",
          "slot",
          "tailwind",
        ],
      },
    ],
    /* Names this repo actually uses, including Tailwind's double-hyphen token suffixes. */
    "selector-class-pattern": [
      "^[a-z][a-z0-9-]*$",
      { message: "Expected class selector to be kebab-case" },
    ],
    "custom-property-pattern": [
      "^_?[a-z][a-z0-9-]*$",
      { message: "Expected custom property name to be kebab-case (a leading underscore or a doubled hyphen is allowed)" },
    ],
    /* Tailwind and Vite resolve bare @import specifiers. url() is not equivalent. */
    "import-notation": "string",
    "at-rule-prelude-no-invalid": [
      true,
      {
        ignoreAtRules: ["apply", "theme", "utility", "custom-variant", "variant", "source", "reference", "config", "plugin", "slot"],
      },
    ],

    /* @utility is a Tailwind scope. Nested & selectors are valid there. */
    "nesting-selector-no-missing-scoping-root": [
      true,
      { ignoreAtRules: ["utility"] },
    ],

    /* @media may declare inside @utility. Stylelint otherwise requires a style-rule ancestor. */
    "no-invalid-position-declaration": [
      true,
      { ignoreAtRules: ["utility", "theme"] },
    ],

    /* CSS guidelines: flat specificity, no !important, svh over vh, colours from tokens. */
    "selector-max-id": 0,
    "selector-max-compound-selectors": 2,
    "declaration-no-important": true,
    "unit-disallowed-list": ["vh"],
    "color-no-hex": true,
    "declaration-property-value-disallowed-list": {
      transition: ["/\\ball\\b/"],
      "transition-property": ["all"],
    },
  },
  overrides: [
    {
      /* Token files: the only place a primitive colour is written. */
      files: ["packages/ui/src/oa.css", "packages/ui/src/boardui/theme.css"],
      rules: { "color-no-hex": null },
    },
  ],
};
