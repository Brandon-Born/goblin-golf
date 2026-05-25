import type { Character, Disc, HoleConfig } from "./types";

const STAT_MIN = 1;
const STAT_MAX = 5;

export const CHARACTERS = [
  {
    id: "grib-ninesnatch",
    name: "Grib Ninesnatch",
    playStyle: "Balanced beginner",
    quote: "Every shot was intentional.",
    palette: 0x5fbf5f,
    stats: {
      power: 3,
      accuracy: 3,
      spin: 3,
      windRead: 3,
      putting: 3,
    },
  },
  {
    id: "morga-mosswhack",
    name: "Morga Mosswhack",
    playStyle: "Control specialist",
    quote: "The grass already told me where this lands.",
    palette: 0x3f8f61,
    stats: {
      power: 2,
      accuracy: 5,
      spin: 3,
      windRead: 4,
      putting: 4,
    },
  },
  {
    id: "skrak-boomarm",
    name: "Skrak Boomarm",
    playStyle: "Power thrower",
    quote: "If it lands, it counts.",
    palette: 0xb85c38,
    stats: {
      power: 5,
      accuracy: 2,
      spin: 4,
      windRead: 2,
      putting: 2,
    },
  },
] as const satisfies readonly Character[];

export const DISCS = [
  {
    id: "driver",
    label: "Driver",
    distance: 340,
    stability: 2,
    control: 2,
    windResistance: 2,
  },
  {
    id: "midrange",
    label: "Midrange",
    distance: 245,
    stability: 3,
    control: 4,
    windResistance: 3,
  },
  {
    id: "putter",
    label: "Putter",
    distance: 145,
    stability: 4,
    control: 5,
    windResistance: 4,
  },
] as const satisfies readonly Disc[];

// Hole 1: "Ruincap Run" — the tutorial. Long straight par 3 with two scramble
// pinches and gentle wind. Established baseline; do not change its physics
// without also updating the golden values referenced in the e2e tests.
export const HOLE_1: HoleConfig = {
  id: "hole-1",
  name: "Ruincap Run",
  par: 3,
  tee: { x: 160, y: 180 },
  basket: { x: 880, y: 180 },
  bounds: { x: 48, y: 24, width: 864, height: 312 },
  reliefPoint: { x: 280, y: 180 },
  puttingRange: 90,
  tapInRange: 18,
  windZones: [
    {
      id: "left-tailwind",
      label: "Moss Tailwind",
      rect: { x: 80, y: 36, width: 200, height: 160 },
      directionDegrees: 0,
      strength: 1.7,
    },
    {
      id: "right-crosswind",
      label: "Ruin Crosswind",
      rect: { x: 170, y: 28, width: 160, height: 120 },
      directionDegrees: 90,
      strength: 2.1,
    },
  ],
  scrambleZones: [
    { id: "ruin-upper-left",  rect: { x: 220, y: 36,  width: 90,  height: 80 } },
    { id: "mush-mid",         rect: { x: 400, y: 250, width: 100, height: 68 } },
    { id: "ruin-upper-right", rect: { x: 600, y: 36,  width: 90,  height: 80 } },
  ],
  scenery: [
    { x: 265, y: 76,  sprite: "ruins" },
    { x: 645, y: 76,  sprite: "ruins" },
    { x: 450, y: 284, sprite: "ruins" },
    { x: 200, y: 265, sprite: "mushroom-red" },
    { x: 680, y: 80,  sprite: "mushroom-spotted" },
    { x: 90,  y: 50,  sprite: "tree", scale: 0.7 },
    { x: 540, y: 36,  sprite: "tree", scale: 0.55 },
    { x: 800, y: 290, sprite: "tree", scale: 0.7 },
  ],
};

