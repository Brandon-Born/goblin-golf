import Phaser from "phaser";
import { gameSession } from "../game/GameSession";

export class ScoreScene extends Phaser.Scene {
  private overlay = document.createElement("div");

  constructor() {
    super("ScoreScene");
  }

  create() {
    this.clearOverlay();
    this.cameras.main.setBackgroundColor("#18271b");
    this.drawBackdrop();
    const scoreLabel = gameSession.scoreLabel();
    const strokes = gameSession.holeState.strokes;
    const headline = scoreLabel === "Even" ? "Even Par" : `${scoreLabel} to Par`;

    this.add
      .text(195, 96, "Round Complete", {
        color: "#f6f0d2",
        fontFamily: "Trebuchet MS",
        fontSize: "35px",
        fontStyle: "bold",
        stroke: "#10150f",
        strokeThickness: 6,
      })
      .setOrigin(0.5);
    this.add
      .text(195, 137, gameSession.hole.name, {
        color: "#e2d36c",
        fontFamily: "Trebuchet MS",
        fontSize: "20px",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    this.drawScoreCard(strokes, headline);

    this.overlay = document.createElement("div");
    this.overlay.dataset.scene = "score";
    this.overlay.className = "scene-overlay scene-overlay--score";
    const restart = document.createElement("button");
    restart.type = "button";
    restart.className = "primary-action scene-primary";
    restart.textContent = "Play again";
    restart.ariaLabel = "Play again";
    restart.addEventListener("click", () => {
      gameSession.reset();
      this.clearOverlay();
      this.scene.start("TitleScene");
    });
    this.overlay.append(restart);
    document.body.append(this.overlay);
  }

  shutdown() {
    this.clearOverlay();
  }

  private clearOverlay() {
    document.querySelectorAll("[data-scene]").forEach((node) => node.remove());
  }

  private drawBackdrop() {
    this.add.rectangle(195, 422, 390, 844, 0x18271b);
    this.add.circle(195, 158, 82, 0xe2d36c, 0.16).setStrokeStyle(4, 0xe2d36c, 0.72);
    this.add.circle(58, 246, 44, 0x5b3f8f, 0.3);
    this.add.circle(330, 560, 54, 0x6a8732, 0.34);

    this.add.rectangle(195, 430, 220, 460, 0x2f5f2e, 0.54);
    for (let y = 245; y <= 618; y += 42) {
      this.add.rectangle(195, y, 182, 8, 0x6a8732, 0.32);
    }
    this.add.rectangle(195, 624, 278, 60, 0x786142, 0.74).setStrokeStyle(3, 0xaec76d, 0.62);
    this.add.ellipse(111, 604, 46, 16, 0xf07b53, 0.92).setStrokeStyle(3, 0x10150f, 0.55);
    this.add.ellipse(279, 604, 46, 16, 0xe2d36c, 0.92).setStrokeStyle(3, 0x10150f, 0.55);
  }

  private drawScoreCard(strokes: number, headline: string) {
    this.add.rectangle(195, 378, 314, 366, 0x263721, 0.97).setStrokeStyle(4, 0xe2d36c);
    this.add.rectangle(195, 214, 286, 34, 0x786142, 0.92);
    this.add
      .text(195, 214, "Goblin score slip", {
        color: "#f6f0d2",
        fontFamily: "Trebuchet MS",
        fontSize: "18px",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.add
      .text(195, 282, headline, {
        color: "#e2d36c",
        fontFamily: "Trebuchet MS",
        fontSize: "38px",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.add.rectangle(195, 350, 250, 3, 0xaec76d, 0.8);
    this.addScoreRow(382, "Goblin", gameSession.selectedCharacter.name);
    this.addScoreRow(424, "Strokes", String(strokes));
    this.addScoreRow(466, "Par", String(gameSession.hole.par));

    this.add.rectangle(195, 522, 158, 42, 0x10150f, 0.42).setStrokeStyle(2, 0xaec76d, 0.66);
    this.add
      .text(195, 522, strokes <= gameSession.hole.par ? "Clean finish" : "Try a tighter line", {
        color: "#dceab5",
        fontFamily: "Trebuchet MS",
        fontSize: "16px",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
  }

  private addScoreRow(y: number, label: string, value: string) {
    this.add
      .text(80, y, label.toUpperCase(), {
        color: "#dceab5",
        fontFamily: "Trebuchet MS",
        fontSize: "13px",
        fontStyle: "bold",
      })
      .setOrigin(0, 0.5);
    this.add
      .text(310, y, value, {
        color: "#f6f0d2",
        fontFamily: "Trebuchet MS",
        fontSize: "19px",
        fontStyle: "bold",
      })
      .setOrigin(1, 0.5);
  }
}
