import { expect, type Page, test } from "@playwright/test";

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

async function throwDiscAndWaitForLie(page: Page, forceDice?: [number, number, number]) {
  await rollShotDice(page, forceDice);
  await assignShotDice(page);
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
    await throwDiscAndWaitForLie(page, [4, 4, 4]);
    await waitForNextThrowOrPutt(page);
    if (await isInPuttingMode(page)) return;
  }
  await expect(
    page.getByRole("button", { name: /Roll for Putt|Tap In/ }).first(),
  ).toBeVisible();
}

test("visual audit of the playable prototype", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Start round" })).toBeVisible();
  await page.screenshot({ path: "test-results/visual-audit/01-title.png", fullPage: true });

  await page.getByRole("button", { name: "Start round" }).click();
  await expect(page.getByRole("button", { name: "Select Grib Ninesnatch" })).toBeVisible();
  await page.screenshot({ path: "test-results/visual-audit/02-character-select.png", fullPage: true });

  await page.getByRole("button", { name: "Select Skrak Boomarm" }).click();
  await page.getByRole("button", { name: "Confirm goblin" }).click();
  await expect(page.getByRole("button", { name: "Roll Dice" })).toBeVisible();
  await page.screenshot({ path: "test-results/visual-audit/03-shot-setup.png", fullPage: true });

  // Roll dice and switch to anhyzer before assigning
  await rollShotDice(page);
  await page.getByRole("button", { name: "Angle: Flat" }).click(); // → Anhyzer
  await assignShotDice(page);
  await page.screenshot({ path: "test-results/visual-audit/03b-dice-assigned-anhyzer.png", fullPage: true });

  const throwDisc = page.getByRole("button", { name: "Throw disc" });
  await expect(throwDisc).toBeEnabled();
  await throwDisc.click();
  await expect(page.getByText("Disc in flight")).toBeVisible();
  await expect(page.getByText("Disc in flight")).toHaveCount(0, { timeout: 7000 });
  await expect(page.getByRole("button", { name: "Roll Dice" })).toBeVisible();
  await page.screenshot({ path: "test-results/visual-audit/04-hyzer-flight-path.png", fullPage: true });

  await page.goto("/");
  await page.getByRole("button", { name: "Start round" }).click();
  await page.getByRole("button", { name: "Select Morga Mosswhack" }).click();
  await page.getByRole("button", { name: "Confirm goblin" }).click();
  await expect(page.getByRole("button", { name: "Roll Dice" })).toBeVisible();
  await throwUntilPutting(page);

  await expect(
    page.getByRole("button", { name: /Roll for Putt|Tap In/ }).first(),
  ).toBeVisible();
  await page.screenshot({ path: "test-results/visual-audit/05-putting.png", fullPage: true });

  const tapIn = page.getByRole("button", { name: "Tap In" });
  if (await tapIn.isVisible().catch(() => false)) {
    await tapIn.click();
  } else {
    await page.evaluate(() => {
      (window as unknown as Record<string, unknown>).__forcePuttDice = [3, 3];
    });
    await page.getByRole("button", { name: "Roll for Putt" }).click();
    await page.getByRole("button", { name: /^Die 1:/ }).click();
    await page.locator(".slot").filter({ hasText: "AIM" }).click();
    await page.getByRole("button", { name: /^Die 2:/ }).click();
    await page.locator(".slot").filter({ hasText: "POWER" }).click();
    await page.getByRole("button", { name: "Release putt" }).click();

    // If still putting after a possible miss, use tap-in or retry
    if (await page.getByRole("button", { name: /Roll for Putt|Tap In/ }).isVisible().catch(() => false)) {
      const tapIn2 = page.getByRole("button", { name: "Tap In" });
      if (await tapIn2.isVisible().catch(() => false)) {
        await tapIn2.click();
      } else {
        await page.evaluate(() => {
          (window as unknown as Record<string, unknown>).__forcePuttDice = [3, 3];
        });
        await page.getByRole("button", { name: "Roll for Putt" }).click();
        await page.getByRole("button", { name: /^Die 1:/ }).click();
        await page.locator(".slot").filter({ hasText: "AIM" }).click();
        await page.getByRole("button", { name: /^Die 2:/ }).click();
        await page.locator(".slot").filter({ hasText: "POWER" }).click();
        await page.getByRole("button", { name: "Release putt" }).click();
      }
    }
  }

  await expect(page.getByRole("button", { name: "Play again" })).toBeVisible();
  await page.screenshot({ path: "test-results/visual-audit/06-score-summary.png", fullPage: true });
});
