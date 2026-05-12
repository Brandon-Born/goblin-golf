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

    this.add
      .text(195, 154, "Goblin\nGolf", {
        color: "#f6f0d2",
        fontFamily: "Trebuchet MS",
        fontSize: "54px",
        fontStyle: "bold",
        align: "center",
        stroke: "#10150f",
        strokeThickness: 7,
        lineSpacing: -8,
      })
      .setOrigin(0.5);
    this.add
      .text(195, 248, "Hole 1  -  Ruincap Run", {
        color: "#e2d36c",
        fontFamily: "Trebuchet MS",
        fontSize: "20px",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    this.add
      .text(195, 682, "Pick a goblin. Read the wind.\nPark the disc by the ruins.", {
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
    this.add.rectangle(195, 422, 390, 844, 0x172419);

    for (let y = 304; y <= 704; y += 38) {
      const width = 250 - Math.abs(y - 504) * 0.22;
      this.add.rectangle(195, y, width, 24, 0x2f5f2e, 0.72);
      this.add.rectangle(195, y + 12, width - 24, 5, 0x6a8732, 0.5);
    }

    this.add.circle(79, 95, 42, 0x6a8732, 0.9);
    this.add.circle(95, 95, 24, 0x82a548, 0.88);
    this.add.circle(318, 176, 72, 0x5b3f8f, 0.44);
    this.add.circle(284, 220, 40, 0x3f8f61, 0.35);

    this.add.rectangle(195, 468, 236, 166, 0x2d3c24, 0.94).setStrokeStyle(4, 0xaec76d);
    this.add.rectangle(195, 404, 188, 24, 0x786142, 0.9);
    this.add.rectangle(195, 531, 206, 20, 0x786142, 0.9);
    this.add.rectangle(132, 468, 20, 126, 0x786142, 0.9);
    this.add.rectangle(258, 468, 20, 126, 0x786142, 0.9);

    this.drawBasket(195, 424);
    this.drawDisc(115, 541, 0xf07b53);
    this.drawDisc(280, 502, 0xe2d36c);
    this.drawMushroom(80, 604, 1.15, 0xb85c38);
    this.drawMushroom(308, 616, 0.95, 0x5b3f8f);

    this.add
      .text(195, 376, "Tee box open", {
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
