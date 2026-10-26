import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import realClub from "../club.json" with { type: "json" };
import { EMPTY_SETTINGS } from "../src/lib/settings.js";
import { todayRegattas } from "../src/lib/today.js";

// 11:00 am in New York, the demo club's time zone, on a Sunday.
const NOW = new Date("2026-10-25T15:00:00Z");

describe("demo club", () => {
  beforeAll(() => {
    vi.useFakeTimers({ toFake: ["Date"], now: NOW });
    vi.stubEnv("CREWDASH_DEMO", "1");
  });
  afterAll(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  const load = async () => {
    const { blobsStore } = await import("../src/lib/store.js");
    const { club } = await import("../src/lib/config.js");
    return { store: blobsStore(), club };
  };

  it("swaps in the made-up club", async () => {
    const { club } = await load();
    expect(club.name).toBe("Riverside Rowing Club");
    expect(club.name).not.toBe(realClub.name);
  });

  it("is racing today, with some results in and some still to come", async () => {
    const { store, club } = await load();
    const [today] = todayRegattas(await store.list(), club, EMPTY_SETTINGS, club.timezone, NOW);
    expect(today?.when).toBe("Today");
    const done = today!.events.filter((e) => e.done).length;
    expect(done).toBeGreaterThan(0);
    expect(done).toBeLessThan(today!.events.length);
    expect(await store.getAlertLog()).not.toHaveLength(0);
  });

  it("has past regattas on Sundays with lineups for this season", async () => {
    const { store } = await load();
    const past = (await store.list()).filter((r) => r.regatta.date < "2026-10-25");
    expect(past.length).toBeGreaterThan(3);
    for (const { regatta } of past) {
      expect(new Date(`${regatta.date}T12:00:00Z`).getUTCDay()).toBe(0);
      expect(regatta.events.every((e) => e.entries.every((x) => x.status !== "pending"))).toBe(
        true,
      );
    }
    const kettle = past.find((r) => r.regatta.id === "demo-kettle-2026")!;
    expect(Object.keys(await store.getLineups(kettle.regatta.id)).length).toBeGreaterThan(0);
  });

  it("never looks up the weather", async () => {
    const { store } = await load();
    const [record] = await store.list();
    expect(await store.conditions.get(record!.regatta.id)).not.toBeNull();
  });
});
