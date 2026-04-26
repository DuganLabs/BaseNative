/* Cloudflare Worker preset — Service Worker globals + Worker-friendly rules.
   Use for Cloudflare Workers and Pages Functions code. */

import globals from "globals";
import base from "./index.js";

export default [
  ...base,
  {
    languageOptions: {
      globals: {
        ...globals.serviceworker,
        // Workers expose a few extras beyond strict service-worker globals.
        crypto: "readonly",
        caches: "readonly",
        WebAssembly: "readonly",
      },
    },
    rules: {
      // Workers cannot use most Node APIs; warn about common pitfalls.
      "no-restricted-globals": ["error",
        { name: "process", message: "Workers do not have a Node process global. Use env bindings instead." },
        { name: "Buffer",  message: "Workers do not have Buffer. Use Uint8Array / TextEncoder." },
        { name: "__dirname", message: "Workers do not have __dirname." },
        { name: "__filename", message: "Workers do not have __filename." },
      ],
    },
  },
];
