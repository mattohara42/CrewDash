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
