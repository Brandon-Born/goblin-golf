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

## Fantasy Physics Modifiers

These questions apply to the Hex Spiral and Runic Maw mechanics planned for future holes. See `docs/core-mechanics.md` for the full design intent.

- **Slingshot carry bonus:** Should the Runic Maw slingshot be modeled as a distance multiplier on the existing shot calculation, or as a second carry segment appended after the transition zone? A multiplier is simpler but may feel discontinuous at the visible landing point.
- **Disc speed proxy:** The slingshot mechanic requires comparing disc speed against the Maw's pull. Should this use `effectivePower * disc.distance` as a speed proxy, or should discs get an explicit speed stat? An explicit stat has more design surface; a proxy avoids a new stat screen element.
- **Forecast reveal for gravity well pull radius:** Should the forecast show the pull radius as a circle overlay on the course (always visible) or only when the player's shot route crosses the influence zone? Always visible is more learnable; route-gated reveal rewards Wind Read stat investment.
- **Hex Spiral route sampling:** The current wind zone system samples 8 points along the route. A vortex whose effect varies by distance from center may need more samples or a different influence model. Decide before implementing.
- **Rule interaction at overlap:** If a route passes through both a Hex Spiral outer ring and a Runic Maw transition zone on the same shot, how are the forces composed? Additive vectors, dominant-force-wins, or sequential?
- **OB vs. scramble for pit center lies:** Should a Runic Maw pit-center landing apply a penalty stroke + relief point (same as OB), or a scramble lie inside the pit with no penalty stroke but heavy control penalty? The OB mapping is simpler and maps cleanly to existing rules; the scramble-in-pit creates a more interesting recovery shot.

## Layout Format

- Decided: design for a 1280x720 landscape browser viewport first.
- Decided: mobile portrait is not a current target.
- Decided: leave PWA installability for later.
