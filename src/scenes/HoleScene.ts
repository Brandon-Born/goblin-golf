import Phaser from "phaser";
import { describeAngle, describeDisc, gameSession } from "../game/GameSession";
import { distanceBetween } from "../game/logic";
import type { DiscType, LieQuality, ReleaseAngle, ShotForecast, ShotInput, ShotResult, Vector2 } from "../game/types";

type HoleMode = "setup" | "flight" | "putting";

interface Layout {
  cx: number;
  cy: number;
  playLeft: number;
  playTop: number;
  playRight: number;
  playBottom: number;
  playWidth: number;
  playHeight: number;
  fairwayH: number;
  puttBasket: { x: number; y: number };
  puttTee: { x: number; y: number };
}

export class HoleScene extends Phaser.Scene {
  private layout!: Layout;
  private aimOffsetDegrees = 0;
  private power = 0.9;
  private puttPower = 0.64;
  private puttOffset: Vector2 = { x: 0, y: 0 };
  private disc: DiscType = "driver";
  private releaseAngle: ReleaseAngle = "flat";
  private mode: HoleMode = "setup";
  private hud?: Phaser.GameObjects.Text;
  private overlay = document.createElement("div");
  private aimPath?: Phaser.GameObjects.Graphics;
  private forecastZone?: Phaser.GameObjects.Graphics;
  private aimLine?: Phaser.GameObjects.Line;
  private aimArrow?: Phaser.GameObjects.Triangle;
  private aimTarget?: Phaser.GameObjects.Arc;
  private aimLabel?: Phaser.GameObjects.Text;
  private lieMarker?: Phaser.GameObjects.Arc;
  private flightPath?: Phaser.GameObjects.Graphics;
  private flightDisc?: Phaser.GameObjects.Arc;
  private crosshair?: Phaser.GameObjects.Arc;
  private crosshairLines: Phaser.GameObjects.Line[] = [];
  private puttGuide?: Phaser.GameObjects.Graphics;
  private readonly defaultStatus = "Drag fairway to aim. Tap Disc/Angle to cycle. Drag power, then throw.";
  private status = this.defaultStatus;
  private lastResult?: ShotResult;
  private controlsLocked = false;
  private queuedThrowClicks = 0;

  constructor() {
    super("HoleScene");
  }

  private computeLayout(): Layout {
    const width = this.scale.width;
    const height = this.scale.height;
    const cx = width / 2;
    const cy = height / 2;
    const playLeft = 48;
    const playTop = 60;
    const playWidth = width - playLeft - 300;
    const playHeight = height - playTop * 2;
    const fairwayH = Math.round(playHeight * 0.34);
    return {
      cx, cy,
      playLeft, playTop,
      playRight: playLeft + playWidth,
      playBottom: playTop + playHeight,
      playWidth, playHeight,
      fairwayH,
      puttBasket: { x: Math.round(width * 0.53), y: Math.round(height * 0.37) },
      puttTee: { x: Math.round(width * 0.30), y: Math.round(height * 0.60) },
    };
  }

