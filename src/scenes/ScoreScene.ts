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
    const W = this.scale.width, H = this.scale.height;
    const cx = W / 2;
    const scoreLabel = gameSession.scoreLabel();
    const strokes = gameSession.holeState.strokes;
    const headline = scoreLabel === "Even" ? "Even Par" : `${scoreLabel} to Par`;

    this.add
      .text(cx, H * 0.13, "Round Complete", {
        color: "#f6f0d2",
        fontFamily: "Trebuchet MS",
        fontSize: "35px",
        fontStyle: "bold",
        stroke: "#10150f",
        strokeThickness: 6,
      })
      .setOrigin(0.5);
    this.add
      .text(cx, H * 0.22, gameSession.hole.name, {
        color: "#10150f",
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
    const W = this.scale.width, H = this.scale.height;
    const cx = W / 2, cy = H / 2;
    this.add.rectangle(cx, cy, W, H, 0x18271b);
    this.add.circle(cx, H * 0.22, 82, 0xe2d36c, 0.16).setStrokeStyle(4, 0xe2d36c, 0.72);
    this.add.circle(cx - 540, H * 0.34, 44, 0x5b3f8f, 0.3);
    this.add.circle(cx + 490, H * 0.78, 54, 0x6a8732, 0.34);
    this.add.rectangle(cx, cy + 40, 280, 420, 0x2f5f2e, 0.54);
    for (let y = H * 0.32; y <= H * 0.82; y += 42) {
      this.add.rectangle(cx, y, 242, 8, 0x6a8732, 0.32);
    }
    // Brown shelf and disc props sit below the score card (card bottom = cy+30+210 = H*0.833)
    this.add.rectangle(cx, H * 0.905, 338, 60, 0x786142, 0.74).setStrokeStyle(3, 0xaec76d, 0.62);
    this.add.ellipse(cx - 114, H * 0.895, 46, 16, 0xf07b53, 0.92).setStrokeStyle(3, 0x10150f, 0.55);
    this.add.ellipse(cx + 114, H * 0.895, 46, 16, 0xe2d36c, 0.92).setStrokeStyle(3, 0x10150f, 0.55);
  }

  private drawScoreCard(strokes: number, headline: string) {
    const W = this.scale.width, H = this.scale.height;
    const cx = W / 2, cy = H / 2;
    this.add.rectangle(cx, cy + 30, 374, 420, 0x263721, 0.97).setStrokeStyle(4, 0xe2d36c);
    this.add.rectangle(cx, H * 0.295, 346, 34, 0x786142, 0.92);
    this.add
      .text(cx, H * 0.295, "Goblin score slip", {
        color: "#f6f0d2",
        fontFamily: "Trebuchet MS",
        fontSize: "18px",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.add
      .text(cx, H * 0.42, headline, {
        color: "#e2d36c",
        fontFamily: "Trebuchet MS",
        fontSize: "38px",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.add.rectangle(cx, H * 0.51, 310, 3, 0xaec76d, 0.8);
    this.addScoreRow(H * 0.57, "Goblin", gameSession.selectedCharacter.name);
    this.addScoreRow(H * 0.63, "Strokes", String(strokes));
    this.addScoreRow(H * 0.69, "Par", String(gameSession.hole.par));

    this.add
      .text(cx, H * 0.77, strokes <= gameSession.hole.par ? "Clean finish" : "Try a tighter line", {
        color: "#9aab6e",
        fontFamily: "Trebuchet MS",
        fontSize: "15px",
        fontStyle: "italic",
      })
      .setOrigin(0.5);
  }

  private addScoreRow(y: number, label: string, value: string) {
    const W = this.scale.width;
    const cx = W / 2;
    this.add
      .text(cx - 140, y, label.toUpperCase(), {
        color: "#dceab5",
        fontFamily: "Trebuchet MS",
        fontSize: "13px",
        fontStyle: "bold",
      })
      .setOrigin(0, 0.5);
    this.add
      .text(cx + 140, y, value, {
        color: "#f6f0d2",
        fontFamily: "Trebuchet MS",
        fontSize: "19px",
        fontStyle: "bold",
      })
      .setOrigin(1, 0.5);
  }
}
