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
  await expect(holeScene(page)).toContainText(/(Behind-goblin setup|Throw setup)/);
  await expect(holeScene(page)).toContainText("Drag fairway to aim. Tap Disc/Angle to cycle. Drag power, then throw.");
  await expect(holeScene(page)).toContainText(/Aim\s*-?\d+ deg/);
  await expect(holeScene(page)).toContainText(/Power\s*\d+%/);
  await expect(holeScene(page)).toContainText("Current lie");
  await expect(holeScene(page)).toContainText("YOUR DISC");
  await expect(holeScene(page)).toContainText(/Target\s*BASKET \d+ ft/);
  await expect(holeScene(page)).toContainText("Projected throw");
  await expect(holeScene(page)).toContainText("Next action");
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
  await expect(page.getByRole("button", { name: /^Putt power: / })).toBeVisible();
  await expect(page.getByRole("button", { name: "Release putt" })).toBeEnabled();
}

async function startHole(page: Page, goblin = "Morga Mosswhack") {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Start prototype" })).toBeVisible();

  await expect(canvas(page)).toBeVisible();
  await expect(canvas(page)).toHaveJSProperty("width", 390);
  await expect(canvas(page)).toHaveJSProperty("height", 844);
  await expectOnlyScene(page, "title");

  await page.getByRole("button", { name: "Start prototype" }).click();
  await expect(page.getByRole("button", { name: "Select Grib Ninesnatch" })).toBeVisible();
  await expectOnlyScene(page, "character-select");
  await expect(page.getByRole("button", { name: "Start prototype" })).toHaveCount(0);
  await page.getByRole("button", { name: `Select ${goblin}` }).click();
  await page.getByRole("button", { name: "Confirm goblin" }).click();

  await expect(page.getByText("Disc: Driver")).toBeVisible();
  await expectOnlyScene(page, "hole");
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

async function aimAt(page: Page, x: number) {
  await page.mouse.move(x, 350);
  await page.mouse.down();
  await page.mouse.move(x, 350);
  await page.mouse.up();
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
    .toBeGreaterThan(18);
}

test("mobile player flow reaches the score summary with fresh scene controls", async ({ page }) => {
  await startHole(page);
  await enterManualPutting(page);
  await expectPuttingStateReadouts(page);

  await expect(page.getByRole("button", { name: "Throw disc" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^Disc:/ })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^Angle:/ })).toHaveCount(0);

  await page.mouse.move(195, 300);
  await page.mouse.down();
  await page.mouse.move(195, 300);
  await page.mouse.up();
  await page.getByRole("button", { name: "Release putt" }).click();

  await expect(page.getByText("Score Summary")).toBeVisible();
  await expectOnlyScene(page, "score");
  await expect(page.getByRole("button", { name: "Release putt" })).toHaveCount(0);
  await expect(page.getByText(/Strokes:/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Play again" })).toBeVisible();

  await page.getByRole("button", { name: "Play again" }).click();
  await expectOnlyScene(page, "title");
  await expect(page.getByRole("button", { name: "Start prototype" })).toBeVisible();
  await expect(page.getByText("Score Summary")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Release putt" })).toHaveCount(0);
});

test("shot setup exposes playtest-critical state and aim feedback", async ({ page }) => {
  await startHole(page, "Grib Ninesnatch");
  await expectSetupStateReadouts(page);

  await expect(page.getByRole("button", { name: "Disc: Driver" })).toBeVisible();

  const beforeAim = await canvas(page).screenshot();
  await aimAt(page, 315);
  await expect(holeScene(page)).toContainText(/Aim\s*-5\d deg/);
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
  await expect(holeScene(page)).toContainText("Current lie");
  await expect(holeScene(page)).toContainText("YOUR DISC");
  await expect(holeScene(page)).toContainText(/Target\s*BASKET \d+ ft/);

  await aimAt(page, 390);
  await throwDiscAndWaitForLie(page);

  await expect(holeScene(page)).toContainText("OB landing. +1 penalty and relief moved the lie in bounds.");
  await expect(holeScene(page)).toContainText("Current lie");
  await expect(holeScene(page)).toContainText("YOUR DISC");
  await expect(holeScene(page)).toContainText(/Target\s*BASKET \d+ ft/);
  await expect(holeScene(page)).toContainText("Next action");
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

  await aimAt(page, 390);
  await throwDiscAndWaitForLie(page);

  await expect(page.getByRole("button", { name: "Throw disc" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Disc: Driver" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Angle: Flat" })).toBeVisible();
  await expect(page.getByText("OB landing. +1 penalty and relief moved the lie in bounds.")).toBeVisible();
  await expect(holeScene(page)).toContainText(/Aim\s*-?\d+ deg/);
  await expect(page.getByText("Score Summary")).toHaveCount(0);
  await expectOnlyScene(page, "hole");

  await aimAt(page, 195);
  await throwUntilPutting(page, 4);

  await expect(page.getByRole("button", { name: "Release putt" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Throw disc" })).toHaveCount(0);
});

test("putting mode replaces shot setup with a distinct basket-focused view", async ({ page }) => {
  await startHole(page, "Morga Mosswhack");
  const setupView = await canvas(page).screenshot();

  await enterManualPutting(page);
  await expectManualPuttingDistance(page);
  await expectPuttingStateReadouts(page);

  await expect(page.getByRole("button", { name: "Putt power: 64%" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Release putt" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Throw disc" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^Disc:/ })).toHaveCount(0);

  const puttingView = await canvas(page).screenshot();
  expect(puttingView.equals(setupView)).toBe(false);

  await page.getByRole("button", { name: "Putt power: 64%" }).click();
  await expect(page.getByRole("button", { name: "Putt power: 79%" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Putt power: 64%" })).toHaveCount(0);

  await page.mouse.move(195, 300);
  await page.mouse.down();
  await page.mouse.move(255, 340);
  await page.mouse.up();
  const adjustedCrosshair = await canvas(page).screenshot();
  expect(adjustedCrosshair.equals(puttingView)).toBe(false);
});

test("manual putt make from putting mode reaches score summary", async ({ page }) => {
  await startHole(page, "Morga Mosswhack");
  await enterManualPutting(page);
  await expectManualPuttingDistance(page);

  await page.mouse.move(195, 300);
  await page.mouse.down();
  await page.mouse.move(195, 300);
  await page.mouse.up();
  await page.getByRole("button", { name: "Release putt" }).click();

  await expect(page.getByText("Score Summary")).toBeVisible();
  await expect(page.getByText(/Strokes:/)).toBeVisible();
});
