import { describe, it, expect, vi } from "vitest";
import { CHARACTERS, HOLE_1, ANGLE_DIAL_DEGREES, POWER_DIAL, WIND_CLARITY_DIAL, PUTT_AIM_DIAL_PX, PUTT_POWER_DIAL } from "../../src/game/data";

vi.mock("phaser", () => ({
  default: {
    Math: {
      Clamp: (value: number, min: number, max: number) => Math.min(max, Math.max(min, value)),
    },
  },
}));
import { rollDice, diceToShotInput, diceToPuttInput, windClarityFromDie } from "../../src/game/logic";
import { GameSession } from "../../src/game/GameSession";
import type { DieValue } from "../../src/game/types";

describe("rollDice", () => {
  it("returns the requested number of values", () => {
    expect(rollDice(3)).toHaveLength(3);
    expect(rollDice(2)).toHaveLength(2);
  });

  it("always returns values in [1, 6]", () => {
    for (let trial = 0; trial < 200; trial++) {
      for (const value of rollDice(3)) {
        expect(value).toBeGreaterThanOrEqual(1);
        expect(value).toBeLessThanOrEqual(6);
      }
    }
  });

  it("respects an injected RNG", () => {
    const always0 = () => 0;
    const always1 = () => 0.9999;
    expect(rollDice(3, always0)).toEqual([1, 1, 1]);
    expect(rollDice(3, always1)).toEqual([6, 6, 6]);
  });
});

describe("diceToShotInput", () => {
  const basketBearing = 0;

  it("maps each angle die to the correct dial entry", () => {
    for (let die = 1; die <= 6; die++) {
      const input = diceToShotInput(
        { angleDie: die as DieValue, powerDie: 4, windDie: 4 },
        basketBearing,
        "driver",
        "flat",
      );
      const expectedOffset = ANGLE_DIAL_DEGREES[die - 1];
      const expectedAim = ((basketBearing + expectedOffset) % 360 + 360) % 360;
      expect(input.aimDegrees).toBe(expectedAim);
    }
  });

  it("maps each power die to the correct dial entry", () => {
    for (let die = 1; die <= 6; die++) {
      const input = diceToShotInput(
        { angleDie: 4, powerDie: die as DieValue, windDie: 4 },
        basketBearing,
        "midrange",
        "flat",
      );
      expect(input.power).toBe(POWER_DIAL[die - 1]);
    }
  });

  it("normalises aimDegrees past 360 correctly", () => {
    const input = diceToShotInput({ angleDie: 6, powerDie: 4, windDie: 4 }, 350, "driver", "flat");
    expect(input.aimDegrees).toBeGreaterThanOrEqual(0);
    expect(input.aimDegrees).toBeLessThan(360);
  });

  it("normalises aimDegrees below 0 correctly", () => {
    const input = diceToShotInput({ angleDie: 1, powerDie: 4, windDie: 4 }, 10, "driver", "flat");
    expect(input.aimDegrees).toBeGreaterThanOrEqual(0);
    expect(input.aimDegrees).toBeLessThan(360);
  });

  it("is deterministic — same inputs always yield the same ShotInput", () => {
    const a = diceToShotInput({ angleDie: 3, powerDie: 5, windDie: 2 }, 45, "putter", "hyzer");
    const b = diceToShotInput({ angleDie: 3, powerDie: 5, windDie: 2 }, 45, "putter", "hyzer");
    expect(a).toEqual(b);
  });

  it("passes disc and releaseAngle through unchanged", () => {
    const input = diceToShotInput({ angleDie: 4, powerDie: 4, windDie: 4 }, 0, "putter", "anhyzer");
    expect(input.disc).toBe("putter");
    expect(input.releaseAngle).toBe("anhyzer");
  });
});

describe("diceToPuttInput", () => {
  it("maps each aim die to the correct dial entry", () => {
    for (let die = 1; die <= 6; die++) {
      const input = diceToPuttInput({ aimDie: die as DieValue, powerDie: 4 });
      expect(input.aimOffset.x).toBe(PUTT_AIM_DIAL_PX[die - 1]);
      expect(input.aimOffset.y).toBe(0);
    }
  });

  it("maps each power die to the correct dial entry", () => {
    for (let die = 1; die <= 6; die++) {
      const input = diceToPuttInput({ aimDie: 4, powerDie: die as DieValue });
      expect(input.power).toBe(PUTT_POWER_DIAL[die - 1]);
    }
  });

  it("is deterministic", () => {
    const a = diceToPuttInput({ aimDie: 2, powerDie: 5 });
    const b = diceToPuttInput({ aimDie: 2, powerDie: 5 });
    expect(a).toEqual(b);
  });
});

