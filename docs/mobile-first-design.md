# Layout and UX Design

Goblin Golf's current prototype targets a **landscape desktop viewport (1280×720)**. The design should stay readable and approachable, with controls that work well for both mouse and touch input on a wide screen.

## Target Format

Current prototype defaults:

- Landscape orientation, 1280×720 canvas (`Scale.FIT + CENTER_BOTH`)
- Touch-friendly controls where possible (touch events supported, `hasTouch: true` in tests)
- Large readable UI elements
- Short session length
- Fast load time

## Layout Strategy

All scenes derive positions from `this.scale.width / this.scale.height` rather than hardcoded pixel values. `HoleScene` exposes a `Layout` object built in `create()` that defines:

- `playLeft`, `playRight`, `playTop`, `playBottom`, `playWidth`, `playHeight` — the active play area margins
- `cx`, `cy` — canvas center
- `fairwayH` — fairway corridor height
- `puttBasket` — putting view basket position

`worldToScreen()` uses this layout to project hole-data coordinates into canvas pixels. All course rendering flows through it.

## Screen Priorities

Each mode shows only what the player needs right now.

### Shot Setup

Primary information:

- Lie position and quality
- Basket direction and distance
- Aim indicator and forecast zone
- Wind indicator
- Selected disc and release angle
- Power control

Secondary information:

- Stroke count
- Hole par

The right-panel HUD (`.hole-controls`) is DOM-based and positioned outside the play area (`right: 180px, width: 280px`). It does not overlap the fairway.

### Disc Flight

Primary information:

- Disc position and arc
- Landing area
- Basket direction
- Wind effect

The UI pulls back during flight so the player can read the result.

### Putting

Primary information:

- Basket
- Crosshair aim (drag to set angle)
- Distance-scaled wind drift

Putting is a focused mini-game. The putting view uses a fixed viewport (`puttBasket` centered at ~53% × 37% of canvas) so the basket is always readable.

## Input Controls

Controls are designed around drag interactions. Mouse and touch are both supported.

### Shot setup

- **Aim**: drag vertically on the canvas — `dy` from course-center Y controls aim offset (±42° clamp)
- **Power**: drag the power pad (DOM element, right panel) — vertical drag, bottom = max power
- **Disc / release angle**: tap buttons in the right panel to cycle

### Putting

- **Aim**: drag the crosshair (touch/mouse) to set putt angle
- **Power**: release-putt button triggers the shot

### Aim axis note

The hole corridor runs left→right (tee at x≈160, basket at x≈880 in world space). The **perpendicular aim axis is Y**. Dragging the canvas downward (increasing Y) aims the disc toward the south/right; dragging upward aims toward north/left. The base aim is computed from `atan2(basket − lie)` so it always points down-course regardless of lie position.

## UI Sizing

- Important touch targets: at least 44×44 CSS pixels
- Primary controls in the right panel, outside the fairway
- Critical information (wind, distance, power) in the right panel, not overlapping the playfield
- Text is short and readable at 1280×720

## Performance

Guidelines:

- Fixed internal resolution (1280×720) with responsive scaling via `Scale.FIT`
- Modest decorative geometry (Phaser primitives, no external image assets)
- No expensive per-frame physics calculations — shots resolve in a single deterministic pass
- Keep the first playable hole small and asset-light

## Accessibility

- No timing windows for shot release or putting
- Wind and shot angle are visible on screen, not just numeric
- Aim, disc, and angle controls are labeled buttons
- Avoid color-only communication for shot quality or warnings
