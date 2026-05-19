import { ANGLE_DIAL_DEGREES, POWER_DIAL, PUTT_AIM_DIAL_PX, PUTT_POWER_DIAL, WIND_CLARITY_DIAL, getDiscById } from "./data";
import type {
  Character,
  DieValue,
  Disc,
  DiscType,
  HoleConfig,
  HoleState,
  LieQuality,
  PuttDiceAssignment,
  PuttInput,
  ReleaseAngle,
  ShotDiceAssignment,
  ShotForecast,
  ShotInput,
  ShotResult,
  Vector2,
  Wind,
} from "./types";

const DEG_TO_RAD = Math.PI / 180;
const BASKET_CATCH_RADIUS = 8;
const RELIEF_MARGIN = 6;

export function rollDice(count: number, rng: () => number = Math.random): DieValue[] {
  return Array.from({ length: count }, () => (Math.floor(rng() * 6) + 1) as DieValue);
}

export function diceToShotInput(
  assignment: ShotDiceAssignment,
  basketBearingDegrees: number,
  disc: DiscType,
  releaseAngle: ReleaseAngle,
): ShotInput {
  const angleOffset = ANGLE_DIAL_DEGREES[assignment.angleDie - 1];
  const raw = basketBearingDegrees + angleOffset;
  const aimDegrees = ((raw % 360) + 360) % 360;
  return {
    aimDegrees,
    power: POWER_DIAL[assignment.powerDie - 1],
    disc,
    releaseAngle,
  };
}

export function diceToPuttInput(assignment: PuttDiceAssignment): PuttInput {
  return {
    aimOffset: { x: PUTT_AIM_DIAL_PX[assignment.aimDie - 1], y: 0 },
    power: PUTT_POWER_DIAL[assignment.powerDie - 1],
  };
}

export function windClarityFromDie(dieValue: DieValue): number {
  return WIND_CLARITY_DIAL[dieValue - 1];
}

