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
    // Soft circular glow behind the title
    this.add.circle(cx, H * 0.22, 92, 0xe2d36c, 0.18).setStrokeStyle(4, 0xe2d36c, 0.72);
    // Distant scenery to frame the card
    this.add.image(cx - 540, H * 0.34, "tree").setScale(0.9).setAlpha(0.6);
    this.add.image(cx + 490, H * 0.42, "tree").setScale(0.85).setAlpha(0.7);
    this.add.image(cx - 480, H * 0.74, "ruins").setScale(0.9).setAlpha(0.85);
    this.add.image(cx + 460, H * 0.78, "mushroom-spotted").setScale(1.1).setAlpha(0.92);
    // Wooden shelf with three discs flanking the card (offset to sides so the bottom button doesn't cover them)
    this.add.rectangle(cx - 380, H * 0.55, 200, 50, 0x786142).setStrokeStyle(3, 0xaec76d, 0.62);
    this.add.rectangle(cx - 380, H * 0.538, 200, 3, 0xa88841);
    this.add.image(cx - 420, H * 0.547, "disc-driver").setScale(1.3);
    this.add.image(cx - 340, H * 0.547, "disc-midrange").setScale(1.3);
    this.add.rectangle(cx + 380, H * 0.55, 120, 50, 0x786142).setStrokeStyle(3, 0xaec76d, 0.62);
    this.add.rectangle(cx + 380, H * 0.538, 120, 3, 0xa88841);
    this.add.image(cx + 380, H * 0.547, "disc-putter").setScale(1.3);
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
