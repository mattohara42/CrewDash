import type { APIRoute } from "astro";
import { club } from "../lib/config.js";

// Lets phones install CrewDash to the home screen, which iPhones require for notifications.
// Public (see middleware): browsers fetch it without cookies, and it holds nothing private.
// It carries the club's name and color from the admin's settings, so it's made on request.
// Phones fetch it on most page loads, so Netlify's CDN keeps it for an hour and the function
// runs a few times an hour at most. A settings change reaches it within the hour.
const CACHE = "public, max-age=3600";
const CDN_CACHE = "public, durable, s-maxage=3600, stale-while-revalidate=86400";

export const GET: APIRoute = () =>
  new Response(
    JSON.stringify({
      name: `${club.name} · CrewDash`,
      short_name: club.name,
      start_url: "/",
      display: "standalone",
      background_color: "#f7f8fa",
      theme_color: club.colors.primary,
      icons: [
        { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
        { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      ],
    }),
    {
      headers: {
        "Content-Type": "application/manifest+json",
        "Cache-Control": CACHE,
        "Netlify-CDN-Cache-Control": CDN_CACHE,
      },
    },
  );
