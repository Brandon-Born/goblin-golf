import { CHARACTERS, HOLE_1 } from "../../src/game/data";
import {
  applyShotResult,
  applyTapIn,
  calculateShot,
  createInitialHoleState,
  distanceBetween,
  isPuttingAvailable,
  isPointInBounds,
  isTapInAvailable,
  scoreRelativeToPar,
} from "../../src/game/logic";
import type { HoleState, ShotInput, Wind } from "../../src/game/types";

const calm: Wind = { directionDegrees: 0, strength: 0 };
const straightNorth: ShotInput = {
  aimDegrees: -90,
  power: 1,
  releaseAngle: "flat",
  disc: "driver",
};

describe("deterministic game logic", () => {
  it("starts hole 1 at the tee with no score", () => {
    expect(createInitialHoleState(HOLE_1)).toEqual({
      lie: HOLE_1.tee,
      strokes: 0,
      complete: false,
      penaltyStrokes: 0,
    });
  });

  it("calculates repeatable shots from the same inputs", () => {
    const state = createInitialHoleState(HOLE_1);
    const first = calculateShot(state, CHARACTERS[0], HOLE_1, calm, straightNorth);
    const second = calculateShot(state, CHARACTERS[0], HOLE_1, calm, straightNorth);

    expect(second).toEqual(first);
  });

  it("uses character power and disc type to change distance", () => {
    const state = createInitialHoleState(HOLE_1);
    const gribDrive = calculateShot(state, CHARACTERS[0], HOLE_1, calm, straightNorth);
    const skrakDrive = calculateShot(state, CHARACTERS[2], HOLE_1, calm, straightNorth);
    const gribPutter = calculateShot(state, CHARACTERS[0], HOLE_1, calm, { ...straightNorth, disc: "putter" });

    expect(skrakDrive.distance).toBeGreaterThan(gribDrive.distance);
    expect(gribDrive.distance).toBeGreaterThan(gribPutter.distance);
  });

  it("uses release angle and wind to shape lateral flight", () => {
    const state = createInitialHoleState(HOLE_1);
    const hyzer = calculateShot(state, CHARACTERS[0], HOLE_1, calm, { ...straightNorth, releaseAngle: "hyzer" });
    const anhyzer = calculateShot(state, CHARACTERS[0], HOLE_1, calm, { ...straightNorth, releaseAngle: "anhyzer" });
    const crosswind = calculateShot(state, CHARACTERS[0], HOLE_1, { directionDegrees: 0, strength: 3 }, straightNorth);

    expect(hyzer.curve).toBeGreaterThan(0);
    expect(anhyzer.curve).toBeLessThan(0);
    expect(crosswind.landing.x).toBeGreaterThan(hyzer.start.x);
  });

  it("adds a stroke, OB penalty, and relief lie for out-of-bounds throws", () => {
    const state = createInitialHoleState(HOLE_1);
    const result = calculateShot(state, CHARACTERS[0], HOLE_1, calm, {
      aimDegrees: 0,
      power: 1,
      releaseAngle: "flat",
      disc: "driver",
    });
    const nextState = applyShotResult(state, HOLE_1, result);

    expect(result.inBounds).toBe(false);
    expect(result.reliefApplied).toBe(true);
    expect(result.flightLanding).not.toEqual(HOLE_1.reliefPoint);
    expect(result.landing).toEqual(HOLE_1.reliefPoint);
    expect(nextState.lie).toEqual(HOLE_1.reliefPoint);
    expect(nextState.strokes).toBe(2);
    expect(nextState.penaltyStrokes).toBe(1);
  });

  it("keeps OB relief in bounds, incomplete, and playable for the next throw", () => {
    const state = createInitialHoleState(HOLE_1);
    const obResult = calculateShot(state, CHARACTERS[0], HOLE_1, calm, {
      aimDegrees: 0,
      power: 1,
      releaseAngle: "flat",
      disc: "driver",
    });
    const relieved = applyShotResult(state, HOLE_1, obResult);
    const recovery = calculateShot(relieved, CHARACTERS[0], HOLE_1, calm, {
      ...straightNorth,
      power: 0.5,
      disc: "midrange",
    });

    expect(isPointInBounds(relieved.lie, HOLE_1)).toBe(true);
    expect(relieved.complete).toBe(false);
    expect(recovery.start).toEqual(HOLE_1.reliefPoint);
    expect(recovery.distance).toBeGreaterThan(0);
  });

  it("completes the hole with an automatic tap-in when close enough", () => {
    const state: HoleState = {
      lie: { x: HOLE_1.basket.x, y: HOLE_1.basket.y + HOLE_1.tapInRange },
      strokes: 2,
      complete: false,
      penaltyStrokes: 0,
    };
    const completed = applyTapIn(state, HOLE_1);

    expect(isTapInAvailable(state, HOLE_1)).toBe(true);
    expect(completed.complete).toBe(true);
    expect(completed.lie).toEqual(HOLE_1.basket);
    expect(completed.strokes).toBe(3);
    expect(scoreRelativeToPar(completed, HOLE_1)).toBe(0);
  });

  it("does not grant tap-ins outside range or after completion", () => {
    const outsideRange: HoleState = {
      lie: { x: HOLE_1.basket.x, y: HOLE_1.basket.y + HOLE_1.tapInRange + 0.1 },
      strokes: 2,
      complete: false,
      penaltyStrokes: 0,
    };
    const completeState: HoleState = {
      lie: { ...HOLE_1.basket },
      strokes: 2,
      complete: true,
      penaltyStrokes: 0,
    };

    expect(distanceBetween(outsideRange.lie, HOLE_1.basket)).toBeGreaterThan(HOLE_1.tapInRange);
    expect(isTapInAvailable(outsideRange, HOLE_1)).toBe(false);
    expect(applyTapIn(outsideRange, HOLE_1)).toBe(outsideRange);
    expect(isTapInAvailable(completeState, HOLE_1)).toBe(false);
    expect(applyTapIn(completeState, HOLE_1)).toBe(completeState);
  });

  it("exposes putting range before tap-in range", () => {
    const state: HoleState = {
      lie: { x: HOLE_1.basket.x, y: HOLE_1.basket.y + HOLE_1.puttingRange - 1 },
      strokes: 1,
      complete: false,
      penaltyStrokes: 0,
    };

    expect(isPuttingAvailable(state, HOLE_1)).toBe(true);
    expect(isTapInAvailable(state, HOLE_1)).toBe(false);
  });
});
