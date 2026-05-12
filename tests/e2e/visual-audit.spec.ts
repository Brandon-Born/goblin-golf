import { expect, type Page, test } from "@playwright/test";

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

test("visual audit of the playable prototype", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Start round" })).toBeVisible();
  await page.screenshot({ path: "test-results/visual-audit/01-title.png", fullPage: true });

  await page.getByRole("button", { name: "Start round" }).click();
  await expect(page.getByRole("button", { name: "Select Grib Ninesnatch" })).toBeVisible();
  await page.screenshot({ path: "test-results/visual-audit/02-character-select.png", fullPage: true });

  await page.getByRole("button", { name: "Select Skrak Boomarm" }).click();
  await page.getByRole("button", { name: "Confirm goblin" }).click();
  await expect(page.getByRole("button", { name: "Throw disc" })).toBeVisible();
  await page.screenshot({ path: "test-results/visual-audit/03-shot-setup.png", fullPage: true });

  await page.mouse.move(320, 350);
  await page.mouse.down();
  await page.mouse.move(320, 350);
  await page.mouse.up();
  await setPower(page, "Throw power", 0.78);
  await page.getByRole("button", { name: "Angle: Flat" }).click();
  await page.getByRole("button", { name: "Angle: Anhyzer" }).click();
  await expect(page.getByRole("button", { name: "Angle: Hyzer" })).toBeVisible();
  await throwDiscAndWaitForLie(page);
  await expect(page.getByRole("button", { name: "Throw disc" })).toBeVisible();
  await page.screenshot({ path: "test-results/visual-audit/04-hyzer-flight-path.png", fullPage: true });

  await page.goto("/");
  await page.getByRole("button", { name: "Start round" }).click();
  await page.getByRole("button", { name: "Select Morga Mosswhack" }).click();
  await page.getByRole("button", { name: "Confirm goblin" }).click();
  await setPower(page, "Throw power", 0.84);
  await page.getByRole("button", { name: "Disc: Driver" }).click();
  await page.getByRole("button", { name: "Angle: Flat" }).click();
  await throwUntilPutting(page);

  await expect(page.getByRole("button", { name: "Release putt" })).toBeVisible();
  await page.screenshot({ path: "test-results/visual-audit/05-putting.png", fullPage: true });

  await page.mouse.move(195, 300);
  await page.mouse.down();
  await page.mouse.move(195, 300);
  await page.mouse.up();
  await page.getByRole("button", { name: "Release putt" }).click();
  await expect(page.getByRole("button", { name: "Play again" })).toBeVisible();
  await page.screenshot({ path: "test-results/visual-audit/06-score-summary.png", fullPage: true });
});
