import type { APIRoute } from "astro";
import {
  SESSION_COOKIE,
  SESSION_DAYS,
  authConfigFromEnv,
  createSessionToken,
  verifyInviteToken,
  verifySessionToken,
} from "../lib/auth.js";

// Opening an invite link logs the phone in as a member and lands on Rowing 101, which is
// written for new families. A phone that's already logged in keeps its session, so a coach
// tapping a parent's invite stays a coach.
export const GET: APIRoute = ({ url, cookies, redirect }) => {
  const { sessionSecret } = authConfigFromEnv(process.env);
  const loggedIn = verifySessionToken(cookies.get(SESSION_COOKIE)?.value, sessionSecret);
  const invite = verifyInviteToken(url.searchParams.get("k"), sessionSecret);

  let response: Response;
  if (loggedIn) {
    response = redirect("/guide", 303);
  } else if (invite && sessionSecret) {
    cookies.set(SESSION_COOKIE, createSessionToken("member", sessionSecret), {
      path: "/",
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: SESSION_DAYS * 86_400,
    });
    response = redirect("/guide", 303);
  } else {
    response = redirect("/login?invite=expired", 303);
  }
  response.headers.set("Cache-Control", "private, no-store");
  return response;
};
