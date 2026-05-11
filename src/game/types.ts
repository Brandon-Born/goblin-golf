export type ReleaseAngle = "hyzer" | "flat" | "anhyzer";
export type DiscType = "driver" | "midrange" | "putter";

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

export interface HoleConfig {
  id: string;
  name: string;
  par: number;
  tee: Vector2;
  basket: Vector2;
  bounds: { x: number; y: number; width: number; height: number };
  reliefPoint: Vector2;
  puttingRange: number;
  tapInRange: number;
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
}

export interface HoleState {
  lie: Vector2;
  strokes: number;
  complete: boolean;
  penaltyStrokes: number;
}
