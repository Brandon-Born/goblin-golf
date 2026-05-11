import Phaser from "phaser";

export class TitleScene extends Phaser.Scene {
  private controls = document.createElement("div");

  constructor() {
    super("TitleScene");
  }

  create() {
    this.clearControls();
    this.cameras.main.setBackgroundColor("#172419");
    this.add.rectangle(195, 422, 390, 844, 0x172419);
    this.add.circle(95, 150, 56, 0x6a8732, 0.9);
    this.add.circle(288, 225, 78, 0x5b3f8f, 0.45);
    this.add.rectangle(195, 592, 320, 82, 0x2d3c24, 0.92).setStrokeStyle(3, 0xaec76d);

    this.add
      .text(195, 250, "Goblin Golf", {
        color: "#f6f0d2",
        fontFamily: "Trebuchet MS",
        fontSize: "48px",
        align: "center",
      })
      .setOrigin(0.5);
    this.add
      .text(195, 320, "Hole 1: Ruincap Run", {
        color: "#cfe4a4",
        fontFamily: "Trebuchet MS",
        fontSize: "20px",
      })
      .setOrigin(0.5);
    this.add
      .text(195, 590, "Portrait prototype\nNo timing shots", {
        color: "#f6f0d2",
        fontFamily: "Trebuchet MS",
        fontSize: "20px",
        align: "center",
      })
      .setOrigin(0.5);

    this.controls = this.makeOverlay();
    const start = document.createElement("button");
    start.type = "button";
    start.textContent = "Start prototype";
    start.ariaLabel = "Start prototype";
    start.addEventListener("click", () => {
      this.clearControls();
      this.scene.start("CharacterSelectScene");
    });
    this.controls.append(start);
    document.body.append(this.controls);
  }

  shutdown() {
    this.clearControls();
  }

  private makeOverlay() {
    const overlay = document.createElement("div");
    overlay.dataset.scene = "title";
    overlay.style.cssText =
      "position:fixed;left:50%;bottom:56px;transform:translateX(-50%);width:min(320px,82vw);z-index:20;";
    return overlay;
  }

  private clearControls() {
    document.querySelectorAll("[data-scene]").forEach((node) => node.remove());
  }
}
