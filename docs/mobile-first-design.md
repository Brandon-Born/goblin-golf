# Mobile-First Design

Goblin Golf should be designed primarily for mobile web play. Desktop support can exist later, but the proof of concept should assume a phone-sized screen, touch input, short sessions, and limited attention.

## Target Format

Recommended default:

- Portrait orientation only for the first prototype
- One-handed friendly controls where possible
- Touch-first interaction
- Large readable UI elements
- Short session length
- Fast load time

The game can support landscape later if it improves shot readability, but the first implementation should not add landscape-specific layout work.

## Screen Priorities

Mobile screens have limited space, so each mode should show only what the player needs right now.

### Shot Setup

Primary information:

- Goblin and lie position
- Basket direction
- Aim line or projected arc
- Wind indicator
- Selected disc
- Release angle
- Power control

Secondary information:

- Stroke count
- Hole par
- Distance to basket

### Disc Flight

Primary information:

- Disc position
- Landing area
- Basket direction
- Wind effect

The UI should pull back during disc flight so the player can read the result.

### Putting

Primary information:

- Basket
- Crosshair aim
- Power control
- Distance-scaled wind drift

Putting should avoid dense controls. The mini game should feel focused and readable on a small screen.

## Touch Controls

Controls should be designed around taps, holds, and drags.

Recommended control language:

- Drag to aim
- Tap to cycle disc
- Tap to cycle release angle
- Drag to set shot power
- Drag a crosshair to aim putts
- Set putt power deliberately

Avoid tiny buttons, hover-only behavior, and inputs that require precise cursor control.

## UI Sizing

Use large targets and clear spacing.

Guidelines:

- Important touch targets should be at least 44 by 44 CSS pixels.
- Primary controls should sit near the lower half of the screen.
- Critical information should not sit under the player's thumb.
- Text should be short and readable without zooming.
- Avoid crowding the shot screen with persistent panels.

## Performance

The prototype should run smoothly on mid-range mobile devices.

Guidelines:

- Prefer a fixed internal game resolution with responsive scaling.
- Keep particle effects modest.
- Limit full-screen transparency layers.
- Compress image assets.
- Avoid expensive physics calculations.
- Keep the first playable hole small and asset-light.

## Accessibility

The mobile version should support simple, forgiving input.

Guidelines:

- Do not require fast repeated tapping.
- Do not require timing windows for shot release or putting.
- Make wind and shot angle visible, not just numeric.
- Use icons with text labels for core controls until players learn them.
- Avoid color-only communication for shot quality, disc type, or warnings.
