# Implementation Plan

This plan turns the current design documentation into a practical build order for the first playable Goblin Golf prototype.

## Primary Goal

Build a mobile-first Phaser prototype that proves the core experience:

- Title screen
- Three-goblin character select
- One playable disc golf hole
- Drive and approach shot controls
- Distinct putting mini game
- Basic PDGA/DGPT-style scoring, lies, OB, relief, and holing out
- High-quality pixel-art-inspired presentation

Implementation should happen on branch `prototype/hole-1`. Shot release and putting must avoid timing-based mechanics.

## Recommended Build Order

### Phase 1: Project Scaffold

Create the technical foundation.

Deliverables:

- Vite + TypeScript + Phaser project
- Mobile-first canvas sizing
- Portrait-oriented layout baseline
- Boot, preload, title, character select, hole, and score scenes
- Basic asset folder structure

Acceptance checks:

- App runs locally in a browser.
- Canvas scales correctly at common mobile viewport sizes.
- Scene transitions work from title to character select to hole.

### Phase 2: Title Screen

Create the first impression and entry point.

Deliverables:

- Pixel-art-inspired title screen
- Large touch-friendly start button
- Simple animated background or idle course scene
- No sound controls in the first pass

Acceptance checks:

- Start action is obvious on a phone screen.
- Text is readable without zooming.
- Nothing important sits under browser UI or unsafe screen areas.

### Phase 3: Character Select

Implement selection between the three starting goblins.

Deliverables:

- Three selectable character cards or carousel entries
- Name, portrait, play style, short personality line, and stats
- Confirm action
- Selected character passed into the hole scene

Acceptance checks:

- Each character is readable on a narrow screen.
- Selection clearly changes state.
- Stats and play styles match [Characters](characters.md).

### Phase 4: Hole Scene Foundation

Build the first hole as a readable play space.

Deliverables:

- Tee, fairway, basket, rough, OB, and at least one fantasy hazard
- Ruins, mushrooms, and scattered bones as hole 1 flavor
- Behind-the-player shot setup framing
- Top-down flight framing
- Stroke counter, par, distance to basket, and wind indicator
- Lie marker after each throw

Acceptance checks:

- The player can understand the hole objective immediately.
- OB and playable areas are visually distinct.
- The camera modes support portrait play.

### Phase 5: Shot Model

Implement drive and approach mechanics.

Deliverables:

- Aim control using touch drag or large touch region
- Power input using a drag interaction
- Disc selection: driver, midrange, putter
- Release angle selection: hyzer, flat, anhyzer
- Wind influence
- Lightweight deterministic flight model
- Character stat modifiers

Acceptance checks:

- Power, aim, wind, disc type, and release angle visibly affect the throw.
- The shot preview or aim line gives enough information before release.
- Misses feel explainable rather than random.

### Phase 6: Rules And Scoring

Make the hole behave like disc golf.

Deliverables:

- Stroke count incremented on throws
- Lie placement after legal throws
- OB detection and one-stroke penalty
- Simple OB relief position support
- Hole completion when the disc is in the basket or an automatic tap-in is granted
- Score summary showing strokes and relation to par

Acceptance checks:

- Normal play follows tee-to-lie-to-basket flow.
- OB feedback is concise and clear.
- Scoring is consistent across replayed attempts.

### Phase 7: Putting Mini Game

Add the distinct close-range mode.

Deliverables:

- Trigger putting mode near the basket
- Basket-focused camera
- Crosshair aim and deliberate power interaction
- Distance-scaled wind influence
- Automatic tap-ins for very close putts
- Light physics for putt travel
- Make, chain hit, rim hit, and miss outcomes

Acceptance checks:

- Putting feels different from drives and approaches.
- The interaction is accessible on touch screens.
- A miss communicates why it missed.

### Phase 8: Game Feel Pass

Improve the prototype without expanding scope.

Deliverables:

- Pixel-art placeholder polish or first-pass custom assets
- Goblin idle, throw, success, and miss reactions
- Wind, OB, and score feedback
- Mobile performance pass

Acceptance checks:

- The prototype communicates the intended lighthearted tone.
- The rules still feel serious and readable.
- The hole can be completed smoothly in a short mobile session.

## Suggested Folder Structure

```text
src/
  main.ts
  game/
    config.ts
    scenes/
      BootScene.ts
      PreloadScene.ts
      TitleScene.ts
      CharacterSelectScene.ts
      HoleScene.ts
      ScoreScene.ts
    data/
      characters.ts
      discs.ts
      hole-one.ts
    systems/
      shotModel.ts
      rules.ts
      wind.ts
      mobileInput.ts
    ui/
      controls.ts
      buttons.ts
      hud.ts
assets/
  sprites/
  backgrounds/
  ui/
```

Putting can start inside `HoleScene.ts`. Move it into a dedicated scene only if it becomes large enough to justify the split.

## Resolved Startup Decisions

These decisions have been made for the first implementation pass:

- Use branch `prototype/hole-1`.
- Build a full vertical slice.
- Use readable gameplay placeholders first.
- Add generated pixel-art-inspired title and character art after the scaffold exists.
- Keep the three documented goblins and make differences stat-based only.
- Use no timing-based mechanics.
- Use drag power and selected release angle for drives and approaches.
- Use crosshair aim, deliberate power, distance-scaled wind, and auto tap-ins for putting.
- Start with OB relief only, no drop zones.
- Make hole 1 fantasy-themed with ruins, mushrooms, and scattered bones.
- Support portrait orientation only.
- Leave PWA installability and sound for later.

## Do Not Expand Scope Yet

Avoid adding these until the first hole is playable:

- Multiple holes
- Multiplayer
- Progression systems
- Shops or unlocks
- Advanced disc inventories
- Full PDGA edge-case simulation
- Desktop-specific UI
