import { defineMiddleware } from "astro:middleware";
import { SESSION_COOKIE, authConfigFromEnv, canCoach, verifySessionToken } from "./lib/auth.js";
import { isDemo } from "./lib/config.js";

const PUBLIC_PATHS = new Set(["/login", "/api/login", "/join", "/manifest.webmanifest"]);

// The demo is public, passwords and all, so it takes no changes: nobody can post text other
// visitors would see, send pushes or fetch real results. Reading push status is fine.
const DEMO_READ_ONLY = ["/api/admin/", "/api/coach/", "/api/push/subscribe", "/api/push/test"];

// Every page requires the club password. Coach pages need the coach or admin password,
// and admin pages the admin password.
export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname, search } = context.url;
  if (PUBLIC_PATHS.has(pathname)) return next();

  const config = authConfigFromEnv(process.env);
  const role = verifySessionToken(context.cookies.get(SESSION_COOKIE)?.value, config.sessionSecret);
  const isAdminPath =
    pathname === "/admin" || pathname.startsWith("/admin/") || pathname.startsWith("/api/admin/");

  const isCoachPath =
    pathname === "/coach" || pathname.startsWith("/coach/") || pathname.startsWith("/api/coach/");

  if (!role || (isAdminPath && role !== "admin") || (isCoachPath && !canCoach(role))) {
    const params = new URLSearchParams({ next: pathname + search });
    if (role) params.set(isAdminPath ? "admin" : "coach", "1");
    return context.redirect(`/login?${params}`);
  }

  if (
    isDemo() &&
    context.request.method === "POST" &&
    DEMO_READ_ONLY.some((p) => pathname.startsWith(p))
  ) {
    const from = new URL(context.request.headers.get("referer") ?? "/", context.url);
    const back = from.origin === context.url.origin ? from.pathname : "/";
    const error = "This is the demo, so changes aren't saved.";
    return context.redirect(`${back}?${new URLSearchParams({ error })}`, 303);
  }

  context.locals.role = role;
  const response = await next();
  // Results pages hold rowers' names, so browsers and CDNs must not cache them.
  response.headers.set("Cache-Control", "private, no-store");
  return response;
});
