import { CHARACTERS, HOLE_1 } from "../../src/game/data";
import {
  applyShotResult,
  applyTapIn,
  calculateRouteWind,
  calculateShot,
  calculateShotForecast,
  createInitialHoleState,
  distanceBetween,
  isPuttingAvailable,
  isPointInBounds,
  isTapInAvailable,
  sampleRouteWindZones,
  scoreRelativeToPar,
} from "../../src/game/logic";
import type { HoleState, ShotForecast, ShotInput, Wind } from "../../src/game/types";

const calm: Wind = { directionDegrees: 0, strength: 0 };
const straightNorth: ShotInput = {
  aimDegrees: -90,
  power: 1,
  releaseAngle: "flat",
  disc: "driver",
};

function aimDegreesToward(from: HoleState["lie"], to: HoleState["lie"]) {
  return (Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI;
}

function landingRadius(forecast: ShotForecast) {
  expect(forecast.landingZone.radiusX).toEqual(expect.any(Number));
  expect(forecast.landingZone.radiusY).toEqual(expect.any(Number));
  expect(forecast.landingZone.radiusX).toBeGreaterThan(0);
  expect(forecast.landingZone.radiusY).toBeGreaterThan(0);

  return Math.hypot(forecast.landingZone.radiusX, forecast.landingZone.radiusY);
}

describe("deterministic game logic", () => {
  it("starts hole 1 at the tee with no score", () => {
    expect(createInitialHoleState(HOLE_1)).toEqual({
      lie: HOLE_1.tee,
      lieQuality: "fairway",
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

  it("exposes forecast uncertainty for every previewed throw", () => {
    const state = createInitialHoleState(HOLE_1);
    const forecast = calculateShotForecast(state, CHARACTERS[0], HOLE_1, calm, straightNorth);

    expect(forecast).toEqual(
      expect.objectContaining({
        landingZone: expect.objectContaining({
          radiusX: expect.any(Number),
          radiusY: expect.any(Number),
        }),
        confidence: expect.stringMatching(/^(high|medium|low)$/),
      }),
    );
  });

  it("increases forecast uncertainty for high-power shots", () => {
    const state = createInitialHoleState(HOLE_1);
    const controlledPower = calculateShotForecast(state, CHARACTERS[0], HOLE_1, calm, {
      ...straightNorth,
      power: 0.45,
    });
    const fullPower = calculateShotForecast(state, CHARACTERS[0], HOLE_1, calm, {
      ...straightNorth,
      power: 1,
    });

    expect(landingRadius(fullPower)).toBeGreaterThan(landingRadius(controlledPower));
  });

  it("uses disc control when forecasting landing uncertainty", () => {
    const state = createInitialHoleState(HOLE_1);
    const driver = calculateShotForecast(state, CHARACTERS[0], HOLE_1, calm, {
      ...straightNorth,
      power: 0.65,
      disc: "driver",
    });
    const putter = calculateShotForecast(state, CHARACTERS[0], HOLE_1, calm, {
      ...straightNorth,
      power: 0.65,
      disc: "putter",
    });

    expect(landingRadius(driver)).toBeGreaterThan(landingRadius(putter));
  });

  it("uses lie quality when forecasting and resolving shots", () => {
    const cleanState = {
      ...createInitialHoleState(HOLE_1),
      lieQuality: "fairway",
    } satisfies HoleState;
    const roughState = {
      ...createInitialHoleState(HOLE_1),
      lieQuality: "rough",
    } satisfies HoleState;
    const input: ShotInput = {
      ...straightNorth,
      power: 0.78,
      disc: "midrange",
    };

    const cleanResult = calculateShot(cleanState, CHARACTERS[0], HOLE_1, calm, input);
    const roughResult = calculateShot(roughState, CHARACTERS[0], HOLE_1, calm, input);
    const cleanForecast = calculateShotForecast(cleanState, CHARACTERS[0], HOLE_1, calm, input);
    const roughForecast = calculateShotForecast(roughState, CHARACTERS[0], HOLE_1, calm, input);

    expect(roughResult.distance).toBeLessThan(cleanResult.distance);
    expect(landingRadius(roughForecast)).toBeGreaterThan(landingRadius(cleanForecast));
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

  it("samples spatial wind zones along the selected route", () => {
    const state = createInitialHoleState(HOLE_1);
    const straightForecast = calculateShotForecast(state, CHARACTERS[0], HOLE_1, calm, {
      ...straightNorth,
      power: 0.75,
      disc: "midrange",
    });
    const rightLaneForecast = calculateShotForecast(state, CHARACTERS[0], HOLE_1, calm, {
      ...straightNorth,
      aimDegrees: -72,
      power: 0.85,
      disc: "driver",
    });

    expect(straightForecast.routeWindZones).toContain("left-tailwind");
    expect(straightForecast.routeWind.strength).toBeGreaterThan(0);
    expect(rightLaneForecast.routeWindZones).toContain("right-crosswind");
    expect(rightLaneForecast.routeWind.directionDegrees).not.toBe(straightForecast.routeWind.directionDegrees);
  });

  it("combines route wind deterministically from sampled wind lanes", () => {
    const zones = sampleRouteWindZones(HOLE_1.tee, { x: 0, y: -1 }, 500, HOLE_1);
    const routeWind = calculateRouteWind(HOLE_1.tee, { x: 0, y: -1 }, 500, HOLE_1, calm);

    expect(zones).toContain("left-tailwind");
    expect(routeWind.strength).toBeGreaterThan(0);
    expect(calculateRouteWind(HOLE_1.tee, { x: 0, y: -1 }, 500, HOLE_1, calm)).toEqual(routeWind);
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
    expect(result.landing).not.toEqual(HOLE_1.reliefPoint);
    expect(nextState.lie).toEqual(result.landing);
    expect(isPointInBounds(nextState.lie, HOLE_1)).toBe(true);
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
    expect(recovery.start).toEqual(obResult.landing);
    expect(recovery.distance).toBeGreaterThan(0);
  });

  it("allows a recovery shot back toward the basket from a lie past and offset from the target", () => {
    const recoveryHole = {
      ...HOLE_1,
      bounds: {
        x: HOLE_1.basket.x - 320,
        y: HOLE_1.basket.y - 320,
        width: 640,
        height: 640,
      },
    };
    const state: HoleState = {
      lie: { x: HOLE_1.basket.x + 70, y: HOLE_1.basket.y - 140 },
      strokes: 2,
      complete: false,
      penaltyStrokes: 0,
    };
    const startingDistance = distanceBetween(state.lie, recoveryHole.basket);
    const result = calculateShot(state, CHARACTERS[1], recoveryHole, calm, {
      aimDegrees: aimDegreesToward(state.lie, recoveryHole.basket),
      power: 0.25,
      releaseAngle: "flat",
      disc: "putter",
    });
    const nextState = applyShotResult(state, recoveryHole, result);

    expect(result.inBounds).toBe(true);
    expect(result.reliefApplied).toBe(false);
    expect(result.landing.x).toBeLessThan(state.lie.x);
    expect(result.landing.y).toBeGreaterThan(state.lie.y);
    expect(distanceBetween(nextState.lie, recoveryHole.basket)).toBeLessThan(startingDistance);
    expect(nextState.complete).toBe(false);
  });

  it("does not treat an OB flight near the basket as a made shot after relief", () => {
    const state = createInitialHoleState(HOLE_1);
    const relieved = applyShotResult(state, HOLE_1, {
      start: HOLE_1.tee,
      flightLanding: { ...HOLE_1.basket },
      landing: { x: HOLE_1.basket.x + 20, y: HOLE_1.basket.y },
      distance: distanceBetween(HOLE_1.tee, HOLE_1.basket),
      curve: 0,
      inBounds: false,
      reliefApplied: true,
      penaltyStroke: 1,
      startLieQuality: "fairway",
      lieQuality: "relief",
      requestedPower: 1,
      effectivePower: 1,
      routeWind: calm,
      routeWindZones: [],
    });

    expect(relieved.lie).not.toEqual(HOLE_1.basket);
    expect(relieved.complete).toBe(false);
    expect(relieved.strokes).toBe(2);
    expect(relieved.penaltyStrokes).toBe(1);
    expect(distanceBetween(relieved.lie, HOLE_1.basket)).toBeGreaterThan(0);
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
