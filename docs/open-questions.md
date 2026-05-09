# Open Questions

These questions do not need answers before the documentation can move forward, but they should guide the next design pass.

## Game Format

- Decided: use a hybrid camera with behind-the-goblin shot setup, top-down long-flight view, and side-view or basket-focused putting.
- Recommended: use light arcade physics rather than a full simulation.
- Open: should the first hole be fantasy-themed from the start, or a simple grassy test course with fantasy props?

## Controls

- Should the prototype target mouse only, keyboard, touch, or gamepad as well?
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

- Should the game follow real disc golf scoring closely, or use arcade scoring bonuses?
- Should hazards add strokes, create funny recovery shots, or both?
- Should the course include fantasy obstacles such as mushrooms, ruins, carts, traps, or critter spectators?

## Web Prototype

- Recommended: build the first prototype with Phaser, TypeScript, and Vite.
- Recommended: prioritize a small but scalable game architecture, especially scene flow, shot state, and tuning data.
- Should the initial art be placeholder shapes, generated bitmap art, pixel art, or hand-drawn vector sprites?
