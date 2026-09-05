import { expect, type Page, test } from "@playwright/test";

async function openSeededTeam(page: Page): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Email").fill("player-one@example.test");
  await page.getByLabel("Password").fill("correct-horse-battery-staple");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Your teams" })).toBeVisible();
  await page.getByRole("link", { name: /DuskLass reg m-b life orb/ }).click();
}

test("seeded user can view the visual Pokémon team", async ({ page }) => {
  await openSeededTeam(page);

  await expect(
    page.getByRole("heading", { name: "DuskLass reg m-b life orb" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /Froslass-Mega/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /Scovillain-Mega/ }),
  ).toBeVisible();
  await expect(page.locator(".set-card")).toHaveCount(6);
  await expect(page.getByTestId("pokemon-art")).toHaveCount(6);
  await expect(page.getByTestId("item-treatment")).toHaveCount(6);
  await expect(page.locator(".move-pill")).toHaveCount(24);
  await expect(
    page.locator('.move-pill[data-type="ice"]').first(),
  ).toContainText("Ice");
  await expect(page.getByText("✦ Shiny", { exact: true })).toHaveCount(1);
  await expect(page.getByLabel("HP: 25 of 32")).toBeVisible();
  await expect(page.getByLabel("Timid nature increases Spe")).toBeVisible();
  await expect(page.getByLabel("Timid nature decreases Atk")).toBeVisible();
  await expect(page.getByText("Sprites provided by")).toBeVisible();
});

test("team cards stack without horizontal overflow on mobile", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await openSeededTeam(page);

  await expect(page.locator(".set-card")).toHaveCount(6);
  const hasHorizontalOverflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth >
      document.documentElement.clientWidth,
  );
  expect(hasHorizontalOverflow).toBe(false);
});
