import { getDiscById } from "./data";
import type { Character, Disc, HoleConfig, HoleState, ShotInput, ShotResult, Vector2, Wind } from "./types";

const DEG_TO_RAD = Math.PI / 180;
const BASKET_CATCH_RADIUS = 8;

export function createInitialHoleState(hole: HoleConfig): HoleState {
  return {
    lie: { ...hole.tee },
    strokes: 0,
    complete: false,
    penaltyStrokes: 0,
  };
}

export function calculateShot(
  state: HoleState,
  character: Character,
  hole: HoleConfig,
  wind: Wind,
  input: ShotInput,
): ShotResult {
  if (state.complete) {
    throw new Error("Cannot throw after the hole is complete.");
  }

  const disc = getDiscById(input.disc);
  const start = { ...state.lie };
  const power = clamp(input.power, 0, 1);
  const aim = unitFromDegrees(input.aimDegrees);
  const right = { x: -aim.y, y: aim.x };
  const windVector = unitFromDegrees(wind.directionDegrees);
  const windStrength = Math.max(0, wind.strength);
  const tailWind = dot(windVector, aim) * windStrength;
  const crossWind = dot(windVector, right) * windStrength;
  const windHandling = (character.stats.windRead + disc.windResistance) / 10;
  const control = (character.stats.accuracy + disc.control) / 10;
  const distance =
    disc.distance *
    (0.35 + power * 0.75) *
    statMultiplier(character.stats.power, 0.08) *
    (1 + tailWind * 0.035 * (1 - windHandling * 0.55));
  const curve =
    releaseCurve(input.releaseAngle, character.stats.spin, disc) +
    crossWind * 9 * (1 - windHandling * 0.55) +
    (1 - control) * releaseBias(input.releaseAngle) * 5;
  const landing = {
    x: start.x + aim.x * distance + right.x * curve,
    y: start.y + aim.y * distance + right.y * curve,
  };
  const inBounds = isPointInBounds(landing, hole);

  return {
    start,
    flightLanding: landing,
    landing: inBounds ? landing : { ...hole.reliefPoint },
    distance: distanceBetween(start, landing),
    curve,
    inBounds,
    reliefApplied: !inBounds,
    penaltyStroke: inBounds ? 0 : 1,
  };
}

export function applyShotResult(state: HoleState, hole: HoleConfig, result: ShotResult): HoleState {
  if (state.complete) {
    return state;
  }

  const landing = result.reliefApplied ? hole.reliefPoint : result.landing;
  const throwHoledOut = !result.reliefApplied && distanceBetween(landing, hole.basket) <= BASKET_CATCH_RADIUS;

  return {
    lie: throwHoledOut ? { ...hole.basket } : { ...landing },
    strokes: state.strokes + 1 + result.penaltyStroke,
    complete: throwHoledOut,
    penaltyStrokes: state.penaltyStrokes + result.penaltyStroke,
  };
}

export function applyTapIn(state: HoleState, hole: HoleConfig): HoleState {
  if (state.complete || !isTapInAvailable(state, hole)) {
    return state;
  }

  return {
    lie: { ...hole.basket },
    strokes: state.strokes + 1,
    complete: true,
    penaltyStrokes: state.penaltyStrokes,
  };
}

export function isTapInAvailable(state: HoleState, hole: HoleConfig): boolean {
  return !state.complete && distanceBetween(state.lie, hole.basket) <= hole.tapInRange;
}

export function isPuttingAvailable(state: HoleState, hole: HoleConfig): boolean {
  return !state.complete && distanceBetween(state.lie, hole.basket) <= hole.puttingRange;
}

export function scoreRelativeToPar(state: HoleState, hole: HoleConfig): number {
  return state.strokes - hole.par;
}

export function isPointInBounds(point: Vector2, hole: HoleConfig): boolean {
  return (
    point.x >= hole.bounds.x &&
    point.x <= hole.bounds.x + hole.bounds.width &&
    point.y >= hole.bounds.y &&
    point.y <= hole.bounds.y + hole.bounds.height
  );
}

export function distanceBetween(a: Vector2, b: Vector2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function releaseCurve(releaseAngle: ShotInput["releaseAngle"], spin: number, disc: Disc): number {
  const shape = releaseBias(releaseAngle);
  const spinShape = statMultiplier(spin, 0.1);
  const discFade = 1 + (3 - disc.stability) * 0.14;

  return shape * 24 * spinShape * discFade;
}

function releaseBias(releaseAngle: ShotInput["releaseAngle"]): number {
  if (releaseAngle === "hyzer") return 1;
  if (releaseAngle === "anhyzer") return -1;
  return 0;
}

function statMultiplier(stat: number, step: number): number {
  return 1 + (stat - 3) * step;
}

function unitFromDegrees(degrees: number): Vector2 {
  const radians = degrees * DEG_TO_RAD;

  return {
    x: Math.cos(radians),
    y: Math.sin(radians),
  };
}

function dot(a: Vector2, b: Vector2): number {
  return a.x * b.x + a.y * b.y;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
