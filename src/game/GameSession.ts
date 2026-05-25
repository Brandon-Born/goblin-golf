import Phaser from "phaser";
import type {
  Character,
  DieValue,
  DiscType,
  HoleConfig,
  HoleState,
  PuttDiceAssignment,
  PuttDiceRoll,
  PuttInput,
  PuttResult,
  ReleaseAngle,
  ShotDiceAssignment,
  ShotDiceRoll,
  ShotInput,
  ShotForecast,
  ShotResult,
  Wind,
} from "./types";
import { CHARACTERS, DISCS, HOLES } from "./data";
import {
  applyShotResult,
  applyTapIn,
  calculateShotForecast,
  calculateShot,
  diceToShotInput,
  diceToPuttInput,
  distanceBetween,
  getStateLieQuality,
  isPuttingAvailable,
  isTapInAvailable,
  rollDice,
  scoreRelativeToPar,
} from "./logic";

const PROTOTYPE_WIND: Wind = {
  directionDegrees: 18,
  strength: 2,
};

export type ShotMode = "throw" | "putt" | "complete";

/** A single hole's final result after the player putted out. */
export interface HoleScoreEntry {
  holeId: string;
  holeName: string;
  par: number;
  strokes: number;
  relative: number;
}

export class GameSession {
  selectedCharacter: Character = CHARACTERS[0];
  /** Index into HOLES — the hole the player is currently on (0-based). */
  currentHoleIndex = 0;
  /** Per-hole results in play order; populated as each hole completes. */
  holeScores: HoleScoreEntry[] = [];
  holeState: HoleState = {
    lie: { ...HOLES[0].tee },
    lieQuality: "fairway",
    strokes: 0,
    complete: false,
    penaltyStrokes: 0,
  };

  lastShot?: ShotResult;
  lastPutt?: PuttResult;

  currentShotDice: ShotDiceRoll | null = null;
  currentShotAssignment: ShotDiceAssignment | null = null;
  currentPuttDice: PuttDiceRoll | null = null;
  currentPuttAssignment: PuttDiceAssignment | null = null;

  get characters() {
    return CHARACTERS;
  }

  get discs() {
    return DISCS;
  }

  get holes(): ReadonlyArray<HoleConfig> {
    return HOLES;
  }

  get hole(): HoleConfig {
    return HOLES[this.currentHoleIndex];
  }

  get wind() {
    return PROTOTYPE_WIND;
  }

  get distanceToBasket() {
    return distanceBetween(this.holeState.lie, this.hole.basket);
  }

  get lieQuality() {
    return getStateLieQuality(this.holeState, this.hole);
  }

  get isLastHole(): boolean {
    return this.currentHoleIndex >= HOLES.length - 1;
  }

  /** Total strokes across all played holes. Includes the in-progress hole's
   *  strokes only when its score hasn't yet been pushed to holeScores. */
  get totalStrokes(): number {
    const recorded = this.holeScores.reduce((sum, h) => sum + h.strokes, 0);
    if (this.courseComplete) return recorded;
    return recorded + this.holeState.strokes;
  }

  /** Sum of par across all played holes. Includes the in-progress hole's
   *  par only when its score hasn't yet been pushed to holeScores. */
  get totalPar(): number {
    const recordedPar = this.holeScores.reduce((sum, h) => sum + h.par, 0);
    if (this.courseComplete) return recordedPar;
    return recordedPar + this.hole.par;
  }

  /** Cumulative score relative to par across played holes (including current). */
  get totalRelative(): number {
    return this.totalStrokes - this.totalPar;
  }

  get mode(): ShotMode {
    if (this.holeState.complete) {
      return "complete";
    }

    return isPuttingAvailable(this.holeState, this.hole) ? "putt" : "throw";
  }

  /** Reset the current hole's state without leaving the hole. */
  reset(character = this.selectedCharacter) {
    this.selectedCharacter = character;
    this.holeState = {
      lie: { ...this.hole.tee },
      lieQuality: "fairway",
      strokes: 0,
      complete: false,
      penaltyStrokes: 0,
    };
    this.lastShot = undefined;
    this.lastPutt = undefined;
    this.currentShotDice = null;
    this.currentShotAssignment = null;
    this.currentPuttDice = null;
    this.currentPuttAssignment = null;
  }

  /** Start the course over from hole 1 with a fresh scorecard. */
  resetCourse(character = this.selectedCharacter) {
    this.currentHoleIndex = 0;
    this.holeScores = [];
    this.reset(character);
  }

  /** Record the just-completed hole's score in holeScores. If another hole
   *  remains, advance to its tee and return true; otherwise return false
   *  (the course is complete and the final scorecard should be shown). */
  advanceHole(): boolean {
    if (!this.holeState.complete) {
      throw new Error("Cannot advance: current hole is not complete.");
    }
    const hole = this.hole;
    this.holeScores.push({
      holeId: hole.id,
      holeName: hole.name,
      par: hole.par,
      strokes: this.holeState.strokes,
      relative: this.holeState.strokes - hole.par,
    });

    const courseComplete = this.isLastHole;
    if (!courseComplete) {
      this.currentHoleIndex += 1;
      this.holeState = {
        lie: { ...this.hole.tee },
        lieQuality: "fairway",
        strokes: 0,
        complete: false,
        penaltyStrokes: 0,
      };
      this.lastShot = undefined;
      this.lastPutt = undefined;
      this.currentShotDice = null;
      this.currentShotAssignment = null;
      this.currentPuttDice = null;
      this.currentPuttAssignment = null;
    }
    return !courseComplete;
  }

