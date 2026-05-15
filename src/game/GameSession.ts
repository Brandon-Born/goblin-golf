import Phaser from "phaser";
import type {
  Character,
  DiscType,
  HoleState,
  ReleaseAngle,
  ShotInput,
  ShotForecast,
  ShotResult,
  Vector2,
  Wind,
} from "./types";
import { CHARACTERS, DISCS, HOLE_1 } from "./data";
import {
  applyShotResult,
  applyTapIn,
  calculateShotForecast,
  calculateShot,
  distanceBetween,
  getStateLieQuality,
  isPuttingAvailable,
  isTapInAvailable,
  scoreRelativeToPar,
} from "./logic";

const PROTOTYPE_WIND: Wind = {
  directionDegrees: 18,
  strength: 2,
};

export type ShotMode = "throw" | "putt" | "complete";

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

export class GameSession {
  selectedCharacter: Character = CHARACTERS[0];
  holeState: HoleState = {
    lie: { ...HOLE_1.tee },
    lieQuality: "fairway",
    strokes: 0,
    complete: false,
    penaltyStrokes: 0,
  };

  lastShot?: ShotResult;
  lastPutt?: PuttResult;

  get characters() {
    return CHARACTERS;
  }

  get discs() {
    return DISCS;
  }

  get hole() {
    return HOLE_1;
  }

  get wind() {
    return PROTOTYPE_WIND;
  }

  get distanceToBasket() {
    return distanceBetween(this.holeState.lie, HOLE_1.basket);
  }

  get lieQuality() {
    return getStateLieQuality(this.holeState, HOLE_1);
  }

  get mode(): ShotMode {
    if (this.holeState.complete) {
      return "complete";
    }

    return isPuttingAvailable(this.holeState, HOLE_1) ? "putt" : "throw";
  }

  reset(character = this.selectedCharacter) {
    this.selectedCharacter = character;
    this.holeState = {
      lie: { ...HOLE_1.tee },
      lieQuality: "fairway",
      strokes: 0,
      complete: false,
      penaltyStrokes: 0,
    };
    this.lastShot = undefined;
    this.lastPutt = undefined;
  }

  selectCharacter(characterId: string) {
    const character = CHARACTERS.find((candidate) => candidate.id === characterId);
    if (!character) {
      throw new Error(`Unknown character: ${characterId}`);
    }
    this.reset(character);
  }

  throwDisc(input: ShotInput) {
    const result = calculateShot(this.holeState, this.selectedCharacter, HOLE_1, PROTOTYPE_WIND, input);

    this.holeState = applyShotResult(this.holeState, HOLE_1, result);
    this.lastShot = result;
    return result;
  }

  previewThrow(input: ShotInput) {
    return this.forecastThrow(input);
  }

  forecastThrow(input: ShotInput): ShotForecast {
    return calculateShotForecast(this.holeState, this.selectedCharacter, HOLE_1, PROTOTYPE_WIND, input);
  }

  putt(input: PuttInput) {
    const autoTapIn = isTapInAvailable(this.holeState, HOLE_1);

    const result = autoTapIn
      ? ({
          made: true,
          autoTapIn: true,
          landing: { ...HOLE_1.basket },
          strokesAdded: 1,
        } satisfies PuttResult)
      : this.resolveManualPutt(input);

    this.holeState = result.autoTapIn
      ? applyTapIn(this.holeState, HOLE_1)
      : {
          ...this.holeState,
          lie: result.landing,
          strokes: this.holeState.strokes + result.strokesAdded,
          complete: result.made,
        };
    this.lastPutt = result;
    return result;
  }

  scoreLabel() {
    const relative = scoreRelativeToPar(this.holeState, HOLE_1);
    if (relative === 0) {
      return "Even";
    }

    return relative > 0 ? `+${relative}` : `${relative}`;
  }

  private resolveManualPutt(input: PuttInput): PuttResult {
    const distance = this.distanceToBasket;
    const aimError = Math.hypot(input.aimOffset.x, input.aimOffset.y);
    const idealPower = Phaser.Math.Clamp(distance / HOLE_1.puttingRange, 0.38, 0.95);
    const powerError = Math.abs(input.power - idealPower);
    const windDrift = (PROTOTYPE_WIND.strength * distance) / 90 / Math.max(this.selectedCharacter.stats.windRead, 1);
    const forgiveness = 16 + this.selectedCharacter.stats.putting * 4;
    const made = aimError + windDrift <= forgiveness && powerError <= 0.26;
    const progress = Phaser.Math.Clamp(input.power / idealPower, 0.2, 1.1);

    let missReason: string | undefined;
    if (!made) {
      const powerDominant = powerError > 0.18;
      const windDominant = windDrift > aimError * 0.5 && windDrift > 4;
      if (powerDominant) {
        missReason = input.power < idealPower ? "short on power" : "sailed long";
      } else if (windDominant) {
        missReason = "wind pushed it";
      } else {
        missReason = input.aimOffset.x > 4 ? "wide right" : input.aimOffset.x < -4 ? "wide left" : "off line";
      }
    }

    // For a miss, cap progress so the disc can't overshoot into tap-in range.
    // An accidental gimme after a bad-aim putt isn't a meaningful tap-in.
    const maxSafeProgress = distance > HOLE_1.tapInRange
      ? (distance - HOLE_1.tapInRange - 2) / distance
      : 0.2;
    const landingProgress = made ? progress : Math.min(progress, Math.max(0.2, maxSafeProgress));

    return {
      made,
      autoTapIn: false,
      landing: made
        ? { ...HOLE_1.basket }
        : {
            x: this.holeState.lie.x + (HOLE_1.basket.x - this.holeState.lie.x) * landingProgress,
            y: this.holeState.lie.y + (HOLE_1.basket.y - this.holeState.lie.y) * landingProgress,
          },
      strokesAdded: 1,
      missReason,
    };
  }
}

export const gameSession = new GameSession();

export function describeDisc(disc: DiscType) {
  return DISCS.find((candidate) => candidate.id === disc)?.label ?? disc;
}

export function describeAngle(angle: ReleaseAngle) {
  return angle[0].toUpperCase() + angle.slice(1);
}
