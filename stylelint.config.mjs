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

    /* Declarations inside @media in an @utility are valid Tailwind. Stylelint treats @utility as a plain at-rule. */
    "no-invalid-position-declaration": null,
  },
};
