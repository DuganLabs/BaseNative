/* Browser preset — adds browser globals on top of the base config.
   Use for SPA / Vite / static client code. */

import globals from "globals";
import base from "./index.js";

export default [
  ...base,
  {
    languageOptions: {
      globals: { ...globals.browser },
    },
  },
];
