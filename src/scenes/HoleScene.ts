import Phaser from "phaser";
import { describeAngle, describeDisc, gameSession } from "../game/GameSession";
import { diceToShotInput, distanceBetween, isTapInAvailable, windClarityFromDie } from "../game/logic";
import { ANGLE_DIAL_DEGREES, POWER_DIAL, PUTT_AIM_DIAL_PX, PUTT_POWER_DIAL, WIND_CLARITY_DIAL } from "../game/data";
import type { DieValue, DiscType, LieQuality, PuttDiceRoll, ReleaseAngle, ShotDiceAssignment, ShotDiceRoll, ShotForecast, ShotResult, Vector2, WindEffect } from "../game/types";
import { characterTokenKey, discKey } from "./BootScene";

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
  private flightDisc?: Phaser.GameObjects.Image;
  private crosshair?: Phaser.GameObjects.Arc;
  private crosshairLines: Phaser.GameObjects.Line[] = [];
  private puttGuide?: Phaser.GameObjects.Graphics;
  private windZoneObjects: Phaser.GameObjects.GameObject[] = [];
  private readonly defaultStatus = "Roll dice, assign to slots, then throw.";
  private status = this.defaultStatus;
  private lastResult?: ShotResult;
  private controlsLocked = false;
  private queuedThrowClicks = 0;

  // Dice state (managed by the scene; committed to gameSession at throw time)
  private shotDice: ShotDiceRoll | null = null;
  private shotSlots: { angle: number | null; power: number | null; wind: number | null } = { angle: null, power: null, wind: null };
  private puttDice: PuttDiceRoll | null = null;
  private puttSlots: { aim: number | null; power: number | null } = { aim: null, power: null };
  private selectedDieIndex: number | null = null;
  private windClarity = 1.0;

  // Dice-roll animation timers (cleared when a new roll starts or the scene tears down)
  private rollCycleTimer?: number;
  private rollSettleTimers: number[] = [];

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
    // Mirror the CSS HUD position: right: max(16px, calc(50vw - 460px)), width: 280px
    const hudRightMargin = Math.max(16, width / 2 - 460);
    const playRight = width - hudRightMargin - 280 - 10;
    const playWidth = playRight - playLeft;
    const playHeight = height - playTop * 2;
    const fairwayH = Math.round(playHeight * 0.34);
    return {
      cx, cy,
      playLeft, playTop,
      playRight,
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
    // Scene instances persist across scene.start("HoleScene"), so explicitly
    // reset transient per-hole state when we enter a new hole.
    this.shotDice = null;
    this.shotSlots = { angle: null, power: null, wind: null };
    this.puttDice = null;
    this.puttSlots = { aim: null, power: null };
    this.selectedDieIndex = null;
    this.controlsLocked = false;
    this.queuedThrowClicks = 0;
    this.lastResult = undefined;
    this.windClarity = 1.0;
    this.status = this.defaultStatus;
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
    this.input.on("pointerup", () => this.updateHud());
    this.updateHud();
  }

  shutdown() {
    this.clearRollAnimation();
    this.clearOverlay();
  }

  private drawSetupView() {
    const { cx, cy, playLeft, playWidth, playTop, playBottom, playHeight, fairwayH } = this.layout;
    const W = this.scale.width, H = this.scale.height;
    const playCx = playLeft + playWidth / 2;
    const obH = (playHeight - fairwayH) / 2;

    const basket = this.worldToScreen(gameSession.hole.basket);
    const lie = this.worldToScreen(gameSession.holeState.lie);
    const tee = this.worldToScreen(gameSession.hole.tee);

    this.add.rectangle(cx, cy, W, H, 0x142018);
    // OB strips: textured tile pattern, masked to play area
    this.add.tileSprite(playCx, playTop + obH / 2, playWidth, obH, "ob-tile").setAlpha(0.92);
    this.add.tileSprite(playCx, playBottom - obH / 2, playWidth, obH, "ob-tile").setAlpha(0.92);
    // Fairway: grass tile texture with subtle border framing
    this.add.tileSprite(playCx, cy, playWidth, fairwayH, "grass-tile");
    this.add.rectangle(playCx, cy, playWidth, fairwayH).setStrokeStyle(3, 0xd8c66a, 0.42);
    // OB labels float on the textured ground
    this.add
      .text(playLeft + 50, playTop + obH / 2, "OB", {
        color: "#f6f0d2", fontFamily: "Trebuchet MS", fontSize: "18px", fontStyle: "bold",
        stroke: "#10150f", strokeThickness: 3,
      })
      .setOrigin(0.5);
    this.add
      .text(playLeft + 50, playBottom - obH / 2, "OB", {
        color: "#f6f0d2", fontFamily: "Trebuchet MS", fontSize: "18px", fontStyle: "bold",
        stroke: "#10150f", strokeThickness: 3,
      })
      .setOrigin(0.5);
    this.drawWindZones();

    // Tee marker behind the goblin token
    this.add.image(tee.x, tee.y + 10, "tee-marker").setScale(0.85).setDepth(3);

    this.drawBasketTarget(basket.x, basket.y);
    this.drawBasketIcon(basket.x + 6, basket.y - 4, 0.5);

    this.drawScrambleZoneBoundaries();
    this.drawScenery();

    // Goblin token at the current lie
    const tokenKey = characterTokenKey(gameSession.selectedCharacter.id);
    this.add.image(lie.x, lie.y, tokenKey).setScale(0.78).setDepth(6);
    const lieLabelY = lie.y > cy ? lie.y - 50 : lie.y + 50;
    const lieLabelX = Math.min(lie.x, this.layout.playRight - 72);
    this.add
      .text(lieLabelX, lieLabelY, "CURRENT LIE / DISC", {
        color: "#10150f",
        fontFamily: "Trebuchet MS",
        fontSize: "12px",
        fontStyle: "bold",
        backgroundColor: "#e2d36c",
        padding: { x: 6, y: 3 },
      })
      .setOrigin(0.5)
      .setDepth(7);
    this.lieMarker = this.add.circle(lie.x, lie.y, 26, 0xe2d36c, 0).setStrokeStyle(3, 0xe2d36c, 0.85).setDepth(5);
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
    // Clamp label so its right edge stays clear of the HUD panel
    const labelX = Math.min(x, this.layout.playRight - 60);
    this.add
      .text(labelX, y - 54, "BASKET TARGET", {
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
    this.add.image(x, y, "basket").setScale(scale).setDepth(5);
  }

  private drawHazardLabel(x: number, y: number, label: string, detail?: string) {
    this.add
      .text(x, y, label, {
        color: "#10150f",
        fontFamily: "Trebuchet MS",
        fontSize: "11px",
        fontStyle: "bold",
        backgroundColor: "#cac8b9",
        padding: { x: 5, y: 2 },
      })
      .setOrigin(0.5)
      .setDepth(7);
    if (detail) {
      this.add
        .text(x, y + 14, detail, {
          color: "#fdf5d2",
          fontFamily: "Trebuchet MS",
          fontSize: "9px",
          fontStyle: "bold",
          backgroundColor: "#3a2515",
          padding: { x: 4, y: 1 },
        })
        .setOrigin(0.5)
        .setDepth(7);
    }
  }

  private drawScrambleZoneBoundaries() {
    const zones = gameSession.hole.scrambleZones ?? [];
    if (zones.length === 0) return;
    const graphics = this.add.graphics().setDepth(2);
    graphics.lineStyle(2, 0xff8f6b, 0.72);
    graphics.fillStyle(0xff8f6b, 0.08);
    for (const zone of zones) {
      const tl = this.worldToScreen({ x: zone.rect.x, y: zone.rect.y });
      const br = this.worldToScreen({
        x: zone.rect.x + zone.rect.width,
        y: zone.rect.y + zone.rect.height,
      });
      const sw = br.x - tl.x;
      const sh = br.y - tl.y;
      graphics.fillRect(tl.x, tl.y, sw, sh);
      graphics.strokeRect(tl.x, tl.y, sw, sh);
    }
  }

  /** Render decorative scenery (ruins, mushrooms, trees) declared by the hole config.
   *  Ruins additionally get a tiny "SCRAMBLE LIE" label since they sit on hazard zones
   *  by convention. Trees and mushrooms render label-free. */
  private drawScenery() {
    for (const prop of gameSession.hole.scenery ?? []) {
      const { x, y } = this.worldToScreen({ x: prop.x, y: prop.y });
      const scale = prop.scale ?? 0.85;
      this.add.image(x, y, prop.sprite).setScale(scale).setDepth(prop.sprite === "tree" ? 3 : 4);
      if (prop.sprite === "ruins") {
        this.drawHazardLabel(x, y + 38, "RUINS", "SCRAMBLE LIE");
      }
    }
  }

  private drawWindZones() {
    this.windZoneObjects = [];
    for (const zone of gameSession.hole.windZones ?? []) {
      const rect = this.worldRectToScreen(zone.rect);
      const center = {
        x: rect.x + rect.width / 2,
        y: rect.y + rect.height / 2,
      };
      // Tailwinds read cool/helpful, everything else warm. Derived from the
      // zone's effect so any hole's lanes color consistently.
      const color = zone.effect === "tailwind" ? 0x8fd8ff : 0xffd27a;
      const colorHex = zone.effect === "tailwind" ? "#8fd8ff" : "#ffd27a";
      const arrowImage = this.add
        .image(center.x, center.y, "wind-arrow")
        .setRotation(Phaser.Math.DegToRad(zone.directionDegrees))
        .setScale(1.1)
        .setTint(color)
        .setDepth(3);
      this.windZoneObjects.push(
        this.add.rectangle(center.x, center.y, rect.width, rect.height, color, 0.13).setStrokeStyle(2, color, 0.44),
        arrowImage,
        this.add
          .text(center.x, center.y + rect.height / 2 - 18, zone.label.toUpperCase(), {
            color: "#10150f",
            fontFamily: "Trebuchet MS",
            fontSize: "10px",
            fontStyle: "bold",
            backgroundColor: colorHex,
            padding: { x: 5, y: 2 },
          })
          .setOrigin(0.5)
          .setDepth(3),
      );
    }
  }

  private drawCourse() {
    const { cx, cy, playLeft, playWidth, playTop, playBottom, playHeight, fairwayH } = this.layout;
    const W = this.scale.width, H = this.scale.height;
    const playCx = playLeft + playWidth / 2;
    const obH = (playHeight - fairwayH) / 2;

    this.add.rectangle(cx, cy, W, H, 0x142018);
    this.add.tileSprite(playCx, playTop + obH / 2, playWidth, obH, "ob-tile").setAlpha(0.85);
    this.add.tileSprite(playCx, playBottom - obH / 2, playWidth, obH, "ob-tile").setAlpha(0.85);
    this.add.tileSprite(playCx, cy, playWidth, fairwayH, "grass-tile");
    this.add.rectangle(playCx, cy, playWidth, fairwayH).setStrokeStyle(3, 0xd8c66a, 0.42);
    this.add
      .text(playLeft + 40, playTop + obH / 2, "OB", {
        color: "#f6f0d2", fontFamily: "Trebuchet MS", fontSize: "14px", fontStyle: "bold",
        stroke: "#10150f", strokeThickness: 3,
      })
      .setOrigin(0.5);
    this.add
      .text(playLeft + 40, playBottom - obH / 2, "OB", {
        color: "#f6f0d2", fontFamily: "Trebuchet MS", fontSize: "14px", fontStyle: "bold",
        stroke: "#10150f", strokeThickness: 3,
      })
      .setOrigin(0.5);
    this.drawWindZones();

    // Render the hole's actual scenery at reduced scale (flight view is more zoomed-out feel)
    for (const prop of gameSession.hole.scenery ?? []) {
      const { x, y } = this.worldToScreen({ x: prop.x, y: prop.y });
      const baseScale = prop.scale ?? 0.85;
      this.add.image(x, y, prop.sprite).setScale(baseScale * 0.75).setDepth(prop.sprite === "tree" ? 3 : 4);
    }

    const basket = this.worldToScreen(gameSession.hole.basket);
    this.add
      .text(playLeft + 80, playTop + 30, "FLIGHT: DISC PATH", {
        color: "#f6f0d2",
        fontFamily: "Trebuchet MS",
        fontSize: "15px",
        fontStyle: "bold",
        stroke: "#10150f",
        strokeThickness: 4,
      })
      .setOrigin(0.5);
    this.drawBasketTarget(basket.x, basket.y);
    this.drawBasketIcon(basket.x + 6, basket.y - 4, 0.5);
    this.lieMarker = this.add.circle(0, 0, 22, 0xe2d36c, 0).setStrokeStyle(3, 0xe2d36c, 0.85).setDepth(5);
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

    const assignment = this.buildShotAssignment();
    const input = diceToShotInput(assignment, this.basketBearingDegrees(), this.disc, this.releaseAngle);
    const forecast = gameSession.forecastThrow(input);
    const allAssigned = this.isAllAssigned();

    // Recompute windClarity so the panel always reflects the current WIND slot assignment.
    const windDieForPanel = this.shotSlots.wind !== null && this.shotDice
      ? this.shotDice[this.shotSlots.wind] as DieValue
      : 4 as DieValue;
    this.windClarity = windClarityFromDie(windDieForPanel);

    this.addScreenStatePanel([
      ["Lie", this.currentLieQualityLabel()],
      ["Wind", this.routeWindLabel(forecast, this.windClarity)],
      ["Forecast", allAssigned ? this.previewLandingLabel(forecast) : "—"],
      ["Risk", allAssigned ? this.previewRiskLabel(forecast) : "—"],
    ]);

    if (!this.shotDice) {
      const controls = this.createElement("div", "button-grid single-action");
      this.addButton("Roll Dice", () => {
        this.shotDice = gameSession.rollShotDice();
        this.shotSlots = { angle: null, power: null, wind: null };
        this.selectedDieIndex = null;
        this.renderOverlay();
        this.animateDiceRoll(this.shotDice);
        this.updateAimLine();
        this.updateHud();
      }, controls, "primary-action");
      this.overlay.append(controls);
      return;
    }

    this.renderDiceTiles(this.shotDice, this.shotSlots);
    this.renderShotAssignmentSlots();

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
    this.addButton("Throw disc", () => this.throwDisc(), controls, "primary-action", !allAssigned || this.controlsLocked);
    this.overlay.append(controls);
  }

  /**
   * Play the tumble-and-settle dice roll animation on the freshly rendered tiles.
   * Each die rapidly cycles random pip values, then settles to its real face with a
   * staggered "thump." Safe to call after re-render: existing timers are cleared first.
   */
  private animateDiceRoll(dice: ReadonlyArray<number>) {
    this.clearRollAnimation();

    const dieElements = Array.from(this.overlay.querySelectorAll(".die")) as HTMLButtonElement[];
    if (dieElements.length === 0) return;
    const tray = this.overlay.querySelector(".dice-display") as HTMLDivElement | null;
    tray?.classList.add("dice-display--rolling");

    for (const die of dieElements) {
      die.classList.add("die--rolling");
      die.classList.remove("die--selected");
    }

    // Rapidly cycle displayed pip values for that "kinetic" tumble feel.
    this.rollCycleTimer = window.setInterval(() => {
      for (const die of dieElements) {
        if (die.classList.contains("die--rolling")) {
          die.textContent = String(Math.floor(Math.random() * 6) + 1);
        }
      }
    }, 60);

    const baseDelay = 460;
    const stagger = 130;
    dieElements.forEach((die, index) => {
      const settleAt = baseDelay + index * stagger;
      const settleTimer = window.setTimeout(() => {
        die.classList.remove("die--rolling");
        die.classList.add("die--settled");
        die.textContent = String(dice[index]);
        const clearTimer = window.setTimeout(() => die.classList.remove("die--settled"), 320);
        this.rollSettleTimers.push(clearTimer);
      }, settleAt);
      this.rollSettleTimers.push(settleTimer);
    });

    const totalDuration = baseDelay + (dieElements.length - 1) * stagger + 80;
    const stopTimer = window.setTimeout(() => {
      if (this.rollCycleTimer !== undefined) {
        window.clearInterval(this.rollCycleTimer);
        this.rollCycleTimer = undefined;
      }
      tray?.classList.remove("dice-display--rolling");
    }, totalDuration);
    this.rollSettleTimers.push(stopTimer);
  }

  private clearRollAnimation() {
    if (this.rollCycleTimer !== undefined) {
      window.clearInterval(this.rollCycleTimer);
      this.rollCycleTimer = undefined;
    }
    for (const id of this.rollSettleTimers) window.clearTimeout(id);
    this.rollSettleTimers = [];
  }

  private renderDiceTiles(
    dice: ShotDiceRoll | PuttDiceRoll,
    slots: { angle?: number | null; power: number | null; wind?: number | null; aim?: number | null },
  ) {
    const assignedIndices = new Set(Object.values(slots).filter((v): v is number => v !== null));
    const container = this.createElement("div", "dice-display");

    for (let index = 0; index < dice.length; index++) {
      const die = this.createElement("button", "die");
      die.type = "button";
      die.textContent = String(dice[index]);
      die.ariaLabel = `Die ${index + 1}: ${dice[index]}`;

      if (assignedIndices.has(index)) {
        die.classList.add("die--assigned");
        die.disabled = true;
      } else if (this.selectedDieIndex === index) {
        die.classList.add("die--selected");
      }

      die.addEventListener("click", () => {
        if (assignedIndices.has(index)) return;
        this.selectedDieIndex = this.selectedDieIndex === index ? null : index;
        this.renderOverlay();
      });
      container.append(die);
    }
    this.overlay.append(container);
  }

  private renderShotAssignmentSlots() {
    const dice = this.shotDice!;
    const slots = this.shotSlots;
    const container = this.createElement("div", "assignment-slots");

    const slotDefs: { key: keyof typeof slots; label: string; getValue: () => string }[] = [
      {
        key: "angle",
        label: "ANGLE",
        getValue: () => {
          if (slots.angle === null) return "—";
          const deg = ANGLE_DIAL_DEGREES[dice[slots.angle] - 1];
          return `${deg > 0 ? "+" : ""}${deg}°`;
        },
      },
      {
        key: "power",
        label: "POWER",
        getValue: () => slots.power === null ? "—" : `${Math.round(POWER_DIAL[dice[slots.power] - 1] * 100)}%`,
      },
      {
        key: "wind",
        label: "WIND",
        getValue: () => slots.wind === null ? "—" : `${Math.round(WIND_CLARITY_DIAL[dice[slots.wind] - 1] * 100)}% read`,
      },
    ];

    for (const { key, label, getValue } of slotDefs) {
      const slot = this.createElement("div", slots[key] !== null ? "slot slot--filled" : "slot");
      const labelEl = this.createElement("span", "slot-label");
      labelEl.textContent = label;
      const valueEl = this.createElement("span", "slot-value");
      valueEl.textContent = getValue();
      slot.append(labelEl, valueEl);

      slot.addEventListener("click", () => {
        if (slots[key] !== null) {
          this.shotSlots[key] = null;
          this.selectedDieIndex = null;
        } else if (this.selectedDieIndex !== null) {
          this.shotSlots[key] = this.selectedDieIndex;
          this.selectedDieIndex = null;
        }
        this.renderOverlay();
        this.updateAimLine();
        this.updateHud();
      });
      container.append(slot);
    }
    this.overlay.append(container);
  }

  private renderPuttingControls() {
    this.addStatusPanel("Putting view", this.status);
    this.addScreenStatePanel([
      ["Distance", `${Math.round(gameSession.distanceToBasket)} ft`],
      ["Wind", `${gameSession.wind.strength} @ ${gameSession.wind.directionDegrees}°`],
      ["AIM die", this.puttSlots.aim !== null && this.puttDice ? `${PUTT_AIM_DIAL_PX[this.puttDice[this.puttSlots.aim] - 1]} px` : "—"],
      ["POWER die", this.puttSlots.power !== null && this.puttDice ? `${Math.round(PUTT_POWER_DIAL[this.puttDice[this.puttSlots.power] - 1] * 100)}%` : "—"],
    ]);

    if (isTapInAvailable(gameSession.holeState, gameSession.hole)) {
      const controls = this.createElement("div", "button-grid single-action");
      this.addButton("Tap In", () => this.releasePutt(), controls, "primary-action");
      this.overlay.append(controls);
      return;
    }

    if (!this.puttDice) {
      const controls = this.createElement("div", "button-grid single-action");
      this.addButton("Roll for Putt", () => {
        this.puttDice = gameSession.rollPuttDice();
        this.puttSlots = { aim: null, power: null };
        this.selectedDieIndex = null;
        this.renderOverlay();
        this.animateDiceRoll(this.puttDice);
        this.updateHud();
      }, controls, "primary-action");
      this.overlay.append(controls);
      return;
    }

    this.renderDiceTiles(this.puttDice, this.puttSlots);
    this.renderPuttAssignmentSlots();

    const controls = this.createElement("div", "button-grid single-action");
    this.addButton("Release putt", () => this.releasePutt(), controls, "primary-action", !this.isPuttAllAssigned() || this.controlsLocked);
    this.overlay.append(controls);
  }

  private renderPuttAssignmentSlots() {
    const dice = this.puttDice!;
    const slots = this.puttSlots;
    const container = this.createElement("div", "assignment-slots assignment-slots--putt");

    const slotDefs: { key: keyof typeof slots; label: string; getValue: () => string }[] = [
      {
        key: "aim",
        label: "AIM",
        getValue: () => {
          if (slots.aim === null) return "—";
          const px = PUTT_AIM_DIAL_PX[dice[slots.aim] - 1];
          return `${px > 0 ? "+" : ""}${px} px`;
        },
      },
      {
        key: "power",
        label: "POWER",
        getValue: () => slots.power === null ? "—" : `${Math.round(PUTT_POWER_DIAL[dice[slots.power] - 1] * 100)}%`,
      },
    ];

    for (const { key, label, getValue } of slotDefs) {
      const slot = this.createElement("div", slots[key] !== null ? "slot slot--filled" : "slot");
      const labelEl = this.createElement("span", "slot-label");
      labelEl.textContent = label;
      const valueEl = this.createElement("span", "slot-value");
      valueEl.textContent = getValue();
      slot.append(labelEl, valueEl);

      slot.addEventListener("click", () => {
        if (slots[key] !== null) {
          this.puttSlots[key] = null;
          this.selectedDieIndex = null;
        } else if (this.selectedDieIndex !== null) {
          this.puttSlots[key] = this.selectedDieIndex;
          this.selectedDieIndex = null;
          this.drawCrosshair();
        }
        this.renderOverlay();
        this.updateHud();
      });
      container.append(slot);
    }
    this.overlay.append(container);
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
    // Input replaced by dice UI.
  }

  private throwDisc() {
    if (this.controlsLocked) {
      this.queuedThrowClicks = Phaser.Math.Clamp(this.queuedThrowClicks + 1, 0, 2);
      this.status = "Next throw queued after the lie resolves.";
      this.updateHud();
      this.renderOverlay();
      return;
    }

    if (!this.isAllAssigned() || !this.shotDice) return;

    // Commit dice assignment to session then execute
    gameSession.assignShotDice({
      angleDie: this.shotDice[this.shotSlots.angle!] as DieValue,
      powerDie: this.shotDice[this.shotSlots.power!] as DieValue,
      windDie: this.shotDice[this.shotSlots.wind!] as DieValue,
    });

    this.controlsLocked = true;
    this.mode = "flight";
    this.status = "Watch the landing before the next lie resolves.";
    this.children.removeAll(true);
    this.drawCourse();
    this.createHud();
    this.renderOverlay();
    this.updateHud();

    const result = gameSession.throwDisc(this.disc, this.releaseAngle);
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
          this.status = "Putting mode. Roll dice, assign AIM and POWER, then release.";
          this.controlsLocked = false;
          this.enterPuttingView();
          this.updateHud();
          this.renderOverlay();
        });
        return;
      }

      this.mode = "setup";
      this.controlsLocked = false;
      this.shotDice = null;
      this.shotSlots = { angle: null, power: null, wind: null };
      this.selectedDieIndex = null;
      this.windClarity = 1.0;
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
    if (this.controlsLocked) return;

    // Auto tap-in: no dice needed
    if (isTapInAvailable(gameSession.holeState, gameSession.hole)) {
      const result = gameSession.putt();
      this.status = "Tap-in range. One stroke added automatically.";
      this.finishPuttResult(result);
      return;
    }

    if (!this.isPuttAllAssigned() || !this.puttDice) return;

    gameSession.assignPuttDice({
      aimDie: this.puttDice[this.puttSlots.aim!] as DieValue,
      powerDie: this.puttDice[this.puttSlots.power!] as DieValue,
    });
    this.puttDice = null;
    this.puttSlots = { aim: null, power: null };
    this.selectedDieIndex = null;

    const result = gameSession.putt();
    this.status = result.made
      ? "Chains caught it."
      : result.missReason
        ? `Missed: ${result.missReason}.`
        : "Missed putt.";

    // Auto-complete if a missed putt leaves disc inside tap-in range
    if (!result.made && !gameSession.holeState.complete && isTapInAvailable(gameSession.holeState, gameSession.hole)) {
      gameSession.putt();
      this.status += " Tap-in — one more stroke added.";
    }

    this.finishPuttResult(result);
  }

  private finishPuttResult(_result: { made: boolean; autoTapIn: boolean }) {
    if (this.mode === "putting") {
      this.children.removeAll(true);
      this.drawPuttingView();
      this.createHud();
    } else {
      this.updateLieMarker();
    }

    if (gameSession.holeState.complete) {
      // Push the result into the scorecard and advance the index. ScoreScene
      // then reads from gameSession.holeScores to render either an intermission
      // or the final scorecard.
      gameSession.advanceHole();
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
      const diceInfo = this.puttDice ? `Dice: [${this.puttDice.join(", ")}]` : "Roll for putt";
      this.hud?.setText(`Putting view | ${scoreLine}\nPutt ${distance} ft | Wind ${wind.strength} @ ${wind.directionDegrees} deg | ${diceInfo}`);
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

    const diceInfo = this.shotDice
      ? `Dice: [${this.shotDice.join(", ")}] | ${this.assignmentSummary()}`
      : "Roll dice to shoot";
    this.hud?.setText(
      `Throw setup | ${scoreLine}\n${distance} ft | Wind ${wind.strength} @ ${wind.directionDegrees} deg\n${describeDisc(this.disc)} | ${describeAngle(this.releaseAngle)}\n${diceInfo}`,
    );
    this.updateAimLine();
  }

  private updateAimLine() {
    if ((!this.aimLine && !this.aimPath) || this.mode === "putting") {
      return;
    }

    const assignment = this.buildShotAssignment();
    const input = diceToShotInput(assignment, this.basketBearingDegrees(), this.disc, this.releaseAngle);
    const forecast = gameSession.forecastThrow(input);

    // Update wind clarity and gate wind zone visuals
    const windDieValue = this.shotSlots.wind !== null && this.shotDice
      ? this.shotDice[this.shotSlots.wind] as DieValue
      : 4 as DieValue;
    this.windClarity = windClarityFromDie(windDieValue);
    const zoneAlpha = this.windClarity <= 0 ? 0 : this.windClarity <= 0.4 ? 0.3 : this.windClarity <= 0.8 ? 0.6 : 1.0;
    for (const obj of this.windZoneObjects) {
      if ("setAlpha" in obj) {
        (obj as unknown as Phaser.GameObjects.Components.Alpha).setAlpha(zoneAlpha);
      }
    }

    const start = this.worldToScreen(gameSession.holeState.lie);
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
      const angleOffset = this.shotSlots.angle !== null && this.shotDice ? ANGLE_DIAL_DEGREES[this.shotDice[this.shotSlots.angle] - 1] : 0;
      const labelOffsetY = angleOffset >= 0 ? 48 : -48;
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

    const { cx, cy, playLeft } = this.layout;
    const PB = this.layout.puttBasket;
    const PT = this.layout.puttTee;
    const W = this.scale.width, H = this.scale.height;

    this.add.rectangle(cx, cy, W, H, 0x172419);
    // Putting green: textured grass strip (constrained so it doesn't bleed under the HUD)
    const greenLeft = playLeft;
    const greenRight = this.layout.playRight;
    const greenWidth = greenRight - greenLeft;
    const greenCx = (greenLeft + greenRight) / 2;
    this.add.tileSprite(greenCx, cy, greenWidth, H - 120, "grass-tile");
    this.add.rectangle(greenCx, cy, greenWidth, H - 120).setStrokeStyle(3, 0xd8c66a, 0.42);
    this.add.tileSprite(greenCx, cy + 90, greenWidth, 80, "scramble-tile").setAlpha(0.32);
    // Decorative trees behind/beside the green (kept within green bounds)
    this.add.image(greenLeft + 40, this.layout.playTop + 30, "tree").setScale(0.95);
    this.add.image(greenLeft + 130, this.layout.playTop + 18, "tree").setScale(0.72);
    this.add.image(greenRight - 50, this.layout.playTop + 30, "tree").setScale(0.85);

    // Basket sprite — sized to fit within the green
    this.add.image(PB.x, PB.y + 20, "basket").setScale(1.15).setDepth(5);
    this.add
      .text(PB.x, PB.y - 78, "BASKET / CHAINS", {
        color: "#10150f",
        fontFamily: "Trebuchet MS",
        fontSize: "12px",
        fontStyle: "bold",
        backgroundColor: "#f6f0d2",
        padding: { x: 6, y: 3 },
      })
      .setOrigin(0.5)
      .setDepth(7);

    // Tee marker + goblin at the putt lie
    this.add.image(PT.x, PT.y + 12, "tee-marker").setScale(0.9).setDepth(3);
    const tokenKey = characterTokenKey(gameSession.selectedCharacter.id);
    this.add.image(PT.x, PT.y, tokenKey).setScale(0.9).setDepth(5);
    this.add
      .text(PT.x, PT.y - 36, "PUTT LIE / DISC", {
        color: "#10150f",
        fontFamily: "Trebuchet MS",
        fontSize: "12px",
        fontStyle: "bold",
        backgroundColor: "#e2d36c",
        padding: { x: 6, y: 3 },
      })
      .setOrigin(0.5)
      .setDepth(7);

    // Distance + wind info now lives in the HUD overlay panel; no in-scene duplicate needed.
    const dragHint = this.add
      .text(PB.x, PB.y + 130, "▶  Assign AIM die to set aim  ◀", {
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

    // Ground shadow rides the flat path and shrinks/separates as the disc lofts,
    // selling the height of the arc without moving the disc off its line.
    const shadow = this.add.ellipse(start.x, start.y, 24, 11, 0x10150f, 0.34).setDepth(6);

    // Motion trail: a short comet tail of recent positions that fades to the tail.
    const trail = this.add.graphics().setDepth(7);
    const trailPoints: Phaser.Math.Vector2[] = [];
    const maxTrail = 16;

    this.flightDisc?.destroy();
    this.flightDisc = this.add.image(start.x, start.y, discKey(this.disc)).setDepth(8);
    const disc = this.flightDisc;
    const trailColor = result.reliefApplied ? 0xffb49e : 0xf6f0d2;

    this.tweens.add({
      targets: tracker,
      t: 1,
      duration: 850,
      ease: "Sine.easeInOut",
      onUpdate: () => {
        const point = curve.getPoint(tracker.t);
        const lift = Math.sin(tracker.t * Math.PI); // 0 → 1 → 0 height factor
        disc.setPosition(point.x, point.y);
        const arc = 1 + lift * 0.55;
        disc.setScale(arc, arc * 0.85);
        disc.rotation += 0.5; // disc spin

        // Shadow drops below and shrinks at apex → reads as the disc rising.
        shadow.setPosition(point.x, point.y + lift * 28);
        shadow.setScale(1 - lift * 0.5);
        shadow.setAlpha(0.34 - lift * 0.18);

        // Append the latest point and redraw the fading tail.
        trailPoints.push(new Phaser.Math.Vector2(point.x, point.y));
        if (trailPoints.length > maxTrail) trailPoints.shift();
        trail.clear();
        for (let i = 1; i < trailPoints.length; i += 1) {
          const f = i / trailPoints.length;
          trail.lineStyle(1 + f * 4, trailColor, f * 0.55);
          trail.beginPath();
          trail.moveTo(trailPoints[i - 1].x, trailPoints[i - 1].y);
          trail.lineTo(trailPoints[i].x, trailPoints[i].y);
          trail.strokePath();
        }
      },
      onComplete: () => {
        const finalPoint = result.reliefApplied ? this.worldToScreen(result.landing) : landing;
        this.tweens.add({
          targets: disc,
          x: finalPoint.x,
          y: finalPoint.y,
          scaleX: 0.9,
          scaleY: 0.75,
          duration: result.reliefApplied ? 360 : 120,
          ease: "Sine.easeOut",
          onComplete: () => {
            shadow.setPosition(finalPoint.x, finalPoint.y + 6).setScale(0.95).setAlpha(0.34);
            this.tweens.add({ targets: trail, alpha: 0, duration: 240 });
            this.playLandingImpact(finalPoint, result.reliefApplied);
            // Hold a beat on the impact before handing control back / transitioning.
            this.time.delayedCall(260, onComplete);
          },
        });
      },
    });
  }

  /**
   * Punchy landing feedback: an expanding dust ring, scattering specks, a quick
   * settle wobble on the disc, and a brief camera shake. Relief landings hit
   * harder and tint warm to flag the OB penalty.
   */
  private playLandingImpact(point: { x: number; y: number }, isRelief: boolean) {
    const color = isRelief ? 0xff8f6b : 0xf6f0d2;

    const ring = this.add
      .circle(point.x, point.y, 8, 0x000000, 0)
      .setStrokeStyle(3, color, 0.9)
      .setDepth(7);
    this.tweens.add({
      targets: ring,
      scaleX: 4.2,
      scaleY: 4.2,
      alpha: 0,
      duration: 430,
      ease: "Cubic.easeOut",
      onComplete: () => ring.destroy(),
    });

    const speckCount = 7;
    for (let i = 0; i < speckCount; i += 1) {
      const angle = (Math.PI * 2 * i) / speckCount + Math.random() * 0.6;
      const dist = 14 + Math.random() * 20;
      const speck = this.add
        .circle(point.x, point.y, 2 + Math.random() * 2, color, 0.85)
        .setDepth(7);
      this.tweens.add({
        targets: speck,
        x: point.x + Math.cos(angle) * dist,
        y: point.y + Math.sin(angle) * dist,
        alpha: 0,
        scale: 0.2,
        duration: 320 + Math.random() * 180,
        ease: "Cubic.easeOut",
        onComplete: () => speck.destroy(),
      });
    }

    // Disc settles flat with a quick wobble from its spinning angle.
    if (this.flightDisc) {
      this.tweens.add({
        targets: this.flightDisc,
        angle: { from: -10, to: 0 },
        duration: 280,
        ease: "Back.easeOut",
      });
    }

    this.cameras.main.shake(150, isRelief ? 0.006 : 0.0032);
  }

  private drawCrosshair() {
    this.crosshair?.destroy();
    this.crosshairLines.forEach((line) => line.destroy());
    this.crosshairLines = [];
    this.puttGuide?.destroy();

    const PB = this.layout.puttBasket;
    const PT = this.layout.puttTee;
    const puttAimPx = this.puttSlots.aim !== null && this.puttDice
      ? PUTT_AIM_DIAL_PX[this.puttDice[this.puttSlots.aim] - 1]
      : 0;
    const x = PB.x + puttAimPx;
    const y = PB.y;
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
    const { puttingRange } = gameSession.hole;
    this.releaseAngle = "flat";
    // Suggest the disc by how many putting-ranges out the basket sits, so the
    // defaults scale with each hole rather than using tee-distance constants.
    if (distance > puttingRange * 3) {
      this.disc = "driver";
    } else if (distance > puttingRange * 2) {
      this.disc = "midrange";
    } else {
      this.disc = "putter";
    }
  }

  private basketBearingDegrees(): number {
    const lie = gameSession.holeState.lie;
    const basket = gameSession.hole.basket;
    return (Math.atan2(basket.y - lie.y, basket.x - lie.x) * 180) / Math.PI;
  }

  private buildShotAssignment(): ShotDiceAssignment {
    const dice = this.shotDice;
    const getValue = (slotIndex: number | null): DieValue =>
      slotIndex !== null && dice ? dice[slotIndex] as DieValue : 4;
    return {
      angleDie: getValue(this.shotSlots.angle),
      powerDie: getValue(this.shotSlots.power),
      windDie: getValue(this.shotSlots.wind),
    };
  }

  private isAllAssigned(): boolean {
    return this.shotSlots.angle !== null && this.shotSlots.power !== null && this.shotSlots.wind !== null;
  }

  private isPuttAllAssigned(): boolean {
    return this.puttSlots.aim !== null && this.puttSlots.power !== null;
  }

  private assignmentSummary(): string {
    if (!this.shotDice) return "none";
    const parts: string[] = [];
    if (this.shotSlots.angle !== null) parts.push(`A:${this.shotDice[this.shotSlots.angle]}`);
    if (this.shotSlots.power !== null) parts.push(`P:${this.shotDice[this.shotSlots.power]}`);
    if (this.shotSlots.wind !== null) parts.push(`W:${this.shotDice[this.shotSlots.wind]}`);
    return parts.length > 0 ? parts.join(" ") : "unassigned";
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

  private routeWindLabel(forecast: ShotForecast, clarity = 1.0) {
    const zones = forecast.routeWindZones
      .map((id) => gameSession.hole.windZones?.find((zone) => zone.id === id)?.label)
      .filter((label): label is string => Boolean(label));
    const zoneName = zones.length > 0 ? zones.join(" + ") : "Open air";

    if (clarity <= 0) return `${zoneName} · hidden`;
    if (clarity <= 0.4) return zoneName;

    const strength = forecast.routeWind.strength;
    const band = strength > 3 ? "strong" : strength > 1.5 ? "moderate" : "light";
    if (clarity <= 0.8) return `${zoneName} · ${band}`;

    const effect = this.windEffectDescription(forecast);
    return `${zoneName} ${strength.toFixed(1)}${effect}`;
  }

  private windEffectDescription(forecast: ShotForecast): string {
    const effects = new Set(
      forecast.routeWindZones
        .map((id) => gameSession.hole.windZones?.find((zone) => zone.id === id)?.effect)
        .filter((effect): effect is WindEffect => Boolean(effect)),
    );

    if (effects.has("tailwind")) return " · longer carry";
    if (effects.has("crosswind")) return " · push across";
    if (effects.has("headwind")) return " · shorter carry";
    if (effects.has("calm")) return " · stays steady";

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
