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

    // Layered atmospheric backdrop
    this.add.rectangle(cx, cy, W, H, 0x172419);
    this.add.rectangle(cx, H * 0.15, W, H * 0.3, 0x1f3322, 0.85);
    this.add.rectangle(cx, H * 0.85, W, H * 0.3, 0x0e1810, 0.75);

    // Distant tree silhouettes
    for (let x = 40; x < W; x += 70) {
      const tx = x + ((x * 7) % 30) - 15;
      const ty = H * 0.18 + ((x * 13) % 20);
      this.add.image(tx, ty, "tree").setScale(0.6).setAlpha(0.55).setTint(0x223018);
    }

    // Central scene panel (storybook frame)
    this.add.rectangle(cx + 120, cy + 20, 320, 250, 0x2d3c24, 0.96).setStrokeStyle(5, 0xd8c66a, 0.85);
    this.add.rectangle(cx + 120, cy + 20, 308, 238).setStrokeStyle(2, 0x10150f, 0.32);
    // Grass ground inside panel
    this.add.tileSprite(cx + 120, cy + 80, 300, 100, "grass-tile");

    // Basket centerpiece
    this.add.image(cx + 120, cy + 20, "basket").setScale(1.05);

    // Two discs in front of basket
    this.add.image(cx + 40, cy + 110, "disc-driver").setScale(1.1).setRotation(-0.18);
    this.add.image(cx + 205, cy + 95, "disc-putter").setScale(1.0).setRotation(0.14);

    // Mushrooms flanking the panel
    this.add.image(cx - 40, cy + 160, "mushroom-red").setScale(1.2);
    this.add.image(cx + 340, cy + 170, "mushroom-spotted").setScale(1.05);
    // Tee box in foreground
    this.add.image(cx - 200, cy + 200, "tee-marker").setScale(1.1);
    // Ruins to the left
    this.add.image(cx - 280, cy + 90, "ruins").setScale(0.85);

    this.add
      .text(cx + 120, cy - 96, "Tee box open", {
        color: "#f6f0d2",
        fontFamily: "Trebuchet MS",
        fontSize: "16px",
        fontStyle: "bold",
        stroke: "#10150f",
        strokeThickness: 3,
      })
      .setOrigin(0.5);
  }
}
