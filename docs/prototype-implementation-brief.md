# Prototype Implementation Brief

This brief captures the startup decisions for the first Goblin Golf implementation pass.

## Scope

Build a full vertical slice for hole 1:

- Title screen
- Three-goblin character select
- One playable fantasy disc golf hole
- Drive and approach shot loop
- Basket-focused putting interaction
- Auto tap-ins for very close putts
- Score summary

The goal is a clean, playable prototype, not final content polish.

## Branch

Use a feature branch for implementation:

```text
prototype/hole-1
```

## Stack

Use the documented recommended stack:

- Phaser
- TypeScript
- Vite

The current prototype should stay focused on the 1280x720 landscape viewport.

## Testing

Automated testing is a high priority for the first implementation pass. Do not treat tests as deferred polish.

Set up both test layers during the initial scaffold:

- Unit tests for deterministic game logic
- Playwright tests for browser-visible behavior in the landscape viewport

Unit tests should cover the systems that decide gameplay outcomes:

- Shot model calculations for power, aim, release angle, disc type, wind, and character stat modifiers
- Rules and scoring for strokes, lies, OB penalties, relief, tap-ins, and hole completion
- Data validation for characters, discs, and hole 1 configuration

Playwright tests should cover the player-visible prototype flow:

- Landscape viewport rendering and canvas scaling
- Title screen start flow
- Character selection and confirmation
- Hole scene HUD readability
- Touch or pointer interactions for aim, power, disc selection, release angle, and putting
- A repeatable smoke test that reaches the score summary after completing hole 1

Each feature phase should include the relevant unit and Playwright coverage before it is considered done.

## Art Direction

Use a mixed first art pass:

- Gameplay uses readable placeholders.
- Title and character presentation can receive generated pixel-art-inspired bitmap art after the scaffold exists.
- Hole 1 should feel fantasy-themed from the start.

Hole 1 should include ruins, mushrooms, and scattered bones as environmental flavor. Obstacles and hazards must remain readable during play.

## Characters

Keep the three documented starting goblins:

- Grib Ninesnatch: balanced beginner
- Morga Mosswhack: control specialist
- Skrak Boomarm: power thrower

Goblin differences should be stat-based only for the first prototype. Do not add active special abilities yet.

Stats should affect gameplay through simple modifiers such as:

- Distance
- Control
- Wind resistance
- Putting forgiveness

## Controls

The game should avoid timing-based mechanics. This is an accessibility requirement.

Drive and approach shots should be based on deliberate player choices:

- Aim
- Power
- Release angle
- Disc selection

Power should use a drag interaction. Release angle should be selected before the throw with a hyzer / flat / anhyzer control.

Character stats can affect the resulting flight, but they should not require reflex timing from the player.

## Putting

Putting should also follow the no-timing rule.

Use a basket-focused putting view where the player:

1. Aims at the basket with a crosshair.
2. Chooses power deliberately.
3. Releases the putt.

Wind may shift the disc in flight. Wind impact should be distance-scaled:

- Minimal or irrelevant for very short tap-ins
- Noticeable on longer putts

Very close putts should be automatic tap-ins.

## Rules

Start with simple out-of-bounds relief only:

- OB adds a penalty stroke.
- The next lie is placed at a clear relief point.
- Do not add drop zones in the first pass.

The prototype should still preserve basic disc golf structure:

- Every throw counts as a stroke.
- The next throw starts from the lie.
- The hole ends only when the disc is in the basket or an auto tap-in is granted.
- Score is shown relative to par.

## Camera

Use the documented hybrid camera model:

- Behind-goblin setup view for shot planning
- Top-down view for long disc flight
- Basket-focused view for putting

All camera modes must support the 1280x720 landscape play space first.

## Deferred

Leave these out of the first implementation pass:

- PWA installability
- Sound
- Multiplayer
- Multiple holes
- Progression systems
- Shops or unlocks
- Advanced disc inventories
- Full PDGA edge-case simulation
- Alternate mobile portrait layout

## Next Implementation Step

Create branch `prototype/hole-1`, scaffold the Vite + TypeScript + Phaser app, add unit and Playwright test infrastructure, and implement the vertical slice with readable gameplay placeholders before generating title or character art.
