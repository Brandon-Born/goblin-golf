import Phaser from "phaser";
import { gameSession } from "../game/GameSession";
import type { HoleScoreEntry } from "../game/GameSession";

export class ScoreScene extends Phaser.Scene {
  private overlay = document.createElement("div");

  constructor() {
    super("ScoreScene");
  }

  create() {
    this.clearOverlay();
    this.cameras.main.setBackgroundColor("#18271b");
    this.drawBackdrop();

    if (gameSession.courseComplete) {
      this.drawFinalScorecard();
    } else {
      this.drawHoleIntermission();
    }
  }

  shutdown() {
    this.clearOverlay();
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Between-hole intermission: small panel with the hole that just ended +
  // a running scorecard strip + a "Tee off Hole N" button.
  // ────────────────────────────────────────────────────────────────────────────
  private drawHoleIntermission() {
    const W = this.scale.width, H = this.scale.height;
    const cx = W / 2;
    const justFinished = gameSession.holeScores[gameSession.holeScores.length - 1];
    const nextHole = gameSession.hole;
    const nextHoleNumber = gameSession.currentHoleIndex + 1;

    this.add
      .text(cx, H * 0.12, `Hole ${gameSession.holeScores.length} Complete`, {
        color: "#f6f0d2", fontFamily: "Trebuchet MS", fontSize: "30px", fontStyle: "bold",
        stroke: "#10150f", strokeThickness: 6,
      })
      .setOrigin(0.5);
    this.add
      .text(cx, H * 0.19, justFinished.holeName, {
        color: "#e2d36c", fontFamily: "Trebuchet MS", fontSize: "17px", fontStyle: "bold",
      })
      .setOrigin(0.5);

    // Big result chip
    const verdict = scoreVerdict(justFinished.relative);
    this.add.rectangle(cx, H * 0.32, 360, 90, 0x263721, 0.97).setStrokeStyle(4, 0xe2d36c);
    this.add
      .text(cx, H * 0.30, `${justFinished.strokes} strokes`, {
        color: "#f6f0d2", fontFamily: "Trebuchet MS", fontSize: "22px", fontStyle: "bold",
      })
      .setOrigin(0.5);
    this.add
      .text(cx, H * 0.36, `${formatRelative(justFinished.relative)} — ${verdict}`, {
        color: relativeColor(justFinished.relative), fontFamily: "Trebuchet MS",
        fontSize: "18px", fontStyle: "bold",
      })
      .setOrigin(0.5);

    // Running scorecard strip
    this.drawScorecardStrip(H * 0.50, gameSession.holeScores, gameSession.holes.length);

    // Round-so-far totals (only completed holes; the next hole's par doesn't count yet).
    const playedStrokes = gameSession.holeScores.reduce((sum, h) => sum + h.strokes, 0);
    const playedPar = gameSession.holeScores.reduce((sum, h) => sum + h.par, 0);
    const playedRelative = playedStrokes - playedPar;
    this.add
      .text(cx, H * 0.66, `Round: ${playedStrokes} strokes  ·  ${formatRelative(playedRelative)} to par`, {
        color: "#dceab5", fontFamily: "Trebuchet MS", fontSize: "16px", fontStyle: "bold",
      })
      .setOrigin(0.5);

    // Next-hole teaser
    this.add
      .text(cx, H * 0.74, `Next: Hole ${nextHoleNumber} — ${nextHole.name} (Par ${nextHole.par})`, {
        color: "#f6f0d2", fontFamily: "Trebuchet MS", fontSize: "14px", fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.overlay = document.createElement("div");
    this.overlay.dataset.scene = "score";
    this.overlay.className = "scene-overlay scene-overlay--score";
    const nextButton = document.createElement("button");
    nextButton.type = "button";
    nextButton.className = "primary-action scene-primary";
    nextButton.textContent = `Tee off Hole ${nextHoleNumber}`;
    nextButton.ariaLabel = `Tee off Hole ${nextHoleNumber}`;
    nextButton.addEventListener("click", () => {
      this.clearOverlay();
      this.scene.start("HoleScene");
    });
    this.overlay.append(nextButton);
    document.body.append(this.overlay);
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Final 9-hole scorecard with totals + Play again.
  // ────────────────────────────────────────────────────────────────────────────
  private drawFinalScorecard() {
    const W = this.scale.width, H = this.scale.height;
    const cx = W / 2;
    const total = gameSession.totalStrokes;
    const par = gameSession.totalPar;
    const relative = total - par;

    this.add
      .text(cx, H * 0.09, "Round Complete", {
        color: "#f6f0d2", fontFamily: "Trebuchet MS", fontSize: "34px", fontStyle: "bold",
        stroke: "#10150f", strokeThickness: 6,
      })
      .setOrigin(0.5);

    // Big total chip
    this.add.rectangle(cx, H * 0.21, 480, 78, 0x263721, 0.97).setStrokeStyle(4, 0xe2d36c);
    this.add
      .text(cx - 100, H * 0.21, `${total}`, {
        color: "#f6f0d2", fontFamily: "Trebuchet MS", fontSize: "34px", fontStyle: "bold",
      })
      .setOrigin(0.5);
    this.add
      .text(cx - 60, H * 0.21, `/ ${par} par`, {
        color: "#dceab5", fontFamily: "Trebuchet MS", fontSize: "17px", fontStyle: "bold",
      })
      .setOrigin(0, 0.5);
    this.add
      .text(cx + 100, H * 0.21, formatRelative(relative), {
        color: relativeColor(relative), fontFamily: "Trebuchet MS", fontSize: "26px", fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.drawScorecardTable(H * 0.31, gameSession.holeScores);

    this.add
      .text(cx, H * 0.84, courseVerdict(relative), {
        color: "#cfe4a4", fontFamily: "Trebuchet MS", fontSize: "16px", fontStyle: "italic",
      })
      .setOrigin(0.5);

    this.overlay = document.createElement("div");
    this.overlay.dataset.scene = "score";
    this.overlay.className = "scene-overlay scene-overlay--score";
    const restart = document.createElement("button");
    restart.type = "button";
    restart.className = "primary-action scene-primary";
    restart.textContent = "Play again";
    restart.ariaLabel = "Play again";
    restart.addEventListener("click", () => {
      gameSession.resetCourse();
      this.clearOverlay();
      this.scene.start("TitleScene");
    });
    this.overlay.append(restart);
    document.body.append(this.overlay);
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Helpers
  // ────────────────────────────────────────────────────────────────────────────

  /** Compact 9-slot scorecard strip (one chip per hole). Played holes show
   *  their relative-to-par; future holes show their par. */
  private drawScorecardStrip(y: number, scores: HoleScoreEntry[], totalHoles: number) {
    const W = this.scale.width;
    const cx = W / 2;
    const slotWidth = 50;
    const slotGap = 6;
    const totalWidth = totalHoles * slotWidth + (totalHoles - 1) * slotGap;
    const startX = cx - totalWidth / 2 + slotWidth / 2;

    for (let i = 0; i < totalHoles; i += 1) {
      const x = startX + i * (slotWidth + slotGap);
      const played = i < scores.length;
      const hole = gameSession.holes[i];
      const fill = played ? 0x425b2a : 0x1a2418;
      const stroke = played ? 0xe2d36c : 0x6a8732;
      this.add.rectangle(x, y, slotWidth, 56, fill, 0.95).setStrokeStyle(2, stroke);
      this.add
        .text(x, y - 14, `H${i + 1}`, {
          color: played ? "#fdf5d2" : "#7a8c5e", fontFamily: "Trebuchet MS",
          fontSize: "11px", fontStyle: "bold",
        })
        .setOrigin(0.5);
      if (played) {
        const entry = scores[i];
        this.add
          .text(x, y + 4, `${entry.strokes}`, {
            color: "#fdf5d2", fontFamily: "Trebuchet MS", fontSize: "18px", fontStyle: "bold",
          })
          .setOrigin(0.5);
        this.add
          .text(x, y + 19, formatRelative(entry.relative), {
            color: relativeColor(entry.relative), fontFamily: "Trebuchet MS",
            fontSize: "10px", fontStyle: "bold",
          })
          .setOrigin(0.5);
      } else {
        this.add
          .text(x, y + 8, `Par ${hole.par}`, {
            color: "#7a8c5e", fontFamily: "Trebuchet MS", fontSize: "11px", fontStyle: "bold",
          })
          .setOrigin(0.5);
      }
    }
  }

  /** Full 9-row scorecard table for the final scene. */
  private drawScorecardTable(y: number, scores: HoleScoreEntry[]) {
    const W = this.scale.width;
    const cx = W / 2;
    const tableWidth = 720;
    const rowHeight = 40;
    const rows = scores.length;
    const tableHeight = rowHeight * (rows + 1);

    this.add
      .rectangle(cx, y + tableHeight / 2, tableWidth, tableHeight, 0x263721, 0.97)
      .setStrokeStyle(4, 0xe2d36c);

    // Header row
    const headerY = y + rowHeight / 2;
    this.add
      .rectangle(cx, headerY, tableWidth - 6, rowHeight - 6, 0x3a5727, 0.85)
      .setStrokeStyle(1, 0xaec76d, 0.6);
    const headers: Array<[string, number]> = [
      ["HOLE",     -tableWidth / 2 + 60],
      ["NAME",     -tableWidth / 2 + 200],
      ["PAR",      0],
      ["STROKES",  tableWidth / 2 - 180],
      ["SCORE",    tableWidth / 2 - 60],
    ];
    for (const [label, dx] of headers) {
      this.add
        .text(cx + dx, headerY, label, {
          color: "#dceab5", fontFamily: "Trebuchet MS", fontSize: "13px", fontStyle: "bold",
        })
        .setOrigin(0.5);
    }

    // Data rows
    scores.forEach((entry, index) => {
      const rowY = y + (index + 1) * rowHeight + rowHeight / 2;
      const stripe = index % 2 === 0 ? 0x21321b : 0x263721;
      this.add.rectangle(cx, rowY, tableWidth - 6, rowHeight - 6, stripe, 0.7);

      this.add
        .text(cx - tableWidth / 2 + 60, rowY, `${index + 1}`, {
          color: "#f6f0d2", fontFamily: "Trebuchet MS", fontSize: "18px", fontStyle: "bold",
        })
        .setOrigin(0.5);
      this.add
        .text(cx - tableWidth / 2 + 200, rowY, entry.holeName, {
          color: "#f6f0d2", fontFamily: "Trebuchet MS", fontSize: "14px",
        })
        .setOrigin(0.5);
      this.add
        .text(cx, rowY, `${entry.par}`, {
          color: "#dceab5", fontFamily: "Trebuchet MS", fontSize: "16px", fontStyle: "bold",
        })
        .setOrigin(0.5);
      this.add
        .text(cx + tableWidth / 2 - 180, rowY, `${entry.strokes}`, {
          color: "#f6f0d2", fontFamily: "Trebuchet MS", fontSize: "18px", fontStyle: "bold",
        })
        .setOrigin(0.5);
      this.add
        .text(cx + tableWidth / 2 - 60, rowY, formatRelative(entry.relative), {
          color: relativeColor(entry.relative),
          fontFamily: "Trebuchet MS", fontSize: "16px", fontStyle: "bold",
        })
        .setOrigin(0.5);
    });
  }

  private clearOverlay() {
    document.querySelectorAll("[data-scene]").forEach((node) => node.remove());
  }

  private drawBackdrop() {
    const W = this.scale.width, H = this.scale.height;
    const cx = W / 2, cy = H / 2;
    this.add.rectangle(cx, cy, W, H, 0x18271b);
    this.add.circle(cx, H * 0.09, 92, 0xe2d36c, 0.18).setStrokeStyle(4, 0xe2d36c, 0.72);
    // Distant scenery framing the card
    this.add.image(cx - 540, H * 0.34, "tree").setScale(0.9).setAlpha(0.6);
    this.add.image(cx + 540, H * 0.42, "tree").setScale(0.85).setAlpha(0.7);
    this.add.image(cx - 510, H * 0.78, "ruins").setScale(0.9).setAlpha(0.85);
    this.add.image(cx + 510, H * 0.78, "mushroom-spotted").setScale(1.1).setAlpha(0.92);
  }
}

function formatRelative(relative: number): string {
  if (relative === 0) return "E";
  return relative > 0 ? `+${relative}` : `${relative}`;
}

function relativeColor(relative: number): string {
  if (relative < 0) return "#aaff8a"; // birdie or better — green
  if (relative === 0) return "#f6f0d2"; // par — cream
  if (relative === 1) return "#e2d36c"; // bogey — gold
  return "#f07b53"; // double or worse — orange
}

function scoreVerdict(relative: number): string {
  if (relative <= -2) return "Eagle!";
  if (relative === -1) return "Birdie!";
  if (relative === 0) return "Par";
  if (relative === 1) return "Bogey";
  if (relative === 2) return "Double Bogey";
  return `+${relative}`;
}

function courseVerdict(relative: number): string {
  if (relative <= -3) return "Goblin Grand Master.";
  if (relative <= 0) return "Clean round — chains all day.";
  if (relative <= 4) return "Solid run. The fairway remembers.";
  if (relative <= 9) return "Rough patches, but the basket forgives.";
  return "Try a tighter line next time.";
}
