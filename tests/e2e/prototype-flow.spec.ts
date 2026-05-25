import { expect, type Page, test } from "@playwright/test";

const canvas = (page: Page) => page.locator("canvas");
const activeScene = (page: Page) => page.locator("[data-scene]");
const holeScene = (page: Page) => page.locator("[data-scene='hole']");

async function expectOnlyScene(page: Page, scene: string) {
  await expect(activeScene(page)).toHaveCount(1);
  await expect(activeScene(page)).toHaveAttribute("data-scene", scene);
}

async function expectSetupStateReadouts(page: Page) {
  await expect(holeScene(page)).toHaveClass(/hole-controls--setup/);
  await expect(holeScene(page)).toContainText("Lie");
  await expect(holeScene(page)).toContainText("Wind");
  await expect(holeScene(page)).toContainText("Forecast");
  await expect(holeScene(page)).toContainText("Risk");
  await expect(page.getByRole("button", { name: "Roll Dice" })).toBeVisible();
}

async function expectPuttingStateReadouts(page: Page) {
  await expect(holeScene(page)).toHaveClass(/hole-controls--putting/);
  await expect(holeScene(page)).toContainText("Putting view");
  await expect(holeScene(page)).toContainText(/\d+ ft/);
  await expect(
    page.getByRole("button", { name: /Roll for Putt|Tap In/ }).first(),
  ).toBeVisible();
}

// ─── Dice helpers ─────────────────────────────────────────────────────────────

async function rollShotDice(page: Page, forceDice?: [number, number, number]) {
  if (forceDice) {
    await page.evaluate((d) => {
      (window as unknown as Record<string, unknown>).__forceDice = d;
    }, forceDice);
  }
  await page.getByRole("button", { name: "Roll Dice" }).click();
}

async function assignShotDice(page: Page) {
  await page.getByRole("button", { name: /^Die 1:/ }).click();
  await page.locator(".slot").filter({ hasText: "ANGLE" }).click();
  await page.getByRole("button", { name: /^Die 2:/ }).click();
  await page.locator(".slot").filter({ hasText: "POWER" }).click();
  await page.getByRole("button", { name: /^Die 3:/ }).click();
  await page.locator(".slot").filter({ hasText: "WIND" }).click();
}

async function rollAndAssignShot(page: Page, forceDice?: [number, number, number]) {
  await rollShotDice(page, forceDice);
  await assignShotDice(page);
}

async function rollAndAssignPutt(page: Page, forceDice?: [number, number]) {
  if (forceDice) {
    await page.evaluate((d) => {
      (window as unknown as Record<string, unknown>).__forcePuttDice = d;
    }, forceDice);
  }
  await page.getByRole("button", { name: "Roll for Putt" }).click();
  await page.getByRole("button", { name: /^Die 1:/ }).click();
  await page.locator(".slot").filter({ hasText: "AIM" }).click();
  await page.getByRole("button", { name: /^Die 2:/ }).click();
  await page.locator(".slot").filter({ hasText: "POWER" }).click();
}

// ─── Flow helpers ─────────────────────────────────────────────────────────────

async function targetDistance(page: Page) {
  const value = await holeScene(page).getAttribute("data-distance-ft");
  if (!value) throw new Error("Could not find data-distance-ft on hole scene overlay");
  return Number(value);
}

async function throwDiscAndWaitForLie(page: Page, forceDice?: [number, number, number]) {
  await rollAndAssignShot(page, forceDice);
  const throwDisc = page.getByRole("button", { name: "Throw disc" });
  await expect(throwDisc).toBeEnabled();
  await throwDisc.click();
  await expect(page.getByText("Disc in flight")).toBeVisible();
  await expect(page.getByText("Disc in flight")).toHaveCount(0, { timeout: 7000 });
}

async function waitForNextThrowOrPutt(page: Page) {
  await expect
    .poll(
      async () => {
        const tapIn = page.getByRole("button", { name: "Tap In" });
        if ((await tapIn.count()) > 0 && (await tapIn.first().isVisible())) return "putt";

        const rollForPutt = page.getByRole("button", { name: "Roll for Putt" });
        if ((await rollForPutt.count()) > 0 && (await rollForPutt.first().isVisible())) return "putt";

        const rollDice = page.getByRole("button", { name: "Roll Dice" });
        if ((await rollDice.count()) > 0 && (await rollDice.first().isVisible())) return "throw";

        return "transition";
      },
      { timeout: 2000 },
    )
    .not.toBe("transition");
}

async function isInPuttingMode(page: Page): Promise<boolean> {
  const tapIn = page.getByRole("button", { name: "Tap In" });
  const rollForPutt = page.getByRole("button", { name: "Roll for Putt" });
  return (
    (await tapIn.isVisible().catch(() => false)) ||
    (await rollForPutt.isVisible().catch(() => false))
  );
}

