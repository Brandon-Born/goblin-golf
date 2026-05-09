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

## Target Tone

The tone is light, colorful, and competitive without becoming mean-spirited. Goblins can be goofy, boastful, scrappy, and overconfident. The visual style should lean toward chunky shapes, readable silhouettes, exaggerated reactions, and playful fantasy sports presentation.

## Core Player Loop

1. Start from the title screen.
2. Select one of three goblins.
3. View the hole layout and conditions.
4. Choose a disc.
5. Aim the throw.
6. Set release angle: hyzer, flat, or anhyzer.
7. Set power and release timing.
8. Watch the disc flight and landing result.
9. Repeat until close enough to enter putting mode.
10. Complete the hole through the putting mini game.
11. Review score and return to menu or replay.

## Prototype Success Criteria

The first proof of concept is successful if it demonstrates:

- Character selection has immediate personality and mechanical implications.
- Throw setup is readable before release.
- Wind and disc choice visibly affect the result.
- Hyzer/anhyzer angle is understandable through flight behavior.
- Putting feels like a distinct mode rather than a shorter version of driving.
- One hole can be completed from title screen to score summary.

