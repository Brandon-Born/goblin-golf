# Open Questions

These questions do not need answers before the documentation can move forward, but they should guide the next design pass.

## Game Format

- Decided: use a hybrid camera with behind-the-goblin shot setup, top-down long-flight view, and side-view or basket-focused putting.
- Recommended: use light arcade physics rather than a full simulation.
- Open: should the first hole be fantasy-themed from the start, or a simple grassy test course with fantasy props?

## Controls

- Decided: mobile touch input is the primary target.
- Should power and accuracy use one combined timing meter or separate inputs?
- Should release angle be selected before the throw or controlled during the timing interaction?

## Putting

- Decided: putting should be a small accessible physics challenge.
- Should close putts ever be automatic, or should every basket attempt be played?
- How much should wind matter while putting?

## Characters

- Are the three starting goblins close to the intended tone?
- Should each goblin have a special ability, or should differences stay stat-based for now?
- Should character names lean sillier, sportier, or more fantasy-like?

## Rules And Tone

- Decided: follow competitive disc golf rules closely, using PDGA/DGPT-style scoring, lies, OB, relief, and penalties.
- Decided: fantasy hazards should be whimsical in style but clear in rules behavior.
- Open: should the first hole include only OB and rough, or should it also introduce a drop zone?
- Open: should the course include fantasy obstacles such as mushrooms, ruins, carts, traps, or goblin spectators?

## Art Direction

- Decided: use high-quality pixel art that pays homage to 16-bit sports games without being limited by old hardware constraints.
- Open: should the first art pass use generated pixel-art-inspired assets, hand-made placeholder sprites, or simple readable shapes before final art?
- Open: should characters use larger portrait art during selection and smaller sprites during gameplay?

## Web Prototype

- Recommended: build the first prototype with Phaser, TypeScript, and Vite.
- Recommended: prioritize a small but scalable game architecture, especially scene flow, shot state, and tuning data.
- Should the initial art be placeholder shapes, generated bitmap art, pixel art, or hand-drawn vector sprites?

## Mobile Format

- Decided: design for mobile web first.
- Recommended: portrait orientation should be the default prototype format.
- Open: should landscape be supported as an alternate mode for the hole view?
- Open: should the game be installable as a Progressive Web App in an early milestone?
