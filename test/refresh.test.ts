import { describe, expect, it, vi } from "vitest";
import { fetchAndStore, isRecent, refreshRecent } from "../src/lib/refresh.js";
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
    const first = await fetchAndStore("r1", store, respond(), now);
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
    const base = (await fetchAndStore("r1", store, respond(), now)).regatta;
    await store.put({ regatta: { ...base, id: "r2", date: "2026-10-12" }, fetchedAt: "" });
    await store.put({ regatta: { ...base, id: "r3", date: "2026-10-11" }, fetchedAt: "" });
    await store.put({ regatta: { ...base, id: "r4", date: "2025-10-12" }, fetchedAt: "" });

    const fetchImpl = vi.fn(async (url: string | URL | Request) =>
      String(url).includes("r2")
        ? new Response("nope", { status: 500 })
        : new Response(JSON.stringify(fixture)),
    );
    vi.spyOn(console, "error").mockImplementation(() => {});

    // r1's fixture date is 2026-10-11, so it's recent too.
    expect(await refreshRecent(store, fetchImpl, now)).toEqual(["r1", "r3"]);
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect((await store.get("r2"))?.fetchedAt).toBe("");
  });
});