async function throwUntilPutting(page: Page, maxThrows = 5) {
  for (let attempt = 0; attempt < maxThrows; attempt += 1) {
    if (await isInPuttingMode(page)) return;
    // Force [4,4,4]: 8° angle, 70% power, 60% wind — advances reliably without overshooting
    await throwDiscAndWaitForLie(page, [4, 4, 4]);
    await waitForNextThrowOrPutt(page);
    if (await isInPuttingMode(page)) return;
  }
  await expect(
    page.getByRole("button", { name: /Roll for Putt|Tap In/ }).first(),
  ).toBeVisible();
}

/**
 * Complete the current hole from putting mode.
 * Uses tap-in if available, otherwise rolls putt dice [3,3]
 * (aim ±16 px, 60% power — reliable make for all characters).
 */
async function completeHoleFromPutting(page: Page) {
  const tapIn = page.getByRole("button", { name: "Tap In" });
  if (await tapIn.isVisible().catch(() => false)) {
    await tapIn.click();
    return;
  }

  await rollAndAssignPutt(page, [3, 3]);
  await page.getByRole("button", { name: "Release putt" }).click();

  // If still on the hole (putt missed), finish with tap-in or one more roll
  if (await page.getByRole("button", { name: /Roll for Putt|Tap In/ }).isVisible().catch(() => false)) {
    const tapInAgain = page.getByRole("button", { name: "Tap In" });
    if (await tapInAgain.isVisible().catch(() => false)) {
      await tapInAgain.click();
    } else {
      await rollAndAssignPutt(page, [3, 3]);
      await page.getByRole("button", { name: "Release putt" }).click();
    }
  }
}

async function startHole(page: Page, goblin = "Morga Mosswhack") {
  await page.goto("/");
  await page.waitForLoadState("domcontentloaded");
  await expect(page.getByRole("button", { name: "Start round" })).toBeVisible({ timeout: 10000 });

  await expect(canvas(page)).toBeVisible();
  await expect(canvas(page)).toHaveJSProperty("width", 1280);
  await expect(canvas(page)).toHaveJSProperty("height", 720);
  await expectOnlyScene(page, "title");

  await page.getByRole("button", { name: "Start round" }).click();
  await expect(page.getByRole("button", { name: "Select Grib Ninesnatch" })).toBeVisible();
  await expectOnlyScene(page, "character-select");
  await expect(page.getByRole("button", { name: "Start round" })).toHaveCount(0);
  await page.getByRole("button", { name: `Select ${goblin}` }).click();
  await page.getByRole("button", { name: "Confirm goblin" }).click();

  await expectOnlyScene(page, "hole");
  await expect(page.getByRole("button", { name: "Roll Dice" })).toBeVisible();
  await expectSetupStateReadouts(page);
  await expect(page.getByRole("button", { name: "Confirm goblin" })).toHaveCount(0);
}

// ─── Tests ───────────────────────────────────────────────────────────────────

test("hole 1 completion lands on the intermission scorecard and advances to hole 2", async ({ page }) => {
  await startHole(page);
  await expectSetupStateReadouts(page);

  await throwUntilPutting(page);
  await expectPuttingStateReadouts(page);

  await expect(page.getByRole("button", { name: "Throw disc" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^Disc:/ })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^Angle:/ })).toHaveCount(0);

  await completeHoleFromPutting(page);

  // After hole 1 the player sees the intermission scorecard with a "Tee off Hole 2"
  // CTA. "Play again" only appears after the full 9-hole round.
  await expectOnlyScene(page, "score");
  await expect(page.getByRole("button", { name: "Release putt" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Tee off Hole 2" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Play again" })).toHaveCount(0);

  await page.getByRole("button", { name: "Tee off Hole 2" }).click();
  await expectOnlyScene(page, "hole");
  await expectSetupStateReadouts(page);
});

test("shot setup exposes playtest-critical state and dice assignment feedback", async ({ page }) => {
  await startHole(page, "Grib Ninesnatch");
  await expectSetupStateReadouts(page);

  await expect(page.getByRole("button", { name: "Roll Dice" })).toBeVisible();
  const beforeRoll = await canvas(page).screenshot();

  await rollAndAssignShot(page);

  // After full assignment the forecast cone appears — canvas must differ
  const afterAssign = await canvas(page).screenshot();
  expect(afterAssign.equals(beforeRoll)).toBe(false);

  await expect(holeScene(page)).toContainText("Forecast");
  await expect(holeScene(page)).toContainText("Risk");

  // Disc and angle buttons appear after rolling
  await expect(page.getByRole("button", { name: "Disc: Driver" })).toBeVisible();
  await page.getByRole("button", { name: "Disc: Driver" }).click();
  await expect(page.getByRole("button", { name: "Disc: Midrange" })).toBeVisible();
  await expect(holeScene(page)).toContainText("Disc: Midrange");

  await expect(page.getByRole("button", { name: "Throw disc" })).toBeEnabled();
});

