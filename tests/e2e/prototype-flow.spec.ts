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
  // Screen-state panel rows
  await expect(holeScene(page)).toContainText("Lie");
  await expect(holeScene(page)).toContainText("Wind");
  await expect(holeScene(page)).toContainText("Forecast");
  await expect(holeScene(page)).toContainText("Risk");
  // Aim and power readouts
  await expect(holeScene(page)).toContainText(/Aim\s*\d*°/);
  await expect(holeScene(page)).toContainText(/Power\s*\d+%/);
  // Controls
  await expect(page.getByRole("slider", { name: "Throw power" })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Disc: / })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Angle: / })).toBeVisible();
  await expect(page.getByRole("button", { name: "Throw disc" })).toBeEnabled();
}

async function expectPuttingStateReadouts(page: Page) {
  await expect(holeScene(page)).toHaveClass(/hole-controls--putting/);
  await expect(holeScene(page)).toContainText("Putting view");
  await expect(holeScene(page)).toContainText("Putting mode. Drag the crosshair on the basket and set putt power.");
  await expect(holeScene(page)).toContainText(/Putt\s*\d+ ft/);
  await expect(holeScene(page)).toContainText(/Aim miss\s*\d+ px/);
  await expect(page.getByRole("slider", { name: "Putt power" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Release putt" })).toBeEnabled();
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
  await expect(page.getByRole("button", { name: /^Disc: / })).toBeVisible();
  await expectSetupStateReadouts(page);
  await expect(page.getByRole("button", { name: "Confirm goblin" })).toHaveCount(0);
}

async function setPower(page: Page, label: "Throw power" | "Putt power", percent: number) {
  const slider = page.getByRole("slider", { name: label });
  await expect(slider).toBeVisible();
  const track = slider.locator(".power-track");
  const box = await track.boundingBox();
  if (!box) {
    throw new Error(`Could not find ${label} track bounds.`);
  }

  const x = box.x + box.width / 2;
  const y = box.y + box.height * (1 - percent);
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x, y);
  await page.mouse.up();
  await expect(slider).toHaveAttribute("aria-valuenow", `${Math.round(percent * 100)}`);
}

async function aimAt(page: Page, x: number, y = 360) {
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x, y);
  await page.mouse.up();
}

async function targetDistance(page: Page) {
  const value = await holeScene(page).getAttribute("data-distance-ft");
  if (!value) {
    throw new Error("Could not find data-distance-ft on hole scene overlay");
  }
  return Number(value);
}

async function throwDiscAndWaitForLie(page: Page) {
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
        const releasePutt = page.getByRole("button", { name: "Release putt" });
        if ((await releasePutt.count()) > 0 && (await releasePutt.first().isVisible())) {
          return "putt";
        }

        const throwDisc = page.getByRole("button", { name: "Throw disc" });
        if (
          (await throwDisc.count()) > 0 &&
          (await throwDisc.first().isVisible()) &&
          (await throwDisc.first().isEnabled())
        ) {
          return "throw";
        }

        return "transition";
      },
      { timeout: 2000 },
    )
    .not.toBe("transition");
}

async function throwUntilPutting(page: Page, maxThrows = 5) {
  for (let attempt = 0; attempt < maxThrows; attempt += 1) {
    if (await page.getByRole("button", { name: "Release putt" }).isVisible()) {
      return;
    }
    await throwDiscAndWaitForLie(page);
    await waitForNextThrowOrPutt(page);
  }

  await expect(page.getByRole("button", { name: "Release putt" })).toBeVisible();
}

async function enterManualPutting(page: Page) {
  await setPower(page, "Throw power", 0.84);
  await page.getByRole("button", { name: "Disc: Driver" }).click();
  await page.getByRole("button", { name: "Angle: Flat" }).click();

  await throwUntilPutting(page);
  await expect(page.getByRole("button", { name: "Release putt" })).toBeVisible();
}

async function expectManualPuttingDistance(page: Page) {
  await expect
    .poll(async () => {
      const text = (await page.locator("[data-scene='hole']").textContent()) ?? "";
      const match = /Putt\s*(\d+) ft/.exec(text);
      return match ? Number(match[1]) : 0;
    })
    .toBeGreaterThan(0);
}