// ─── Course: 9 holes with variety in length, shape, hazards, and wind ─────────
//
// Every hole shares the same playfield bounds (48..912 × 24..336). Variety
// comes from tee/basket placement, scramble-zone clusters that force route
// choices, and wind zones that alter the optimal line.
//
// World y increases downward (Phaser convention). The fairway corridor runs
// roughly y=93..267; anything outside that strip but inside bounds is rough
// (per getLieQuality in logic.ts).

const COURSE_BOUNDS: HoleConfig["bounds"] = { x: 48, y: 24, width: 864, height: 312 };

// Hole 2: short technical par 3. Mushroom-choked corridor. No wind — pure shape.
const HOLE_2: HoleConfig = {
  id: "hole-2",
  name: "Toadstool Twist",
  par: 3,
  tee: { x: 100, y: 180 },
  basket: { x: 480, y: 180 },
  bounds: COURSE_BOUNDS,
  reliefPoint: { x: 200, y: 180 },
  puttingRange: 90,
  tapInRange: 18,
  windZones: [],
  scrambleZones: [
    { id: "twist-pinch-upper", rect: { x: 240, y: 90,  width: 110, height: 60 } },
    { id: "twist-pinch-lower", rect: { x: 200, y: 230, width: 110, height: 70 } },
    { id: "twist-guardian",    rect: { x: 380, y: 120, width: 60,  height: 50 } },
  ],
  scenery: [
    { x: 290, y: 110, sprite: "mushroom-red",     scale: 1.0 },
    { x: 320, y: 130, sprite: "mushroom-spotted", scale: 0.85 },
    { x: 250, y: 255, sprite: "mushroom-spotted", scale: 1.0 },
    { x: 280, y: 280, sprite: "mushroom-red",     scale: 0.9 },
    { x: 410, y: 140, sprite: "mushroom-red",     scale: 0.85 },
    { x: 80,  y: 60,  sprite: "tree",             scale: 0.65 },
    { x: 600, y: 290, sprite: "tree",             scale: 0.7  },
    { x: 720, y: 60,  sprite: "tree",             scale: 0.6  },
  ],
};

// Hole 3: medium par 3 with a single big ruin pile blocking the middle.
// Tailwind in the back half rewards getting around the obstacle cleanly.
const HOLE_3: HoleConfig = {
  id: "hole-3",
  name: "Brittlebark Bend",
  par: 3,
  tee: { x: 140, y: 220 },
  basket: { x: 820, y: 140 },
  bounds: COURSE_BOUNDS,
  reliefPoint: { x: 320, y: 180 },
  puttingRange: 90,
  tapInRange: 18,
  windZones: [
    {
      id: "bend-tailwind",
      label: "Bramble Tailwind",
      rect: { x: 420, y: 80, width: 280, height: 160 },
      directionDegrees: 12,
      strength: 1.8,
    },
  ],
  scrambleZones: [
    { id: "bend-keep", rect: { x: 380, y: 155, width: 200, height: 90 } },
  ],
  scenery: [
    { x: 470, y: 195, sprite: "ruins",           scale: 0.95 },
    { x: 540, y: 200, sprite: "ruins",           scale: 0.85 },
    { x: 200, y: 70,  sprite: "tree",            scale: 0.75 },
    { x: 700, y: 290, sprite: "tree",            scale: 0.7  },
    { x: 60,  y: 80,  sprite: "tree",            scale: 0.6  },
    { x: 880, y: 290, sprite: "mushroom-spotted", scale: 0.85 },
    { x: 90,  y: 280, sprite: "mushroom-red",    scale: 0.8  },
  ],
};

