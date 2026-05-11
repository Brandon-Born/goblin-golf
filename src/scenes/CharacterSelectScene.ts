import Phaser from "phaser";
import { gameSession } from "../game/GameSession";
import type { Character } from "../game/types";

export class CharacterSelectScene extends Phaser.Scene {
  private selectedId: string = gameSession.characters[0].id;
  private overlay = document.createElement("div");
  private cards: Phaser.GameObjects.Container[] = [];

  constructor() {
    super("CharacterSelectScene");
  }

  create() {
    this.clearOverlay();
    this.cameras.main.setBackgroundColor("#1c2a1d");
    this.add
      .text(195, 56, "Choose Your Goblin", {
        color: "#f6f0d2",
        fontFamily: "Trebuchet MS",
        fontSize: "30px",
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
      const y = 155 + index * 178;
      const selected = character.id === this.selectedId;
      const container = this.add.container(195, y);
      container.add(
        this.add
          .rectangle(0, 0, 340, 144, selected ? 0x425b2a : 0x263721, 0.98)
          .setStrokeStyle(selected ? 4 : 2, selected ? 0xe2d36c : 0x719159),
      );
      container.add(this.add.circle(-132, -28, 34, character.palette));
      container.add(
        this.add.text(-82, -54, character.name, {
          color: "#f6f0d2",
          fontFamily: "Trebuchet MS",
          fontSize: "20px",
        }),
      );
      container.add(
        this.add.text(-82, -25, character.playStyle, {
          color: "#cfe4a4",
          fontFamily: "Trebuchet MS",
          fontSize: "15px",
        }),
      );
      container.add(
        this.add.text(-146, 16, character.quote, {
          color: "#f6f0d2",
          fontFamily: "Trebuchet MS",
          fontSize: "13px",
          wordWrap: { width: 292 },
        }),
      );
      this.addStats(container, character);
      return container;
    });
  }

  private addStats(container: Phaser.GameObjects.Container, character: Character) {
    const stats = [
      ["PWR", character.stats.power],
      ["ACC", character.stats.accuracy],
      ["SPN", character.stats.spin],
      ["WND", character.stats.windRead],
      ["PUT", character.stats.putting],
    ] as const;

    stats.forEach(([label, value], index) => {
      const x = -144 + index * 58;
      container.add(
        this.add.text(x, 48, label, {
          color: "#cfe4a4",
          fontFamily: "Trebuchet MS",
          fontSize: "12px",
        }),
      );
      container.add(this.add.rectangle(x + 34, 56, 28, 7, 0x111a12));
      container.add(this.add.rectangle(x + 20 + value * 2.8, 56, value * 5.6, 7, 0xe2d36c));
    });
  }

  private renderOverlay() {
    this.overlay = document.createElement("div");
    this.overlay.dataset.scene = "character-select";
    this.overlay.style.cssText =
      "position:fixed;left:50%;bottom:32px;transform:translateX(-50%);width:min(350px,90vw);z-index:20;display:grid;gap:10px;";

    for (const character of gameSession.characters) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = character.name;
      button.ariaLabel = `Select ${character.name}`;
      button.addEventListener("click", () => {
        this.selectedId = character.id;
        this.renderCards();
      });
      this.overlay.append(button);
    }

    const confirm = document.createElement("button");
    confirm.type = "button";
    confirm.textContent = "Confirm goblin";
    confirm.ariaLabel = "Confirm goblin";
    confirm.addEventListener("click", () => {
      gameSession.selectCharacter(this.selectedId);
      this.clearOverlay();
      this.scene.start("HoleScene");
    });
    this.overlay.append(confirm);
    document.body.append(this.overlay);
  }

  private clearOverlay() {
    document.querySelectorAll("[data-scene]").forEach((node) => node.remove());
  }
}
