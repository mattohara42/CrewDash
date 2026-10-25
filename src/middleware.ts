import { defineMiddleware } from "astro:middleware";
import { SESSION_COOKIE, authConfigFromEnv, canCoach, verifySessionToken } from "./lib/auth.js";

const PUBLIC_PATHS = new Set(["/login", "/api/login", "/join", "/manifest.webmanifest"]);

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

  context.locals.role = role;
  const response = await next();
  // Results pages hold rowers' names, so browsers and CDNs must not cache them.
  response.headers.set("Cache-Control", "private, no-store");
  return response;
});
