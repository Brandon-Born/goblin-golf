import { CHARACTERS, DISCS, HOLE_1, validateCharacter, validateDisc, validateGameData, validateHoleConfig } from "../../src/game/data";

describe("game data validation", () => {
  it("ships valid prototype data", () => {
    expect(validateGameData()).toEqual([]);
  });

  it("defines the three starting characters with stat-only differences", () => {
    expect(CHARACTERS).toHaveLength(3);
    expect(CHARACTERS.map((character) => character.name)).toEqual([
      "Grib Ninesnatch",
      "Morga Mosswhack",
      "Skrak Boomarm",
    ]);
    expect(CHARACTERS.map((character) => character.stats.power)).toEqual([3, 2, 5]);
    expect(CHARACTERS.flatMap(validateCharacter)).toEqual([]);
  });

  it("defines driver, midrange, and putter discs", () => {
    expect(DISCS.map((disc) => disc.id)).toEqual(["driver", "midrange", "putter"]);
    expect(DISCS.find((disc) => disc.id === "driver")?.distance).toBeGreaterThan(
      DISCS.find((disc) => disc.id === "putter")?.distance ?? 0,
    );
    expect(DISCS.find((disc) => disc.id === "putter")?.control).toBeGreaterThan(
      DISCS.find((disc) => disc.id === "driver")?.control ?? 0,
    );
    expect(DISCS.flatMap(validateDisc)).toEqual([]);
  });

  it("rejects invalid stat and hole ranges", () => {
    expect(validateCharacter({ ...CHARACTERS[0], stats: { ...CHARACTERS[0].stats, power: 6 } })).toContain(
      "Character stat power must be an integer from 1 to 5.",
    );
    expect(validateDisc({ ...DISCS[0], distance: 0 })).toContain("Disc distance must be greater than zero.");
    expect(validateHoleConfig({ ...HOLE_1, puttingRange: HOLE_1.tapInRange })).toContain(
      "Putting range must be greater than tap-in range.",
    );
  });
});
