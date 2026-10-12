import { describe, expect, it } from "vitest";
import { matchClub, parseClubConfig } from "../src/club.js";
import clubJson from "../club.json" with { type: "json" };

const club = { name: "Lakeview Rowing Club", aliases: ["Lakeview Rowing Club", "Lakeview RC"] };

describe("matchClub", () => {
  it("matches aliases ignoring case and spacing", () => {
    expect(matchClub("lakeview  rowing club ", club)).toBe("match");
    expect(matchClub("Lakeview RC", club)).toBe("match");
  });

  it("flags names that contain an alias as near", () => {
    expect(matchClub("Lakeview Rowing Club - EXH", club)).toBe("near");
  });

  it("ignores other clubs", () => {
    expect(matchClub("Hillside Boat Club", club)).toBe("none");
  });
});

describe("parseClubConfig", () => {
  it("accepts the repo's club.json", () => {
    expect(parseClubConfig(clubJson).aliases.length).toBeGreaterThan(0);
  });

  it.each([null, {}, { name: "X", aliases: [] }, { name: "X", aliases: [" "] }])(
    "rejects %j",
    (value) => {
      expect(() => parseClubConfig(value)).toThrow(/club\.json/);
    },
  );
});
