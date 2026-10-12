import type { APIRoute } from "astro";
import {
  SESSION_COOKIE,
  SESSION_DAYS,
  authConfigFromEnv,
  createSessionToken,
  roleForPassword,
  safeNext,
} from "../../lib/auth.js";

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const form = await request.formData();
  const next = safeNext(String(form.get("next") ?? "/"));
  const config = authConfigFromEnv(process.env);
  const role = roleForPassword(String(form.get("password") ?? ""), config);

  if (!role || !config.sessionSecret) {
    return redirect(`/login?${new URLSearchParams({ error: "1", next })}`, 303);
  }

  cookies.set(SESSION_COOKIE, createSessionToken(role, config.sessionSecret), {
    path: "/",
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: SESSION_DAYS * 86_400,
  });
  return redirect(next, 303);
};
