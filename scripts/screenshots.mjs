// Phone-sized screenshots of the demo club, for posts and the README.
// Start the demo first (npm run demo), then: node scripts/screenshots.mjs [out-dir]
// Needs Playwright (npm install --no-save playwright && npx playwright install chromium).
import { mkdir } from "node:fs/promises";
import { createRequire } from "node:module";

// Playwright isn't a project dependency, so it may be installed globally.
const { chromium } = createRequire(import.meta.url)("playwright");

const BASE = process.env.DEMO_URL ?? "http://localhost:4321";
const OUT = process.argv[2] ?? "screenshots";
const year = new Date().getFullYear();

const PAGES = [
  ["today", "/"],
  ["regatta", `/regatta/demo-millrace-${year}`],
  ["past-regatta", `/regatta/demo-kettle-${year}`],
  ["year-over-year", `/series?name=${encodeURIComponent("Head of the Millrace")}`],
  ["rowing-101", "/guide"],
  ["venue", "/venue?id=millrace"],
  ["alerts", "/alerts"],
  ["rower", `/rower?name=${encodeURIComponent("Maya Okafor")}`],
  ["recap", `/recap?id=demo-kettle-${year}`],
  ["wrapped", `/wrapped?year=${year}`],
];

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
  colorScheme: process.env.DEMO_THEME === "dark" ? "dark" : "light",
});
await page.goto(`${BASE}/login`);
await page.fill('input[name="password"]', process.env.DEMO_PASSWORD ?? "demo");
await Promise.all([
  page.waitForURL((url) => !url.pathname.startsWith("/login")),
  page.press('input[name="password"]', "Enter"),
]);

for (const [name, path] of PAGES) {
  await page.goto(BASE + path, { waitUntil: "networkidle" });
  // The dev server's toolbar isn't part of the app.
  await page.evaluate(() => document.querySelector("astro-dev-toolbar")?.remove());
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: process.env.DEMO_FULL === "1" });
  console.log(`${OUT}/${name}.png`);
}
await browser.close();