  /** True once advanceHole() has been called on the final hole — i.e. every
   *  hole's score is in holeScores and there's no hole left to play. */
  get courseComplete(): boolean {
    return this.holeScores.length >= HOLES.length;
  }

  selectCharacter(characterId: string) {
    const character = CHARACTERS.find((candidate) => candidate.id === characterId);
    if (!character) {
      throw new Error(`Unknown character: ${characterId}`);
    }
    this.resetCourse(character);
  }

  rollShotDice(): ShotDiceRoll {
    const override = typeof window !== "undefined" ? (window as unknown as Record<string, unknown>).__forceDice as number[] | undefined : undefined;
    const raw = override ? override.slice(0, 3) : rollDice(3);
    const dice: ShotDiceRoll = [
      Math.max(1, Math.min(6, raw[0])) as DieValue,
      Math.max(1, Math.min(6, raw[1])) as DieValue,
      Math.max(1, Math.min(6, raw[2])) as DieValue,
    ];
    this.currentShotDice = dice;
    this.currentShotAssignment = null;
    return dice;
  }

  rollPuttDice(): PuttDiceRoll {
    const override = typeof window !== "undefined" ? (window as unknown as Record<string, unknown>).__forcePuttDice as number[] | undefined : undefined;
    const raw = override ? override.slice(0, 2) : rollDice(2);
    const dice: PuttDiceRoll = [
      Math.max(1, Math.min(6, raw[0])) as DieValue,
      Math.max(1, Math.min(6, raw[1])) as DieValue,
    ];
    this.currentPuttDice = dice;
    this.currentPuttAssignment = null;
    return dice;
  }

  assignShotDice(assignment: ShotDiceAssignment) {
    if (!this.currentShotDice) {
      throw new Error("No shot dice rolled. Call rollShotDice() first.");
    }
    this.currentShotAssignment = assignment;
  }

  assignPuttDice(assignment: PuttDiceAssignment) {
    if (!this.currentPuttDice) {
      throw new Error("No putt dice rolled. Call rollPuttDice() first.");
    }
    this.currentPuttAssignment = assignment;
  }

  throwDisc(disc: DiscType, releaseAngle: ReleaseAngle): ShotResult {
    if (!this.currentShotAssignment) {
      throw new Error("No shot dice assigned. Call assignShotDice() first.");
    }
    const input = diceToShotInput(this.currentShotAssignment, this.basketBearingDegrees(), disc, releaseAngle);
    const result = calculateShot(this.holeState, this.selectedCharacter, this.hole, PROTOTYPE_WIND, input);
    this.holeState = applyShotResult(this.holeState, this.hole, result);
    this.lastShot = result;
    this.currentShotDice = null;
    this.currentShotAssignment = null;
    return result;
  }

  forecastThrow(input: ShotInput): ShotForecast {
    return calculateShotForecast(this.holeState, this.selectedCharacter, this.hole, PROTOTYPE_WIND, input);
  }

  putt(input?: PuttInput): PuttResult {
    const autoTapIn = isTapInAvailable(this.holeState, this.hole);

    let resolvedInput: PuttInput | null = null;
    if (!autoTapIn) {
      resolvedInput = input ?? (this.currentPuttAssignment ? diceToPuttInput(this.currentPuttAssignment) : null);
      if (!resolvedInput) {
        throw new Error("No putt input: provide PuttInput directly or assign putt dice first.");
      }
    }

    const result: PuttResult = autoTapIn
      ? { made: true, autoTapIn: true, landing: { ...this.hole.basket }, strokesAdded: 1 }
      : this.resolveManualPutt(resolvedInput!);

    this.holeState = result.autoTapIn
      ? applyTapIn(this.holeState, this.hole)
      : {
          ...this.holeState,
          lie: result.landing,
          strokes: this.holeState.strokes + result.strokesAdded,
          complete: result.made,
        };
    this.lastPutt = result;
    this.currentPuttDice = null;
    this.currentPuttAssignment = null;
    return result;
  }

  scoreLabel() {
    const relative = scoreRelativeToPar(this.holeState, this.hole);
    if (relative === 0) {
      return "Even";
    }

    return relative > 0 ? `+${relative}` : `${relative}`;
  }

  totalScoreLabel(): string {
    const relative = this.totalRelative;
    if (relative === 0) return "Even";
    return relative > 0 ? `+${relative}` : `${relative}`;
  }

  private basketBearingDegrees(): number {
    const hole = this.hole;
    return (Math.atan2(hole.basket.y - this.holeState.lie.y, hole.basket.x - this.holeState.lie.x) * 180) / Math.PI;
  }

  private resolveManualPutt(input: PuttInput): PuttResult {
    const hole = this.hole;
    const distance = this.distanceToBasket;
    const aimError = Math.hypot(input.aimOffset.x, input.aimOffset.y);
    const idealPower = Phaser.Math.Clamp(distance / hole.puttingRange, 0.38, 0.95);
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
    const maxSafeProgress = distance > hole.tapInRange
      ? (distance - hole.tapInRange - 2) / distance
      : 0.2;
    const landingProgress = made ? progress : Math.min(progress, Math.max(0.2, maxSafeProgress));

    return {
      made,
      autoTapIn: false,
      landing: made
        ? { ...hole.basket }
        : {
            x: this.holeState.lie.x + (hole.basket.x - this.holeState.lie.x) * landingProgress,
            y: this.holeState.lie.y + (hole.basket.y - this.holeState.lie.y) * landingProgress,
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
