# Dice-Driven Shot Input — Implementation Spec

**Status:** Proposed (MVP). Not yet implemented.
**Branch suggestion:** `prototype/dice-input` off `prototype/hole-1`.
**Audience:** an agent (or developer) implementing this feature end-to-end.

This document is the executable spec. Follow it section-by-section; each section lists exactly what to add, what to change, and what to leave alone. Acceptance criteria are in **Verification** at the bottom.

---

## 1. Goal

Replace the prototype's continuous drag-aim + power-slider input with a dice-driven decision:

1. Player starts a shot → **rolls 3d6** (throws) or **2d6** (putts).
2. Player picks a disc and release angle.
3. Player **assigns each die to a stat slot** — for throws: `ANGLE` / `POWER` / `WIND`; for putts: `AIM` / `POWER`.
4. Player commits → existing shot physics resolve the throw deterministically.

The player's only continuous knobs are disc choice, release angle, and which die goes in which slot. Dice values map through fixed dials to today's `ShotInput` / `PuttInput` shapes, so the underlying physics layer is **unchanged**.

The **wind die** is a display-only mechanic: it gates how much of the wind information the HUD reveals. Physics still apply wind in full; the player just sees more or less of it depending on the die assigned.

## 2. Out of scope (deferred)

Do not implement these in this pass — they are intentionally deferred so we can validate core feel first:

- Re-roll tokens or per-round dice economy.
- Character abilities that modify dice (+1, swap, reroll).
- Doubles → crit/fumble effects.
- Banked dice carried between shots.
- Wind die affecting physics (it is display-only here).
- L/R aim toggle. The angle dial is symmetric and the player commits to its direction.

## 3. Data contracts

### 3.1 New types — `src/game/types.ts`

```ts
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
```

`ShotInput` and `PuttInput` shapes stay as they are today. Dice translate *into* those shapes via the helpers in §4.

### 3.2 Dial constants — `src/game/data.ts`

All dials are length-6 arrays indexed by `dieValue - 1`. Symmetric (no entry equals "straight" for the angle dial — that is by design).

```ts
export const ANGLE_DIAL_DEGREES = [-42, -25, -8, 8, 25, 42] as const;
export const POWER_DIAL          = [0.25, 0.4, 0.55, 0.7, 0.85, 1.0] as const;
export const WIND_CLARITY_DIAL   = [0, 0.2, 0.4, 0.6, 0.8, 1.0] as const;

export const PUTT_AIM_DIAL_PX    = [-80, -48, -16, 16, 48, 80] as const;
export const PUTT_POWER_DIAL     = [0.3, 0.45, 0.6, 0.75, 0.9, 1.0] as const;
```

Dial tuning is expected to change after playtesting. Keep the constants centralized here.

## 4. Logic layer — `src/game/logic.ts`

Add the following **pure** helpers. Do **not** modify `calculateShot`, `calculateShotForecast`, `resolveShotPhysics`, `sampleRouteWindZones`, `calculateRouteWind`, or `applyShotResult` — the dice layer translates into existing `ShotInput` / `PuttInput`, so physics is untouched.

```ts
// Returns `count` independent d6 rolls. Inject `rng` in tests for determinism.
export function rollDice(count: number, rng: () => number = Math.random): DieValue[];

// Translate a shot dice assignment into the existing ShotInput shape.
// basketBearingDegrees is the absolute bearing from the current lie to the basket;
// angleDie offsets this by ANGLE_DIAL_DEGREES[angleDie - 1].
export function diceToShotInput(
  assignment: ShotDiceAssignment,
  basketBearingDegrees: number,
  disc: DiscId,
  releaseAngle: ReleaseAngle,
): ShotInput;

// Translate a putt dice assignment into the existing PuttInput shape.
// aimOffset is set from PUTT_AIM_DIAL_PX along the basket's perpendicular axis
// (single-axis is acceptable for MVP; do not invent a second axis).
export function diceToPuttInput(assignment: PuttDiceAssignment): PuttInput;

// Wind die → 0..1 fraction of wind HUD revealed.
export function windClarityFromDie(dieValue: DieValue): number;
```

Notes:
- `diceToShotInput` must be pure and deterministic — same inputs always yield the same `ShotInput`.
- `aimDegrees = basketBearingDegrees + ANGLE_DIAL_DEGREES[angleDie - 1]`. Normalize to `[0, 360)`.
- `power = POWER_DIAL[powerDie - 1]`. The existing physics will further clamp by lie `maxPower`, so no clamping is needed here.

## 5. Session — `src/game/GameSession.ts`

### 5.1 New state

Add transient per-shot dice state on the session:

