import { describe, expect, it, vi } from "vitest";
import { normalizeRegatta } from "../src/crewtimer/normalize.js";
import type { RawRegattaResults } from "../src/crewtimer/raw.js";
import { reconcileCalendar, summarize, type StoredRegatta } from "../src/lib/store.js";
import fixture from "./fixtures/regatta.json" with { type: "json" };

const record = (id: string): StoredRegatta => ({
  regatta: { ...normalizeRegatta(id, fixture as RawRegattaResults), id },
  fetchedAt: "",
});

describe("reconcileCalendar", () => {
  it("leaves a calendar that matches the stored regattas alone", async () => {
    const load = vi.fn();
    const calendar = { r1: summarize(record("r1")) };
    expect(await reconcileCalendar(["r1"], calendar, load)).toBeNull();
    expect(load).not.toHaveBeenCalled();
  });

  it("adds regattas it's missing and drops ones no longer stored", async () => {
    const calendar = { r1: summarize(record("r1")), gone: summarize(record("gone")) };
    const fixed = await reconcileCalendar(["r1", "r2"], calendar, async (id) => record(id));
    expect(Object.keys(fixed ?? {}).sort()).toEqual(["r1", "r2"]);
    expect(fixed?.r2).toMatchObject({ id: "r2", date: "2026-10-11", parserVersion: 0 });
    // The calendar passed in isn't changed.
    expect(Object.keys(calendar).sort()).toEqual(["gone", "r1"]);
  });
});

describe("changeCalendar", async () => {
  const { changeCalendar } = await import("../src/lib/store.js");

  it("redoes a change when another write landed first, so neither is lost", async () => {
    // What's stored, with an etag that changes on every write.
    let stored: Record<string, ReturnType<typeof summarize>> = {};
    let etag = 0;
    const io = {
      read: async () => ({ calendar: stored, etag: etag ? String(etag) : null }),
      write: async (next: typeof stored, seen: string | null) => {
        if ((seen ?? "0") !== String(etag)) return false;
        stored = next;
        etag++;
        return true;
      },
    };
    // Another writer adds r2 between this writer's read and its write.
    let interrupted = false;
    await changeCalendar(io, async (calendar) => {
      if (!interrupted) {
        interrupted = true;
        await changeCalendar(io, (c) => ({ ...c, r2: summarize(record("r2")) }));
      }
      return { ...calendar, r1: summarize(record("r1")) };
    });
    expect(Object.keys(stored).sort()).toEqual(["r1", "r2"]);
  });

  it("gives up after a few tries rather than loop forever", async () => {
    const io = { read: async () => ({ calendar: {}, etag: "a" }), write: async () => false };
    await expect(changeCalendar(io, () => ({}))).rejects.toThrow(/kept changing/);
  });

  it("writes nothing when the change is null", async () => {
    const write = vi.fn();
    await changeCalendar({ read: async () => ({ calendar: {}, etag: "a" }), write }, () => null);
    expect(write).not.toHaveBeenCalled();
  });
});

describe("cachedRecords", async () => {
  const { cachedRecords } = await import("../src/lib/store.js");

  it("downloads a regatta only when its etag changes, and forgets deleted ones", async () => {
    const cache = new Map();
    const load = vi.fn(async (key: string) => record(key.replace("regatta/", "")));
    const ids = (records: StoredRegatta[]) => records.map((r) => r.regatta.id);

    const first = [
      { key: "regatta/r1", etag: "a" },
      { key: "regatta/r2", etag: "a" },
    ];
    expect(ids(await cachedRecords(first, cache, load))).toEqual(["r1", "r2"]);
    expect(load).toHaveBeenCalledTimes(2);

    // Nothing changed: no downloads.
    await cachedRecords(first, cache, load);
    expect(load).toHaveBeenCalledTimes(2);

    // r2 changed and r1 was deleted.
    expect(ids(await cachedRecords([{ key: "regatta/r2", etag: "b" }], cache, load))).toEqual([
      "r2",
    ]);
    expect(load).toHaveBeenCalledTimes(3);
    expect([...cache.keys()]).toEqual(["regatta/r2"]);
  });

  it("skips a regatta deleted between listing and download", async () => {
    const cache = new Map();
    const found = await cachedRecords(
      [{ key: "regatta/gone", etag: "a" }],
      cache,
      async () => null,
    );
    expect(found).toEqual([]);
    expect(cache.size).toBe(0);
  });
});
