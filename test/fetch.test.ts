import { describe, expect, it, vi } from "vitest";
import { fetchRegattaResults, regattaIdFrom } from "../src/crewtimer/fetch.js";

describe("regattaIdFrom", () => {
  it.each([
    ["r16329", "r16329"],
    ["https://www.crewtimer.com/regatta/r16329", "r16329"],
    ["crewtimer.com/regatta/r16329?tab=results", "r16329"],
    ["  r42  ", "r42"],
  ])("reads %s", (input, id) => {
    expect(regattaIdFrom(input)).toBe(id);
  });

  it.each(["", "16329", "https://example.com/regatta/r16329", "r16329/../x"])(
    "rejects %j",
    (input) => {
      expect(regattaIdFrom(input)).toBeNull();
    },
  );
});

describe("fetchRegattaResults", () => {
  const ok = (body: unknown) => vi.fn().mockResolvedValue(new Response(JSON.stringify(body)));

  it("requests the regatta's results path", async () => {
    const fetchImpl = ok({ regattaInfo: {}, results: [] });
    await fetchRegattaResults("r16329", fetchImpl);
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://crewtimer-results.firebaseio.com/results/r16329.json",
    );
  });

  it("refuses ids that aren't CrewTimer ids", async () => {
    await expect(fetchRegattaResults("../secret", ok({}))).rejects.toThrow(/Not a CrewTimer/);
  });

  it("reports an unknown regatta", async () => {
    await expect(fetchRegattaResults("r1", ok(null))).rejects.toThrow(/No CrewTimer results/);
  });

  it("reports HTTP errors", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response("denied", { status: 401 }));
    await expect(fetchRegattaResults("r1", fetchImpl)).rejects.toThrow(/401/);
  });
});
