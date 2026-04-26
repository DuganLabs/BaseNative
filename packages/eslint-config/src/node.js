/* Node preset — adds Node globals + import hygiene rules. */

import globals from "globals";
import base from "./index.js";

export default [
  ...base,
  {
    languageOptions: {
      globals: { ...globals.node },
    },
  },
];
