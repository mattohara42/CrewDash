import { safeNext } from "./auth.js";

/** Back to an admin page with an error message shown at the top. */
export function withError(path: string, message: string): string {
  const url = new URL(path, "http://x");
  url.searchParams.set("error", message);
  return url.pathname + url.search;
}

/** A path with a flag added, such as ?refreshed=1 to confirm a refresh. */
export function withFlag(path: string, name: string): string {
  const url = new URL(path, "http://x");
  url.searchParams.set(name, "1");
  return url.pathname + url.search;
}

/** Where an admin form returns to. Same-site paths only. */
export function backTo(value: FormDataEntryValue | null, fallback = "/admin"): string {
  return safeNext(typeof value === "string" ? value : null, fallback);
}
