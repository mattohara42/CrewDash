import { describe, expect, it, vi } from "vitest";
import { PARSER_VERSION } from "../src/crewtimer/normalize.js";
import { fetchAndStore, isRaceDay, isRecent, isStale, refreshRecent } from "../src/lib/refresh.js";
import { memoryStore } from "../src/lib/store.js";
import fixture from "./fixtures/regatta.json" with { type: "json" };

const now = new Date("2026-10-12T15:00:00Z");
const respond = () => vi.fn(async () => new Response(JSON.stringify(fixture)));

describe("isRecent", () => {
  it.each([
    ["2026-10-13", true], // tomorrow
    ["2026-10-12", true],
    ["2026-10-09", true], // three days ago
    ["2026-10-08", false],
    ["2026-10-14", false],
    ["not a date", false],
  ])("%s -> %s", (date, recent) => {
    expect(isRecent(date, now)).toBe(recent);
  });
});

describe("fetchAndStore", () => {
  it("normalizes and stores a regatta with its fetch time", async () => {
    const store = memoryStore();
    await fetchAndStore("r1", store, respond(), now);
    expect(await store.get("r1")).toMatchObject({
      regatta: { id: "r1", title: "Made-up Head of the Lake" },
      fetchedAt: now.toISOString(),
    });
  });
});

describe("fetchAndStore on refresh", () => {
  it("keeps the series an admin set", async () => {
    const store = memoryStore();
    const { record: first } = await fetchAndStore("r1", store, respond(), now);
    await store.put({ ...first, series: "Head of the Lake" });
    await fetchAndStore("r1", store, respond(), new Date("2026-10-12T16:00:00Z"));
    expect(await store.get("r1")).toMatchObject({
      series: "Head of the Lake",
      fetchedAt: "2026-10-12T16:00:00.000Z",
    });
  });
});

describe("refreshRecent", () => {
  it("re-fetches only recent regattas and keeps going after a failure", async () => {
    const store = memoryStore();
    const base = (await fetchAndStore("r1", store, respond(), now)).record.regatta;
    await store.put({
      regatta: { ...base, id: "r2", date: "2026-10-12" },
      fetchedAt: "",
      parserVersion: PARSER_VERSION,
    });
    await store.put({
      regatta: { ...base, id: "r3", date: "2026-10-11" },
      fetchedAt: "",
      parserVersion: PARSER_VERSION,
    });
    await store.put({
      regatta: { ...base, id: "r4", date: "2025-10-12" },
      fetchedAt: "",
      parserVersion: PARSER_VERSION,
    });

    const fetchImpl = vi.fn(async (url: string | URL | Request) =>
      String(url).includes("r2")
        ? new Response("nope", { status: 500 })
        : new Response(JSON.stringify(fixture)),
    );
    vi.spyOn(console, "error").mockImplementation(() => {});

    // r1's fixture date is 2026-10-11, so it's recent too.
    // r4 is old but parsed by the current version, so it's left alone.
    const refreshed = await refreshRecent(store, fetchImpl, now);
    expect(refreshed.map((r) => r.record.regatta.id)).toEqual(["r1", "r3"]);
    expect(refreshed.every((r) => r.previous !== null)).toBe(true);
    const fullFetches = fetchImpl.mock.calls.filter(
      ([url]) => !String(url).includes("lastUpdated"),
    );
    expect(fullFetches).toHaveLength(3);
    expect((await store.get("r2"))?.fetchedAt).toBe("");
  });
});

describe("refreshRecent with stale copies", () => {
  it("re-fetches a few old regattas parsed by an earlier version", async () => {
    const store = memoryStore();
    const old = (await fetchAndStore("r1", store, respond(), now)).record;
    for (const id of ["r10", "r11", "r12", "r13", "r14", "r15"]) {
      // Made before versions existed, and long past.
      await store.put({
        ...old,
        parserVersion: undefined,
        regatta: { ...old.regatta, id, date: "2024-05-01" },
      });
    }
    const fetchImpl = respond();
    const later = new Date("2026-12-01T15:00:00Z");
    const first = await refreshRecent(store, fetchImpl, later);
    expect(first).toHaveLength(5);
    const stamped = (await store.list()).filter((r) => r.parserVersion === PARSER_VERSION);
    expect(isStale(stamped[0]!)).toBe(false);
    // r1 is current and not recent, so it's left alone. One stale copy remains for the next run.
    expect(await refreshRecent(store, fetchImpl, later)).toHaveLength(1);
    expect(await refreshRecent(store, fetchImpl, later)).toHaveLength(0);
  });
});

describe("refreshRecent off race day", () => {
  // The fixture races on 2026-10-11.
  const seed = async () => {
    const store = memoryStore();
    await fetchAndStore("r1", store, respond(), now);
    return store;
  };
  const marker = (value: string) =>
    vi.fn(async (url: string | URL | Request) =>
      String(url).includes("lastUpdatedEvent")
        ? new Response(JSON.stringify(value))
        : new Response(JSON.stringify(fixture)),
    );

  it("knows race day from the event dates", async () => {
    const { regatta } = (await (await seed()).get("r1"))!;
    expect(isRaceDay(regatta, new Date("2026-10-11T15:30:00Z"))).toBe(true);
    expect(isRaceDay(regatta, new Date("2026-10-12T15:30:00Z"))).toBe(false);
  });

  it("fetches every run on race day", async () => {
    const store = await seed();
    const refreshed = await refreshRecent(store, marker("1"), new Date("2026-10-11T15:35:00Z"));
    expect(refreshed).toHaveLength(1);
  });

  it("fetches only on the first run of each hour after race day", async () => {
    const store = await seed();
    expect(await refreshRecent(store, marker("1"), new Date("2026-10-12T15:35:00Z"))).toHaveLength(
      0,
    );
    expect(await refreshRecent(store, marker("1"), new Date("2026-10-12T16:00:00Z"))).toHaveLength(
      1,
    );
  });

  it("keeps CrewTimer's change marker and logs whether it moved with the results", async () => {
    const store = await seed();
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const raceDay = new Date("2026-10-11T15:00:00Z");
    await refreshRecent(store, marker("86"), raceDay);
    expect((await store.get("r1"))?.marker).toBe("86");
    await refreshRecent(store, marker("87"), raceDay);
    expect(log).toHaveBeenCalledWith("Marker check r1: marker changed, results same");
    // A coach's Refresh results passes no marker, so the old one doesn't skew the next check.
    await fetchAndStore("r1", store, respond(), raceDay);
    expect((await store.get("r1"))?.marker).toBeUndefined();
    log.mockRestore();
  });
});