```ts
currentShotDice: ShotDiceRoll | null;
currentShotAssignment: ShotDiceAssignment | null;
currentPuttDice: PuttDiceRoll | null;
currentPuttAssignment: PuttDiceAssignment | null;
```

All four start `null`. They reset to `null` after a successful `throwDisc` / `putt`, and at the start of a new hole.

### 5.2 New methods

```ts
rollShotDice(): ShotDiceRoll;     // rolls 3d6, stores, clears assignment, returns
rollPuttDice(): PuttDiceRoll;     // rolls 2d6, stores, clears assignment, returns

assignShotDice(assignment: ShotDiceAssignment): void;  // throws if no current roll
assignPuttDice(assignment: PuttDiceAssignment): void;  // same

// Preview using the stored assignment + given disc/release. Throws if not assigned.
// Returns the existing forecast plus the wind-clarity value the scene needs.
forecastThrow(disc: DiscId, releaseAngle: ReleaseAngle): {
  forecast: ShotForecast;
  windClarity: number;
};
```

### 5.3 Modified methods

- `throwDisc(disc, releaseAngle)` — no longer accepts a full `ShotInput`. It derives the `ShotInput` from `currentShotDice` + `currentShotAssignment` via `diceToShotInput`, calls today's `calculateShot`, applies the result via existing `applyShotResult`, then clears `currentShotDice` and `currentShotAssignment`. Throws if either is null.
- `putt(...)` — analogous: derives `PuttInput` from `currentPuttDice` + `currentPuttAssignment` via `diceToPuttInput`. Clears putt dice state on completion. Throws if dice are not assigned.
- Auto tap-in path (within `hole.tapInRange`) bypasses dice — keep today's behavior.

## 6. UI — `src/scenes/HoleScene.ts`

### 6.1 Remove