// Hole 4: pure wind puzzle. Wide open fairway, no scramble. A strong headwind
// in the middle eats your carry; a calm pocket near the basket gives a window.
const HOLE_4: HoleConfig = {
  id: "hole-4",
  name: "Hollow Howl",
  par: 3,
  tee: { x: 120, y: 180 },
  basket: { x: 860, y: 180 },
  bounds: COURSE_BOUNDS,
  reliefPoint: { x: 280, y: 180 },
  puttingRange: 90,
  tapInRange: 18,
  windZones: [
    {
      id: "howl-headwind",
      label: "Hollow Headwind",
      rect: { x: 280, y: 80, width: 280, height: 200 },
      directionDegrees: 180,
      strength: 2.8,
    },
    {
      id: "howl-pocket",
      label: "Calm Pocket",
      rect: { x: 600, y: 70, width: 200, height: 110 },
      directionDegrees: 350,
      strength: 0.8,
    },
  ],
  scrambleZones: [],
  scenery: [
    { x: 220, y: 60,  sprite: "tree",             scale: 0.75 },
    { x: 420, y: 280, sprite: "tree",             scale: 0.75 },
    { x: 700, y: 60,  sprite: "tree",             scale: 0.7  },
    { x: 80,  y: 290, sprite: "tree",             scale: 0.65 },
    { x: 870, y: 70,  sprite: "mushroom-spotted", scale: 0.9  },
    { x: 850, y: 290, sprite: "mushroom-red",     scale: 0.8  },
  ],
};

// Hole 5: long par 4. Five scramble zones in a tight maze; a side drift wind
// nudges discs off line. Reading the route matters more than raw power.
const HOLE_5: HoleConfig = {
  id: "hole-5",
  name: "Ruin Gauntlet",
  par: 4,
  tee: { x: 80, y: 180 },
  basket: { x: 880, y: 180 },
  bounds: COURSE_BOUNDS,
  reliefPoint: { x: 280, y: 180 },
  puttingRange: 90,
  tapInRange: 18,
  windZones: [
    {
      id: "gauntlet-side",
      label: "Side Drift",
      rect: { x: 480, y: 30, width: 220, height: 130 },
      directionDegrees: 110,
      strength: 1.4,
    },
  ],
  scrambleZones: [
    { id: "gauntlet-a", rect: { x: 200, y: 60,  width: 80,  height: 70 } },
    { id: "gauntlet-b", rect: { x: 320, y: 230, width: 100, height: 80 } },
    { id: "gauntlet-c", rect: { x: 480, y: 80,  width: 90,  height: 70 } },
    { id: "gauntlet-d", rect: { x: 600, y: 220, width: 110, height: 90 } },
    { id: "gauntlet-e", rect: { x: 750, y: 70,  width: 80,  height: 70 } },
  ],
  scenery: [
    { x: 240, y: 95,  sprite: "ruins", scale: 0.8  },
    { x: 370, y: 270, sprite: "ruins", scale: 0.85 },
    { x: 525, y: 115, sprite: "ruins", scale: 0.8  },
    { x: 655, y: 265, sprite: "ruins", scale: 0.85 },
    { x: 790, y: 105, sprite: "ruins", scale: 0.8  },
    { x: 130, y: 60,  sprite: "tree",  scale: 0.6  },
    { x: 870, y: 60,  sprite: "tree",  scale: 0.6  },
    { x: 70,  y: 290, sprite: "tree",  scale: 0.65 },
  ],
};

// Hole 6: medium par 3 with a single very strong crosswind. The disc gets
// shoved sideways if you don't compensate; two narrow pinches near the basket
// punish the over-correction.
const HOLE_6: HoleConfig = {
  id: "hole-6",
  name: "Crossgust Canyon",
  par: 3,
  tee: { x: 160, y: 180 },
  basket: { x: 720, y: 180 },
  bounds: COURSE_BOUNDS,
  reliefPoint: { x: 280, y: 180 },
  puttingRange: 90,
  tapInRange: 18,
  windZones: [
    {
      id: "canyon-cross",
      label: "Canyon Crosswind",
      rect: { x: 260, y: 60, width: 340, height: 240 },
      directionDegrees: 90,
      strength: 3.2,
    },
  ],
  scrambleZones: [
    { id: "canyon-narrow-1", rect: { x: 560, y: 60,  width: 100, height: 70 } },
    { id: "canyon-narrow-2", rect: { x: 560, y: 230, width: 100, height: 80 } },
  ],
  scenery: [
    { x: 600, y: 95,  sprite: "ruins",            scale: 0.78 },
    { x: 605, y: 275, sprite: "ruins",            scale: 0.78 },
    { x: 100, y: 60,  sprite: "tree",             scale: 0.65 },
    { x: 200, y: 290, sprite: "tree",             scale: 0.7  },
    { x: 800, y: 70,  sprite: "mushroom-red",     scale: 0.85 },
    { x: 830, y: 290, sprite: "mushroom-spotted", scale: 0.8  },
  ],
};

