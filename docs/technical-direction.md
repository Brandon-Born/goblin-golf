# Technical Direction

## Recommended Stack

Use Phaser with TypeScript and Vite for the first playable prototype.

Phaser is the recommended starting point because Goblin Golf is currently a 2D web game with multiple scenes, character selection, camera changes, input handling, animated sprites, simple physics, and UI overlays. Phaser provides those game-specific systems directly, which should reduce custom infrastructure during the prototype.

Recommended baseline:

- Phaser for the game runtime
- TypeScript for game logic and maintainability
- Vite for local development and bundling
- Canvas-based game scene with lightweight DOM only where it helps menus or accessibility
- Landscape-first layout with pointer and touch-friendly input

## Why Phaser Over Lower-Level Rendering

PixiJS is a strong rendering engine, but it is lower-level. It is a good fit when the project needs maximum rendering control and is willing to build more game systems manually.

For Goblin Golf, the scaling risk is not raw rendering. The scaling risk is organizing scenes, inputs, cameras, shot states, animation sequencing, assets, and physics rules as the game grows. Phaser gives the project a more complete game framework from the start.

## Initial Architecture

Use scenes that match the player flow:

- Boot scene
- Preload scene
- Title scene
- Character select scene
- Hole scene
- Putting scene or putting mode inside the hole scene
- Score summary scene

For the proof of concept, putting can start as a mode inside the hole scene. If it grows into a richer mini game, move it into its own scene.

## Camera Direction

Use a hybrid camera model:

- Behind-the-goblin view during shot setup
- Top-down follow view during long disc flight
- Side-view or basket-focused view for putting

This gives the shot setup a sports-game feel while keeping flight readable. The top-down view should prioritize landing position, hazards, wind influence, and the basket location.

Camera framing should be designed for the 1280x720 landscape viewport first. Each camera mode should reduce UI clutter and prioritize the current action while keeping the right-side HUD clear of the playfield.

## Viewport Target

The current prototype treats a landscape desktop browser viewport as the primary platform.

Recommended assumptions:

- 1280x720 landscape is the default.
- Mouse and touch input should both work.
- Controls should use clicks, taps, and drags.
- Primary controls should live in the right-side HUD outside the playfield.
- Game systems should avoid requiring precise cursor-only control.
- Shot release and putting should avoid timing-based mechanics.
- Performance should stay lightweight enough for modest browser hardware.

## Physics Direction

Use light arcade physics instead of full disc simulation.

The first implementation should model only the behavior players can clearly understand:

- Power affects carry distance.
- Aim controls initial direction.
- Wind pushes flight and changes distance.
- Disc type adjusts range, control, and stability.
- Hyzer and anhyzer adjust curve shape.
- Character stats modify distance, control, wind resistance, and putting forgiveness.

The system should be deterministic enough to tune, with misses explained by power, angle, wind, disc choice, lie context, and character stats rather than reflex timing.
