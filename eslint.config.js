import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["node_modules", "dist", ".netlify", ".astro"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    // The service worker runs in the browser, not Node.
    files: ["public/sw.js"],
    languageOptions: { globals: { self: "readonly", URL: "readonly" } },
  },
  {
    // Node scripts. The screenshot script also runs a line in the browser page.
    files: ["scripts/*.mjs"],
    languageOptions: {
      globals: { process: "readonly", console: "readonly", document: "readonly" },
    },
  },
);
