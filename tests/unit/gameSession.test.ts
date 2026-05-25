import { vi } from "vitest";
import { CHARACTERS, HOLE_1, HOLES } from "../../src/game/data";
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
      lieQuality: "fairway",
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

  it("returns no missReason on a made putt", () => {
    const session = new GameSession();
    session.holeState = {
      lie: { x: HOLE_1.basket.x, y: HOLE_1.basket.y + 40 },
      strokes: 2,
      complete: false,
      penaltyStrokes: 0,
    };
    const result = session.putt({ aimOffset: { x: 0, y: 0 }, power: 0.5 });

    expect(result.made).toBe(true);
    expect(result.missReason).toBeUndefined();
  });

  it("returns missReason 'wide right' when crosshair is right of basket", () => {
    const session = new GameSession();
    session.holeState = {
      lie: { x: HOLE_1.basket.x, y: HOLE_1.basket.y + 40 },
      strokes: 2,
      complete: false,
      penaltyStrokes: 0,
    };
    const result = session.putt({ aimOffset: { x: 60, y: 0 }, power: 0.5 });

    expect(result.made).toBe(false);
    expect(result.missReason).toBe("wide right");
  });

  it("returns missReason 'wide left' when crosshair is left of basket", () => {
    const session = new GameSession();
    session.holeState = {
      lie: { x: HOLE_1.basket.x, y: HOLE_1.basket.y + 40 },
      strokes: 2,
      complete: false,
      penaltyStrokes: 0,
    };
    const result = session.putt({ aimOffset: { x: -60, y: 0 }, power: 0.5 });

    expect(result.made).toBe(false);
    expect(result.missReason).toBe("wide left");
  });

  it("returns missReason 'short on power' for too-soft a putt", () => {
    const session = new GameSession();
    session.holeState = {
      lie: { x: HOLE_1.basket.x, y: HOLE_1.basket.y + 80 },
      strokes: 2,
      complete: false,
      penaltyStrokes: 0,
    };
    // idealPower = clamp(80/90, 0.38, 0.95) ≈ 0.889; power=0.25 → powerError=0.64 > 0.18
    const result = session.putt({ aimOffset: { x: 0, y: 0 }, power: 0.25 });

    expect(result.made).toBe(false);
    expect(result.missReason).toBe("short on power");
  });

  it("returns missReason 'sailed long' for too-hard a putt", () => {
    const session = new GameSession();
    session.holeState = {
      lie: { x: HOLE_1.basket.x, y: HOLE_1.basket.y + 30 },
      strokes: 2,
      complete: false,
      penaltyStrokes: 0,
    };
    // idealPower = clamp(30/90, 0.38, 0.95) = 0.38; power=0.95 → powerError=0.57 > 0.18
    const result = session.putt({ aimOffset: { x: 0, y: 0 }, power: 0.95 });

    expect(result.made).toBe(false);
    expect(result.missReason).toBe("sailed long");
  });
});

// Helper for the course-progression tests below: mark the current hole complete
// with a chosen stroke count, then advance.
function completeHoleWithStrokes(session: GameSession, strokes: number) {
  session.holeState = {
    ...session.holeState,
    strokes,
    complete: true,
    lie: { ...session.hole.basket },
  };
  return session.advanceHole();
}

describe("game session course progression", () => {
  it("starts on hole 1 with an empty scorecard", () => {
    const session = new GameSession();
    expect(session.currentHoleIndex).toBe(0);
    expect(session.hole.id).toBe(HOLES[0].id);
    expect(session.holeScores).toEqual([]);
    expect(session.courseComplete).toBe(false);
    expect(session.isLastHole).toBe(false);
  });

  it("advanceHole pushes the score and moves to the next hole's tee", () => {
    const session = new GameSession();
    const stillMoreHoles = completeHoleWithStrokes(session, 4);

    expect(stillMoreHoles).toBe(true);
    expect(session.currentHoleIndex).toBe(1);
    expect(session.hole.id).toBe(HOLES[1].id);
    expect(session.holeScores).toHaveLength(1);
    expect(session.holeScores[0]).toMatchObject({
      holeId: HOLES[0].id,
      par: HOLES[0].par,
      strokes: 4,
      relative: 4 - HOLES[0].par,
    });
    // After advance the new hole's state is fresh
    expect(session.holeState.strokes).toBe(0);
    expect(session.holeState.complete).toBe(false);
    expect(session.holeState.lie).toEqual(HOLES[1].tee);
  });

  it("advanceHole throws if the current hole is not yet complete", () => {
    const session = new GameSession();
    expect(() => session.advanceHole()).toThrow(/not complete/i);
  });

  it("course completes after the 9th hole and totals are accurate", () => {
    const session = new GameSession();
    const strokes = [3, 4, 3, 3, 5, 4, 5, 3, 6];
    let lastReturn = true;
    for (const s of strokes) lastReturn = completeHoleWithStrokes(session, s);

    expect(lastReturn).toBe(false);
    expect(session.courseComplete).toBe(true);
    expect(session.holeScores).toHaveLength(HOLES.length);
    expect(session.totalStrokes).toBe(strokes.reduce((a, b) => a + b, 0));
    expect(session.totalPar).toBe(HOLES.reduce((sum, h) => sum + h.par, 0));
    expect(session.totalRelative).toBe(session.totalStrokes - session.totalPar);
  });

  it("resetCourse returns the session to hole 1 with a fresh scorecard", () => {
    const session = new GameSession();
    completeHoleWithStrokes(session, 5);
    completeHoleWithStrokes(session, 4);
    expect(session.currentHoleIndex).toBe(2);

    session.resetCourse();
    expect(session.currentHoleIndex).toBe(0);
    expect(session.holeScores).toEqual([]);
    expect(session.courseComplete).toBe(false);
    expect(session.holeState.lie).toEqual(HOLES[0].tee);
  });

  it("selectCharacter resets the entire course, not just the current hole", () => {
    const session = new GameSession();
    completeHoleWithStrokes(session, 4);
    expect(session.currentHoleIndex).toBe(1);

    session.selectCharacter(CHARACTERS[2].id);
    expect(session.currentHoleIndex).toBe(0);
    expect(session.holeScores).toEqual([]);
    expect(session.selectedCharacter.id).toBe(CHARACTERS[2].id);
  });

  it("totalScoreLabel reports +/- relative to par across all played holes", () => {
    const session = new GameSession();
    // Every hole at par exactly → "Even"
    for (const hole of HOLES) {
      session.holeState = { ...session.holeState, strokes: hole.par, complete: true, lie: { ...hole.basket } };
      session.advanceHole();
    }
    expect(session.totalRelative).toBe(0);
    expect(session.totalScoreLabel()).toBe("Even");
  });
});
