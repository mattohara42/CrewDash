import { defineConfig } from "astro/config";
import netlify from "@astrojs/netlify";

// Every page renders on request so it can check the club password and read
// the latest stored results.
export default defineConfig({
  output: "server",
  adapter: netlify(),
});
