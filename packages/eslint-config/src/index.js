/* @basenative/eslint-config — base flat-config preset.
   Universal rules that apply everywhere (browser, node, workers).
   Compose with one of the runtime-specific exports for environment globals. */

import js from "@eslint/js";
import prettier from "eslint-config-prettier";

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: "module",
    },
    rules: {
      // Allow underscore-prefixed unused — useful for destructuring + caught errors.
      "no-unused-vars": ["error", {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_",
      }],
      "no-empty": ["error", { allowEmptyCatch: true }],
      // Security baseline — no codegen-from-strings.
      "no-eval": "error",
      "no-implied-eval": "error",
      "no-new-func": "error",
      // Hygiene
      "eqeqeq": ["error", "smart"],
      "no-var": "error",
      "prefer-const": ["warn", { destructuring: "all" }],
    },
  },
  // Disable rules that conflict with Prettier — we delegate formatting.
  prettier,
  {
    ignores: [
      "dist/",
      "build/",
      "out/",
      ".next/",
      ".vite/",
      "node_modules/",
      "coverage/",
      "*.min.js",
    ],
  },
];
