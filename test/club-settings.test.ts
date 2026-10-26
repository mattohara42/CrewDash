import { beforeEach, describe, expect, it, vi } from "vitest";

// club-settings updates the shared club object, so each test starts from fresh modules.
const load = async () => {
  vi.resetModules();
  return {
    ...(await import("../src/lib/club-settings.js")),
    ...(await import("../src/lib/config.js")),
  };
};

const saved = {
  name: "Lakeview Rowing Club",
  aliases: ["Lakeview Rowing Club", "Lakeview RC"],
  timezone: "Australia/Sydney",
  locale: "en-AU",
  seasonStartMonth: 9,
  units: "metric",
};

describe("loadClub", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("uses club.json until settings are saved", async () => {
    const { loadClub, clubIsSetUp, club, clubFromFile } = await load();
    await loadClub(async () => null, 0);
    expect(club).toEqual(clubFromFile());
    expect(clubIsSetUp()).toBe(false);
  });

  it("puts saved settings into the shared club", async () => {
    const { loadClub, clubIsSetUp, club } = await load();
    await loadClub(async () => saved, 0);
    expect(club).toMatchObject({ name: "Lakeview Rowing Club", seasonStartMonth: 9 });
    expect(clubIsSetUp()).toBe(true);
  });

  it("reads Blobs at most every 30 seconds", async () => {
    const { loadClub } = await load();
    const read = vi.fn(async () => saved);
    await loadClub(read, 0);
    await loadClub(read, 29_000);
    expect(read).toHaveBeenCalledTimes(1);
    await loadClub(read, 30_000);
    expect(read).toHaveBeenCalledTimes(2);
  });

  it("refuses to run on club.json when the settings have never been read", async () => {
    const { loadClub, club, clubFromFile } = await load();
    await expect(
      loadClub(async () => {
        throw new Error("Blobs down");
      }, 0),
    ).rejects.toThrow(/Couldn't load/);
    // The next request tries again rather than waiting 30 seconds.
    await loadClub(async () => null, 1);
    expect(club).toEqual(clubFromFile());
  });

  it("keeps the settings in use when Blobs fails or what's saved is bad", async () => {
    const { loadClub, club } = await load();
    await loadClub(async () => saved, 0);
    await loadClub(async () => {
      throw new Error("Blobs down");
    }, 60_000);
    await loadClub(async () => ({ ...saved, timezone: "Mars/Olympus" }), 120_000);
    expect(club.timezone).toBe("Australia/Sydney");
    expect(console.error).toHaveBeenCalledTimes(2);
  });
});

describe("the settings form", () => {
  const fields: Record<string, string> = {
    name: "Lakeview Rowing Club",
    aliases: "Lakeview Rowing Club\r\n\nLakeview RC  \n",
    timezone: "Europe/London",
    locale: "en-GB",
    units: "metric",
    seasonStartMonth: "9",
    primary: "#14402f",
    secondary: "#2e8b57",
    accent: "#f2c14e",
    bladeBase: "#2e8b57",
    bladeTip: "#f2c14e",
    chartLightStrong: "#3b5bb0",
    chartLightMuted: "#a3b4de",
    chartDarkStrong: "#b8860b",
    chartDarkMuted: "#6e5414",
  };
  const field =
    (overrides: Record<string, string> = {}) =>
    (name: string) =>
      ({ ...fields, ...overrides })[name] ?? "";

  it("becomes a checked club, one alias per line", async () => {
    const { checkClub, clubFromForm } = await load();
    const result = checkClub(clubFromForm(field()));
    expect(result).toMatchObject({
      club: {
        aliases: ["Lakeview Rowing Club", "Lakeview RC"],
        locale: "en-GB",
        seasonStartMonth: 9,
        units: "metric",
        colors: { blade: { base: "#2e8b57", tip: "#f2c14e" } },
      },
    });
  });

  it.each([
    [{ name: "" }, /at least one name/],
    [{ aliases: " \n " }, /at least one name/],
    [{ timezone: "Nowhere/Land" }, /Time zone/],
    [{ seasonStartMonth: "" }, /Season start/],
    [{ primary: "#f4b81e" }, /too light for white text/],
    [{ accent: "orange" }, /accent/],
  ])("explains what's wrong with %j", async (overrides, message) => {
    const { checkClub, clubFromForm } = await load();
    const result = checkClub(clubFromForm(field(overrides)));
    expect("error" in result && result.error).toMatch(message);
  });
});
