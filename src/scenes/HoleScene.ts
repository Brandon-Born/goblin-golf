import Phaser from "phaser";
import { describeAngle, describeDisc, gameSession } from "../game/GameSession";
import type { DiscType, ReleaseAngle, ShotResult, Vector2 } from "../game/types";

type HoleMode = "setup" | "flight" | "putting";

const PUTT_BASKET = { x: 195, y: 300 };
const PUTT_TEE = { x: 195, y: 560 };
const COURSE_CENTER_X = 195;
const AIM_DRAG_TOP = 168;

export class HoleScene extends Phaser.Scene {
  private aimDegrees = -86;
  private power = 0.72;
  private puttPower = 0.64;
  private puttOffset: Vector2 = { x: 0, y: 0 };
  private disc: DiscType = "driver";
  private releaseAngle: ReleaseAngle = "flat";
  private mode: HoleMode = "setup";
  private hud?: Phaser.GameObjects.Text;
  private overlay = document.createElement("div");
  private aimPath?: Phaser.GameObjects.Graphics;
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
  private status = "Drag fairway to aim. Tap Disc/Angle to cycle. Drag power, then throw.";
  private lastResult?: ShotResult;
  private controlsLocked = false;
  private queuedThrowClicks = 0;

  constructor() {
    super("HoleScene");
  }