// Hole 7: par 4 with a branching decision. The middle is blocked, forcing
// either the upper lane (tailwind, narrow) or lower lane (crosswind, wider).
const HOLE_7: HoleConfig = {
  id: "hole-7",
  name: "Forking Paths",
  par: 4,
  tee: { x: 100, y: 180 },
  basket: { x: 880, y: 180 },
  bounds: COURSE_BOUNDS,
  reliefPoint: { x: 280, y: 180 },
  puttingRange: 90,
  tapInRange: 18,
  windZones: [
    {
      id: "forking-upper-tailwind",
      label: "Upper Tailwind",
      rect: { x: 250, y: 40, width: 400, height: 110 },
      directionDegrees: 5,
      strength: 2.4,
    },
    {
      id: "forking-lower-cross",
      label: "Lower Crosswind",
      rect: { x: 250, y: 220, width: 400, height: 100 },
      directionDegrees: 75,
      strength: 2.0,
    },
  ],
  scrambleZones: [
    { id: "fork-middle-block", rect: { x: 290, y: 150, width: 290, height: 70 } },
    { id: "fork-near-basket",  rect: { x: 700, y: 140, width: 80,  height: 80 } },
  ],
  scenery: [
    { x: 360, y: 180, sprite: "ruins", scale: 0.95 },
    { x: 470, y: 185, sprite: "ruins", scale: 0.95 },
    { x: 555, y: 180, sprite: "ruins", scale: 0.85 },
    { x: 735, y: 180, sprite: "ruins", scale: 0.85 },
    { x: 80,  y: 60,  sprite: "tree",  scale: 0.65 },
    { x: 870, y: 60,  sprite: "tree",  scale: 0.65 },
    { x: 80,  y: 290, sprite: "tree",  scale: 0.65 },
    { x: 870, y: 290, sprite: "tree",  scale: 0.65 },
  ],
};

// Hole 8: medium par 3. A ring of mushrooms guards the basket on four sides —
// you have to thread one of the gaps. Mild diagonal drift adds a wrinkle.
const HOLE_8: HoleConfig = {
  id: "hole-8",
  name: "Spore Ring",
  par: 3,
  tee: { x: 140, y: 180 },
  basket: { x: 700, y: 200 },
  bounds: COURSE_BOUNDS,
  reliefPoint: { x: 280, y: 180 },
  puttingRange: 90,
  tapInRange: 18,
  windZones: [
    {
      id: "spore-drift",
      label: "Spore Drift",
      rect: { x: 300, y: 100, width: 240, height: 160 },
      directionDegrees: 60,
      strength: 1.4,
    },
  ],
  scrambleZones: [
    { id: "spore-ring-n", rect: { x: 650, y: 110, width: 100, height: 50 } },
    { id: "spore-ring-s", rect: { x: 650, y: 250, width: 100, height: 60 } },
    { id: "spore-ring-w", rect: { x: 580, y: 165, width: 60,  height: 70 } },
    { id: "spore-ring-e", rect: { x: 770, y: 165, width: 60,  height: 70 } },
  ],
  scenery: [
    { x: 670, y: 130, sprite: "mushroom-red",     scale: 0.95 },
    { x: 720, y: 135, sprite: "mushroom-spotted", scale: 0.85 },
    { x: 670, y: 275, sprite: "mushroom-spotted", scale: 0.95 },
    { x: 730, y: 285, sprite: "mushroom-red",     scale: 0.9  },
    { x: 605, y: 195, sprite: "mushroom-red",     scale: 0.85 },
    { x: 800, y: 195, sprite: "mushroom-spotted", scale: 0.85 },
    { x: 80,  y: 60,  sprite: "tree",             scale: 0.65 },
    { x: 80,  y: 290, sprite: "tree",             scale: 0.7  },
    { x: 870, y: 80,  sprite: "tree",             scale: 0.65 },
  ],
};

