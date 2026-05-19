import Phaser from "phaser";

const SPRITES: ReadonlyArray<readonly [string, string]> = [
  ["basket", "assets/basket.svg"],
  ["disc-driver", "assets/disc-driver.svg"],
  ["disc-midrange", "assets/disc-midrange.svg"],
  ["disc-putter", "assets/disc-putter.svg"],
  ["goblin-grib", "assets/goblin-grib.svg"],
  ["goblin-morga", "assets/goblin-morga.svg"],
  ["goblin-skrak", "assets/goblin-skrak.svg"],
  ["goblin-token-grib-ninesnatch", "assets/goblin-token-grib.svg"],
  ["goblin-token-morga-mosswhack", "assets/goblin-token-morga.svg"],
  ["goblin-token-skrak-boomarm", "assets/goblin-token-skrak.svg"],
  ["mushroom-red", "assets/mushroom-red.svg"],
  ["mushroom-spotted", "assets/mushroom-spotted.svg"],
  ["ruins", "assets/ruins.svg"],
  ["tree", "assets/tree.svg"],
  ["tee-marker", "assets/tee-marker.svg"],
  ["wind-arrow", "assets/wind-arrow.svg"],
  ["grass-tile", "assets/grass-tile.svg"],
  ["ob-tile", "assets/ob-tile.svg"],
  ["scramble-tile", "assets/scramble-tile.svg"],
];

export class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  preload() {
    for (const [key, path] of SPRITES) {
      this.load.image(key, path);
    }
  }

  create() {
    this.cameras.main.setBackgroundColor("#172419");
    this.scene.start("TitleScene");
  }
}

export function characterPortraitKey(characterId: string): string {
  const slug = characterId.split("-")[0];
  return `goblin-${slug}`;
}

export function characterTokenKey(characterId: string): string {
  return `goblin-token-${characterId}`;
}

export function discKey(discId: string): string {
  return `disc-${discId}`;
}