- Vertical-drag aim mechanic (and the `aimOffsetDegrees` state it drives — see today's input handling around line 649).
- `.power-pad` DOM slider and its drag handlers (today around lines 492–542).
- Power-percent live readout that mirrored the slider.

### 6.2 Keep

- Disc-select and release-angle toggle buttons (today around lines 410–422). These remain the player's continuous knobs.
- Forecast cone rendering (`aimPath` + `forecastZone` in `updateAimLine` around lines 786–842). It now updates whenever the dice assignment changes rather than every drag tick.
- Wind zone drawing and `routeWindLabel` (today around lines 1246–1275). They are **gated** by `windClarity` — see §6.4.
- Putting-mode crosshair rendering — but its *input* is replaced by dice (§6.3).

### 6.3 Add (throw mode)

- **Roll button** — visible when `currentShotDice` is null. Tap → `gameSession.rollShotDice()`, then show dice.
- **3 dice tiles** — render each rolled value 1–6 as a die face (pips or numerals — pips preferred). Tiles are interactive: drag-to-slot, or tap-die then tap-slot. Pick one interaction model and stick with it; document the choice in code comments above the handler.
- **3 assignment slots** — `ANGLE`, `POWER`, `WIND`. Each accepts one die. Tapping a filled slot clears it (die returns to the tile pool).
- **Per-slot live readout** — below each slot, show the derived value:
  - `ANGLE` slot → `+25°` style label using `ANGLE_DIAL_DEGREES`.
  - `POWER` slot → percent: `70%`.
  - `WIND` slot → `60% visible` (or qualitative band — see §6.4).
- **Throw button** — disabled until all 3 slots are filled. Enabled commit → `gameSession.throwDisc(disc, releaseAngle)`.
- Whenever the assignment changes, call `gameSession.forecastThrow(...)` and re-render the forecast cone using the returned `forecast`.

### 6.4 Wind HUD gating

Take the `windClarity` value returned by `forecastThrow` and use it to scale wind-related HUD elements:

| `windClarity` range | Wind arrows         | Route-wind text                            | Numeric strength |
|---------------------|---------------------|--------------------------------------------|------------------|
| `0`                 | hidden              | hidden                                     | hidden           |
| `0 < c ≤ 0.4`       | 30% alpha           | direction only ("crosswind from west")     | hidden           |
| `0.4 < c ≤ 0.8`     | 60% alpha           | direction + qualitative band               | band ("moderate")|
| `c > 0.8`           | full alpha          | full text as today                         | numeric value    |

Bands: `≤1.5` → "light", `≤3` → "moderate", `>3` → "strong". (Today's `routeWindLabel` returns the full numeric text — extend it to accept a clarity argument, or wrap it in the scene.)

The physics inside `calculateShot` / `resolveShotPhysics` keep applying wind in full regardless of clarity. The mechanic only changes what the player *sees*.

### 6.5 Putt mode

Mirror §6.3 with 2 dice and 2 slots (`AIM`, `POWER`). No wind die for putts. Same Roll button → assign → commit flow. Auto tap-ins (already in session) bypass dice entirely.

## 7. Tests

### 7.1 New file — `tests/unit/diceMechanic.test.ts`

Cover the pure helpers:

- `rollDice(3)` returns an array of length 3, each in `[1, 6]`.
- `rollDice(count, rng)` with an injected RNG produces a known sequence (e.g. `rng = () => 0` → all `1`s; `rng = () => 0.999` → all `6`s).
- `diceToShotInput`:
  - Each `dieValue` → expected dial entry for angle and power.
  - `aimDegrees = (basketBearing + dial) mod 360`. Test bearings near 0 and 359 to catch wrap.
  - Identical inputs → identical `ShotInput` across calls (determinism).
- `diceToPuttInput`: dial mapping + determinism.
- `windClarityFromDie(d)` returns `WIND_CLARITY_DIAL[d - 1]` for all 6 values.

### 7.2 Update — `tests/unit/gameSession.test.ts`

- `rollShotDice` → stores dice and clears any prior assignment.
- `assignShotDice` without a current roll throws.
- `throwDisc` without an assignment throws.
- `rollShotDice` → `assignShotDice` → `throwDisc` produces a valid `ShotResult` and clears dice state.
- Same round-trip for putts with `rollPuttDice` / `assignPuttDice` / `putt`.
- Auto tap-in still resolves without rolling dice.

### 7.3 Update — `tests/unit/gameLogic.test.ts`

No structural changes required — `calculateShot` and `calculateShotForecast` are untouched, and the existing tests construct `ShotInput` directly. Run them to confirm physics regression-free.

### 7.4 Update — `tests/e2e/prototype-flow.spec.ts`

Replace the drag-aim and power-slider interactions with the dice flow:

- Tap Roll → assert 3 die tiles appear with readable values.
- Drag (or tap) each die into its slot → assert slot readouts update.
- Assert Throw button enables only with all 3 slots filled.
- Throw → assert flight resolves and HUD transitions to next shot / putting.
- Low wind die (force via test seed) → assert wind arrows have reduced opacity and numeric strength is hidden.
- High wind die → assert full wind text present.
- Putting flow: Roll → assign 2 dice → Putt → resolves.

For seedable RNG in e2e, expose a test-only hook (e.g. `window.__forceDice = [3, 5, 2]`) consumed by `rollShotDice` when present. Keep it gated behind `import.meta.env.DEV` or a `data-testid` flag.

## 8. Critical files

- `src/game/types.ts` — new dice types
- `src/game/data.ts` — dial constants
- `src/game/logic.ts` — `rollDice`, `diceToShotInput`, `diceToPuttInput`, `windClarityFromDie`
- `src/game/GameSession.ts` — dice state + modified `throwDisc` / `putt` / `forecastThrow`
- `src/scenes/HoleScene.ts` — input rip-and-replace; wind HUD gating
- `tests/unit/diceMechanic.test.ts` — new
- `tests/unit/gameSession.test.ts` — updates
- `tests/e2e/prototype-flow.spec.ts` — updates

## 9. Existing functions to reuse (do not modify)

- `calculateShot`, `calculateShotForecast`, `resolveShotPhysics`, `applyShotResult` in `src/game/logic.ts`.
- `sampleRouteWindZones`, `calculateRouteWind`, `routeWindLabel`.
- `CHARACTERS`, `DISCS`, `HOLE_1` in `src/game/data.ts`.
- Disc and release-angle button rendering in `HoleScene.ts`.
- `PuttInput` and `ShotInput` interfaces — dice translate into these shapes.

## 10. Verification

A correct implementation passes all of these:

**Automated**
- `npm test` — all unit tests pass, including new `tests/unit/diceMechanic.test.ts`.
- `npm run test:e2e:server` — full e2e flow plays through hole 1 with dice.

**Manual** (`npm run dev`)

1. New shot → Roll button visible; tap reveals 3 dice.
2. Drag/tap dice into ANGLE / POWER / WIND → forecast cone updates live with each assignment.
3. Reassigning dice updates the cone and per-slot readouts.
4. Low wind die (1–2) → wind arrows faded; numeric strength hidden.
5. High wind die (5–6) → wind HUD fully shown.
6. Throw button only enables with all 3 slots filled; commit → disc lands consistent with forecast.
7. Approaching within putt range → 2 dice rolled for putt; AIM/POWER slots; commit resolves the putt.
8. Inside tap-in range → auto-resolves without dice.
9. Hole completes; score reflects strokes correctly.

**Regression**
- Existing logic tests still pass (physics unchanged).
- Existing OB / relief / wind-zone behavior unchanged.
- Disc and release-angle selection still works.
