export type ReleaseAngle = "hyzer" | "flat" | "anhyzer";
export type DiscType = "driver" | "midrange" | "putter";
export type LieQuality = "fairway" | "rough" | "scramble" | "relief";

export interface Vector2 {
  x: number;
  y: number;
}

export interface CharacterStats {
  power: number;
  accuracy: number;
  spin: number;
  windRead: number;
  putting: number;
}

export interface Character {
  id: string;
  name: string;
  playStyle: string;
  quote: string;
  palette: number;
  stats: CharacterStats;
}

export interface Disc {
  id: DiscType;
  label: string;
  distance: number;
  stability: number;
  control: number;
  windResistance: number;
}

export interface Wind {
  directionDegrees: number;
  strength: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface WindZone extends Wind {
  id: string;
  label: string;
  rect: Rect;
}

export interface ScrambleZone {
  id: string;
  rect: Rect;
}

export type ScenicSprite =
  | "tree"
  | "mushroom-red"
  | "mushroom-spotted"
  | "ruins";

export interface ScenicProp {
  x: number;
  y: number;
  sprite: ScenicSprite;
  scale?: number;
}

export interface HoleConfig {
  id: string;
  name: string;
  par: number;
  tee: Vector2;
  basket: Vector2;
  bounds: Rect;
  reliefPoint: Vector2;
  puttingRange: number;
  tapInRange: number;
  windZones?: readonly WindZone[];
  scrambleZones?: readonly ScrambleZone[];
  /** Decorative sprites placed in world coordinates. Includes hazard visuals (ruins,
   *  mushrooms) and pure scenery (trees). Position-only; gameplay impact comes
   *  from scrambleZones / windZones, not from these props. */
  scenery?: readonly ScenicProp[];
}

export interface ShotInput {
  aimDegrees: number;
  power: number;
  releaseAngle: ReleaseAngle;
  disc: DiscType;
}

export interface ShotResult {
  start: Vector2;
  flightLanding: Vector2;
  landing: Vector2;
  distance: number;
  curve: number;
  inBounds: boolean;
  reliefApplied: boolean;
  penaltyStroke: number;
  startLieQuality: LieQuality;
  lieQuality: LieQuality;
  requestedPower: number;
  effectivePower: number;
  routeWind: Wind;
  routeWindZones: string[];
}

export interface ShotForecast {
  start: Vector2;
  likelyLanding: Vector2;
  likelyLie: Vector2;
  likelyDistance: number;
  likelyCurve: number;
  inBoundsLikely: boolean;
  reliefLikely: boolean;
  startLieQuality: LieQuality;
  likelyLieQuality: LieQuality;
  requestedPower: number;
  effectivePower: number;
  maxPower: number;
  controlledPower: number;
  routeWind: Wind;
  routeWindZones: string[];
  landingZone: {
    center: Vector2;
    radiusX: number;
    radiusY: number;
    rotationDegrees: number;
  };
  pathReveal: number;
  confidence: "high" | "medium" | "low";
  risk: "safe" | "putt" | "tap-in" | "ob-risk";
}

export interface HoleState {
  lie: Vector2;
  lieQuality?: LieQuality;
  strokes: number;
  complete: boolean;
  penaltyStrokes: number;
}

export type DieValue = 1 | 2 | 3 | 4 | 5 | 6;
export type ShotDiceRoll = readonly [DieValue, DieValue, DieValue];
export interface ShotDiceAssignment {
  angleDie: DieValue;
  powerDie: DieValue;
  windDie: DieValue;
}
export type PuttDiceRoll = readonly [DieValue, DieValue];
export interface PuttDiceAssignment {
  aimDie: DieValue;
  powerDie: DieValue;
}

export interface PuttInput {
  aimOffset: Vector2;
  power: number;
}

export interface PuttResult {
  made: boolean;
  autoTapIn: boolean;
  landing: Vector2;
  strokesAdded: number;
  missReason?: string;
}
