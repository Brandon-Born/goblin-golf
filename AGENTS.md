# AGENTS.md

## Project Overview

Goblin Golf is a browser disc golf game built with Vite, TypeScript, and Phaser. The current prototype targets a **landscape desktop viewport (1280×720)** and is a playable vertical slice: title screen, character select, one fantasy disc golf hole, throw setup, flight resolution, OB relief, putting, scoring, and replay.

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

The first hole is `Ruincap Run`.

Core loop:

- Pick one of three goblins.
- Read the lie, wind lane, risk, and forecast zone.
- Choose disc, release angle, aim, and power.
- Throw from the current lie.
- Resolve legal landing, OB penalty, or relief.
- Enter putting mode near the basket.
- Finish the hole and view the score summary.

Important design choices:

- Throws are deterministic under the hood.
- Previews are intentionally incomplete: players see forecast, confidence, and uncertainty rather than an exact answer.
- Lie quality matters: fairway, rough, scramble, and relief affect control and power.
- Wind zones are spatial course features and should be readable on the course.
- OB relief should keep the game playable without creating free tap-ins.

## Code Map

- `src/game/types.ts` - shared gameplay types.
- `src/game/data.ts` - characters, discs, hole config, wind zones.
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

See `docs/product-backlog.md` for details. Current major issues include:

- Forecast and course labels can overflow, clip, or overlap.
- Default first shot can read as high risk.
- Wind-lane language needs to explain what the lane does.
- Forecast uncertainty may be too large on first-drive defaults.

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
