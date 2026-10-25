import { describe, expect, it } from "vitest";
import { normalizeRegatta } from "../src/crewtimer/normalize.js";
import type { RawRegattaResults } from "../src/crewtimer/raw.js";
import fixture from "./fixtures/regatta.json" with { type: "json" };
import {
  EMPTY_VENUES,
  deleteVenue,
  formatPlaces,
  parseCoordinates,
  parsePlaces,
  parseVenueData,
  regattasAtVenue,
  saveVenue,
  setSeriesVenue,
  venueForSeries,
} from "../src/lib/venues.js";

const lake = {
  name: "Lakeview Basin",
  courseLengthM: 4800,
  courseBearing: null,
  places: [],
  notes: "",
};

describe("parseCoordinates", () => {
  it.each([
    ["43.1301, -77.634", { lat: 43.1301, lon: -77.634 }],
    ["https://www.google.com/maps/@43.1301,-77.634,15z", { lat: 43.1301, lon: -77.634 }],
    [
      "https://www.google.com/maps/search/?api=1&query=43.1301%2C-77.634",
      { lat: 43.1301, lon: -77.634 },
    ],
    // The pin wins over the map view.
    [
      "https://www.google.com/maps/place/X/@43.1,-77.6,15z/data=!3d43.1301!4d-77.634",
      { lat: 43.1301, lon: -77.634 },
    ],
  ])("%s", (text, expected) => {
    expect(parseCoordinates(text)).toEqual(expected);
  });

  it.each(["https://maps.app.goo.gl/abc123", "91, 10", "east lot"])("rejects %s", (text) => {
    expect(parseCoordinates(text)).toBeNull();
  });
});

describe("parsePlaces", () => {
  it("reads labelled lines and skips blanks", () => {
    const result = parsePlaces(
      "Launch: 43.13, -77.63\n\nFinish: https://www.google.com/maps/@43.15,-77.61,15z",
    );
    expect(result).toEqual({
      places: [
        { label: "Launch", lat: 43.13, lon: -77.63 },
        { label: "Finish", lat: 43.15, lon: -77.61 },
      ],
    });
  });

  it("reports the first line it can't read", () => {
    expect(parsePlaces("Launch: 43.13, -77.63\nParking: east lot")).toEqual({
      error: "Parking: east lot",
    });
    expect(parsePlaces("https://www.google.com/maps/@43.15,-77.61,15z")).toHaveProperty("error");
  });

  it("round-trips through the edit box", () => {
    const places = [{ label: "Tent", lat: 43.1, lon: -77.6 }];
    expect(parsePlaces(formatPlaces(places))).toEqual({ places });
  });
});

describe("venues", () => {
  it("gives new venues unused ids and keeps ids on rename", () => {
    let data = saveVenue(EMPTY_VENUES, lake);
    data = saveVenue(data, lake);
    expect(data.venues.map((v) => v.id)).toEqual(["lakeview-basin", "lakeview-basin-2"]);
    data = saveVenue(data, { ...lake, id: "lakeview-basin", name: "Lakeview" });
    expect(data.venues[0]).toMatchObject({ id: "lakeview-basin", name: "Lakeview" });
    expect(data.venues).toHaveLength(2);
  });

  it("links series ignoring case, and unlinks on delete", () => {
    let data = saveVenue(EMPTY_VENUES, lake);
    data = setSeriesVenue(data, "Lakeview Head - Sunday", "lakeview-basin");
    expect(venueForSeries(data, "LAKEVIEW HEAD - SUNDAY")?.name).toBe("Lakeview Basin");
    expect(setSeriesVenue(data, "Lakeview Head - Sunday", "").seriesVenue).toEqual({});
    data = deleteVenue(data, "lakeview-basin");
    expect(data).toEqual(EMPTY_VENUES);
  });

  it("parses stored data defensively", () => {
    expect(parseVenueData(null)).toEqual(EMPTY_VENUES);
    const data = parseVenueData({
      venues: [
        { id: "a", name: "A", places: [{ label: "X", lat: 500, lon: 0 }] },
        { name: "no id" },
      ],
      seriesVenue: { s: "a", t: 3 },
      clubTips: 7,
    });
    expect(data).toEqual({
      venues: [
        { id: "a", name: "A", courseLengthM: null, courseBearing: null, places: [], notes: "" },
      ],
      seriesVenue: { s: "a" },
      clubTips: "",
      chatUrl: "",
    });
  });
});

describe("chat link", () => {
  it("keeps https links only", async () => {
    const { safeUrl } = await import("../src/lib/venues.js");
    expect(safeUrl(" https://chat.whatsapp.com/abc ")).toBe("https://chat.whatsapp.com/abc");
    expect(safeUrl("javascript:alert(1)")).toBe("");
    expect(safeUrl("http://example.com")).toBe("");
    expect(parseVenueData({ chatUrl: "javascript:alert(1)" }).chatUrl).toBe("");
  });
});

describe("regattasAtVenue", () => {
  const record = (id: string, date: string, series: string) => ({
    regatta: { ...normalizeRegatta(id, fixture as RawRegattaResults), date },
    fetchedAt: "",
    series,
  });

  it("lists each linked series once, as its newest regatta", () => {
    const records = [
      record("r1", "2025-10-11", "Lakeview Head"),
      record("r2", "2026-10-11", "Lakeview Head"),
      record("r3", "2026-05-01", "Hillside Sprints"),
    ];
    let data = saveVenue(EMPTY_VENUES, {
      name: "Lake",
      courseLengthM: null,
      courseBearing: null,
      places: [],
      notes: "",
    });
    data = setSeriesVenue(data, "Lakeview Head", "lake");
    data = setSeriesVenue(data, "Hillside Sprints", "lake");
    expect(regattasAtVenue(records, data, "lake").map((r) => r.regatta.id)).toEqual(["r3", "r2"]);
    expect(regattasAtVenue(records, data, "other")).toEqual([]);
  });
});
