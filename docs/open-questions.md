# Resolved And Open Questions

These notes track which early design questions have been resolved for the first implementation pass and which can remain open for later.

## Game Format

- Decided: use a hybrid camera with behind-the-goblin shot setup, top-down long-flight view, and side-view or basket-focused putting.
- Recommended: use light arcade physics rather than a full simulation.
- Decided: make the first hole fantasy-themed from the start.

## Controls

- Decided: mobile touch input is the primary target.
- Decided: do not use timing-based mechanics.
- Decided: use drag power for drives and approaches.
- Decided: select release angle before the throw with hyzer / flat / anhyzer controls.

## Putting

- Decided: putting should be a small accessible physics challenge.
- Decided: use basket-focused crosshair aim and deliberate power.
- Decided: use automatic tap-ins for very close putts.
- Decided: make wind distance-scaled while putting.

## Characters

- Decided: keep the three documented starting goblins.
- Decided: keep differences stat-based only for the first prototype.
- Later: revisit names and special abilities after the first playable hole is working.

## Rules And Tone

- Decided: follow competitive disc golf rules closely, using PDGA/DGPT-style scoring, lies, OB, relief, and penalties.
- Decided: fantasy hazards should be whimsical in style but clear in rules behavior.
- Decided: start with OB relief only, no drop zones.
- Decided: include ruins, mushrooms, and scattered bones on hole 1.

## Art Direction

- Decided: use high-quality pixel art that pays homage to 16-bit sports games without being limited by old hardware constraints.
- Decided: use readable gameplay placeholders first.
- Decided: generate pixel-art-inspired title and character assets after the scaffold exists.
- Later: decide whether characters need separate large portraits and small gameplay sprites.

## Web Prototype

- Recommended: build the first prototype with Phaser, TypeScript, and Vite.
- Recommended: prioritize a small but scalable game architecture, especially scene flow, shot state, and tuning data.
- Decided: build an implementation brief first, then scaffold later.

## Mobile Format

- Decided: design for mobile web first.
- Decided: portrait orientation only for the first prototype.
- Decided: leave PWA installability for later.
