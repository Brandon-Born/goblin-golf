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
    this.add.rectangle(195, 422, 390, 844, 0x18271b);
    this.add.circle(195, 156, 72, 0xe2d36c, 0.18).setStrokeStyle(4, 0xe2d36c);
    this.add
      .text(195, 138, "Score Summary", {
        color: "#f6f0d2",
        fontFamily: "Trebuchet MS",
        fontSize: "34px",
      })
      .setOrigin(0.5);
    this.add
      .text(
        195,
        308,
        `${gameSession.hole.name}\n${gameSession.selectedCharacter.name}\nStrokes: ${gameSession.holeState.strokes}\nPar: ${gameSession.hole.par}\nScore: ${gameSession.scoreLabel()}`,
        {
          color: "#f6f0d2",
          fontFamily: "Trebuchet MS",
          fontSize: "24px",
          align: "center",
          lineSpacing: 10,
        },
      )
      .setOrigin(0.5);

    this.overlay = document.createElement("div");
    this.overlay.dataset.scene = "score";
    this.overlay.style.cssText =
      "position:fixed;left:50%;bottom:42px;transform:translateX(-50%);width:min(320px,82vw);z-index:20;display:grid;gap:12px;text-align:center;";
    const summary = document.createElement("section");
    summary.ariaLabel = "Score Summary";
    summary.style.cssText = "color:#f6f0d2;font-family:'Trebuchet MS',sans-serif;font-size:18px;";
    summary.innerHTML = `<h1 style="font-size:24px;margin:0 0 8px;">Score Summary</h1><p style="margin:0;">Strokes: ${gameSession.holeState.strokes} | Score: ${gameSession.scoreLabel()}</p>`;
    const restart = document.createElement("button");
    restart.type = "button";
    restart.textContent = "Play again";
    restart.ariaLabel = "Play again";
    restart.addEventListener("click", () => {
      gameSession.reset();
      this.clearOverlay();
      this.scene.start("TitleScene");
    });
    this.overlay.append(summary);
    this.overlay.append(restart);
    document.body.append(this.overlay);
  }

  shutdown() {
    this.clearOverlay();
  }

  private clearOverlay() {
    document.querySelectorAll("[data-scene]").forEach((node) => node.remove());
  }
}
