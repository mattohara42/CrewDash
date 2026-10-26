import { describe, expect, it } from "vitest";
import {
  MAX_FAILURES,
  WINDOW_MS,
  clearFailures,
  failureKey,
  isLockedOut,
  memoryFailureStore,
  recordFailure,
} from "../src/lib/login-limit.js";

describe("login limit", () => {
  it("locks an address out after too many failures, until the window passes", async () => {
    const store = memoryFailureStore();
    const key = failureKey("203.0.113.7", "salt");
    for (let i = 0; i < MAX_FAILURES - 1; i++) await recordFailure(store, key, 1000);
    expect(await isLockedOut(store, key, 1000)).toBe(false);
    await recordFailure(store, key, 1000);
    expect(await isLockedOut(store, key, 1000)).toBe(true);
    expect(await isLockedOut(store, key, 1000 + WINDOW_MS)).toBe(false);
  });

  it("starts counting again after the window", async () => {
    const store = memoryFailureStore();
    for (let i = 0; i < MAX_FAILURES; i++) await recordFailure(store, "k", 0);
    await recordFailure(store, "k", WINDOW_MS + 1);
    expect(await store.get("k")).toEqual({ count: 1, since: WINDOW_MS + 1 });
  });

  it("clears on a successful login", async () => {
    const store = memoryFailureStore();
    for (let i = 0; i < MAX_FAILURES; i++) await recordFailure(store, "k", 0);
    await clearFailures(store, "k");
    expect(await isLockedOut(store, "k", 0)).toBe(false);
  });

  it("never stores the address itself", () => {
    const key = failureKey("203.0.113.7", "salt");
    expect(key).not.toContain("203");
    expect(key).toBe(failureKey("203.0.113.7", "salt"));
    expect(key).not.toBe(failureKey("203.0.113.7", "other"));
  });
});
