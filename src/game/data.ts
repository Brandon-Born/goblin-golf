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
};

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

  return errors;
}

export function validateGameData(): string[] {
  return [
    ...validateUniqueIds(CHARACTERS, "Character"),
    ...validateUniqueIds(DISCS, "Disc"),
    ...CHARACTERS.flatMap(validateCharacter),
    ...DISCS.flatMap(validateDisc),
    ...validateHoleConfig(HOLE_1),
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
