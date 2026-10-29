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
    // Other imports may have loaded the config before demo mode was switched on.
    vi.resetModules();
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
    expect(today!.stale).toBeNull();
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

  it("has public passwords that only work in demo mode", async () => {
    const { authConfigFromEnv, roleForPassword } = await import("../src/lib/auth.js");
    const demo = authConfigFromEnv({ CREWDASH_DEMO: "1" });
    expect(roleForPassword("demo", demo)).toBe("member");
    expect(roleForPassword("admin", demo)).toBe("admin");
    expect(roleForPassword("demo", authConfigFromEnv({}))).toBeNull();
  });

  it("never fetches real results", async () => {
    const { fetchChangeMarker, fetchRegattaResults } = await import("../src/crewtimer/fetch.js");
    const fetchImpl = vi.fn();
    await expect(fetchRegattaResults("r16426", fetchImpl)).rejects.toThrow(/demo/);
    expect(await fetchChangeMarker("r16426", fetchImpl)).toBeNull();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("never looks up the weather", async () => {
    const { store } = await load();
    const [record] = await store.list();
    expect(await store.conditions.get(record!.regatta.id)).not.toBeNull();
  });
});