// Hole 9: the finale. Long diagonal climb from the lower-left tee to the
// upper-right basket. Cliffside tailwind helps in the middle; summit crosswind
// punishes a sloppy approach. Four scramble piles between you and the chains.
const HOLE_9: HoleConfig = {
  id: "hole-9",
  name: "Champion's Cliff",
  par: 4,
  tee: { x: 80, y: 270 },
  basket: { x: 880, y: 90 },
  bounds: COURSE_BOUNDS,
  reliefPoint: { x: 320, y: 200 },
  puttingRange: 90,
  tapInRange: 18,
  windZones: [
    {
      id: "cliff-boost",
      label: "Cliffside Boost",
      rect: { x: 280, y: 140, width: 230, height: 130 },
      directionDegrees: 340,
      strength: 2.6,
    },
    {
      id: "cliff-cross",
      label: "Summit Crosswind",
      rect: { x: 550, y: 40, width: 260, height: 130 },
      directionDegrees: 100,
      strength: 1.9,
    },
  ],
  scrambleZones: [
    { id: "cliff-low-block",   rect: { x: 260, y: 240, width: 120, height: 70 } },
    { id: "cliff-mid-block",   rect: { x: 460, y: 150, width: 110, height: 80 } },
    { id: "cliff-high-block",  rect: { x: 660, y: 60,  width: 100, height: 70 } },
    { id: "cliff-near-basket", rect: { x: 780, y: 130, width: 70,  height: 70 } },
  ],
  scenery: [
    { x: 305, y: 275, sprite: "ruins",            scale: 0.9  },
    { x: 350, y: 290, sprite: "mushroom-red",     scale: 0.85 },
    { x: 510, y: 190, sprite: "ruins",            scale: 0.95 },
    { x: 705, y: 95,  sprite: "ruins",            scale: 0.85 },
    { x: 810, y: 160, sprite: "mushroom-spotted", scale: 0.9  },
    { x: 60,  y: 100, sprite: "tree",             scale: 0.75 },
    { x: 150, y: 60,  sprite: "tree",             scale: 0.7  },
    { x: 900, y: 290, sprite: "tree",             scale: 0.7  },
  ],
};

export const HOLES: ReadonlyArray<HoleConfig> = [
  HOLE_1,
  HOLE_2,
  HOLE_3,
  HOLE_4,
  HOLE_5,
  HOLE_6,
  HOLE_7,
  HOLE_8,
  HOLE_9,
];

export const ANGLE_DIAL_DEGREES = [-42, -25, -8, 8, 25, 42] as const;
export const POWER_DIAL = [0.25, 0.4, 0.55, 0.7, 0.85, 1.0] as const;
export const WIND_CLARITY_DIAL = [0, 0.2, 0.4, 0.6, 0.8, 1.0] as const;
export const PUTT_AIM_DIAL_PX = [-80, -48, -16, 16, 48, 80] as const;
export const PUTT_POWER_DIAL = [0.3, 0.45, 0.6, 0.75, 0.9, 1.0] as const;

export function getCharacterById(id: string): Character | undefined {
  return CHARACTERS.find((character) => character.id === id);
}

export function getDiscById(id: Disc["id"]): Disc {
  const disc = DISCS.find((candidate) => candidate.id === id);

  if (!disc) {
    throw new Error(`Unknown disc: ${id}`);
  }

  return disc;
}

