import type { APIRoute } from "astro";
import { club } from "../lib/config.js";

// Lets phones install CrewDash to the home screen, which iPhones require for notifications.
// Public (see middleware): browsers fetch it without cookies, and it holds nothing private.
// Built once as a static file: phones fetch it on most page loads, and it never changes.
export const prerender = true;

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
    { headers: { "Content-Type": "application/manifest+json" } },
  );
