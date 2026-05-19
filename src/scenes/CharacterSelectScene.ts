import Phaser from "phaser";
import { gameSession } from "../game/GameSession";
import type { Character } from "../game/types";
import { characterPortraitKey } from "./BootScene";

export class CharacterSelectScene extends Phaser.Scene {
  private selectedId: string = gameSession.characters[0].id;
  private overlay = document.createElement("div");
  private cards: Phaser.GameObjects.Container[] = [];
  private selectionButtons: HTMLButtonElement[] = [];

  constructor() {
    super("CharacterSelectScene");
  }

  create() {
    this.clearOverlay();
    this.cameras.main.setBackgroundColor("#1c2a1d");
    this.drawBackdrop();
    const W = this.scale.width, H = this.scale.height;
    const cx = W / 2;
    this.add
      .text(cx, H * 0.07, "Choose Your Goblin", {
        color: "#f6f0d2",
        fontFamily: "Trebuchet MS",
        fontSize: "29px",
        fontStyle: "bold",
        stroke: "#10150f",
        strokeThickness: 5,
      })
      .setOrigin(0.5);
    this.add
      .text(cx, H * 0.14, "Different throws, same tiny tee pad", {
        color: "#dceab5",
        fontFamily: "Trebuchet MS",
        fontSize: "14px",
      })
      .setOrigin(0.5);
    this.renderCards();
    this.renderOverlay();
  }

  shutdown() {
    this.clearOverlay();
  }

  private tabConnectorContainer?: Phaser.GameObjects.Container;

  private renderCards() {
    this.cards.forEach((card) => card.destroy());
    this.tabConnectorContainer?.destroy();
    this.tabConnectorContainer = this.buildTabConnector();
    const W = this.scale.width, H = this.scale.height;
    const cx = W / 2, cy = H / 2;
    const spacing = 380;
    const cardY = cy - 20;

    this.cards = gameSession.characters.map((character, index) => {
      const x = cx + (index - 1) * spacing;
      const selected = character.id === this.selectedId;
      const container = this.add.container(x, cardY);
      container.add(
        this.add
          .rectangle(0, 0, 354, 320, selected ? 0x425b2a : 0x263721, 0.98)
          .setStrokeStyle(selected ? 4 : 2, selected ? 0xe2d36c : 0x719159),
      );
      // Decorative paper texture line at top
      container.add(this.add.rectangle(0, -156, 330, 9, selected ? 0xe2d36c : 0x6a8732, selected ? 0.92 : 0.54));
      container.add(this.add.rectangle(0, -150, 330, 2, 0x10150f, 0.18));
      // Portrait panel backdrop
      container.add(this.add.rectangle(-118, -68, 120, 120, 0x141d10, 0.7).setStrokeStyle(2, selected ? 0xe2d36c : 0x6a8732, 0.78));
      container.add(this.add.rectangle(-118, -68, 118, 118).setStrokeStyle(1, 0x10150f, 0.4));
      this.addGoblinPortrait(container, -118, -68, character, selected);
      container.add(
        this.add.text(-50, -128, character.name, {
          color: "#f6f0d2",
          fontFamily: "Trebuchet MS",
          fontSize: "18px",
          fontStyle: "bold",
        }),
      );
      container.add(
        this.add.text(-50, -102, character.playStyle, {
          color: "#e2d36c",
          fontFamily: "Trebuchet MS",
          fontSize: "14px",
          fontStyle: "bold",
        }),
      );
      container.add(
        this.add.text(-50, -76, `"${character.quote}"`, {
          color: "#dceab5",
          fontFamily: "Trebuchet MS",
          fontSize: "13px",
          wordWrap: { width: 210 },
        }),
      );
      if (selected) {
        container.add(
          this.add
            .text(139, -128, "✓ SELECTED", {
              color: "#10150f",
              fontFamily: "Trebuchet MS",
              fontSize: "11px",
              fontStyle: "bold",
              backgroundColor: "#e2d36c",
              padding: { left: 5, right: 5, top: 2, bottom: 2 },
            })
            .setOrigin(0.5),
        );
      }
      this.addStats(container, character);
      return container;
    });
  }

