# Game Design Overview

## High Concept

Goblin Golf is a web-based arcade disc golf game where goblins play through whimsical fantasy courses using a mix of skill shots, character quirks, and unpredictable environmental conditions.

The game starts from a familiar golf structure: pick a character, select a hole, take shots from tee to basket, and try to finish under par. The disc golf layer adds disc selection, wind reading, shot angle, and landing control. The goblin theme adds personality, comedic reactions, odd equipment, and fantasy course hazards.

## Design Pillars

### Easy To Understand

Players should understand the current shot at a glance: where the basket is, where the disc is likely to fly, what the wind is doing, and how much power they are applying.

### Skillful But Forgiving

Shot planning should matter, but the first prototype should not punish players with simulation-heavy complexity. The goal is expressive arcade physics, not a strict disc flight simulator.

### Characterful

Each goblin should feel meaningfully different through stats, animation, voice/text flavor, and shot tendencies.

### Short Play Sessions

The proof of concept should support a complete hole in a few minutes. Later versions can expand to full courses, tournaments, unlocks, and challenge modes.

### Rewarding Course Reading

Fantasy courses should function as spatial puzzles with multiple valid lines. Every hole should have at least one obvious safe route, one high-risk shortcut, and at least one fantasy modifier — a magical vortex, gravity well, or enchanted terrain — that rewards players who read it correctly.

The design goal is the same as a well-placed sand trap or water hazard in traditional golf: the safe line avoids the hazard; the expert line uses it. Players who understand a modifier can pick a line that beginners skip and feel clever for doing so. Fantasy physics modifiers are not just decoration — they are puzzle elements that make routes interesting.

Crucially, fantasy modifiers should extend familiar disc golf concepts rather than invent new hidden rules. A swirling vortex behaves like an unusual rotational wind lane. A gravity well behaves like a pull-slope that also carries a slingshot bonus for the right line. Players who already understand wind and disc flight should be able to read and use these modifiers with some experimentation, not a tutorial.

## Target Tone

The tone is light, colorful, and competitive without becoming mean-spirited. Goblins can be goofy, boastful, scrappy, and overconfident.

The game should feel whimsical in style but serious in rules. Course presentation, character animation, and fantasy hazards can be playful, but scoring, lies, out-of-bounds, relief, and putting should feel recognizable to disc golf players.

The visual style should use high-quality pixel art that pays homage to classic 16-bit sports games without being restricted to historical 16-bit limitations. Use readable silhouettes, expressive animation, richer palettes, and modern UI clarity.

## Core Player Loop

1. Start from the title screen.
2. Select one of three goblins.
3. View the hole layout and conditions.
4. Choose a disc.
5. Aim the throw.
6. Set release angle: hyzer, flat, or anhyzer.
7. Set power with a drag interaction.
8. Watch the disc flight and landing result.
9. Repeat until close enough to enter putting mode or receive an automatic tap-in.
10. Complete the hole through the basket-focused putting mini game.
11. Review score and return to menu or replay.

## Prototype Success Criteria

The first proof of concept is successful if it demonstrates:

- Character selection has immediate personality and mechanical implications.
- Throw setup is readable before release.
- Wind and disc choice visibly affect the result.
- Hyzer/anhyzer angle is understandable through flight behavior.
- Shot execution is accessible and does not depend on timing-based release mechanics.
- Putting feels like a distinct crosshair-and-power mode rather than a shorter version of driving.
- A full nine-hole round can be completed from title screen to the final score summary, with an intermission scorecard between holes.
- Competitive disc golf basics are respected, especially stroke count, lie, par, OB, relief, and holing out.
- The art direction reads as polished pixel art on a mobile screen.
