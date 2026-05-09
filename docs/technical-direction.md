# Technical Direction

## Recommended Stack

Use Phaser with TypeScript and Vite for the first playable prototype.

Phaser is the recommended starting point because Goblin Golf is currently a 2D web game with multiple scenes, character selection, camera changes, input handling, animated sprites, simple physics, and UI overlays. Phaser provides those game-specific systems directly, which should reduce custom infrastructure during the prototype.

Recommended baseline:

- Phaser for the game runtime
- TypeScript for game logic and maintainability
- Vite for local development and bundling
- Canvas-based game scene with lightweight DOM only where it helps menus or accessibility
- Mobile-first layout and touch-first input

## Why Phaser Over Lower-Level Rendering

PixiJS is a strong rendering engine, but it is lower-level. It is a good fit when the project needs maximum rendering control and is willing to build more game systems manually.

For Goblin Golf, the scaling risk is not raw rendering. The scaling risk is organizing scenes, inputs, cameras, shot states, animation timing, assets, and physics rules as the game grows. Phaser gives the project a more complete game framework from the start.

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

Camera framing should be designed for portrait mobile first. Each camera mode should reduce UI clutter and prioritize the current action over showing the entire hole at once.

## Mobile Target

The first prototype should treat mobile web as the primary platform.

Recommended assumptions:

- Portrait orientation is the default.
- Touch is the default input method.
- Controls should use taps, holds, and drags.
- Primary controls should be reachable near the lower half of the screen.
- Game systems should avoid requiring precise cursor control.
- Performance should target mid-range phones, not only desktop browsers.

## Physics Direction

Use light arcade physics instead of full disc simulation.

The first implementation should model only the behavior players can clearly understand:

- Power affects carry distance.
- Aim controls initial direction.
- Wind pushes flight and changes distance.
- Disc type adjusts range, control, and stability.
- Hyzer and anhyzer adjust curve shape.
- Character stats modify forgiveness and extremes.

The system should be deterministic enough to tune, with just enough release imperfection to make timing and character stats matter.
