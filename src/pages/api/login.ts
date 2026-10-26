import type { APIRoute } from "astro";
import {
  SESSION_COOKIE,
  SESSION_DAYS,
  authConfigFromEnv,
  createSessionToken,
  roleForPassword,
  safeNext,
} from "../../lib/auth.js";
import { isDemo } from "../../lib/config.js";
import {
  blobsFailureStore,
  clearFailures,
  failureKey,
  isLockedOut,
  recordFailure,
} from "../../lib/login-limit.js";

/** The visitor's address, or "" where the host doesn't provide one. */
function addressOf(context: { clientAddress: string }): string {
  try {
    return context.clientAddress;
  } catch {
    return "";
  }
}

export const POST: APIRoute = async (context) => {
  const { request, cookies, redirect } = context;
  const form = await request.formData();
  const next = safeNext(String(form.get("next") ?? "/"));
  const config = authConfigFromEnv(process.env);
  // The demo's passwords are public, so there's nothing to guess.
  const address = addressOf(context);
  const limit = !isDemo() && config.sessionSecret && address ? blobsFailureStore() : null;
  const key = failureKey(address, config.sessionSecret ?? "");
  // If the count can't be read, let the login through rather than lock the club out.
  const guarded = async (step: () => Promise<unknown>) => {
    try {
      return await step();
    } catch (err) {
      console.error("Login limit unavailable:", err);
      return false;
    }
  };

  if (limit && (await guarded(() => isLockedOut(limit, key)))) {
    return redirect(`/login?${new URLSearchParams({ error: "wait", next })}`, 303);
  }
  const role = roleForPassword(String(form.get("password") ?? ""), config);
  if (!role || !config.sessionSecret) {
    if (limit) await guarded(() => recordFailure(limit, key));
    return redirect(`/login?${new URLSearchParams({ error: "1", next })}`, 303);
  }
  if (limit) await guarded(() => clearFailures(limit, key));

  cookies.set(SESSION_COOKIE, createSessionToken(role, config.sessionSecret), {
    path: "/",
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: SESSION_DAYS * 86_400,
  });
  return redirect(next, 303);
};