  private addStats(container: Phaser.GameObjects.Container, character: Character) {
    const stats = [
      ["POW", character.stats.power],
      ["AIM", character.stats.accuracy],
      ["SPIN", character.stats.spin],
      ["WIND", character.stats.windRead],
      ["PUTT", character.stats.putting],
    ] as const;
    const positions = [
      [-108, 40],
      [0, 40],
      [108, 40],
      [-54, 72],
      [54, 72],
    ] as const;

    stats.forEach(([label, value], index) => {
      const [x, y] = positions[index];
      container.add(
        this.add.rectangle(x, y, 98, 22, 0x111a12, 0.74).setStrokeStyle(1, 0x719159, 0.72),
      );
      container.add(
        this.add.text(x - 43, y - 7, label, {
          color: "#dceab5",
          fontFamily: "Trebuchet MS",
          fontSize: "10px",
          fontStyle: "bold",
        }),
      );
      container.add(this.add.rectangle(x + 14, y + 5, 54, 6, 0x263721));
      container.add(this.add.rectangle(x - 13 + value * 5.4, y + 5, value * 10.8, 6, 0xe2d36c));
      container.add(
        this.add.text(x + 32, y - 7, `${value}/5`, {
          color: "#f6f0d2",
          fontFamily: "Trebuchet MS",
          fontSize: "10px",
          fontStyle: "bold",
        }),
      );
    });
  }

  private renderOverlay() {
    this.overlay = document.createElement("div");
    this.overlay.dataset.scene = "character-select";
    this.overlay.className = "scene-overlay scene-overlay--character";
    this.selectionButtons = [];

    for (const character of gameSession.characters) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "scene-choice";
      button.dataset.characterId = character.id;
      button.textContent = character.name.split(" ")[0];
      button.ariaLabel = `Select ${character.name}`;
      button.ariaPressed = String(character.id === this.selectedId);
      button.addEventListener("click", () => {
        this.selectedId = character.id;
        this.renderCards();
        this.refreshSelectionButtons();
      });
      this.overlay.append(button);
      this.selectionButtons.push(button);
    }

    const confirm = document.createElement("button");
    confirm.type = "button";
    confirm.className = "primary-action scene-primary";
    confirm.textContent = "Confirm goblin";
    confirm.ariaLabel = "Confirm goblin";
    confirm.addEventListener("click", () => {
      gameSession.selectCharacter(this.selectedId);
      this.clearOverlay();
      this.scene.start("HoleScene");
    });
    this.overlay.append(confirm);
    this.refreshSelectionButtons();
    document.body.append(this.overlay);
  }

  private clearOverlay() {
    document.querySelectorAll("[data-scene]").forEach((node) => node.remove());
  }

  private refreshSelectionButtons() {
    this.selectionButtons.forEach((button) => {
      const selected = button.dataset.characterId === this.selectedId;
      button.classList.toggle("is-selected", selected);
      button.ariaPressed = String(selected);
    });
  }

  private drawBackdrop() {
    const W = this.scale.width, H = this.scale.height;
    const cx = W / 2, cy = H / 2;
    this.add.rectangle(cx, cy, W, H, 0x1c2a1d);
    this.add.rectangle(cx, cy - 20, W - 80, 340, 0x233820, 0.5);
    for (let x = 80; x <= W - 80; x += 34) {
      this.add.rectangle(x, cy - 20, 5, 310 - Math.abs(x - cx) * 0.1, 0x6a8732, 0.28);
    }
    this.add.circle(cx - 530, H * 0.2, 34, 0x5b3f8f, 0.34);
    this.add.circle(cx + 480, H * 0.78, 48, 0xb85c38, 0.24);
  }

  private buildTabConnector(): Phaser.GameObjects.Container {
    const W = this.scale.width, H = this.scale.height;
    const cx = W / 2;
    const spacing = 380;
    const container = this.add.container(0, 0);
    container.add(this.add.rectangle(cx, H * 0.83, W - 200, 2, 0x6a8732, 0.48));
    for (let index = 0; index < gameSession.characters.length; index += 1) {
      const x = cx + (index - 1) * spacing;
      const character = gameSession.characters[index];
      const selected = character.id === this.selectedId;
      container.add(this.add.circle(x, H * 0.91, selected ? 7 : 4, selected ? 0xe2d36c : 0x6a8732, selected ? 0.95 : 0.55));
      container.add(
        this.add
          .text(x, H * 0.94, character.name.split(" ")[0], {
            color: selected ? "#e2d36c" : "#dceab5",
            fontFamily: "Trebuchet MS",
            fontSize: selected ? "13px" : "11px",
            fontStyle: selected ? "bold" : "normal",
          })
          .setOrigin(0.5),
      );
    }
    return container;
  }

  private addGoblinPortrait(
    container: Phaser.GameObjects.Container,
    x: number,
    y: number,
    character: Character,
    selected: boolean,
  ) {
    const key = characterPortraitKey(character.id);
    container.add(
      this.add
        .image(x, y, key)
        .setScale(selected ? 0.95 : 0.9)
        .setDepth(selected ? 2 : 1),
    );
  }
}