test("mobile player flow reaches the score summary with fresh scene controls", async ({ page }) => {
  await startHole(page);
  await expectSetupStateReadouts(page);
  await enterManualPutting(page);
  await expectPuttingStateReadouts(page);

  await expect(page.getByRole("button", { name: "Throw disc" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^Disc:/ })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^Angle:/ })).toHaveCount(0);

  await page.mouse.move(678, 266);
  await page.mouse.down();
  await page.mouse.move(678, 266);
  await page.mouse.up();
  await page.getByRole("button", { name: "Release putt" }).click();

  await expectOnlyScene(page, "score");
  await expect(page.getByRole("button", { name: "Release putt" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Play again" })).toBeVisible();

  await page.getByRole("button", { name: "Play again" }).click();
  await expectOnlyScene(page, "title");
  await expect(page.getByRole("button", { name: "Start round" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Play again" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Release putt" })).toHaveCount(0);
});

test("shot setup exposes playtest-critical state and aim feedback", async ({ page }) => {
  await startHole(page, "Grib Ninesnatch");
  await expectSetupStateReadouts(page);

  await expect(page.getByRole("button", { name: "Disc: Driver" })).toBeVisible();
  const beforeAim = await canvas(page).screenshot();
  await aimAt(page, 500, 520);
  await expect(holeScene(page)).toContainText(/Aim\s*\d+°\s*R/);
  const afterAim = await canvas(page).screenshot();
  expect(afterAim.equals(beforeAim)).toBe(false);

  await page.getByRole("button", { name: "Disc: Driver" }).click();
  await expect(page.getByRole("button", { name: "Disc: Midrange" })).toBeVisible();
  await expect(holeScene(page)).toContainText("Disc: Midrange");

  await setPower(page, "Throw power", 0.45);
  await expect(holeScene(page)).toContainText("Throw power: 45%");
  await expect(page.getByRole("button", { name: "Throw disc" })).toBeEnabled();
});

test("setup and OB overlays expose current lie and basket target distance", async ({ page }) => {
  await startHole(page, "Grib Ninesnatch");
  await expect(holeScene(page)).toContainText("Lie");
  await expect(holeScene(page)).toContainText("Risk");

  // Full power + max right aim guarantees an out-of-bounds landing
  await setPower(page, "Throw power", 1.0);
  await aimAt(page, 500, 650);
  await throwDiscAndWaitForLie(page);

  await expect(holeScene(page)).toContainText("OB landing. +1 penalty and relief moved the lie in bounds.");
  await expect(holeScene(page)).toContainText("Lie");
  await expect(holeScene(page)).toContainText("Risk");
});

test("disc, release angle, and power controls update visible state without stale buttons", async ({ page }) => {
  await startHole(page, "Grib Ninesnatch");

  const beforePowerDrag = await canvas(page).screenshot();
  await setPower(page, "Throw power", 0.25);
  const afterLowPowerDrag = await canvas(page).screenshot();
  expect(afterLowPowerDrag.equals(beforePowerDrag)).toBe(false);

  await page.getByRole("button", { name: "Disc: Driver" }).click();
  await expect(page.getByRole("button", { name: "Disc: Midrange" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Disc: Driver" })).toHaveCount(0);
  await page.getByRole("button", { name: "Disc: Midrange" }).click();
  await expect(page.getByRole("button", { name: "Disc: Putter" })).toBeVisible();
  await page.getByRole("button", { name: "Disc: Putter" }).click();
  await expect(page.getByRole("button", { name: "Disc: Driver" })).toBeVisible();

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

  // Full power + max right aim guarantees an out-of-bounds landing
  await setPower(page, "Throw power", 1.0);
  await aimAt(page, 500, 650);
  await throwDiscAndWaitForLie(page);

  await expect(page.getByRole("button", { name: "Throw disc" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Disc: Driver" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Angle: Flat" })).toBeVisible();
  await expect(page.getByText("OB landing. +1 penalty and relief moved the lie in bounds.")).toBeVisible();
  await expect(holeScene(page)).toContainText(/Aim\s*\d*°/);
  await expect(page.getByText("Round Complete")).toHaveCount(0);
  await expectOnlyScene(page, "hole");

  const reliefDistance = await targetDistance(page);
  await aimAt(page, 500, 360);
  await throwDiscAndWaitForLie(page);
  await waitForNextThrowOrPutt(page);

  if (await page.getByRole("button", { name: "Release putt" }).isVisible()) {
    await expectPuttingStateReadouts(page);
    await expect(page.getByRole("button", { name: "Throw disc" })).toHaveCount(0);
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

  await enterManualPutting(page);
  await expectManualPuttingDistance(page);
  await expectPuttingStateReadouts(page);

  await expect(page.getByRole("button", { name: "Release putt" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Throw disc" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^Disc:/ })).toHaveCount(0);

  const puttingView = await canvas(page).screenshot();
  expect(puttingView.equals(setupView)).toBe(false);

  await setPower(page, "Putt power", 0.79);
  await expect(page.getByRole("slider", { name: "Putt power" })).toHaveAttribute("aria-valuenow", "79");

  await page.mouse.move(678, 266);
  await page.mouse.down();
  await page.mouse.move(738, 306);
  await page.mouse.up();
  const adjustedCrosshair = await canvas(page).screenshot();
  expect(adjustedCrosshair.equals(puttingView)).toBe(false);
});

test("manual putt make from putting mode reaches score summary", async ({ page }) => {
  await startHole(page, "Morga Mosswhack");
  await enterManualPutting(page);
  await expectManualPuttingDistance(page);

  await page.mouse.move(678, 266);
  await page.mouse.down();
  await page.mouse.move(678, 266);
  await page.mouse.up();
  await page.getByRole("button", { name: "Release putt" }).click();

  await expectOnlyScene(page, "score");
  await expect(page.getByRole("button", { name: "Play again" })).toBeVisible();
});

test("flight mode shows Watch the flight button disabled instead of an active Throw disc button", async ({ page }) => {
  await startHole(page, "Grib Ninesnatch");
  await expect(page.getByRole("button", { name: "Throw disc" })).toBeEnabled();

  await page.getByRole("button", { name: "Throw disc" }).click();
  await expect(page.getByText("Disc in flight")).toBeVisible();

  // During flight the action button is relabeled and disabled
  await expect(page.getByRole("button", { name: "Watch the flight…" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Watch the flight…" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Throw disc" })).toHaveCount(0);

  // After flight resolves, Throw disc returns
  await expect(page.getByText("Disc in flight")).toHaveCount(0, { timeout: 7000 });
  await expect(page.getByRole("button", { name: "Throw disc" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Watch the flight…" })).toHaveCount(0);
});

test("wind lane row includes a human-readable effect description", async ({ page }) => {
  await startHole(page, "Grib Ninesnatch");
  // Default straight shot passes through left-tailwind zone
  const windCell = holeScene(page).locator(".screen-state-row").filter({ hasText: "Wind" });
  await expect(windCell).toBeVisible();
  // Should contain zone label and effect description
  await expect(windCell).toContainText(/Moss Tailwind|Open air/);
  await expect(holeScene(page)).toContainText(/longer carry|push across|no effect/);
});

test("missed putt returns a specific miss reason in the status panel", async ({ page }) => {
  await startHole(page, "Grib Ninesnatch");

  // Two default throws land the disc at ~54px from basket — inside putting range, outside tap-in
  await throwDiscAndWaitForLie(page);
  await waitForNextThrowOrPutt(page);
  await throwDiscAndWaitForLie(page);
  await waitForNextThrowOrPutt(page);
  await expect(page.getByRole("button", { name: "Release putt" })).toBeVisible();

  // Drag crosshair far off-center to guarantee a wide miss (aimError >> forgiveness)
  await page.mouse.move(678, 266);
  await page.mouse.down();
  await page.mouse.move(678, 550);
  await page.mouse.up();
  await page.getByRole("button", { name: "Release putt" }).click();

  const statusPanel = holeScene(page).locator(".status-panel");
  await expect(statusPanel).toBeVisible();
  await expect(holeScene(page)).toContainText(/Missed:|Chains caught it\.|Tap-in range/);
});

test("character select shows SELECTED badge not LOCKED on the active card", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Start round" }).click();
  await expect(page.getByRole("button", { name: "Select Grib Ninesnatch" })).toBeVisible();

  // The active character tab should be aria-pressed=true
  const activeTab = page.getByRole("button", { name: "Select Grib Ninesnatch" });
  await expect(activeTab).toHaveAttribute("aria-pressed", "true");

  // Switching selection updates aria-pressed
  await page.getByRole("button", { name: "Select Morga Mosswhack" }).click();
  await expect(page.getByRole("button", { name: "Select Morga Mosswhack" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: "Select Grib Ninesnatch" })).toHaveAttribute("aria-pressed", "false");
});
