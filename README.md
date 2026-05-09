# Goblin Golf

Goblin Golf is a lighthearted web-based disc golf game concept about mischievous goblins competing across fantasy courses. The initial proof of concept focuses on a title screen, three playable goblins, and one playable hole that demonstrates the core shot loop.

The intended feel is playful and approachable, with arcade sports energy: readable controls, expressive characters, surprising course hazards, and enough shot strategy to make each throw feel intentional.

The visual style should use polished pixel art that pays homage to classic 16-bit sports games without being limited by old hardware constraints. The rules should stay close to competitive disc golf, using PDGA/DGPT-style scoring, lies, out-of-bounds, relief, and penalties while letting the world stay whimsical.

## Documentation

- [Game Design Overview](docs/game-design.md)
- [Proof of Concept Scope](docs/proof-of-concept.md)
- [Core Mechanics](docs/core-mechanics.md)
- [Characters](docs/characters.md)
- [Art Direction](docs/art-direction.md)
- [Rules And Competition Direction](docs/rules-and-competition.md)
- [Technical Direction](docs/technical-direction.md)
- [Mobile-First Design](docs/mobile-first-design.md)
- [Open Questions](docs/open-questions.md)

## Initial Prototype Goal

Build a small playable slice that answers the most important question first: does choosing a goblin, shaping a disc golf throw, reacting to wind, and switching into a distinct putting mini game feel fun?

The prototype should be designed mobile-first, with portrait phone screens and touch input treated as the primary experience.

The first version should include:

- Title screen
- Goblin select with three character options
- One complete disc golf hole
- Drive/approach shot system using power, direction, wind, disc selection, and hyzer/anhyzer angle
- Separate putting mini game once the disc is near the basket
- Basic scoring for the hole
