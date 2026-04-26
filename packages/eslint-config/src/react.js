/* React preset — browser globals + React-friendly rules.
   Pure flat-config; assumes consumer brings eslint-plugin-react if they want
   JSX-specific rules. We keep this minimal to avoid hard React peer-dep. */

import globals from "globals";
import base from "./index.js";

export default [
  ...base,
  {
    languageOptions: {
      globals: { ...globals.browser },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    rules: {
      "no-unused-vars": ["error", {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^[_A-Z]",  // Allow uppercase (React components) to be unused-imported.
        caughtErrorsIgnorePattern: "^_",
      }],
    },
  },
];