  create() {
    this.clearOverlay();
    this.mode = gameSession.mode === "putt" ? "putting" : "setup";
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
    const basket = this.worldToScreen(gameSession.hole.basket);
    const lie = this.worldToScreen(gameSession.holeState.lie);

    this.add.rectangle(195, 422, 390, 844, 0x142018);
    this.add.rectangle(195, 318, 246, 492, 0x416b34).setStrokeStyle(3, 0xd8c66a, 0.45);
    this.add.rectangle(42, 318, 72, 492, 0x4d3c81, 0.86);
    this.add.rectangle(348, 318, 72, 492, 0x4d3c81, 0.86);
    this.add.text(42, 318, "OB", { color: "#f6f0d2", fontFamily: "Trebuchet MS", fontSize: "18px" }).setOrigin(0.5);
    this.add.text(348, 318, "OB", { color: "#f6f0d2", fontFamily: "Trebuchet MS", fontSize: "18px" }).setOrigin(0.5);

    this.add.circle(basket.x, basket.y, 46, 0xe2d36c, 0.14).setStrokeStyle(4, 0xe2d36c, 0.7);
    this.add.circle(basket.x, basket.y, 28, 0x10150f, 0.58).setStrokeStyle(4, 0xd8c66a);
    this.drawBasketIcon(basket.x, basket.y + 10, 0.64);
    this.add
      .text(basket.x, basket.y - 56, "BASKET TARGET", {
        color: "#10150f",
        fontFamily: "Trebuchet MS",
        fontSize: "12px",
        fontStyle: "bold",
        backgroundColor: "#f6f0d2",
        padding: { x: 6, y: 3 },
      })
      .setOrigin(0.5)
      .setDepth(7);

    this.drawHazardLabel(112, 270, "RUINS", "SCENERY");
    this.drawHazardLabel(282, 370, "RUINS", "SCENERY");
    this.drawMushroom(88, 430, 0xd14f41);
    this.drawMushroom(304, 220, 0xf2e7b8);

    this.add.circle(lie.x, lie.y, 24, 0x10150f, 0.75).setStrokeStyle(4, 0xe2d36c);
    this.add.circle(lie.x, lie.y, 11, 0xf6f0d2).setStrokeStyle(3, gameSession.selectedCharacter.palette);
    this.add.circle(lie.x - 22, lie.y + 18, 14, gameSession.selectedCharacter.palette).setStrokeStyle(3, 0x10150f);
    const lieLabelY = lie.y > 500 ? lie.y - 58 : lie.y + 46;
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
    this.add
      .text(195, 594, "Drag fairway to aim. Set power, then Throw disc.", {
        color: "#cfe4a4",
        fontFamily: "Trebuchet MS",
        fontSize: "13px",
        align: "center",
        wordWrap: { width: 316 },
      })
      .setOrigin(0.5);

    this.lieMarker = this.add.circle(lie.x, lie.y, 13, 0xe2d36c, 0.22).setStrokeStyle(4, 0xf6f0d2).setDepth(6);
    this.aimLine = undefined;
    this.aimPath = this.add.graphics().setDepth(4);
    this.aimArrow = this.add.triangle(basket.x, basket.y, 0, -12, -10, 10, 10, 10, 0xe2d36c, 0.95).setDepth(5);
    this.aimTarget = this.add.circle(basket.x, basket.y, 16, 0x000000, 0).setStrokeStyle(4, 0xe2d36c).setDepth(5);
    this.aimLabel = this.add
      .text(basket.x, basket.y + 40, "PROJECTED THROW", {
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

  private drawMushroom(x: number, y: number, color: number) {
    this.add.circle(x, y, 13, color);
    this.add.rectangle(x, y + 14, 9, 18, 0xe7d7ad);
  }

  private drawCourse() {
    this.add.rectangle(195, 422, 390, 844, 0x142018);
    this.add.rectangle(195, 346, 318, 500, 0x233b26).setStrokeStyle(3, 0xf6f0d2, 0.18);
    this.add.rectangle(195, 346, 230, 500, 0x5d8743, 0.9);
    this.add.rectangle(76, 346, 52, 500, 0x4d3c81, 0.62);
    this.add.rectangle(314, 346, 52, 500, 0x4d3c81, 0.62);
    this.add.text(76, 346, "OB", { color: "#f1c8ff", fontFamily: "Trebuchet MS", fontSize: "14px" }).setOrigin(0.5).setRotation(Math.PI / 2);
    this.add.text(314, 346, "OB", { color: "#f1c8ff", fontFamily: "Trebuchet MS", fontSize: "14px" }).setOrigin(0.5).setRotation(Math.PI / 2);

    for (const [x, y] of [
      [88, 238],
      [295, 304],
      [112, 515],
      [270, 570],
    ]) {
      this.add.rectangle(x, y, 50, 34, 0x7b7c78);
      this.add.rectangle(x + 8, y - 26, 34, 42, 0x65645e);
    }

    for (const [x, y, color] of [
      [72, 420, 0xd14f41],
      [316, 454, 0xf2e7b8],
      [102, 642, 0xd14f41],
      [302, 185, 0xf2e7b8],
    ]) {
      this.add.circle(x, y, 13, color);
      this.add.rectangle(x, y + 13, 9, 18, 0xe7d7ad);
    }

    for (const [x, y] of [
      [78, 720],
      [318, 682],
      [145, 210],
    ]) {
      this.add.ellipse(x, y, 34, 9, 0xe9e0c9);
      this.add.circle(x - 14, y - 4, 6, 0xe9e0c9);
    }

    const basket = this.worldToScreen(gameSession.hole.basket);
    this.add.circle(basket.x, basket.y, 42, 0xe2d36c, 0.14).setStrokeStyle(3, 0xe2d36c, 0.65);
    this.add.circle(basket.x, basket.y, 28, 0x1a1510).setStrokeStyle(4, 0xd8c66a);
    this.add.circle(basket.x, basket.y, 9, 0xf6f0d2);
    this.add
      .text(COURSE_CENTER_X, 86, "FLIGHT: DISC PATH", {
        color: "#f6f0d2",
        fontFamily: "Trebuchet MS",
        fontSize: "15px",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    this.add
      .text(basket.x, basket.y - 52, "BASKET TARGET", {
        color: "#10150f",
        fontFamily: "Trebuchet MS",
        fontSize: "12px",
        fontStyle: "bold",
        backgroundColor: "#f6f0d2",
        padding: { x: 6, y: 3 },
      })
      .setOrigin(0.5);
    this.lieMarker = this.add.circle(0, 0, 13, 0xe2d36c, 0.45).setStrokeStyle(4, 0xf6f0d2);
    this.aimLine = this.add.line(0, 0, 195, 734, 195, 438, 0xe2d36c, 0.85).setLineWidth(5).setVisible(false);
    this.updateLieMarker();
  }

  private createHud() {
    this.hud = this.add.text(18, 18, "", {
      color: "#f6f0d2",
      fontFamily: "Trebuchet MS",
      fontSize: "12px",
      lineSpacing: 4,
      wordWrap: { width: 354 },
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

    if (this.mode === "putting") {
      this.renderPuttingControls();
      return;
    }

    if (this.mode === "flight") {
      this.addStatusPanel("Disc in flight", this.status);
      const controls = this.createElement("div", "button-grid single-action");
      this.addButton("Throw disc", () => this.throwDisc(), controls, "primary-action", false);
      this.overlay.append(controls);
      return;
    }

    this.renderSetupControls();
  }

  private renderSetupControls() {
    this.addStatusPanel("Throw setup", this.status);
    this.addScreenStatePanel([
      ["Current lie", "YOUR DISC"],
      ["Target", `BASKET ${Math.round(gameSession.distanceToBasket)} ft`],
      ["Projected throw", `${describeAngle(this.releaseAngle)} ${describeDisc(this.disc)}`],
      ["Next action", "Set aim and power, then Throw disc"],
    ]);

    const aimCard = this.createElement("div", "control-card split-card");
    aimCard.append(this.createReadout("Aim", `${Math.round(this.aimDegrees)} deg`));
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
      this.renderOverlay();
      this.updateHud();
    }, controls);
    this.addButton(`Angle: ${describeAngle(this.releaseAngle)}`, () => {
      this.releaseAngle =
        this.releaseAngle === "hyzer" ? "flat" : this.releaseAngle === "flat" ? "anhyzer" : "hyzer";
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
      ["Projected putt", `${Math.round(gameSession.distanceToBasket)} ft with wind drift`],
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
    this.addButton(`Putt power: ${Math.round(this.puttPower * 100)}%`, () => {
      this.puttPower = this.puttPower >= 0.9 ? 0.45 : this.puttPower + 0.15;
      this.renderOverlay();
      this.updateHud();
    }, controls);
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

  private handleOverlayPowerDrag(event: PointerEvent) {
    if (
      this.mode !== "setup" ||
      this.controlsLocked ||
      event.clientY < 575 ||
      event.target instanceof HTMLButtonElement ||
      (event.target instanceof HTMLElement && Boolean(event.target.closest(".power-pad")))
    ) {
      return;
    }

    if (event.type === "pointerdown") {
      this.overlay.setPointerCapture(event.pointerId);
    } else if (!this.overlay.hasPointerCapture(event.pointerId)) {
      return;
    }

    event.preventDefault();
    this.power = Phaser.Math.Clamp((734 - event.clientY) / 190, 0.25, 1);
    this.updateAimLine();
    this.updateHud();
    this.renderOverlay();
  }

  private handleDrag(pointer: Phaser.Input.Pointer) {
    if (!pointer.isDown || this.controlsLocked) {
      return;
    }

    if (this.mode === "putting") {
      this.puttOffset = {
        x: Phaser.Math.Clamp(pointer.x - PUTT_BASKET.x, -88, 88),
        y: Phaser.Math.Clamp(pointer.y - PUTT_BASKET.y, -82, 82),
      };
      this.drawCrosshair();
      this.updateHud();
      return;
    }

    if (this.mode !== "setup") {
      return;
    }

    if (pointer.y < 575 && pointer.y > AIM_DRAG_TOP) {
      const dx = pointer.x - 195;
      this.aimDegrees = Phaser.Math.Clamp(-86 + dx / 4, -126, -46);
    } else if (pointer.y >= 575) {
      this.power = Phaser.Math.Clamp((734 - pointer.y) / 190, 0.25, 1);
    }
    this.updateAimLine();
    this.updateHud();
    this.renderOverlay();
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

    const result = gameSession.throwDisc({
      aimDegrees: this.aimDegrees,
      power: this.power,
      releaseAngle: this.releaseAngle,
      disc: this.disc,
    });
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
      )} | ${describeAngle(this.releaseAngle)} | Aim ${Math.round(this.aimDegrees)} | Power ${Math.round(
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
    const basket = this.worldToScreen(gameSession.hole.basket);
    const radians = Phaser.Math.DegToRad(this.aimDegrees);
    const targetDistance = Math.hypot(basket.x - start.x, basket.y - start.y);
    const length = Phaser.Math.Clamp(targetDistance * (0.78 + this.power * 0.34), 126, targetDistance + 28);
    const end = {
      x: Phaser.Math.Clamp(start.x + Math.cos(radians) * length, 82, 308),
      y: Phaser.Math.Clamp(start.y + Math.sin(radians) * length, 142, 552),
    };
    const pathVector = {
      x: end.x - start.x,
      y: end.y - start.y,
    };
    const pathLength = Math.max(1, Math.hypot(pathVector.x, pathVector.y));
    const normal = {
      x: -pathVector.y / pathLength,
      y: pathVector.x / pathLength,
    };
    const releaseCurve = this.releaseAngle === "flat" ? 0 : this.releaseAngle === "hyzer" ? -56 : 56;
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
    const labelPoint = previewPoints[12] ?? control;
    const beforeEnd = previewPoints[previewPoints.length - 2] ?? start;
    const arrowRotation = Math.atan2(end.y - beforeEnd.y, end.x - beforeEnd.x) + Math.PI / 2;

    this.aimPath?.clear();
    this.aimPath?.lineStyle(6, 0xe2d36c, 0.95);
    this.aimPath?.strokePoints(previewPoints, false);
    this.aimLine?.setTo(start.x, start.y, end.x, end.y);
    this.aimArrow?.setPosition(end.x, end.y);
    this.aimArrow?.setRotation(arrowRotation);
    this.aimTarget?.setPosition(end.x, end.y);
    this.aimLabel?.setPosition(
      Phaser.Math.Clamp(labelPoint.x + 48, 84, 306),
      Phaser.Math.Clamp(labelPoint.y, 222, 506),
    );
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

    this.add.rectangle(195, 422, 390, 844, 0x172419);
    this.add.rectangle(195, 640, 390, 118, 0x45612f);
    this.add.rectangle(195, 705, 390, 70, 0x25371f);
    this.add.rectangle(195, 325, 310, 390, 0xf6f0d2, 0.04).setStrokeStyle(2, 0xd8c66a, 0.28);
    this.add.circle(72, 184, 36, 0x5b3f8f, 0.45);
    this.add.circle(318, 128, 28, 0x6a8732, 0.7);

    this.add.rectangle(PUTT_BASKET.x, PUTT_BASKET.y + 88, 8, 178, 0xd8c66a);
    this.add.ellipse(PUTT_BASKET.x, PUTT_BASKET.y + 180, 96, 16, 0x11140f, 0.55);
    this.add.ellipse(PUTT_BASKET.x, PUTT_BASKET.y - 20, 118, 36, 0xd8c66a, 0.18).setStrokeStyle(4, 0xd8c66a);
    this.add.rectangle(PUTT_BASKET.x, PUTT_BASKET.y + 34, 86, 92, 0x10150f, 0.28).setStrokeStyle(3, 0xd8c66a);
    this.add
      .text(PUTT_BASKET.x, PUTT_BASKET.y - 78, "BASKET / CHAINS", {
        color: "#10150f",
        fontFamily: "Trebuchet MS",
        fontSize: "12px",
        fontStyle: "bold",
        backgroundColor: "#f6f0d2",
        padding: { x: 6, y: 3 },
      })
      .setOrigin(0.5);

    for (let index = 0; index < 6; index += 1) {
      const x = PUTT_BASKET.x - 34 + index * 13.5;
      this.add.line(0, 0, x, PUTT_BASKET.y - 8, x + 8, PUTT_BASKET.y + 76, 0xf6f0d2, 0.55).setLineWidth(2);
    }

    this.add.circle(PUTT_TEE.x, PUTT_TEE.y, 12, 0xe2d36c).setStrokeStyle(3, 0x1a1510);
    this.add.rectangle(PUTT_TEE.x, PUTT_TEE.y + 26, 72, 12, 0xf6f0d2, 0.35);
    this.add
      .text(104, PUTT_TEE.y - 20, "PUTT LIE / DISC", {
        color: "#10150f",
        fontFamily: "Trebuchet MS",
        fontSize: "12px",
        fontStyle: "bold",
        backgroundColor: "#e2d36c",
        padding: { x: 6, y: 3 },
      })
      .setOrigin(0.5);

    this.add
      .text(195, 456, `${Math.round(gameSession.distanceToBasket)} ft putt`, {
        color: "#f6f0d2",
        fontFamily: "Trebuchet MS",
        fontSize: "24px",
      })
      .setOrigin(0.5);
    this.add
      .text(195, 490, `Wind drift ${gameSession.wind.strength} @ ${gameSession.wind.directionDegrees} deg`, {
        color: "#cfe4a4",
        fontFamily: "Trebuchet MS",
        fontSize: "16px",
      })
      .setOrigin(0.5);
    this.add
      .text(195, 512, "Drag crosshair on basket", {
        color: "#f6f0d2",
        fontFamily: "Trebuchet MS",
        fontSize: "15px",
      })
      .setOrigin(0.5);
    this.add.line(0, 0, 285, 512, 330, 512, 0xcfe4a4, 0.75).setLineWidth(3);
    this.add.triangle(342, 512, 330, 504, 330, 520, 348, 512, 0xcfe4a4, 0.75);

    this.drawCrosshair();
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
    this.add
      .text(start.x, Math.min(start.y + 28, 560), "THROW START", {
        color: "#10150f",
        fontFamily: "Trebuchet MS",
        fontSize: "11px",
        fontStyle: "bold",
        backgroundColor: "#e2d36c",
        padding: { x: 5, y: 2 },
      })
      .setOrigin(0.5);
    this.add
      .text(landing.x, Math.max(landing.y - 24, 118), result.reliefApplied ? "OB LANDING" : "LANDING", {
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
        .text(relief.x, Math.min(relief.y + 28, 560), "RELIEF LIE", {
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

    const x = PUTT_BASKET.x + this.puttOffset.x;
    const y = PUTT_BASKET.y + this.puttOffset.y;
    this.puttGuide = this.add.graphics();
    this.puttGuide.lineStyle(3, 0xf6f0d2, 0.5);
    this.puttGuide.beginPath();
    this.puttGuide.moveTo(PUTT_TEE.x, PUTT_TEE.y);
    this.puttGuide.lineTo(x, y);
    this.puttGuide.strokePath();

    this.crosshair = this.add.circle(x, y, 14, 0x000000, 0);
    this.crosshair.setStrokeStyle(3, 0xe2d36c);
    this.crosshairLines = [
      this.add.line(0, 0, x - 22, y, x + 22, y, 0xe2d36c),
      this.add.line(0, 0, x, y - 22, x, y + 22, 0xe2d36c),
    ];
  }

  private worldToScreen(point: Vector2) {
    const x = 48 + ((point.x - gameSession.hole.bounds.x) / gameSession.hole.bounds.width) * 294;
    const y = 92 + ((point.y - gameSession.hole.bounds.y) / gameSession.hole.bounds.height) * 470;
    return { x, y };
  }

  private clearOverlay() {
    document.querySelectorAll("[data-scene]").forEach((node) => node.remove());
  }
}
