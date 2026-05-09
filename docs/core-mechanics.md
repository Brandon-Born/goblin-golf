# Core Mechanics

## Shot Types

The prototype should support two major shot modes:

- Drive and approach shots
- Putting mini game

Drives and approaches use the same base controls, with distance and disc behavior doing most of the differentiation. Putting should switch to a distinct interaction once the disc is close enough to the basket.

## Drive And Approach System

### Direction

The player aims left or right from the current lie. On mobile, this should be controlled with a drag gesture or large touch region rather than small buttons. The UI should show a projected starting direction and, if possible, a rough expected flight path.

### Power

Power controls throw distance. The proof of concept should use a deliberate drag interaction:

- Drag farther to request more power.
- Show the selected power before release.
- Let the player confirm or release the throw without a reflex timing challenge.

The power interaction should be forgiving on touch screens and should not require rapid repeated taps or timing windows.

### Wind

Wind should be visible before the throw and affect disc flight in a readable way.

Recommended prototype behavior:

- Wind has direction and strength.
- Crosswind pushes the disc sideways.
- Headwind reduces distance and can exaggerate turn.
- Tailwind increases distance and can reduce lift.

### Disc Selection

The prototype can start with three disc categories:

| Disc | Role | Behavior |
| --- | --- | --- |
| Driver | Long throws | High distance, harder to control |
| Midrange | Balanced throws | Medium distance, stable control |
| Putter | Short throws | Low distance, high accuracy |

Each disc can be represented by a small set of arcade stats:

- Distance
- Stability
- Control
- Wind resistance

Disc selection should use large touch targets, such as a compact carousel or three-button tray near the lower portion of the screen.

### Release Angle

Release angle changes the disc's flight shape.

| Angle | Description | Expected Result |
| --- | --- | --- |
| Hyzer | Outer edge angled downward | Curves harder in the natural fade direction |
| Flat | Neutral release | Most predictable standard flight |
| Anhyzer | Outer edge angled upward | Turns against natural fade before fading back |

For the first prototype, the player does not need advanced disc golf terminology beyond the labels. The UI should make the flight difference visible through icons, preview arcs, or quick animation.

Release angle should be selectable with a simple mobile control, such as a three-state segmented button for hyzer, flat, and anhyzer.

### Accuracy

Accuracy should come from deliberate aim, character stats, disc control, wind, and lie context. The first prototype should not use timing-based release accuracy. Misses can still shift direction, reduce distance, or add wobble, but those results should come from understandable shot choices and stat modifiers.

## Putting Mini Game

Putting should feel separate from driving. It should be shorter, more focused, and basket-centric.

Recommended prototype direction:

- Use a side-view or basket-focused view.
- Present a small physics challenge rather than another full shot setup.
- Keep the player input accessible and limited.
- Let the disc travel physically enough that misses feel understandable.
- Resolve quickly as make, chain hit, rim hit, or miss.

Recommended putting interaction:

1. Camera shifts to a basket-focused view.
2. The game shows a crosshair aimed at or near the basket.
3. Player adjusts aim within a readable range using a drag or thumb-friendly control.
4. Player sets power deliberately.
5. The disc flies with light physics, including gravity, chain collision, and wind drift.
6. Result depends on aim, power, distance, goblin putting stat, and distance-scaled wind.

Putting should avoid adding too many new variables. Since normal shots already use direction, power, wind, disc selection, and release angle, putting should reduce the problem to crosshair aim and power with readable physical feedback. Very close putts should become automatic tap-ins.

## Character Stats

Suggested starting stats:

- Power
- Accuracy
- Spin
- Wind Read
- Putting

Stats should be simple enough to display during character select and meaningful enough to affect the hole.

## Scoring

The first hole should use familiar golf scoring:

- Each throw adds one stroke.
- The hole ends when the disc lands in the basket.
- Display strokes and relation to par.

For the first prototype, use one par value for the single hole. Par 3 is recommended.

## Rules Fidelity

The game should stay close to competitive disc golf rules for normal play:

- Throws are counted as strokes.
- The next throw is taken from the lie established by the previous throw.
- The hole is complete only when the disc is in the basket.
- Out-of-bounds adds a penalty stroke.
- Relief should be represented clearly. Drop zones can be added later if a future hole needs one.

Fantasy hazards should map to understandable disc golf concepts instead of creating hidden rule exceptions.