  create() {
    this.layout = this.computeLayout();
    this.clearOverlay();
    this.mode = gameSession.mode === "putt" ? "putting" : "setup";
    if (this.mode === "setup") {
      this.setSuggestedThrowDefaults();
    }
    this.cameras.main.setBackgroundColor("#19301e");
    if (this.mode === "putting") {
      this.drawPuttingView();
    } else {
      this.drawSetupView();
    }
    this.createHud();
    this.createOverlay();
    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => this.handleDrag(pointer));
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => this.handleDrag(pointer));
    this.input.on("pointerup", () => this.updateHud());
    this.updateHud();
  }

  shutdown() {
    this.clearOverlay();
  }

  private drawSetupView() {
    const { cx, cy, playLeft, playWidth, playTop, playBottom, playHeight, fairwayH } = this.layout;
    const W = this.scale.width, H = this.scale.height;
    const playCx = playLeft + playWidth / 2;
    const obH = (playHeight - fairwayH) / 2;

    const basket = this.worldToScreen(gameSession.hole.basket);
    const lie = this.worldToScreen(gameSession.holeState.lie);

    this.add.rectangle(cx, cy, W, H, 0x142018);
    // Fairway center strip
    this.add.rectangle(playCx, cy, playWidth, fairwayH, 0x416b34).setStrokeStyle(3, 0xd8c66a, 0.45);
    // OB top and bottom strips
    this.add.rectangle(playCx, playTop + obH / 2, playWidth, obH, 0x4d3c81, 0.86);
    this.add.rectangle(playCx, playBottom - obH / 2, playWidth, obH, 0x4d3c81, 0.86);
    this.add.text(playLeft + 50, playTop + obH / 2, "OB", { color: "#f6f0d2", fontFamily: "Trebuchet MS", fontSize: "18px" }).setOrigin(0.5);
    this.add.text(playLeft + 50, playBottom - obH / 2, "OB", { color: "#f6f0d2", fontFamily: "Trebuchet MS", fontSize: "18px" }).setOrigin(0.5);
    this.drawWindZones();

    this.drawBasketTarget(basket.x, basket.y);
    this.drawBasketIcon(basket.x + 10, basket.y, 0.64);

    this.drawScrambleZoneBoundaries();
    const hazard1 = this.worldToScreen({ x: 265, y: 76 });
    const hazard2 = this.worldToScreen({ x: 450, y: 278 });
    this.drawHazardLabel(hazard1.x, hazard1.y, "RUINS", "SCRAMBLE LIE");
    this.drawHazardLabel(hazard2.x, hazard2.y, "RUINS", "SCRAMBLE LIE");
    const mush1 = this.worldToScreen({ x: 200, y: 265 });
    const mush2 = this.worldToScreen({ x: 680, y: 80 });
    this.drawMushroom(mush1.x, mush1.y, 0xd14f41);
    this.drawMushroom(mush2.x, mush2.y, 0xf2e7b8);

    this.add.circle(lie.x, lie.y, 24, 0x10150f, 0.75).setStrokeStyle(4, 0xe2d36c);
    this.add.circle(lie.x, lie.y, 11, 0xf6f0d2).setStrokeStyle(3, gameSession.selectedCharacter.palette);
    this.add.circle(lie.x - 22, lie.y + 18, 14, gameSession.selectedCharacter.palette).setStrokeStyle(3, 0x10150f);
    const lieLabelY = lie.y > cy ? lie.y - 58 : lie.y + 46;
    this.add
      .text(lie.x, lieLabelY, "CURRENT LIE / DISC", {
        color: "#10150f",
        fontFamily: "Trebuchet MS",
        fontSize: "12px",
        fontStyle: "bold",
        backgroundColor: "#e2d36c",
        padding: { x: 6, y: 3 },
      })
      .setOrigin(0.5)
      .setDepth(7);
    this.lieMarker = this.add.circle(lie.x, lie.y, 13, 0xe2d36c, 0.22).setStrokeStyle(4, 0xf6f0d2).setDepth(6);
    this.aimLine = undefined;
    this.aimPath = this.add.graphics().setDepth(4);
    this.forecastZone = this.add.graphics().setDepth(5);
    this.aimArrow = this.add.triangle(basket.x, basket.y, 0, -12, -10, 10, 10, 10, 0xe2d36c, 0.95).setDepth(5);
    this.aimArrow.setVisible(false);
    this.aimTarget = this.add.circle(basket.x, basket.y, 16, 0x000000, 0).setStrokeStyle(4, 0xe2d36c).setDepth(5);
    this.aimTarget.setVisible(false);
    this.aimLabel = this.add
      .text(basket.x, basket.y + 40, "THROW FORECAST", {
        color: "#10150f",
        fontFamily: "Trebuchet MS",
        fontSize: "12px",
        fontStyle: "bold",
        backgroundColor: "#e2d36c",
        padding: { x: 5, y: 3 },
      })
      .setOrigin(0.5)
      .setDepth(7);
    this.updateAimLine();
  }

  private drawBasketTarget(x: number, y: number) {
    this.add.circle(x, y, 44, 0xe2d36c, 0.14).setStrokeStyle(4, 0xe2d36c, 0.68);
    this.add.circle(x, y, 28, 0x10150f, 0.6).setStrokeStyle(4, 0xd8c66a);
    this.add
      .text(x, y - 54, "BASKET TARGET", {
        color: "#10150f",
        fontFamily: "Trebuchet MS",
        fontSize: "12px",
        fontStyle: "bold",
        backgroundColor: "#f6f0d2",
        padding: { x: 6, y: 3 },
      })
      .setOrigin(0.5)
      .setDepth(7);
  }

  private drawBasketIcon(x: number, y: number, scale: number) {
    this.add.rectangle(x, y + 42 * scale, 8 * scale, 88 * scale, 0xd8c66a);
    this.add.ellipse(x, y - 18 * scale, 78 * scale, 22 * scale, 0x10150f).setStrokeStyle(4, 0xd8c66a);
    this.add.rectangle(x, y + 22 * scale, 58 * scale, 52 * scale, 0x10150f, 0.28).setStrokeStyle(3, 0xd8c66a);
    this.add.circle(x, y - 18 * scale, 9 * scale, 0xf6f0d2);
  }

  private drawHazardLabel(x: number, y: number, label: string, detail?: string) {
    this.add.rectangle(x, y + 12, 54, 30, 0x85877d);
    this.add.rectangle(x + 11, y - 12, 36, 40, 0x65645e);
    this.add
      .text(x, y + 44, label, {
        color: "#f6f0d2",
        fontFamily: "Trebuchet MS",
        fontSize: "12px",
      })
      .setOrigin(0.5);
    if (detail) {
      this.add
        .text(x, y + 58, detail, {
          color: "#cfe4a4",
          fontFamily: "Trebuchet MS",
          fontSize: "10px",
        })
        .setOrigin(0.5);
    }
  }

  private drawScrambleZoneBoundaries() {
    const bounds = gameSession.hole.bounds;
    const centerY = bounds.y + bounds.height / 2;
    // Mirror the scramble zone rectangles from getLieQuality() in logic.ts
    const zones = [
      { wx: bounds.x + 172, wy: centerY - 144, ww: 90, wh: 80 },
      { wx: bounds.x + 352, wy: centerY + 70, ww: 100, wh: 68 },
      { wx: bounds.x + 552, wy: centerY - 144, ww: 90, wh: 80 },
    ];
    const graphics = this.add.graphics().setDepth(2);
    graphics.lineStyle(2, 0xff8f6b, 0.72);
    graphics.fillStyle(0xff8f6b, 0.08);
    for (const { wx, wy, ww, wh } of zones) {
      const tl = this.worldToScreen({ x: wx, y: wy });
      const br = this.worldToScreen({ x: wx + ww, y: wy + wh });
      const sw = br.x - tl.x;
      const sh = br.y - tl.y;
      graphics.fillRect(tl.x, tl.y, sw, sh);
      graphics.strokeRect(tl.x, tl.y, sw, sh);
    }
  }

  private drawMushroom(x: number, y: number, color: number) {
    this.add.circle(x, y, 13, color);
    this.add.rectangle(x, y + 14, 9, 18, 0xe7d7ad);
  }

  private drawWindZones() {
    for (const zone of gameSession.hole.windZones ?? []) {
      const rect = this.worldRectToScreen(zone.rect);
      const center = {
        x: rect.x + rect.width / 2,
        y: rect.y + rect.height / 2,
      };
      const arrow = {
        x: Math.cos(Phaser.Math.DegToRad(zone.directionDegrees)),
        y: Math.sin(Phaser.Math.DegToRad(zone.directionDegrees)),
      };
      const color = zone.id === "left-tailwind" ? 0x8fd8ff : 0xffd27a;

      this.add.rectangle(center.x, center.y, rect.width, rect.height, color, 0.13).setStrokeStyle(2, color, 0.44);
      this.add.line(0, 0, center.x - arrow.x * 20, center.y - arrow.y * 20, center.x + arrow.x * 20, center.y + arrow.y * 20, color, 0.82).setLineWidth(4);
      this.add
        .triangle(
          center.x + arrow.x * 28,
          center.y + arrow.y * 28,
          0,
          -8,
          -7,
          7,
          7,
          7,
          color,
          0.88,
        )
        .setRotation(Phaser.Math.DegToRad(zone.directionDegrees) + Math.PI / 2);
      this.add
        .text(center.x, center.y + rect.height / 2 - 18, zone.label.toUpperCase(), {
          color: "#10150f",
          fontFamily: "Trebuchet MS",
          fontSize: "10px",
          fontStyle: "bold",
          backgroundColor: "#f6f0d2",
          padding: { x: 5, y: 2 },
        })
        .setOrigin(0.5)
        .setDepth(3);
    }
  }

  private drawCourse() {
    const { cx, cy, playLeft, playWidth, playTop, playBottom, playHeight, fairwayH } = this.layout;
    const W = this.scale.width, H = this.scale.height;
    const playCx = playLeft + playWidth / 2;
    const obH = (playHeight - fairwayH) / 2;

    this.add.rectangle(cx, cy, W, H, 0x142018);
    this.add.rectangle(playCx, cy, playWidth + 120, fairwayH + 64, 0x233b26).setStrokeStyle(3, 0xf6f0d2, 0.18);
    this.add.rectangle(playCx, cy, playWidth, fairwayH, 0x5d8743, 0.9);
    this.add.rectangle(playCx, playTop + obH / 2, playWidth, obH, 0x4d3c81, 0.62);
    this.add.rectangle(playCx, playBottom - obH / 2, playWidth, obH, 0x4d3c81, 0.62);
    this.add.text(playLeft + 40, playTop + obH / 2, "OB", { color: "#f1c8ff", fontFamily: "Trebuchet MS", fontSize: "14px" }).setOrigin(0.5);
    this.add.text(playLeft + 40, playBottom - obH / 2, "OB", { color: "#f1c8ff", fontFamily: "Trebuchet MS", fontSize: "14px" }).setOrigin(0.5);
    this.drawWindZones();

    for (const [wx, wy] of [[280, 90], [550, 288], [430, 74], [720, 274]]) {
      const { x, y } = this.worldToScreen({ x: wx, y: wy });
      this.add.rectangle(x, y, 50, 34, 0x7b7c78);
      this.add.rectangle(x + 8, y - 26, 34, 42, 0x65645e);
    }

    for (const [wx, wy, color] of [[200, 270, 0xd14f41], [650, 90, 0xf2e7b8], [350, 74, 0xd14f41], [750, 274, 0xf2e7b8]]) {
      const { x, y } = this.worldToScreen({ x: wx, y: wy });
      this.add.circle(x, y, 13, color);
      this.add.rectangle(x, y + 13, 9, 18, 0xe7d7ad);
    }

    for (const [wx, wy] of [[180, 84], [330, 282], [490, 78]]) {
      const { x, y } = this.worldToScreen({ x: wx, y: wy });
      this.add.ellipse(x, y, 34, 9, 0xe9e0c9);
      this.add.circle(x - 14, y - 4, 6, 0xe9e0c9);
    }

    const basket = this.worldToScreen(gameSession.hole.basket);
    this.add
      .text(playLeft + 80, playTop + 30, "FLIGHT: DISC PATH", {
        color: "#f6f0d2",
        fontFamily: "Trebuchet MS",
        fontSize: "15px",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    this.drawBasketTarget(basket.x, basket.y);
    this.add.circle(basket.x, basket.y, 9, 0xf6f0d2);
    this.lieMarker = this.add.circle(0, 0, 13, 0xe2d36c, 0.45).setStrokeStyle(4, 0xf6f0d2);
    this.aimLine = this.add.line(0, 0, playLeft + 100, cy, this.layout.playRight - 100, cy, 0xe2d36c, 0.85).setLineWidth(5).setVisible(false);
    this.updateLieMarker();
  }

  private createHud() {
    this.hud = this.add.text(18, 18, "", {
      color: "#f6f0d2",
      fontFamily: "Trebuchet MS",
      fontSize: "12px",
      lineSpacing: 4,
      wordWrap: { width: 700 },
    });
  }

  private createOverlay() {
    this.overlay = document.createElement("div");
    this.overlay.dataset.scene = "hole";
    this.overlay.className = "hole-controls";
    this.overlay.addEventListener("pointerdown", (event) => this.handleOverlayPowerDrag(event));
    this.overlay.addEventListener("pointermove", (event) => this.handleOverlayPowerDrag(event));
    document.body.append(this.overlay);
    this.renderOverlay();
  }

  private renderOverlay() {
    this.overlay.replaceChildren();
    this.overlay.className = `hole-controls hole-controls--${this.mode}`;
    this.overlay.classList.toggle("is-locked", this.controlsLocked);
    this.overlay.dataset.distanceFt = `${Math.round(gameSession.distanceToBasket)}`;

    if (this.mode === "putting") {
      this.renderPuttingControls();
      return;
    }

    if (this.mode === "flight") {
      this.addStatusPanel("Disc in flight", this.status);
      const controls = this.createElement("div", "button-grid single-action");
      this.addButton("Watch the flight…", () => {}, controls, "primary-action", true);
      this.overlay.append(controls);
      return;
    }

    this.renderSetupControls();
  }

  private renderSetupControls() {
    if (this.status !== this.defaultStatus) {
      this.addStatusPanel("Shot result", this.status);
    }
    const forecast = gameSession.forecastThrow(this.currentShotInput());
    this.addScreenStatePanel([
      ["Lie", this.currentLieQualityLabel()],
      ["Wind", this.routeWindLabel(forecast)],
      ["Forecast", this.previewLandingLabel(forecast)],
      ["Risk", this.previewRiskLabel(forecast)],
    ]);

    const aimCard = this.createElement("div", "control-card split-card");
    aimCard.append(this.createReadout("Aim", this.formatAimOffset()));
    aimCard.append(this.createReadout("Power", `${Math.round(this.power * 100)}%`));
    this.overlay.append(aimCard);

    this.addPowerPad({
      label: "Throw power",
      value: this.power,
      onValue: (value) => {
        this.power = value;
        this.updateAimLine();
        this.updateHud();
      },
    });

    const controls = this.createElement("div", "button-grid");
    this.addButton(`Disc: ${describeDisc(this.disc)}`, () => {
      this.disc = this.disc === "driver" ? "midrange" : this.disc === "midrange" ? "putter" : "driver";
      this.updateAimLine();
      this.renderOverlay();
      this.updateHud();
    }, controls);
    this.addButton(`Angle: ${describeAngle(this.releaseAngle)}`, () => {
      this.releaseAngle =
        this.releaseAngle === "hyzer" ? "flat" : this.releaseAngle === "flat" ? "anhyzer" : "hyzer";
      this.updateAimLine();
      this.renderOverlay();
      this.updateHud();
    }, controls);
    this.addButton("Throw disc", () => this.throwDisc(), controls, "primary-action");
    this.overlay.append(controls);
  }

  private renderPuttingControls() {
    this.addStatusPanel("Putting view", this.status);
    this.addScreenStatePanel([
      ["Current lie", "PUTT MARKER"],
      ["Target", "BASKET CHAINS"],
      ["Putt forecast", `${Math.round(gameSession.distanceToBasket)} ft with wind drift`],
      ["Next action", "Aim crosshair, set power, Release putt"],
    ]);

    const distance = Math.round(gameSession.distanceToBasket);
    const aimCard = this.createElement("div", "control-card split-card");
    aimCard.append(this.createReadout("Putt", `${distance} ft`));
    aimCard.append(this.createReadout("Aim miss", `${Math.round(Math.hypot(this.puttOffset.x, this.puttOffset.y))} px`));
    this.overlay.append(aimCard);

    this.addPowerPad({
      label: "Putt power",
      value: this.puttPower,
      onValue: (value) => {
        this.puttPower = value;
        this.updateHud();
      },
    });

    const controls = this.createElement("div", "button-grid single-action");
    this.addButton("Release putt", () => this.releasePutt(), controls, "primary-action");
    this.overlay.append(controls);
  }

  private addStatusPanel(title: string, message: string) {
    const panel = this.createElement("div", "status-panel");
    const titleNode = this.createElement("strong", "");
    titleNode.textContent = title;
    const messageNode = this.createElement("span", "");
    messageNode.textContent = message;
    panel.append(titleNode, messageNode);
    this.overlay.append(panel);
  }

  private addScreenStatePanel(rows: [string, string][]) {
    const panel = this.createElement("dl", "screen-state");

    for (const [label, value] of rows) {
      const item = this.createElement("div", "screen-state-row");
      const term = this.createElement("dt", "");
      term.textContent = label;
      const description = this.createElement("dd", "");
      description.textContent = value;
      item.append(term, description);
      panel.append(item);
    }

    this.overlay.append(panel);
  }

  private createReadout(label: string, value: string) {
    const wrapper = this.createElement("div", "readout");
    const labelNode = this.createElement("span", "readout-label");
    labelNode.textContent = label;
    const valueNode = this.createElement("span", "readout-value");
    valueNode.textContent = value;
    wrapper.append(labelNode, valueNode);
    return wrapper;
  }

  private addPowerPad(options: { label: string; value: number; onValue: (value: number) => void }) {
    const pad = this.createElement("div", "power-pad");
    pad.setAttribute("role", "slider");
    pad.setAttribute("aria-label", options.label);
    pad.setAttribute("aria-valuemin", "25");
    pad.setAttribute("aria-valuemax", "100");
    pad.setAttribute("aria-valuenow", `${Math.round(options.value * 100)}`);

    const label = this.createElement("div", "power-label");
    label.textContent = `${options.label}: ${Math.round(options.value * 100)}%`;
    const track = this.createElement("div", "power-track");
    const fill = this.createElement("div", "power-fill");
    fill.style.height = `${Math.round(options.value * 100)}%`;
    const thumb = this.createElement("div", "power-thumb");
    thumb.style.bottom = `${Math.round(options.value * 100)}%`;
    const hint = this.createElement("div", "power-hint");
    hint.textContent = "Drag up for more power";
    track.append(fill, thumb);
    pad.append(label, track, hint);

    const updateFromClientY = (clientY: number) => {
      const rect = track.getBoundingClientRect();
      const nextValue = Phaser.Math.Clamp((rect.bottom - clientY) / rect.height, 0.25, 1);
      options.onValue(nextValue);
      this.syncLivePowerDisplay(options.label, nextValue);
      label.textContent = `${options.label}: ${Math.round(nextValue * 100)}%`;
      fill.style.height = `${Math.round(nextValue * 100)}%`;
      thumb.style.bottom = `${Math.round(nextValue * 100)}%`;
      pad.setAttribute("aria-valuenow", `${Math.round(nextValue * 100)}`);
    };

    pad.addEventListener("pointerdown", (event) => {
      if (this.controlsLocked) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      pad.setPointerCapture(event.pointerId);
      updateFromClientY(event.clientY);
    });
    pad.addEventListener("pointermove", (event) => {
      if (this.controlsLocked || !pad.hasPointerCapture(event.pointerId)) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      updateFromClientY(event.clientY);
    });

    this.overlay.append(pad);
  }

  private syncLivePowerDisplay(label: string, value: number) {
    const percent = `${Math.round(value * 100)}%`;

    if (label === "Throw power") {
      this.overlay.querySelectorAll(".readout").forEach((readout) => {
        const readoutLabel = readout.querySelector(".readout-label")?.textContent?.trim();
        if (readoutLabel === "Power") {
          const readoutValue = readout.querySelector(".readout-value");
          if (readoutValue) {
            readoutValue.textContent = percent;
          }
        }
      });
    }

    if (label === "Putt power") {
      this.overlay.querySelectorAll("button").forEach((button) => {
        if (button.textContent?.startsWith("Putt power:")) {
          const nextLabel = `Putt power: ${percent}`;
          button.textContent = nextLabel;
          button.ariaLabel = nextLabel;
        }
      });
    }
  }

  private updateDragReadouts() {
    if (this.mode !== "setup") return;
    const forecast = gameSession.forecastThrow(this.currentShotInput());
    const powerPercent = `${Math.round(this.power * 100)}%`;

    for (const readout of this.overlay.querySelectorAll<HTMLElement>(".readout")) {
      const label = readout.querySelector(".readout-label")?.textContent?.trim();
      const valueEl = readout.querySelector<HTMLElement>(".readout-value");
      if (!valueEl) continue;
      if (label === "Aim") valueEl.textContent = this.formatAimOffset();
      if (label === "Power") valueEl.textContent = powerPercent;
    }

    const pad = this.overlay.querySelector<HTMLElement>(".power-pad");
    if (pad) {
      const fill = pad.querySelector<HTMLElement>(".power-fill");
      const thumb = pad.querySelector<HTMLElement>(".power-thumb");
      const padLabel = pad.querySelector<HTMLElement>(".power-label");
      if (fill) fill.style.height = powerPercent;
      if (thumb) thumb.style.bottom = powerPercent;
      if (padLabel) padLabel.textContent = `Throw power: ${powerPercent}`;
      pad.setAttribute("aria-valuenow", String(Math.round(this.power * 100)));
    }

    for (const row of this.overlay.querySelectorAll(".screen-state-row")) {
      const label = row.querySelector("dt")?.textContent?.trim();
      const dd = row.querySelector<HTMLElement>("dd");
      if (!label || !dd) continue;
      if (label === "Forecast") dd.textContent = this.previewLandingLabel(forecast);
      if (label === "Risk") dd.textContent = this.previewRiskLabel(forecast);
    }
  }

  private createElement<K extends keyof HTMLElementTagNameMap>(tag: K, className: string) {
    const element = document.createElement(tag);
    if (className) {
      element.className = className;
    }
    return element;
  }

  private addButton(label: string, action: () => void, parent = this.overlay, className = "", disabled = this.controlsLocked) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.ariaLabel = label;
    button.className = className;
    button.disabled = disabled;
    button.addEventListener("click", action);
    parent.append(button);
  }

  private handleOverlayPowerDrag(_event: PointerEvent) {
    // Power is set via the DOM power-pad control; canvas overlay drag is not used in landscape.
  }

  private handleDrag(pointer: Phaser.Input.Pointer) {
    if (!pointer.isDown || this.controlsLocked) {
      return;
    }

    if (this.mode === "putting") {
      this.puttOffset = {
        x: Phaser.Math.Clamp(pointer.x - this.layout.puttBasket.x, -88, 88),
        y: Phaser.Math.Clamp(pointer.y - this.layout.puttBasket.y, -82, 82),
      };
      this.drawCrosshair();
      this.updateHud();
      return;
    }

    if (this.mode !== "setup") {
      return;
    }

    // In landscape the hole runs horizontally; aim offset is controlled by vertical drag.
    const { playLeft, playRight, playTop, playBottom, cy } = this.layout;
    if (pointer.x > playLeft && pointer.x < playRight - 50 && pointer.y > playTop && pointer.y < playBottom) {
      const dy = pointer.y - cy;
      this.aimOffsetDegrees = Phaser.Math.Clamp(dy / 4, -42, 42);
    }
    this.updateAimLine();
    this.updateHud();
    this.updateDragReadouts();
  }

  private throwDisc() {
    if (this.controlsLocked) {
      this.queuedThrowClicks = Phaser.Math.Clamp(this.queuedThrowClicks + 1, 0, 2);
      this.status = "Next throw queued after the lie resolves.";
      this.updateHud();
      this.renderOverlay();
      return;
    }

    this.controlsLocked = true;
    this.mode = "flight";
    this.status = "Watch the landing before the next lie resolves.";
    this.children.removeAll(true);
    this.drawCourse();
    this.createHud();
    this.renderOverlay();
    this.updateHud();

    const result = gameSession.throwDisc(this.currentShotInput());
    this.lastResult = result;
    this.drawFlightPath(result);
    this.animateFlight(result, () => {
      this.status = result.reliefApplied
        ? "OB landing. +1 penalty and relief moved the lie in bounds."
        : gameSession.mode === "putt"
          ? "Approach settled inside putting range."
          : "Lie advanced. Plan the next shot.";
      this.updateLieMarker();

      if (gameSession.mode === "putt") {
        this.queuedThrowClicks = 0;
        this.time.delayedCall(650, () => {
          this.mode = "putting";
          this.status = "Putting mode. Drag the crosshair on the basket and set putt power.";
          this.controlsLocked = false;
          this.enterPuttingView();
          this.updateHud();
          this.renderOverlay();
        });
        return;
      }

      this.mode = "setup";
      this.controlsLocked = false;
      this.setSuggestedThrowDefaults();
      this.children.removeAll(true);
      this.drawSetupView();
      this.createHud();
      this.updateHud();
      this.renderOverlay();

      if (this.queuedThrowClicks > 0) {
        this.queuedThrowClicks -= 1;
        this.time.delayedCall(80, () => this.throwDisc());
      }
    });
  }

  private releasePutt() {
    if (this.controlsLocked) {
      return;
    }

    const result = gameSession.putt({ aimOffset: this.puttOffset, power: this.puttPower });
    this.status = result.autoTapIn
      ? "Tap-in range. One stroke added automatically."
      : result.made
        ? "Chains caught it."
        : result.missReason
          ? `Missed: ${result.missReason}. Reset aim and try again.`
          : "Missed putt. Reset aim and try again.";
    if (this.mode === "putting") {
      this.children.removeAll(true);
      this.drawPuttingView();
      this.createHud();
    } else {
      this.updateLieMarker();
    }

    if (gameSession.holeState.complete) {
      this.clearOverlay();
      this.scene.start("ScoreScene");
      return;
    }

    this.updateHud();
    this.renderOverlay();
  }

  private updateHud() {
    const distance = Math.round(gameSession.distanceToBasket);
    const wind = gameSession.wind;
    const scoreLine = `${gameSession.selectedCharacter.name} | Strokes ${gameSession.holeState.strokes} | Par ${gameSession.hole.par}`;

    if (this.mode === "putting") {
      this.hud?.setText(
        `Putting view | ${scoreLine}\nPutt ${distance} ft | Wind ${wind.strength} @ ${wind.directionDegrees} deg | Power ${Math.round(
          this.puttPower * 100,
        )}%`,
      );
      return;
    }

    if (this.mode === "flight") {
      const resultLine = this.lastResult?.reliefApplied
        ? `Flight landing OB | Relief lie applied | Penalties ${gameSession.holeState.penaltyStrokes}`
        : this.lastResult
          ? `Flight landing shown | Next lie ${distance} ft out`
          : "Flight resolving";
      this.hud?.setText(`Top-down flight | ${scoreLine}\n${resultLine}`);
      return;
    }

    this.hud?.setText(
      `Throw setup | ${scoreLine}\n${distance} ft | Wind ${wind.strength} @ ${wind.directionDegrees} deg\n${describeDisc(
        this.disc,
      )} | ${describeAngle(this.releaseAngle)} | ${this.routeWindLabel(gameSession.forecastThrow(this.currentShotInput()))}\nAim ${Math.round(this.absoluteAimDegrees())} (${this.formatAimOffset()}) | Power ${Math.round(
        this.power * 100,
      )}%`,
    );
    this.updateAimLine();
  }

  private updateAimLine() {
    if ((!this.aimLine && !this.aimPath) || this.mode === "putting") {
      return;
    }

    const start = this.worldToScreen(gameSession.holeState.lie);
    const forecast = gameSession.forecastThrow(this.currentShotInput());
    const end = this.worldToScreen(forecast.likelyLanding);
    const zone = this.previewForecastZone(forecast);
    const pathVector = {
      x: end.x - start.x,
      y: end.y - start.y,
    };
    const pathLength = Math.max(1, Math.hypot(pathVector.x, pathVector.y));
    const normal = {
      x: -pathVector.y / pathLength,
      y: pathVector.x / pathLength,
    };
    const releaseCurve = Phaser.Math.Clamp(forecast.likelyCurve * 1.8, -96, 96);
    const control = {
      x: (start.x + end.x) / 2 + normal.x * releaseCurve,
      y: (start.y + end.y) / 2 + normal.y * releaseCurve,
    };
    const previewCurve = new Phaser.Curves.QuadraticBezier(
      new Phaser.Math.Vector2(start.x, start.y),
      new Phaser.Math.Vector2(control.x, control.y),
      new Phaser.Math.Vector2(end.x, end.y),
    );
    const previewPoints = previewCurve.getPoints(24);
    const forecastPathPoints = previewPoints.slice(0, Math.max(2, Math.floor(previewPoints.length * forecast.pathReveal)));
    const fadeEnd = forecastPathPoints[forecastPathPoints.length - 1] ?? end;
    const labelPoint = previewPoints[12] ?? control;
    const forecastColor = forecast.reliefLikely ? 0xffb49e : 0xe2d36c;

    this.aimPath?.clear();
    this.drawFadedPreviewPath(forecastPathPoints, forecastColor);
    this.forecastZone?.clear();
    this.forecastZone?.fillStyle(forecastColor, forecast.reliefLikely ? 0.2 : 0.16);
    this.forecastZone?.fillEllipse(zone.center.x, zone.center.y, zone.width, zone.height);
    this.forecastZone?.lineStyle(3, forecastColor, 0.82);
    this.forecastZone?.strokeEllipse(zone.center.x, zone.center.y, zone.width, zone.height);
    this.forecastZone?.lineStyle(2, 0xf6f0d2, 0.34);
    this.forecastZone?.strokeEllipse(zone.center.x, zone.center.y, zone.width * 0.58, zone.height * 0.58);
    this.aimLine?.setTo(start.x, start.y, fadeEnd.x, fadeEnd.y);
    this.aimArrow?.setVisible(false);
    this.aimTarget?.setVisible(false);
    this.aimLabel?.setVisible(!forecast.reliefLikely);
    if (!forecast.reliefLikely) {
      const labelOffsetY = this.aimOffsetDegrees >= 0 ? 48 : -48;
      const { playLeft, playRight, playTop, playBottom } = this.layout;
      this.aimLabel?.setPosition(
        Phaser.Math.Clamp(labelPoint.x, playLeft + 60, playRight - 60),
        Phaser.Math.Clamp(labelPoint.y + labelOffsetY, playTop + 30, playBottom - 30),
      );
      this.aimLabel?.setText(this.previewLandingLabel(forecast));
    }
  }

  private updateLieMarker() {
    if (this.mode === "putting") {
      return;
    }
    const lie = this.worldToScreen(gameSession.holeState.lie);
    this.lieMarker?.setPosition(lie.x, lie.y);
  }

  private enterPuttingView() {
    this.children.removeAll(true);
    this.flightPath = undefined;
    this.flightDisc = undefined;
    this.aimPath = undefined;
    this.forecastZone = undefined;
    this.aimLine = undefined;
    this.lieMarker = undefined;
    this.drawPuttingView();
    this.createHud();
  }

  private drawPuttingView() {
    this.crosshair?.destroy();
    this.crosshairLines.forEach((line) => line.destroy());
    this.crosshairLines = [];
    this.puttGuide?.destroy();

    const { cx, cy, playLeft, playTop } = this.layout;
    const PB = this.layout.puttBasket;
    const PT = this.layout.puttTee;
    const W = this.scale.width, H = this.scale.height;

    this.add.rectangle(cx, cy, W, H, 0x172419);
    // Landscape green: center horizontal strip
    this.add.rectangle(cx - 150, cy, W - 300, 220, 0x45612f);
    this.add.rectangle(cx - 150, cy + 80, W - 300, 80, 0x25371f);
    this.add.rectangle(cx - 150, cy, W - 300, H - 120, 0xf6f0d2, 0.04).setStrokeStyle(2, 0xd8c66a, 0.28);
    this.add.circle(playLeft + 50, playTop + 60, 36, 0x5b3f8f, 0.45);
    this.add.circle(playLeft + 200, playTop + 40, 28, 0x6a8732, 0.7);

    // Basket structure
    this.add.rectangle(PB.x, PB.y + 88, 8, 178, 0xd8c66a);
    this.add.ellipse(PB.x, PB.y + 180, 96, 16, 0x11140f, 0.55);
    this.add.ellipse(PB.x, PB.y - 20, 118, 36, 0xd8c66a, 0.18).setStrokeStyle(4, 0xd8c66a);
    this.add.rectangle(PB.x, PB.y + 34, 86, 92, 0x10150f, 0.28).setStrokeStyle(3, 0xd8c66a);
    this.add
      .text(PB.x, PB.y - 78, "BASKET / CHAINS", {
        color: "#10150f",
        fontFamily: "Trebuchet MS",
        fontSize: "12px",
        fontStyle: "bold",
        backgroundColor: "#f6f0d2",
        padding: { x: 6, y: 3 },
      })
      .setOrigin(0.5);

    for (let index = 0; index < 6; index += 1) {
      const x = PB.x - 34 + index * 13.5;
      this.add.line(0, 0, x, PB.y - 8, x + 8, PB.y + 76, 0xf6f0d2, 0.55).setLineWidth(2);
    }

    // Tee marker
    this.add.circle(PT.x, PT.y, 12, 0xe2d36c).setStrokeStyle(3, 0x1a1510);
    this.add.rectangle(PT.x, PT.y + 26, 72, 12, 0xf6f0d2, 0.35);
    this.add
      .text(PT.x, PT.y - 28, "PUTT LIE / DISC", {
        color: "#10150f",
        fontFamily: "Trebuchet MS",
        fontSize: "12px",
        fontStyle: "bold",
        backgroundColor: "#e2d36c",
        padding: { x: 6, y: 3 },
      })
      .setOrigin(0.5);

    // Info text in upper-right of play area
    const infoX = Math.round(W * 0.72);
    this.add
      .text(infoX, H * 0.22, `${Math.round(gameSession.distanceToBasket)} ft putt`, {
        color: "#f6f0d2",
        fontFamily: "Trebuchet MS",
        fontSize: "24px",
      })
      .setOrigin(0.5);
    this.add
      .text(infoX, H * 0.33, `Wind drift ${gameSession.wind.strength} @ ${gameSession.wind.directionDegrees} deg`, {
        color: "#cfe4a4",
        fontFamily: "Trebuchet MS",
        fontSize: "16px",
      })
      .setOrigin(0.5);
    const dragHint = this.add
      .text(PB.x, PB.y + 130, "▶  Drag crosshair to aim  ◀", {
        color: "#10150f",
        fontFamily: "Trebuchet MS",
        fontSize: "14px",
        fontStyle: "bold",
        backgroundColor: "#e2d36c",
        padding: { x: 8, y: 4 },
      })
      .setOrigin(0.5);
    this.tweens.add({
      targets: dragHint,
      alpha: { from: 1, to: 0.25 },
      duration: 700,
      repeat: 3,
      yoyo: true,
      ease: "Sine.easeInOut",
    });

    this.drawCrosshair();
    const pulseRing = this.add.circle(PB.x, PB.y, 20, 0xe2d36c, 0).setStrokeStyle(3, 0xe2d36c, 0.9);
    this.tweens.add({
      targets: pulseRing,
      scaleX: 2.4,
      scaleY: 2.4,
      alpha: 0,
      duration: 1100,
      repeat: 2,
      ease: "Sine.easeOut",
    });
  }

  private drawFlightPath(result: ShotResult) {
    this.flightPath?.destroy();

    const start = this.worldToScreen(result.start);
    const landing = this.worldToScreen(result.flightLanding);
    const midpoint = {
      x: (start.x + landing.x) / 2,
      y: (start.y + landing.y) / 2,
    };
    const pathVector = {
      x: landing.x - start.x,
      y: landing.y - start.y,
    };
    const pathLength = Math.max(1, Math.hypot(pathVector.x, pathVector.y));
    const normal = {
      x: -pathVector.y / pathLength,
      y: pathVector.x / pathLength,
    };
    const visualCurve = Phaser.Math.Clamp(result.curve * 1.8, -96, 96);
    const control = {
      x: midpoint.x + normal.x * visualCurve,
      y: midpoint.y + normal.y * visualCurve,
    };
    const curve = new Phaser.Curves.QuadraticBezier(
      new Phaser.Math.Vector2(start.x, start.y),
      new Phaser.Math.Vector2(control.x, control.y),
      new Phaser.Math.Vector2(landing.x, landing.y),
    );
    const points = curve.getPoints(24);

    this.flightPath = this.add.graphics();
    this.flightPath.lineStyle(4, 0xf6f0d2, 0.68);
    this.flightPath.strokePoints(points, false);
    this.flightPath.fillStyle(0xf6f0d2, 0.9);
    this.flightPath.fillCircle(start.x, start.y, 7);
    this.flightPath.fillCircle(landing.x, landing.y, 7);
    const { playTop, playBottom } = this.layout;
    this.add
      .text(start.x, Math.min(start.y + 28, playBottom - 30), "THROW START", {
        color: "#10150f",
        fontFamily: "Trebuchet MS",
        fontSize: "11px",
        fontStyle: "bold",
        backgroundColor: "#e2d36c",
        padding: { x: 5, y: 2 },
      })
      .setOrigin(0.5);
    this.add
      .text(landing.x, Math.max(landing.y - 24, playTop + 30), result.reliefApplied ? "OB LANDING" : "LANDING", {
        color: "#10150f",
        fontFamily: "Trebuchet MS",
        fontSize: "11px",
        fontStyle: "bold",
        backgroundColor: result.reliefApplied ? "#ffb49e" : "#f6f0d2",
        padding: { x: 5, y: 2 },
      })
      .setOrigin(0.5);

    if (result.reliefApplied) {
      const relief = this.worldToScreen(result.landing);
      this.flightPath.lineStyle(3, 0xff8f6b, 0.8);
      this.flightPath.strokeCircle(landing.x, landing.y, 15);
      this.flightPath.lineStyle(3, 0xe2d36c, 0.65);
      this.flightPath.beginPath();
      this.flightPath.moveTo(landing.x, landing.y);
      this.flightPath.lineTo(relief.x, relief.y);
      this.flightPath.strokePath();
      this.flightPath.fillStyle(0xe2d36c, 0.9);
      this.flightPath.fillCircle(relief.x, relief.y, 6);
      this.add
        .text(relief.x, Math.min(relief.y + 28, playBottom - 30), "RELIEF LIE", {
          color: "#10150f",
          fontFamily: "Trebuchet MS",
          fontSize: "11px",
          fontStyle: "bold",
          backgroundColor: "#e2d36c",
          padding: { x: 5, y: 2 },
        })
        .setOrigin(0.5);
    }
  }

  private animateFlight(result: ShotResult, onComplete: () => void) {
    const start = this.worldToScreen(result.start);
    const landing = this.worldToScreen(result.flightLanding);
    const midpoint = {
      x: (start.x + landing.x) / 2,
      y: (start.y + landing.y) / 2,
    };
    const pathVector = {
      x: landing.x - start.x,
      y: landing.y - start.y,
    };
    const pathLength = Math.max(1, Math.hypot(pathVector.x, pathVector.y));
    const normal = {
      x: -pathVector.y / pathLength,
      y: pathVector.x / pathLength,
    };
    const visualCurve = Phaser.Math.Clamp(result.curve * 1.8, -96, 96);
    const control = {
      x: midpoint.x + normal.x * visualCurve,
      y: midpoint.y + normal.y * visualCurve,
    };
    const curve = new Phaser.Curves.QuadraticBezier(
      new Phaser.Math.Vector2(start.x, start.y),
      new Phaser.Math.Vector2(control.x, control.y),
      new Phaser.Math.Vector2(landing.x, landing.y),
    );
    const tracker = { t: 0 };

    this.flightDisc?.destroy();
    this.flightDisc = this.add.circle(start.x, start.y, 7, 0xf6f0d2).setStrokeStyle(2, 0x1a1510);
    this.tweens.add({
      targets: tracker,
      t: 1,
      duration: 850,
      ease: "Sine.easeInOut",
      onUpdate: () => {
        const point = curve.getPoint(tracker.t);
        this.flightDisc?.setPosition(point.x, point.y);
        this.flightDisc?.setScale(1 + Math.sin(tracker.t * Math.PI) * 0.55, 1);
      },
      onComplete: () => {
        const finalPoint = result.reliefApplied ? this.worldToScreen(result.landing) : landing;
        this.tweens.add({
          targets: this.flightDisc,
          x: finalPoint.x,
          y: finalPoint.y,
          scaleX: 1,
          scaleY: 1,
          duration: result.reliefApplied ? 360 : 120,
          ease: "Sine.easeOut",
          onComplete,
        });
      },
    });
  }

  private drawCrosshair() {
    this.crosshair?.destroy();
    this.crosshairLines.forEach((line) => line.destroy());
    this.crosshairLines = [];
    this.puttGuide?.destroy();

    const PB = this.layout.puttBasket;
    const PT = this.layout.puttTee;
    const x = PB.x + this.puttOffset.x;
    const y = PB.y + this.puttOffset.y;
    this.puttGuide = this.add.graphics();
    this.puttGuide.lineStyle(3, 0xf6f0d2, 0.5);
    this.puttGuide.beginPath();
    this.puttGuide.moveTo(PT.x, PT.y);
    this.puttGuide.lineTo(x, y);
    this.puttGuide.strokePath();

    this.crosshair = this.add.circle(x, y, 14, 0x000000, 0);
    this.crosshair.setStrokeStyle(3, 0xe2d36c);
    this.crosshairLines = [
      this.add.line(0, 0, x - 22, y, x + 22, y, 0xe2d36c),
      this.add.line(0, 0, x, y - 22, x, y + 22, 0xe2d36c),
    ];
  }

  private setSuggestedThrowDefaults() {
    const distance = gameSession.distanceToBasket;

    this.aimOffsetDegrees = 0;
    this.releaseAngle = "flat";

    if (distance > 470) {
      this.disc = "driver";
      this.power = 0.78;
      this.aimOffsetDegrees = 0;
      return;
    }

    if (distance > 260) {
      this.disc = "driver";
      this.power = 0.78;
      return;
    }

    if (distance > 150) {
      this.disc = "midrange";
      this.power = 0.6;
      return;
    }

    this.disc = "putter";
    this.power = 0.52;
  }

  private currentShotInput(): ShotInput {
    return {
      aimDegrees: this.absoluteAimDegrees(),
      power: this.power,
      releaseAngle: this.releaseAngle,
      disc: this.disc,
    };
  }

  private absoluteAimDegrees() {
    const lie = gameSession.holeState.lie;
    const basket = gameSession.hole.basket;
    const basketBearing = Phaser.Math.RadToDeg(Math.atan2(basket.y - lie.y, basket.x - lie.x));

    return this.normalizeDegrees(basketBearing + this.aimOffsetDegrees);
  }

  private normalizeDegrees(degrees: number) {
    return ((((degrees + 180) % 360) + 360) % 360) - 180;
  }

  private formatAimOffset() {
    const rounded = Math.round(this.aimOffsetDegrees);
    if (rounded === 0) return "0°";
    return `${Math.abs(rounded)}° ${rounded > 0 ? "R" : "L"}`;
  }

  private previewLandingLabel(forecast: ShotForecast) {
    if (forecast.reliefLikely) {
      return "OB risk";
    }

    const basketDistance = distanceBetween(forecast.likelyLie, gameSession.hole.basket);
    if (basketDistance <= gameSession.hole.tapInRange) {
      return "Near chains";
    }

    if (basketDistance <= gameSession.hole.puttingRange) {
      return `${forecast.confidence} putt`;
    }

    if (basketDistance <= gameSession.hole.puttingRange * 1.8) {
      return `${forecast.confidence} short`;
    }

    return `${forecast.confidence} landing`;
  }

  private previewRiskLabel(forecast: ShotForecast) {
    if (forecast.reliefLikely) {
      return "High - OB edge";
    }

    const landing = forecast.likelyLie;
    const bounds = gameSession.hole.bounds;
    const margin = Math.min(
      landing.x - bounds.x,
      bounds.x + bounds.width - landing.x,
      landing.y - bounds.y,
      bounds.y + bounds.height - landing.y,
    );
    const basketDistance = distanceBetween(landing, gameSession.hole.basket);

    if (margin < 18) {
      return "High - edge lie";
    }

    if (basketDistance <= gameSession.hole.puttingRange) {
      return "Scoring look";
    }

    const likelyLieQuality = forecast.likelyLieQuality;

    if (likelyLieQuality === "scramble") {
      return "High - hazard lie";
    }

    if (likelyLieQuality === "rough") {
      return "Medium - rough finish";
    }

    if (Math.abs(forecast.likelyCurve) > 34 || forecast.effectivePower > forecast.controlledPower) {
      return "Medium - shape touch";
    }

    return "Low - open lane";
  }

  private routeWindLabel(forecast: ShotForecast) {
    const strength = forecast.routeWind.strength.toFixed(1);
    const zones = forecast.routeWindZones
      .map((id) => gameSession.hole.windZones?.find((zone) => zone.id === id)?.label)
      .filter((label): label is string => Boolean(label));
    const effect = this.windEffectDescription(forecast);

    if (zones.length === 0) {
      return `Open air ${strength}${effect}`;
    }

    return `${zones.join(" + ")} ${strength}${effect}`;
  }

  private windEffectDescription(forecast: ShotForecast): string {
    if (forecast.routeWindZones.includes("left-tailwind")) {
      return " · longer carry";
    }

    if (forecast.routeWindZones.includes("right-crosswind")) {
      return " · push across";
    }

    const wind = forecast.routeWind;
    if (wind.strength < 0.5) {
      return " · no effect";
    }

    return "";
  }

  private currentLieQualityLabel() {
    const lie = gameSession.holeState.lie;
    const basketDistance = distanceBetween(lie, gameSession.hole.basket);

    if (basketDistance <= gameSession.hole.tapInRange) {
      return "Clean circle";
    }

    if (basketDistance <= gameSession.hole.puttingRange) {
      return "Putting look";
    }

    return this.formatLieQuality(gameSession.lieQuality);
  }

  private formatLieQuality(lieQuality: LieQuality) {
    if (lieQuality === "scramble") {
      return "Scramble stance";
    }

    if (lieQuality === "rough") {
      return "Playable rough";
    }

    if (lieQuality === "relief") {
      return "Relief lie";
    }

    return "Open fairway";
  }

  private previewForecastZone(forecast: ShotForecast) {
    const center = this.worldToScreen(forecast.landingZone.center);
    const scaleX = this.layout.playWidth / gameSession.hole.bounds.width;
    const scaleY = this.layout.playHeight / gameSession.hole.bounds.height;

    return {
      center,
      width: Phaser.Math.Clamp(forecast.landingZone.radiusX * 2 * scaleX, 30, 128),
      height: Phaser.Math.Clamp(forecast.landingZone.radiusY * 2 * scaleY, 18, 90),
    };
  }

  private drawFadedPreviewPath(points: Phaser.Math.Vector2[], color: number) {
    if (!this.aimPath || points.length < 2) {
      return;
    }

    for (let index = 1; index < points.length; index += 1) {
      const progress = index / (points.length - 1);
      this.aimPath.lineStyle(6 - progress * 2.5, color, Phaser.Math.Linear(0.88, 0.16, progress));
      this.aimPath.beginPath();
      this.aimPath.moveTo(points[index - 1].x, points[index - 1].y);
      this.aimPath.lineTo(points[index].x, points[index].y);
      this.aimPath.strokePath();
    }
  }

  private worldToScreen(point: Vector2) {
    const { playLeft, playTop, playWidth, playHeight } = this.layout;
    const bounds = gameSession.hole.bounds;
    return {
      x: playLeft + ((point.x - bounds.x) / bounds.width) * playWidth,
      y: playTop + ((point.y - bounds.y) / bounds.height) * playHeight,
    };
  }

  private worldRectToScreen(rect: { x: number; y: number; width: number; height: number }) {
    const topLeft = this.worldToScreen({ x: rect.x, y: rect.y });
    const bottomRight = this.worldToScreen({ x: rect.x + rect.width, y: rect.y + rect.height });

    return {
      x: topLeft.x,
      y: topLeft.y,
      width: bottomRight.x - topLeft.x,
      height: bottomRight.y - topLeft.y,
    };
  }

  private clearOverlay() {
    document.querySelectorAll("[data-scene]").forEach((node) => node.remove());
  }
}
