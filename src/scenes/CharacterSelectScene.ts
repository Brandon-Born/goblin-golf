import Phaser from "phaser";
import { gameSession } from "../game/GameSession";
import type { Character } from "../game/types";

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
    this.add
      .text(195, 48, "Choose Your Goblin", {
        color: "#f6f0d2",
        fontFamily: "Trebuchet MS",
        fontSize: "29px",
        fontStyle: "bold",
        stroke: "#10150f",
        strokeThickness: 5,
      })
      .setOrigin(0.5);
    this.add
      .text(195, 78, "Different throws, same tiny tee pad", {
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

  private renderCards() {
    this.cards.forEach((card) => card.destroy());
    this.cards = gameSession.characters.map((character, index) => {
      const y = 146 + index * 172;
      const selected = character.id === this.selectedId;
      const container = this.add.container(195, y);
      container.add(
        this.add
          .rectangle(0, 0, 342, 154, selected ? 0x425b2a : 0x263721, 0.98)
          .setStrokeStyle(selected ? 4 : 2, selected ? 0xe2d36c : 0x719159),
      );
      container.add(this.add.rectangle(0, -68, 318, 9, selected ? 0xe2d36c : 0x6a8732, selected ? 0.92 : 0.54));
      this.addGoblinPortrait(container, -130, -28, character.palette, selected);
      container.add(
        this.add.text(-82, -54, character.name, {
          color: "#f6f0d2",
          fontFamily: "Trebuchet MS",
          fontSize: "19px",
          fontStyle: "bold",
        }),
      );
      container.add(
        this.add.text(-82, -25, character.playStyle, {
          color: "#e2d36c",
          fontFamily: "Trebuchet MS",
          fontSize: "15px",
          fontStyle: "bold",
        }),
      );
      container.add(
        this.add.text(-82, -2, `"${character.quote}"`, {
          color: "#dceab5",
          fontFamily: "Trebuchet MS",
          fontSize: "13px",
          wordWrap: { width: 232 },
        }),
      );
      if (selected) {
        container.add(
          this.add
            .text(139, -54, "LOCKED", {
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
      [-108, 38],
      [0, 38],
      [108, 38],
      [-54, 63],
      [54, 63],
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
    this.add.rectangle(195, 422, 390, 844, 0x1c2a1d);
    this.add.rectangle(195, 360, 330, 560, 0x233820, 0.5);
    for (let y = 104; y <= 610; y += 34) {
      this.add.rectangle(195, y, 310 - Math.abs(y - 350) * 0.1, 5, 0x6a8732, 0.28);
    }
    this.add.circle(48, 136, 34, 0x5b3f8f, 0.34);
    this.add.circle(340, 620, 48, 0xb85c38, 0.24);
  }

  private addGoblinPortrait(
    container: Phaser.GameObjects.Container,
    x: number,
    y: number,
    palette: number,
    selected: boolean,
  ) {
    container.add(this.add.circle(x, y + 2, 38, 0x10150f, 0.28));
    container.add(this.add.circle(x, y, 31, palette, 0.96).setStrokeStyle(selected ? 3 : 2, 0xf6f0d2, selected ? 0.9 : 0.42));
    container.add(this.add.triangle(x - 25, y - 7, 0, 12, 18, 0, 16, 20, palette, 0.96));
    container.add(this.add.triangle(x + 25, y - 7, 0, 0, 18, 12, 2, 20, palette, 0.96));
    container.add(this.add.circle(x - 10, y - 4, 4, 0xf6f0d2));
    container.add(this.add.circle(x + 10, y - 4, 4, 0xf6f0d2));
    container.add(this.add.rectangle(x, y + 13, 20, 5, 0x10150f, 0.78));
    container.add(this.add.ellipse(x + 14, y - 28, 28, 10, 0xe2d36c, 0.88).setAngle(-18));
  }
}