describe("windClarityFromDie", () => {
  it("returns the dial value for each die face", () => {
    for (let die = 1; die <= 6; die++) {
      expect(windClarityFromDie(die as DieValue)).toBe(WIND_CLARITY_DIAL[die - 1]);
    }
  });

  it("returns 0 for die 1 and 1.0 for die 6", () => {
    expect(windClarityFromDie(1)).toBe(0);
    expect(windClarityFromDie(6)).toBe(1.0);
  });
});

describe("GameSession dice round-trip", () => {
  it("rollShotDice stores dice and clears any prior assignment", () => {
    const session = new GameSession();
    session.rollShotDice();
    expect(session.currentShotDice).not.toBeNull();
    expect(session.currentShotDice).toHaveLength(3);
    expect(session.currentShotAssignment).toBeNull();
  });

  it("rollShotDice rolls values in [1, 6]", () => {
    const session = new GameSession();
    const dice = session.rollShotDice();
    for (const value of dice) {
      expect(value).toBeGreaterThanOrEqual(1);
      expect(value).toBeLessThanOrEqual(6);
    }
  });

  it("assignShotDice throws without a prior roll", () => {
    const session = new GameSession();
    expect(() =>
      session.assignShotDice({ angleDie: 3, powerDie: 4, windDie: 5 }),
    ).toThrow();
  });

  it("throwDisc throws without an assignment", () => {
    const session = new GameSession();
    session.rollShotDice();
    expect(() => session.throwDisc("driver", "flat")).toThrow();
  });

  it("round-trip rollShotDice → assignShotDice → throwDisc produces a ShotResult and clears dice state", () => {
    const session = new GameSession();
    const dice = session.rollShotDice();
    session.assignShotDice({
      angleDie: dice[0],
      powerDie: dice[1],
      windDie: dice[2],
    });
    const result = session.throwDisc("driver", "flat");

    expect(result).toBeDefined();
    expect(typeof result.distance).toBe("number");
    expect(session.currentShotDice).toBeNull();
    expect(session.currentShotAssignment).toBeNull();
  });

  it("rollPuttDice stores 2 dice and clears any prior putt assignment", () => {
    const session = new GameSession();
    const dice = session.rollPuttDice();
    expect(dice).toHaveLength(2);
    expect(session.currentPuttDice).toEqual(dice);
    expect(session.currentPuttAssignment).toBeNull();
  });

  it("assignPuttDice throws without a prior roll", () => {
    const session = new GameSession();
    expect(() => session.assignPuttDice({ aimDie: 3, powerDie: 4 })).toThrow();
  });

  it("round-trip rollPuttDice → assignPuttDice → putt produces a PuttResult", () => {
    const session = new GameSession();
    session.selectCharacter(CHARACTERS[0].id);
    session.holeState = {
      lie: { x: HOLE_1.basket.x, y: HOLE_1.basket.y + 50 },
      strokes: 2,
      complete: false,
      penaltyStrokes: 0,
    };
    const dice = session.rollPuttDice();
    session.assignPuttDice({ aimDie: dice[0], powerDie: dice[1] });
    const result = session.putt();

    expect(result).toBeDefined();
    expect(typeof result.made).toBe("boolean");
    expect(session.currentPuttDice).toBeNull();
    expect(session.currentPuttAssignment).toBeNull();
  });

  it("auto tap-in resolves without dice", () => {
    const session = new GameSession();
    session.holeState = {
      lie: { x: HOLE_1.basket.x, y: HOLE_1.basket.y + HOLE_1.tapInRange },
      strokes: 2,
      complete: false,
      penaltyStrokes: 0,
    };
    const result = session.putt();
    expect(result.autoTapIn).toBe(true);
    expect(result.made).toBe(true);
  });

  it("reset clears all dice state", () => {
    const session = new GameSession();
    session.rollShotDice();
    session.rollPuttDice();
    session.reset();
    expect(session.currentShotDice).toBeNull();
    expect(session.currentShotAssignment).toBeNull();
    expect(session.currentPuttDice).toBeNull();
    expect(session.currentPuttAssignment).toBeNull();
  });
});