export function validateCharacter(character: Character): string[] {
  const errors: string[] = [];

  if (!character.id) errors.push("Character id is required.");
  if (!character.name) errors.push("Character name is required.");
  if (!character.playStyle) errors.push("Character play style is required.");
  if (!character.quote) errors.push("Character quote is required.");
  if (!Number.isInteger(character.palette)) errors.push("Character palette must be an integer.");

  for (const [stat, value] of Object.entries(character.stats)) {
    if (!Number.isInteger(value) || value < STAT_MIN || value > STAT_MAX) {
      errors.push(`Character stat ${stat} must be an integer from ${STAT_MIN} to ${STAT_MAX}.`);
    }
  }

  return errors;
}

export function validateDisc(disc: Disc): string[] {
  const errors: string[] = [];

  if (!disc.id) errors.push("Disc id is required.");
  if (!disc.label) errors.push("Disc label is required.");
  if (disc.distance <= 0) errors.push("Disc distance must be greater than zero.");
  if (disc.stability < 1 || disc.stability > 5) errors.push("Disc stability must be from 1 to 5.");
  if (disc.control < 1 || disc.control > 5) errors.push("Disc control must be from 1 to 5.");
  if (disc.windResistance < 1 || disc.windResistance > 5) {
    errors.push("Disc wind resistance must be from 1 to 5.");
  }

  return errors;
}

export function validateHoleConfig(hole: HoleConfig): string[] {
  const errors: string[] = [];

  if (!hole.id) errors.push("Hole id is required.");
  if (!hole.name) errors.push("Hole name is required.");
  if (!Number.isInteger(hole.par) || hole.par <= 0) errors.push("Hole par must be a positive integer.");
  if (hole.bounds.width <= 0 || hole.bounds.height <= 0) errors.push("Hole bounds must have positive size.");
  if (hole.puttingRange <= hole.tapInRange) errors.push("Putting range must be greater than tap-in range.");
  if (!pointInBounds(hole.tee, hole)) errors.push("Hole tee must be in bounds.");
  if (!pointInBounds(hole.basket, hole)) errors.push("Hole basket must be in bounds.");
  if (!pointInBounds(hole.reliefPoint, hole)) errors.push("Hole relief point must be in bounds.");
  for (const zone of hole.windZones ?? []) {
    if (!zone.id) errors.push("Wind zone id is required.");
    if (!zone.label) errors.push("Wind zone label is required.");
    if (zone.rect.width <= 0 || zone.rect.height <= 0) errors.push(`Wind zone ${zone.id} must have positive size.`);
    if (zone.strength <= 0) errors.push(`Wind zone ${zone.id} strength must be greater than zero.`);
  }
  for (const zone of hole.scrambleZones ?? []) {
    if (!zone.id) errors.push(`Scramble zone id is required on hole ${hole.id}.`);
    if (zone.rect.width <= 0 || zone.rect.height <= 0) {
      errors.push(`Scramble zone ${zone.id} must have positive size.`);
    }
  }

  return errors;
}

export function validateGameData(): string[] {
  return [
    ...validateUniqueIds(CHARACTERS, "Character"),
    ...validateUniqueIds(DISCS, "Disc"),
    ...validateUniqueIds(HOLES, "Hole"),
    ...CHARACTERS.flatMap(validateCharacter),
    ...DISCS.flatMap(validateDisc),
    ...HOLES.flatMap(validateHoleConfig),
  ];
}

function validateUniqueIds(items: readonly { id: string }[], label: string): string[] {
  const seen = new Set<string>();
  const errors: string[] = [];

  for (const item of items) {
    if (seen.has(item.id)) errors.push(`${label} id must be unique: ${item.id}.`);
    seen.add(item.id);
  }

  return errors;
}

function pointInBounds(point: { x: number; y: number }, hole: HoleConfig): boolean {
  return (
    point.x >= hole.bounds.x &&
    point.x <= hole.bounds.x + hole.bounds.width &&
    point.y >= hole.bounds.y &&
    point.y <= hole.bounds.y + hole.bounds.height
  );
}
