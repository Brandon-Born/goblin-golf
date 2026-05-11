import { vi } from "vitest";
import { CHARACTERS, HOLE_1 } from "../../src/game/data";
import { GameSession } from "../../src/game/GameSession";

vi.mock("phaser", () => ({
  default: {
    Math: {
      Clamp: (value: number, min: number, max: number) => Math.min(max, Math.max(min, value)),
    },
  },
}));

describe("game session putting flow", () => {
  it("resolves automatic tap-ins through the session putt action", () => {
    const session = new GameSession();
    session.holeState = {
      lie: { x: HOLE_1.basket.x, y: HOLE_1.basket.y + HOLE_1.tapInRange },
      strokes: 2,
      complete: false,
      penaltyStrokes: 0,
    };

    const result = session.putt({ aimOffset: { x: 100, y: 100 }, power: 0 });

    expect(result).toEqual({
      made: true,
      autoTapIn: true,
      landing: HOLE_1.basket,
      strokesAdded: 1,
    });
    expect(session.holeState).toEqual({
      lie: HOLE_1.basket,
      strokes: 3,
      complete: true,
      penaltyStrokes: 0,
    });
  });

  it("uses putting and wind-read stats for manual putt forgiveness", () => {
    const controlSpecialist = new GameSession();
    controlSpecialist.selectCharacter(CHARACTERS[1].id);
    controlSpecialist.holeState = {
      lie: { x: HOLE_1.basket.x, y: HOLE_1.basket.y + HOLE_1.tapInRange + 1 },
      strokes: 2,
      complete: false,
      penaltyStrokes: 0,
    };

    const powerThrower = new GameSession();
    powerThrower.selectCharacter(CHARACTERS[2].id);
    powerThrower.holeState = { ...controlSpecialist.holeState, lie: { ...controlSpecialist.holeState.lie } };

    const input = { aimOffset: { x: 26, y: 0 }, power: 0.38 };

    expect(controlSpecialist.putt(input).made).toBe(true);
    expect(powerThrower.putt(input).made).toBe(false);
  });

  it("isolates putting stat from wind read when resolving manual putts", () => {
    const strongPutter = new GameSession();
    strongPutter.selectedCharacter = {
      ...CHARACTERS[0],
      stats: { ...CHARACTERS[0].stats, putting: 5, windRead: 3 },
    };
    strongPutter.holeState = {
      lie: { x: HOLE_1.basket.x, y: HOLE_1.basket.y + 45 },
      strokes: 2,
      complete: false,
      penaltyStrokes: 0,
    };

    const weakPutter = new GameSession();
    weakPutter.selectedCharacter = {
      ...CHARACTERS[0],
      stats: { ...CHARACTERS[0].stats, putting: 1, windRead: 3 },
    };
    weakPutter.holeState = { ...strongPutter.holeState, lie: { ...strongPutter.holeState.lie } };

    const input = { aimOffset: { x: 34, y: 0 }, power: 0.5 };

    expect(strongPutter.putt(input).made).toBe(true);
    expect(weakPutter.putt(input).made).toBe(false);
  });

  it("isolates wind-read stat from putting when resolving long putts", () => {
    const windReader = new GameSession();
    windReader.selectedCharacter = {
      ...CHARACTERS[0],
      stats: { ...CHARACTERS[0].stats, putting: 3, windRead: 5 },
    };
    windReader.holeState = {
      lie: { x: HOLE_1.basket.x, y: HOLE_1.basket.y + HOLE_1.puttingRange },
      strokes: 2,
      complete: false,
      penaltyStrokes: 0,
    };

    const poorWindReader = new GameSession();
    poorWindReader.selectedCharacter = {
      ...CHARACTERS[0],
      stats: { ...CHARACTERS[0].stats, putting: 3, windRead: 1 },
    };
    poorWindReader.holeState = { ...windReader.holeState, lie: { ...windReader.holeState.lie } };

    const input = { aimOffset: { x: 26.5, y: 0 }, power: 0.95 };

    expect(windReader.putt(input).made).toBe(true);
    expect(poorWindReader.putt(input).made).toBe(false);
  });

  it("scales wind effect with putt distance", () => {
    const nearPutt = new GameSession();
    nearPutt.holeState = {
      lie: { x: HOLE_1.basket.x, y: HOLE_1.basket.y + HOLE_1.tapInRange + 1 },
      strokes: 2,
      complete: false,
      penaltyStrokes: 0,
    };

    const longPutt = new GameSession();
    longPutt.holeState = {
      lie: { x: HOLE_1.basket.x, y: HOLE_1.basket.y + HOLE_1.puttingRange },
      strokes: 2,
      complete: false,
      penaltyStrokes: 0,
    };

    const aimNearForgivenessLimit = { x: 27.5, y: 0 };

    expect(nearPutt.putt({ aimOffset: aimNearForgivenessLimit, power: 0.38 }).made).toBe(true);
    expect(longPutt.putt({ aimOffset: aimNearForgivenessLimit, power: 0.95 }).made).toBe(false);
  });
});
