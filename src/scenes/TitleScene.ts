import Phaser from "phaser";

export class TitleScene extends Phaser.Scene {
  private controls = document.createElement("div");

  constructor() {
    super("TitleScene");
  }

  create() {
    this.clearControls();
    this.cameras.main.setBackgroundColor("#172419");
    this.drawBackdrop();
    const W = this.scale.width, H = this.scale.height;
    const cx = W / 2;

    // Title block — left third
    this.add
      .text(cx * 0.42, H * 0.22, "Goblin\nGolf", {
        color: "#f6f0d2",
        fontFamily: "Trebuchet MS",
        fontSize: "64px",
        fontStyle: "bold",
        align: "center",
        stroke: "#10150f",
        strokeThickness: 7,
        lineSpacing: -8,
      })
      .setOrigin(0.5);
    this.add
      .text(cx * 0.42, H * 0.56, "Hole 1  -  Ruincap Run", {
        color: "#e2d36c",
        fontFamily: "Trebuchet MS",
        fontSize: "20px",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    this.add
      .text(cx * 0.42, H * 0.82, "Pick a goblin. Read the wind.\nPark the disc by the ruins.", {
        color: "#dceab5",
        fontFamily: "Trebuchet MS",
        fontSize: "18px",
        align: "center",
        lineSpacing: 6,
      })
      .setOrigin(0.5);

    this.controls = this.makeOverlay();
    const start = document.createElement("button");
    start.type = "button";
    start.className = "primary-action scene-primary";
    start.textContent = "Start round";
    start.ariaLabel = "Start round";
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
    overlay.className = "scene-overlay scene-overlay--title";
    return overlay;
  }

  private clearControls() {
    document.querySelectorAll("[data-scene]").forEach((node) => node.remove());
  }

  private drawBackdrop() {
    const W = this.scale.width, H = this.scale.height;
    const cx = W / 2, cy = H / 2;

    this.add.rectangle(cx, cy, W, H, 0x172419);

    // Fairway backdrop strips — center-right area
    for (let x = cx + 20; x <= cx + 520; x += 48) {
      const height = 280 - Math.abs(x - (cx + 270)) * 0.28;
      this.add.rectangle(x, cy + 20, 32, height, 0x2f5f2e, 0.72);
      this.add.rectangle(x + 16, cy + 20, 6, height - 24, 0x6a8732, 0.5);
    }

    // Decorative circles
    this.add.circle(cx - 120, H * 0.12, 42, 0x6a8732, 0.9);
    this.add.circle(cx - 100, H * 0.12, 24, 0x82a548, 0.88);
    this.add.circle(cx + 440, H * 0.22, 72, 0x5b3f8f, 0.44);
    this.add.circle(cx + 400, H * 0.30, 40, 0x3f8f61, 0.35);

    // Central basket scene
    this.add.rectangle(cx + 120, cy + 20, 236, 166, 0x2d3c24, 0.94).setStrokeStyle(4, 0xaec76d);
    this.add.rectangle(cx + 120, cy - 50, 188, 24, 0x786142, 0.9);
    this.add.rectangle(cx + 120, cy + 100, 206, 20, 0x786142, 0.9);
    this.add.rectangle(cx + 120 - 66, cy + 20, 20, 126, 0x786142, 0.9);
    this.add.rectangle(cx + 120 + 66, cy + 20, 20, 126, 0x786142, 0.9);

    this.drawBasket(cx + 120, cy + 22);
    this.drawDisc(cx + 40, cy + 100, 0xf07b53);
    this.drawDisc(cx + 205, cy + 62, 0xe2d36c);
    this.drawMushroom(cx - 50, cy + 160, 1.15, 0xb85c38);
    this.drawMushroom(cx + 340, cy + 170, 0.95, 0x5b3f8f);

    this.add
      .text(cx + 120, cy - 78, "Tee box open", {
        color: "#10150f",
        fontFamily: "Trebuchet MS",
        fontSize: "18px",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
  }

  private drawBasket(x: number, y: number) {
    this.add.rectangle(x, y - 16, 66, 8, 0xe2d36c);
    this.add.rectangle(x, y + 8, 54, 12, 0xe2d36c, 0.82);
    this.add.rectangle(x, y + 32, 44, 6, 0xe2d36c);
    this.add.rectangle(x, y + 10, 4, 50, 0xf6f0d2);
    this.add.rectangle(x, y + 58, 76, 10, 0x786142);
    for (let offset = -24; offset <= 24; offset += 12) {
      this.add.line(x + offset, y - 10, 0, 0, 0, 38, 0xf6f0d2, 0.52).setLineWidth(2);
    }
  }

  private drawDisc(x: number, y: number, color: number) {
    this.add.ellipse(x, y, 44, 16, color, 0.95).setStrokeStyle(3, 0x10150f, 0.6);
    this.add.ellipse(x + 4, y - 2, 22, 6, 0xf6f0d2, 0.35);
  }

  private drawMushroom(x: number, y: number, scale: number, cap: number) {
    this.add.rectangle(x, y + 18 * scale, 18 * scale, 30 * scale, 0xf6f0d2, 0.92);
    this.add.ellipse(x, y, 62 * scale, 36 * scale, cap, 0.95).setStrokeStyle(3, 0x10150f, 0.45);
    this.add.circle(x - 14 * scale, y - 5 * scale, 5 * scale, 0xf6f0d2, 0.8);
    this.add.circle(x + 13 * scale, y + 2 * scale, 4 * scale, 0xf6f0d2, 0.8);
  }
}
