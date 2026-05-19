# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Canonical Reference

**`AGENTS.md` is the canonical source of truth for this project.** Read it first. It owns the project overview, current gameplay shape, code map, development rules, backlog process, and verification steps. This file only adds Claude Code-specific command reference and architecture notes not already covered there.

## Commands

```sh
npm run dev                  # dev server at http://127.0.0.1:5173
npm run build                # tsc + vite build (Phaser chunk-size warning is expected)
npm test                     # unit tests (vitest, no server needed)
npm run test:watch           # unit tests in watch mode
npm run test:e2e:server      # start dev server then run Playwright e2e tests
npm run test:e2e             # Playwright only (requires server already running)
```

Run a single unit test file:
```sh
npx vitest run tests/unit/gameLogic.test.ts
```

Run a single e2e test:
```sh
npx playwright test tests/e2e/prototype-flow.spec.ts
```

E2E tests run against a desktop Chrome viewport (1280×720, touch enabled). Visual screenshots land in `test-results/visual-audit/`.

## Architecture

The codebase is split into three layers that communicate in one direction:

**Pure game logic** (`src/game/`) — no Phaser imports except in `GameSession.ts` (one `Phaser.Math.Clamp` call):
- `types.ts` — all shared interfaces and union types (`ShotInput`, `ShotResult`, `ShotForecast`, `HoleState`, etc.)
- `data.ts` — static game data (`CHARACTERS`, `DISCS`, `HOLE_1`) plus validation helpers
- `logic.ts` — deterministic, stateless shot physics and scoring functions (`calculateShot`, `calculateShotForecast`, `applyShotResult`, `getLieQuality`, etc.)
- `GameSession.ts` — mutable round state; wraps logic functions and exposes `throwDisc`, `putt`, `forecastThrow`, `mode`, etc. Exports a singleton `gameSession`.

**Phaser scenes** (`src/scenes/`) — rendering, input, animation, and DOM HUD. Scene order: `BootScene → TitleScene → CharacterSelectScene → HoleScene → ScoreScene`. All gameplay state lives in `gameSession`; scenes read and mutate it then react visually.

**Tests** (`tests/`) — unit tests import directly from `src/game/`; e2e tests drive the full browser flow via Playwright.

## Key Design Constraints

- Throws are **deterministic**: same inputs always produce the same `ShotResult`. The forecast (`ShotForecast`) shows uncertainty radius, confidence, and risk rather than an exact answer.
- **No timing-based mechanics** — skill comes from reading course, wind zones, lie quality, disc choice, and release angle.
- Lie quality (`fairway` / `rough` / `scramble` / `relief`) modifies `maxPower`, `powerMultiplier`, `controlPenalty`, and `forecastMultiplier` in `lieModifiers()` inside `logic.ts`.
- Wind zones are spatial course features; `sampleRouteWindZones` ray-marches the shot path to find which zones it crosses, then `calculateRouteWind` blends zone winds with global wind.
- OB lands in `resolveReliefLie` — clamped inside bounds, never within tap-in range.
- Putting mode activates when `distanceToBasket ≤ hole.puttingRange` (90 px); tap-in auto-completes within `hole.tapInRange` (18 px).

## Where to Add Things

| What | Where |
|------|-------|
| New rule or shot physics change | `src/game/logic.ts` |
| New hole, character, or disc | `src/game/data.ts` + `types.ts` if new fields needed |
| Round/session state changes | `src/game/GameSession.ts` |
| Visual, input, or HUD changes | the relevant scene in `src/scenes/` |
| New gameplay rule tests | `tests/unit/gameLogic.test.ts` or `tests/unit/gameSession.test.ts` |
| Player-flow regressions | `tests/e2e/prototype-flow.spec.ts` |
| Known issues and TODOs | `docs/product-backlog.md` (source of truth for product work) |
| New art / sprite | `public/assets/` (SVG), then register in `src/scenes/BootScene.ts` SPRITES array |

## Art Pipeline

Sprites live in `public/assets/` as SVGs (crisp at any scale, fast to author, no binary diffs). `BootScene.preload()` registers every sprite via `this.load.image(key, path)`; scenes call `this.add.image(x, y, key)` to place them. Helper key functions in `BootScene` map character ids and disc ids to sprite keys (`characterPortraitKey`, `characterTokenKey`, `discKey`).

Each character has both a **portrait** (front-facing, used on the character select cards) and a **token** (top-down, used as the lie marker on the course). Adding a new character requires both SVGs plus matching entries in the `SPRITES` array.
