# Goblin Golf

Goblin Golf is a lighthearted web-based disc golf game concept about mischievous goblins competing across fantasy courses. It currently plays as a full nine-hole round: a title screen, three playable goblins, and nine holes (par 30) with hole-to-hole progression, an intermission scorecard, and a final round summary. The proof of concept began as a single hole demonstrating the core shot loop, documented in the planning briefs below.

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
- [Layout and UX Design](docs/mobile-first-design.md)
- [Implementation Plan](docs/implementation-plan.md)
- [Prototype Implementation Brief](docs/prototype-implementation-brief.md)
- [Product Backlog](docs/product-backlog.md)
- [Open Questions](docs/open-questions.md)

## Initial Prototype Goal

Build a small playable slice that answers the most important question first: does choosing a goblin, shaping a disc golf throw, reacting to wind, and switching into a distinct putting mini game feel fun?

The current prototype targets a landscape desktop viewport at 1280x720, with pointer and touch input both supported.

The first version should include:

- Title screen
- Goblin select with three character options
- One complete disc golf hole
- Drive/approach shot system using deliberate aim, drag power, wind, disc selection, and hyzer/anhyzer angle
- Separate basket-focused putting mini game with crosshair aim, power choice, distance-scaled wind, and auto tap-ins
- Basic scoring for the hole

The first playable prototype should not use timing-based release mechanics. Accessibility and deliberate shot planning take priority over reflex tests.
