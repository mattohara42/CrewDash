import { describe, expect, it } from "vitest";
import { normalizeRegatta, type Regatta } from "../src/crewtimer/normalize.js";
import type { RawRegattaResults } from "../src/crewtimer/raw.js";
import { appendAlerts, parseAlertLog, type LoggedAlert } from "../src/lib/alert-log.js";
import { notifyFetched } from "../src/lib/notify-run.js";
import { memoryPushStore } from "../src/lib/push.js";
import { memoryStore } from "../src/lib/store.js";
import fixture from "./fixtures/regatta.json" with { type: "json" };

const alert = (body: string) => ({
  kind: "result" as const,
  title: "Made-up Head of the Lake",
  body,
  url: "/regatta/r1",
  eventKey: "womens u19 8+",
});

describe("appendAlerts", () => {
  it("puts new alerts first, in the order they were sent", () => {
    const now = new Date("2026-10-11T14:00:00Z");
    const log = appendAlerts([], [alert("first"), alert("second")], now);
    expect(log.map((a) => a.body)).toEqual(["second", "first"]);
    expect(log[0]).toMatchObject({ at: "2026-10-11T14:00:00.000Z" });
    expect(new Set(log.map((a) => a.id)).size).toBe(2);
  });

  it("drops alerts older than two weeks", () => {
    const old = appendAlerts([], [alert("old")], new Date("2026-09-01T12:00:00Z"));
    const log = appendAlerts(old, [alert("new")], new Date("2026-10-11T12:00:00Z"));
    expect(log.map((a) => a.body)).toEqual(["new"]);
  });

  it("keeps the log to a few hundred entries", () => {
    const many = Array.from({ length: 400 }, (_, i) => alert(String(i)));
    expect(appendAlerts([], many)).toHaveLength(300);
  });
});

describe("parseAlertLog", () => {
  it("keeps well-formed entries only", () => {
    const good = appendAlerts([], [alert("ok")])[0] as LoggedAlert;
    expect(parseAlertLog([good, { ...good, kind: "spam" }, { id: 1 }, null])).toEqual([good]);
    expect(parseAlertLog("nope")).toEqual([]);
  });
});

describe("notifyFetched", () => {
  it("logs the alerts it sends, even with nobody subscribed", async () => {
    const done = normalizeRegatta("r1", fixture as RawRegattaResults);
    const pending: Regatta = {
      ...done,
      events: done.events.map((e) => ({
        ...e,
        entries: e.entries.map((x) => ({
          ...x,
          status: "pending",
          place: null,
          adjustedTimeMs: null,
        })),
      })),
    };
    const store = memoryStore();
    // notifyFetched uses the club from club.json, so count the fixture's club as ours.
    await store.putSettings({ extraAliases: ["Lakeview Rowing Club"], eventAliases: {} });
    await notifyFetched(
      [{ previous: { regatta: pending, fetchedAt: "" }, record: { regatta: done, fetchedAt: "" } }],
      store,
      memoryPushStore(),
    );
    const log = await store.getAlertLog();
    expect(log.length).toBeGreaterThan(0);
    expect(log.every((a) => a.kind === "result" && a.url === "/regatta/r1")).toBe(true);
  });
});