export function createInitialHoleState(hole: HoleConfig): HoleState {
  return {
    lie: { ...hole.tee },
    lieQuality: "fairway",
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

  const shot = resolveShotPhysics(state, character, hole, wind, input);
  const inBounds = isPointInBounds(shot.landing, hole);
  const finalLie = inBounds ? shot.landing : resolveReliefLie(shot.landing, hole);

  return {
    start: shot.start,
    flightLanding: shot.landing,
    landing: finalLie,
    distance: distanceBetween(shot.start, shot.landing),
    curve: shot.curve,
    inBounds,
    reliefApplied: !inBounds,
    penaltyStroke: inBounds ? 0 : 1,
    startLieQuality: shot.startLieQuality,
    lieQuality: inBounds ? getLieQuality(finalLie, hole) : "relief",
    requestedPower: shot.requestedPower,
    effectivePower: shot.effectivePower,
    routeWind: shot.routeWind,
    routeWindZones: shot.routeWindZones,
  };
}

export function calculateShotForecast(
  state: HoleState,
  character: Character,
  hole: HoleConfig,
  wind: Wind,
  input: ShotInput,
): ShotForecast {
  if (state.complete) {
    throw new Error("Cannot preview after the hole is complete.");
  }

  const shot = resolveShotPhysics(state, character, hole, wind, input);
  const disc = getDiscById(input.disc);
  const lieQuality = getStateLieQuality(state, hole);
  const lie = lieModifiers(lieQuality);
  const inBounds = isPointInBounds(shot.landing, hole);
  const likelyLie = inBounds ? shot.landing : resolveReliefLie(shot.landing, hole);
  const control = (character.stats.accuracy + disc.control) / 10;
  const windHandling = (character.stats.windRead + disc.windResistance) / 10;
  const powerPressure = clamp(
    (shot.effectivePower - lie.controlledPower) / Math.max(0.01, lie.maxPower - lie.controlledPower),
    0,
    1,
  );
  const windPressure = Math.max(0, shot.routeWind.strength) * (1 - windHandling * 0.46);
  const fadePressure = Math.abs(shot.curve) * 0.18 + Math.abs(3 - disc.stability) * 2.2;
  const distancePressure = Math.max(40, shot.distance) / 100;
  const forwardRadius =
    (6 + distancePressure * 3.5 + shot.effectivePower * 16 * (1 - control * 0.55) + windPressure * 4.5) *
    lie.forecastMultiplier *
    (1 + powerPressure * 0.7);
  const lateralRadius =
    (8 + distancePressure * 4.5 + (1 - control) * 32 + windPressure * 5.5 + fadePressure) *
    lie.forecastMultiplier *
    (1 + powerPressure * 0.55);
  const radius = Math.hypot(forwardRadius, lateralRadius);
  const basketDistance = distanceBetween(likelyLie, hole.basket);

  return {
    start: shot.start,
    likelyLanding: { ...shot.landing },
    likelyLie: { ...likelyLie },
    likelyDistance: shot.distance,
    likelyCurve: shot.curve,
    inBoundsLikely: inBounds,
    reliefLikely: !inBounds,
    startLieQuality: lieQuality,
    likelyLieQuality: inBounds ? getLieQuality(likelyLie, hole) : "relief",
    requestedPower: shot.requestedPower,
    effectivePower: shot.effectivePower,
    maxPower: lie.maxPower,
    controlledPower: lie.controlledPower,
    routeWind: shot.routeWind,
    routeWindZones: shot.routeWindZones,
    landingZone: {
      center: { ...shot.landing },
      radiusX: Math.max(12, lateralRadius),
      radiusY: Math.max(10, forwardRadius),
      rotationDegrees: input.aimDegrees,
    },
    pathReveal: clamp(0.86 - radius / 180, 0.48, 0.78),
    confidence: radius < 44 ? "high" : radius < 74 ? "medium" : "low",
    risk: !inBounds
      ? "ob-risk"
      : basketDistance <= hole.tapInRange
        ? "tap-in"
        : basketDistance <= hole.puttingRange
          ? "putt"
          : "safe",
  };
}

export function applyShotResult(state: HoleState, hole: HoleConfig, result: ShotResult): HoleState {
  if (state.complete) {
    return state;
  }

  const landing = result.landing;
  const throwHoledOut = !result.reliefApplied && distanceBetween(landing, hole.basket) <= BASKET_CATCH_RADIUS;

  return {
    lie: throwHoledOut ? { ...hole.basket } : { ...landing },
    lieQuality: throwHoledOut ? "fairway" : result.lieQuality,
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
    lieQuality: "fairway",
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

export function getStateLieQuality(state: HoleState, hole: HoleConfig): LieQuality {
  return state.lieQuality ?? getLieQuality(state.lie, hole);
}

export function getLieQuality(lie: Vector2, hole: HoleConfig): LieQuality {
  if (!isPointInBounds(lie, hole)) {
    return "relief";
  }

  const top = hole.bounds.y;
  const bottom = hole.bounds.y + hole.bounds.height;
  const centerY = hole.bounds.y + hole.bounds.height / 2;
  const fairwayHalfHeight = hole.bounds.height * 0.28;
  const edgeBuffer = hole.bounds.height * 0.16;

  if (
    isInZone(lie, hole.bounds.x + 172, centerY - 144, 90, 80) ||
    isInZone(lie, hole.bounds.x + 352, centerY + 70, 100, 68) ||
    isInZone(lie, hole.bounds.x + 552, centerY - 144, 90, 80)
  ) {
    return "scramble";
  }

  if (
    Math.abs(lie.y - centerY) <= fairwayHalfHeight &&
    lie.y > top + edgeBuffer &&
    lie.y < bottom - edgeBuffer
  ) {
    return "fairway";
  }

  return "rough";
}

export function distanceBetween(a: Vector2, b: Vector2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function resolveShotPhysics(
  state: HoleState,
  character: Character,
  hole: HoleConfig,
  wind: Wind,
  input: ShotInput,
) {
  const start = { ...state.lie };
  const disc = getDiscById(input.disc);
  const startLieQuality = getStateLieQuality(state, hole);
  const lie = lieModifiers(startLieQuality);
  const requestedPower = clamp(input.power, 0, 1);
  const effectivePower = Math.min(requestedPower, lie.maxPower);
  const aim = unitFromDegrees(input.aimDegrees);
  const right = { x: -aim.y, y: aim.x };
  const baseDistance =
    disc.distance * (0.35 + effectivePower * 0.75) * lie.powerMultiplier * statMultiplier(character.stats.power, 0.08);
  const routeWind = calculateRouteWind(start, aim, baseDistance, hole, wind);
  const windVector = unitFromDegrees(routeWind.directionDegrees);
  const windStrength = Math.max(0, routeWind.strength);
  const tailWind = dot(windVector, aim) * windStrength;
  const crossWind = dot(windVector, right) * windStrength;
  const windHandling = (character.stats.windRead + disc.windResistance) / 10;
  const control = (character.stats.accuracy + disc.control) / 10;
  const distance =
    disc.distance *
    (0.35 + effectivePower * 0.75) *
    lie.powerMultiplier *
    statMultiplier(character.stats.power, 0.08) *
    (1 + tailWind * 0.035 * (1 - windHandling * 0.55));
  const curve =
    releaseCurve(input.releaseAngle, character.stats.spin, disc) +
    crossWind * 9 * (1 - windHandling * 0.55) * lie.controlPenalty +
    (1 - control) * releaseBias(input.releaseAngle) * 5;
  const landing = {
    x: start.x + aim.x * distance + right.x * curve,
    y: start.y + aim.y * distance + right.y * curve,
  };

  return {
    start,
    landing,
    distance,
    curve,
    startLieQuality,
    requestedPower,
    effectivePower,
    routeWind,
    routeWindZones: sampleRouteWindZones(start, aim, baseDistance, hole),
  };
}

export function calculateRouteWind(start: Vector2, aim: Vector2, distance: number, hole: HoleConfig, globalWind: Wind): Wind {
  const vectors = [windToVector(globalWind)];
  const zones = sampleRouteWindZones(start, aim, distance, hole);

  for (const zone of hole.windZones ?? []) {
    if (zones.includes(zone.id)) {
      const weight = 0.72;
      const vector = windToVector(zone);
      vectors.push({ x: vector.x * weight, y: vector.y * weight });
    }
  }

  const combined = vectors.reduce(
    (total, vector) => ({
      x: total.x + vector.x,
      y: total.y + vector.y,
    }),
    { x: 0, y: 0 },
  );

  return vectorToWind(combined);
}

export function sampleRouteWindZones(start: Vector2, aim: Vector2, distance: number, hole: HoleConfig): string[] {
  const hits = new Set<string>();

  for (let index = 1; index <= 8; index += 1) {
    const progress = index / 8;
    const point = {
      x: start.x + aim.x * distance * progress,
      y: start.y + aim.y * distance * progress,
    };

    for (const zone of hole.windZones ?? []) {
      if (isInZone(point, zone.rect.x, zone.rect.y, zone.rect.width, zone.rect.height)) {
        hits.add(zone.id);
      }
    }
  }

  return [...hits];
}

function resolveReliefLie(landing: Vector2, hole: HoleConfig): Vector2 {
  if (distanceBetween(hole.reliefPoint, hole.basket) <= hole.tapInRange) {
    return { ...hole.reliefPoint };
  }

  return calculateReliefLie(landing, hole);
}

function calculateReliefLie(landing: Vector2, hole: HoleConfig): Vector2 {
  const minX = hole.bounds.x + RELIEF_MARGIN;
  const maxX = hole.bounds.x + hole.bounds.width - RELIEF_MARGIN;
  const minY = hole.bounds.y + RELIEF_MARGIN;
  const maxY = hole.bounds.y + hole.bounds.height - RELIEF_MARGIN;

  return {
    x: clamp(landing.x, minX, maxX),
    y: clamp(landing.y, minY, maxY),
  };
}

function lieModifiers(lieQuality: LieQuality) {
  if (lieQuality === "relief") {
    return {
      maxPower: 0.76,
      controlledPower: 0.5,
      powerMultiplier: 0.9,
      controlPenalty: 1.22,
      forecastMultiplier: 1.45,
    };
  }

  if (lieQuality === "scramble") {
    return {
      maxPower: 0.68,
      controlledPower: 0.42,
      powerMultiplier: 0.82,
      controlPenalty: 1.3,
      forecastMultiplier: 1.65,
    };
  }

  if (lieQuality === "rough") {
    return {
      maxPower: 0.86,
      controlledPower: 0.58,
      powerMultiplier: 0.92,
      controlPenalty: 1.16,
      forecastMultiplier: 1.32,
    };
  }

  return {
    maxPower: 1,
    controlledPower: 0.78,
    powerMultiplier: 1,
    controlPenalty: 1,
    forecastMultiplier: 1,
  };
}

function isInZone(point: Vector2, x: number, y: number, width: number, height: number): boolean {
  return point.x >= x && point.x <= x + width && point.y >= y && point.y <= y + height;
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

function windToVector(wind: Wind): Vector2 {
  const unit = unitFromDegrees(wind.directionDegrees);
  const strength = Math.max(0, wind.strength);

  return {
    x: unit.x * strength,
    y: unit.y * strength,
  };
}

function vectorToWind(vector: Vector2): Wind {
  const strength = Math.hypot(vector.x, vector.y);

  if (strength <= 0.001) {
    return { directionDegrees: 0, strength: 0 };
  }

  return {
    directionDegrees: (Math.atan2(vector.y, vector.x) * 180) / Math.PI,
    strength,
  };
}

function dot(a: Vector2, b: Vector2): number {
  return a.x * b.x + a.y * b.y;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
