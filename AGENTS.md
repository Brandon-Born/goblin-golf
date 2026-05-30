# AGENTS.md

## Project Overview

Goblin Golf is a browser disc golf game built with Vite, TypeScript, and Phaser. The current prototype targets a **landscape desktop viewport (1280×720)** and plays a full **nine-hole round** (par 30): title screen, character select, then per-hole throw setup, flight resolution, OB relief, and putting — advancing tee-to-tee through an intermission scorecard to a final round summary and replay. It grew out of a single-hole vertical slice; the holes share one playfield footprint (`COURSE_BOUNDS`) and differ by tee/basket placement, wind lanes, and scramble zones.

The target feel is playful but strategic. The game should stay readable and approachable while still rewarding deliberate shot planning. It should not rely on timing-based release mechanics. Skill should come from reading the course, choosing a route, managing uncertainty, selecting discs, shaping release angle, and placing the disc for the next lie.

## Start Here

Read these first before making product or gameplay changes:

- `README.md` - high-level concept and documentation index.
- `docs/product-backlog.md` - current known issues, TODOs, and recently resolved problems.
- `docs/game-design.md` - game fantasy and experience goals.
- `docs/core-mechanics.md` - throw, putting, scoring, and rules direction.
- `docs/mobile-first-design.md` - UX and layout constraints for the landscape prototype.
- `docs/implementation-plan.md` - phased build order and acceptance checks.

The backlog is the source of truth for known product work. If a playtest reveals a new issue, add it to `docs/product-backlog.md`.

## Current Gameplay Shape

The course is nine holes (`HOLES` in `data.ts`), opening on `Ruincap Run`: Ruincap Run, Toadstool Twist, Brittlebark Bend, Hollow Howl, Ruin Gauntlet, Crossgust Canyon, Forking Paths, Spore Ring, and Champion's Cliff (par 30 total). `GameSession` tracks `currentHoleIndex` and `holeScores`; `advanceHole()` records the finished hole and moves to the next tee.

Per-hole core loop:

- Pick one of three goblins (once, at the start of the round).
- Read the lie, wind lane, risk, and forecast zone.
- Choose disc, release angle, aim, and power.
- Throw from the current lie.
- Resolve legal landing, OB penalty, or relief.
- Enter putting mode near the basket.
- Finish the hole; see the intermission scorecard, then play on. After hole 9, view the final round summary and replay.

Important design choices:

- Throws are deterministic under the hood.
- Previews are intentionally incomplete: players see forecast, confidence, and uncertainty rather than an exact answer.
- Lie quality matters: fairway, rough, scramble, and relief affect control and power.
- Wind zones are spatial course features and should be readable on the course.
- OB relief should keep the game playable without creating free tap-ins.

## Code Map

- `src/game/types.ts` - shared gameplay types.
- `src/game/data.ts` - characters, discs, the nine-hole `HOLES` array (wind zones, scramble zones, scenery), plus validation helpers.
- `src/game/logic.ts` - deterministic rules, shot physics, forecasts, lie quality, relief, scoring helpers.
- `src/game/GameSession.ts` - mutable round/session state and putting resolution.
- `src/scenes/TitleScene.ts` - title screen.
- `src/scenes/CharacterSelectScene.ts` - goblin selection.
- `src/scenes/HoleScene.ts` - shot setup, course rendering, HUD, flight animation, putting view.
- `src/scenes/ScoreScene.ts` - round summary.
- `src/style.css` - DOM overlay styling.
- `tests/unit` - deterministic logic and data tests.
- `tests/e2e` - Playwright player-flow and visual-audit tests.

## Development Rules

- Keep gameplay rules outside Phaser scenes when practical. Prefer `src/game/logic.ts` and `src/game/GameSession.ts` for rule changes.
- Keep Phaser scenes focused on rendering, input, animation, and DOM HUD coordination.
- Target a landscape desktop viewport (1280×720, `Scale.FIT + CENTER_BOTH`). Mobile portrait is not a current target.
- Do not add timing-based throw mechanics unless product direction changes.
- Use readable DOM HUD for dense information, but protect the playfield.
- Add or update tests for rule changes and player-visible flow changes.
- Use existing patterns before adding new abstractions.

## Known Highest-Priority Issues

See `docs/product-backlog.md` for details. The earlier P0–P2 issues (label overflow, risky default first shot, unclear wind-lane language, oversized first-drive forecast uncertainty) are now resolved. No progression blockers or major usability issues are open.

Remaining work is P3 — technical debt, code-health refactors, and future design:

- Add `npm run test:e2e:server` to CI so e2e drift is caught on every PR.
- Refactor opportunities: split the ~1600-line `HoleScene`; de-duplicate the setup/flight playfield tiling; make the rough band a per-hole `HoleConfig` field; vary per-hole playfield footprint (all nine currently share `COURSE_BOUNDS`).
- Future hazards designed but not built: Hex Spiral (vortex) and Runic Maw (gravity well).
- The nine holes are functional but have not had the per-hole playtest/polish pass that Hole 1 received.

## Verification

Common commands:

```sh
npm test
npm run build
npm run test:e2e:server
```

Notes:

- `npm run build` currently passes but reports the existing Phaser chunk-size warning.
- `npm run test:e2e:server` may report that port `5173` is already in use if a dev server is already running, then continue against the active server.
- Visual screenshots are written under `test-results/visual-audit/`.

## Backlog Maintenance

When adding issues to `docs/product-backlog.md`, include:

- severity section, or a `Known TODOs` category
- status
- what the player sees
- why it matters
- suggested next step
- screenshot or test evidence when available

Resolved product issues should move to `Recently Resolved` instead of being deleted.
