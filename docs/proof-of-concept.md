# Proof Of Concept Scope

## Objective

Create a playable vertical slice for a mobile-first web-based Goblin Golf prototype. The goal is not a full game; it is a focused experience that proves the main flow and feel on a phone-sized touch screen.

## Included Screens

### Title Screen

Purpose:

- Establish the game name and playful fantasy sports tone.
- Offer a clear start action.
- Optionally show idle goblin animation, a basket, flying discs, or the first course background.
- Fit naturally in portrait orientation.

Minimum actions:

- Start game

Nice-to-have actions:

- Options
- Credits
- Sound toggle

### Goblin Select

Purpose:

- Let the player choose between three goblins.
- Preview each goblin's play style.
- Make the selection feel expressive, not purely statistical.
- Keep comparison readable on a narrow screen.

Minimum content per goblin:

- Name
- Portrait or full-body sprite
- Short personality line
- Core stats
- Play style label

### Single Hole

Purpose:

- Demonstrate the main shot loop from tee to basket.
- Show how power, direction, wind, disc selection, and release angle combine.
- Trigger putting mode near the basket.
- Make shot controls usable with touch input.

Minimum elements:

- Tee position
- Basket position
- Fairway or playable terrain
- Out-of-bounds or rough area
- At least one fantasy hazard with clear disc golf rules behavior
- Wind indicator
- Shot setup UI
- Stroke counter
- Lie marker after each throw
- Mobile-safe touch controls

### Putting Mini Game

Purpose:

- Make short-range basket play feel mechanically different from drives and approaches.
- Add tension at the end of the hole.
- Keep the interaction accessible by using a small physics challenge rather than another full shot-control system.

Minimum elements:

- Side-view or basket-focused camera
- Short putting interaction built around aim and touch
- Wind or wobble influence if useful
- Make/miss result
- Score completion

## Out Of Scope For First Prototype

- Full 18-hole course
- Multiplayer
- Online leaderboards
- Character progression
- Shop, cosmetics, or unlock economy
- Advanced disc inventory management
- Full rules simulation beyond basic scoring, lie, OB, relief, and holing out
- Complex terrain physics

## Recommended First Milestone

The first milestone should be a non-playable or lightly interactive flow:

1. Title screen
2. Start button
3. Goblin select
4. Static single-hole scene
5. Placeholder mobile shot UI

## Recommended Second Milestone

The second milestone should make the hole playable:

1. Basic aiming
2. Power meter
3. Disc flight arc
4. Landing position
5. Stroke count
6. Putting mode trigger
7. Touch input support

## Recommended Third Milestone

The third milestone should improve game feel:

1. Wind effects
2. Disc selection
3. Hyzer/anhyzer angle
4. Goblin-specific stat modifiers
5. Simple score summary
6. Animations, sounds, and UI polish