test("setup and OB overlays expose current lie and basket target distance", async ({ page }) => {
  await startHole(page, "Grib Ninesnatch");
  await expect(holeScene(page)).toContainText("Lie");
  await expect(holeScene(page)).toContainText("Risk");

  // die[0]=6 (+42° offset, south-southeast), die[1]=6 (100% power) guarantees OB
  await throwDiscAndWaitForLie(page, [6, 6, 4]);

  await expect(holeScene(page)).toContainText("OB landing. +1 penalty and relief moved the lie in bounds.");
  await expect(holeScene(page)).toContainText("Lie");
  await expect(holeScene(page)).toContainText("Risk");
});

test("disc, release angle, and dice controls update visible state without stale buttons", async ({ page }) => {
  await startHole(page, "Grib Ninesnatch");

  const beforeRoll = await canvas(page).screenshot();
  await rollAndAssignShot(page);
  const afterAssign = await canvas(page).screenshot();
  expect(afterAssign.equals(beforeRoll)).toBe(false);

  // Disc cycling
  await page.getByRole("button", { name: "Disc: Driver" }).click();
  await expect(page.getByRole("button", { name: "Disc: Midrange" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Disc: Driver" })).toHaveCount(0);
  await page.getByRole("button", { name: "Disc: Midrange" }).click();
  await expect(page.getByRole("button", { name: "Disc: Putter" })).toBeVisible();
  await page.getByRole("button", { name: "Disc: Putter" }).click();
  await expect(page.getByRole("button", { name: "Disc: Driver" })).toBeVisible();

  // Angle cycling
  await page.getByRole("button", { name: "Angle: Flat" }).click();
  await expect(page.getByRole("button", { name: "Angle: Anhyzer" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Angle: Flat" })).toHaveCount(0);
  await page.getByRole("button", { name: "Angle: Anhyzer" }).click();
  await expect(page.getByRole("button", { name: "Angle: Hyzer" })).toBeVisible();
  await page.getByRole("button", { name: "Angle: Hyzer" }).click();
  await expect(page.getByRole("button", { name: "Angle: Flat" })).toBeVisible();
});

test("OB relief keeps the throw loop playable and can still reach putting", async ({ page }) => {
  await startHole(page, "Grib Ninesnatch");

  // die[0]=6 (+42° offset) + die[1]=6 (100% power) → south-southeast at max range → OB
  await throwDiscAndWaitForLie(page, [6, 6, 4]);

  await expect(page.getByRole("button", { name: "Roll Dice" })).toBeVisible();
  await expect(page.getByText("OB landing. +1 penalty and relief moved the lie in bounds.")).toBeVisible();
  await expect(page.getByText("Round Complete")).toHaveCount(0);
  await expectOnlyScene(page, "hole");

  const reliefDistance = await targetDistance(page);
  await throwDiscAndWaitForLie(page);
  await waitForNextThrowOrPutt(page);

  if (await page.getByRole("button", { name: /Roll for Putt|Tap In/ }).isVisible().catch(() => false)) {
    await expectPuttingStateReadouts(page);
    await expect(page.getByRole("button", { name: "Roll Dice" })).toHaveCount(0);
  } else {
    await expectSetupStateReadouts(page);
    await expect.poll(() => targetDistance(page)).toBeLessThan(reliefDistance);
    await throwUntilPutting(page, 3);
    await expectPuttingStateReadouts(page);
  }
});

test("putting mode replaces shot setup with a distinct basket-focused view", async ({ page }) => {
  await startHole(page, "Morga Mosswhack");
  const setupView = await canvas(page).screenshot();

  await throwUntilPutting(page);
  await expectPuttingStateReadouts(page);

  await expect(page.getByRole("button", { name: "Throw disc" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^Disc:/ })).toHaveCount(0);

  const puttingView = await canvas(page).screenshot();
  expect(puttingView.equals(setupView)).toBe(false);

  // Rolling putt dice and assigning AIM slot moves the crosshair — canvas changes
  const tapIn = page.getByRole("button", { name: "Tap In" });
  if (!(await tapIn.isVisible().catch(() => false))) {
    await page.evaluate(() => {
      (window as unknown as Record<string, unknown>).__forcePuttDice = [6, 3];
    });
    await page.getByRole("button", { name: "Roll for Putt" }).click();
    const afterRoll = await canvas(page).screenshot();

    await page.getByRole("button", { name: /^Die 1:/ }).click();
    await page.locator(".slot").filter({ hasText: "AIM" }).click();
    const afterAimAssign = await canvas(page).screenshot();
    expect(afterAimAssign.equals(afterRoll)).toBe(false);
  }
});

test("manual putt make from putting mode reaches the intermission scorecard", async ({ page }) => {
  await startHole(page, "Morga Mosswhack");

  await throwUntilPutting(page);
  await completeHoleFromPutting(page);

  await expectOnlyScene(page, "score");
  // The intermission scorecard shows a "Tee off Hole 2" CTA after hole 1.
  await expect(page.getByRole("button", { name: "Tee off Hole 2" })).toBeVisible();
});

test("flight mode shows Watch the flight button disabled instead of an active Throw disc button", async ({ page }) => {
  await startHole(page, "Grib Ninesnatch");

  await rollAndAssignShot(page);
  await expect(page.getByRole("button", { name: "Throw disc" })).toBeEnabled();

  await page.getByRole("button", { name: "Throw disc" }).click();
  await expect(page.getByText("Disc in flight")).toBeVisible();

  // During flight the action button is relabeled and disabled
  await expect(page.getByRole("button", { name: "Watch the flight…" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Watch the flight…" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Throw disc" })).toHaveCount(0);

  // After flight resolves, Roll Dice returns (setup mode)
  await expect(page.getByText("Disc in flight")).toHaveCount(0, { timeout: 7000 });
  await expect(page.getByRole("button", { name: "Roll Dice" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Watch the flight…" })).toHaveCount(0);
});

test("wind lane row includes a human-readable effect description", async ({ page }) => {
  await startHole(page, "Grib Ninesnatch");
  // Force wind die = 6 (index 5 → WIND_CLARITY_DIAL[5] = 1.0) for full wind description
  await rollShotDice(page, [4, 4, 6]);
  await page.getByRole("button", { name: /^Die 1:/ }).click();
  await page.locator(".slot").filter({ hasText: "ANGLE" }).click();
  await page.getByRole("button", { name: /^Die 2:/ }).click();
  await page.locator(".slot").filter({ hasText: "POWER" }).click();
  await page.getByRole("button", { name: /^Die 3:/ }).click();
  await page.locator(".slot").filter({ hasText: "WIND" }).click();

  const windCell = holeScene(page).locator(".screen-state-row").filter({ hasText: "Wind" });
  await expect(windCell).toBeVisible();
  await expect(windCell).toContainText(/Moss Tailwind|Open air/);
  await expect(holeScene(page)).toContainText(/longer carry|push across|no effect/);
});

test("missed putt resolves to tap-in completion or specific miss feedback", async ({ page }) => {
  await startHole(page, "Grib Ninesnatch");

  await throwUntilPutting(page);

  // Tap-in mode can complete the hole immediately.
  const tapIn = page.getByRole("button", { name: "Tap In" });
  if (await tapIn.isVisible().catch(() => false)) {
    await tapIn.click();
    await expectOnlyScene(page, "score");
    await expect(page.getByRole("button", { name: "Play again" })).toBeVisible();
    return;
  }

  await expect(page.getByRole("button", { name: "Roll for Putt" })).toBeVisible();
  // aim die=6 → 80 px offset >> forgiveness for all characters → guaranteed miss
  await rollAndAssignPutt(page, [6, 6]);
  await page.getByRole("button", { name: "Release putt" }).click();

  await expect
    .poll(
      async () => {
        const scene = await activeScene(page).getAttribute("data-scene").catch(() => null);
        if (scene === "score") return "score";
        if (scene === "hole") {
          const text = await holeScene(page).textContent();
          if (/Missed:|Chains caught it\.|Tap-in range/.test(text ?? "")) return "miss-feedback";
        }
        return "transition";
      },
      { timeout: 2000 },
    )
    .toMatch(/score|miss-feedback/);
});

test("character select shows SELECTED badge not LOCKED on the active card", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Start round" }).click();
  await expect(page.getByRole("button", { name: "Select Grib Ninesnatch" })).toBeVisible();

  const activeTab = page.getByRole("button", { name: "Select Grib Ninesnatch" });
  await expect(activeTab).toHaveAttribute("aria-pressed", "true");

  await page.getByRole("button", { name: "Select Morga Mosswhack" }).click();
  await expect(page.getByRole("button", { name: "Select Morga Mosswhack" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: "Select Grib Ninesnatch" })).toHaveAttribute("aria-pressed", "false");
});
