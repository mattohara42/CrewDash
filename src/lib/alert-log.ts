import type { ResultNotice } from "./notify.js";

// A history of what CrewDash told families: start and result alerts, and coach
// announcements. The bell in the header opens it, so an alert that was missed, cleared
// or silenced by Focus mode can still be found. Entries carry the same text as the push,
// which never names a rower.

export interface LoggedAlert {
  id: string;
  // ISO time it was sent.
  at: string;
  kind: ResultNotice["kind"] | "announcement";
  title: string;
  body: string;
  url: string;
  // The followed-event key, for the "Crews I follow" filter. Missing on announcements.
  eventKey?: string;
}

// About a race weekend and the week after. Older results live on regatta pages.
const KEEP_DAYS = 14;
const KEEP_MAX = 300;
const KINDS = ["start", "result", "update", "announcement"];

export function parseAlertLog(value: unknown): LoggedAlert[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (a): a is LoggedAlert =>
      !!a &&
      ["id", "at", "title", "body", "url"].every(
        (k) => typeof (a as Record<string, unknown>)[k] === "string",
      ) &&
      KINDS.includes((a as LoggedAlert).kind),
  );
}

/** Adds alerts to the log, newest first, dropping old ones. */
export function appendAlerts(
  log: LoggedAlert[],
  alerts: Omit<LoggedAlert, "id" | "at">[],
  now: Date = new Date(),
): LoggedAlert[] {
  const at = now.toISOString();
  const cutoff = new Date(now.getTime() - KEEP_DAYS * 86_400_000).toISOString();
  const added = alerts.map((a, i) => ({
    ...a,
    id: `${now.getTime().toString(36)}-${i}`,
    at,
  }));
  return [...added.reverse(), ...log.filter((a) => a.at >= cutoff)].slice(0, KEEP_MAX);
}

/** Log entries for notices, as they were sent. */
export function noticeAlerts(notices: ResultNotice[]): Omit<LoggedAlert, "id" | "at">[] {
  return notices.map(({ kind, title, body, url, eventKey }) => ({
    kind,
    title,
    body,
    url,
    eventKey,
  }));
}
