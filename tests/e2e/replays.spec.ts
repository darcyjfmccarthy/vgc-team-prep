import { expect, test } from "@playwright/test";
test("visual statistics and game review are readable and work on mobile", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 1440, height: 1050 });
  await page.goto("/login");
  await page.getByLabel("Email").fill("player-one@example.test");
  await page.getByLabel("Password").fill("correct-horse-battery-staple");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(
    page.getByRole("heading", { name: "Choose a team. Prepare with context." }),
  ).toBeVisible();
  await page.goto("/teams");
  await page
    .getByRole("link", { name: /Copy of Copy of Worlds 2026/ })
    .first()
    .click();
  await page.getByRole("link", { name: "Statistics", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Your Pokémon" }),
  ).toBeVisible();
  await expect(page.locator(".usage-card-grid > article")).toHaveCount(6);
  await expect(
    page.locator(".usage-card-grid .pokemon-sprite.is-loaded"),
  ).toHaveCount(6, { timeout: 20000 });
  await expect(page.locator(".win-rate-card")).toContainText("67%");
  await expect(page.locator(".win-rate-card")).toContainText("2/3");
  await page.screenshot({
    path: ".local/statistics-team-desktop.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Move usage", exact: true }).click();
  await expect(page.locator(".move-donut svg")).toHaveCount(6);
  const rillaboom = page.getByRole("article", { name: "Rillaboom move usage" });
  await rillaboom.getByRole("button", { name: /Fake Out/ }).click();
  await expect(
    rillaboom.getByRole("button", { name: /Fake Out/ }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.screenshot({
    path: ".local/statistics-moves-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 375, height: 812 });
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: ".local/statistics-moves-mobile.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Opponents", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Opposing Pokémon" }),
  ).toBeVisible();
  await expect(
    page.getByText("Your record when they brought it").first(),
  ).toBeVisible();
  await page.getByRole("button", { name: "Combinations", exact: true }).click();
  await expect(page.locator(".composition-card")).toHaveCount(2);
  await page
    .getByRole("button", { name: "Four-Pokémon selections", exact: true })
    .click();
  await expect(page.locator(".composition-card").first()).toBeVisible();
  await page.locator(".analysis-filters > summary").click();
  await page
    .getByRole("combobox", { name: "Result", exact: true })
    .selectOption("loss");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(page).toHaveURL(/result=loss/);
  await expect(page.locator(".win-rate-card")).toContainText("0/1");
  await page.setViewportSize({ width: 1440, height: 1050 });
  await page.getByRole("link", { name: "Replays", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Best of three · 2–1 · win" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Game 2", exact: true }).first().click();
  await expect(
    page.getByRole("heading", { name: "vs killerjc123" }),
  ).toBeVisible();
  await expect(page.getByText("Victory", { exact: true })).toBeVisible();
  await expect(
    page
      .locator(".turn-body > ul")
      .getByText("killerjc123 forfeited.", { exact: true }),
  ).toBeVisible();
  await expect(page.locator(".formation-panel")).toHaveCount(2);
  await expect(page.locator(".formation-slot.unrevealed")).toHaveCount(3);
  await expect(
    page.getByRole("heading", { name: "Damage by Pokémon" }),
  ).toBeVisible();
  await expect(page.locator(".replay-source:visible")).toHaveCount(0);
  await expect(page.getByLabel("Reason", { exact: true })).not.toBeVisible();
  await page.screenshot({
    path: ".local/game-review-desktop.png",
    fullPage: true,
  });
  const notes = page.locator(".battle-notes details");
  if ((await notes.getAttribute("open")) === null)
    await notes.locator("summary").click();
  await page
    .getByRole("textbox", { name: "Notes", exact: true })
    .fill("Review the turn-one Draco Meteor.");
  await page.getByRole("button", { name: "Save game note" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Note saved." }),
  ).toBeVisible();
  await page.reload();
  await expect(page.locator(".battle-notes .markdown-content")).toContainText(
    "Review the turn-one Draco Meteor.",
  );
  await page.setViewportSize({ width: 375, height: 812 });
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: ".local/game-review-mobile.png",
    fullPage: true,
  });
  await page.getByRole("link", { name: "Add replays", exact: true }).click();
  await expect(page.getByLabel("Replay URLs", { exact: true })).toBeVisible();
  await expect(page.locator(".game-list-row")).toHaveCount(3);
});
