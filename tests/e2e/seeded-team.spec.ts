import { expect, type Page, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

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

test("user can import Showdown text and manage its lifecycle", async ({
  page,
}) => {
  const source = await readFile(
    "src/modules/teams/fixtures/6bbca2da7c6e2365.txt",
    "utf8",
  );
  await page.goto("/login");
  await page.getByLabel("Email").fill("player-one@example.test");
  await page.getByLabel("Password").fill("correct-horse-battery-staple");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.getByRole("link", { name: "Import team" }).first().click();
  await page.getByLabel("Pokémon Showdown export text").fill(source);
  await page.getByRole("button", { name: "Preview team" }).click();
  await expect(page.getByText("Ready to save.")).toBeVisible();
  await page.getByLabel("Title").fill("E2E import team");
  await page.getByLabel(/Tags/).fill("browser, phase one");
  await page.getByRole("button", { name: "Save team" }).click();
  await expect(
    page.getByRole("heading", { name: "E2E import team" }),
  ).toBeVisible();

  await page.getByLabel("Description").fill("Managed in the browser");
  await page.getByRole("button", { name: "Save details" }).click();
  await expect(page.getByText("Team details saved.")).toBeVisible();
  await page.getByLabel("New note").fill("**Lead plan**\n- Protect");
  await page.getByRole("button", { name: "Add note" }).click();
  await page.reload();
  await expect(page.getByText("Lead plan", { exact: true })).toBeVisible();

  await page
    .getByLabel("Updated Showdown text")
    .fill(source.replace("Froslassite", "Focus Sash"));
  await page.getByRole("button", { name: "Preview revision" }).click();
  await expect(page.getByText(/Slot 1 item/)).toBeVisible();
  await page.getByLabel("Change summary").fill("Browser item change");
  await page.getByRole("button", { name: "Save revision" }).click();
  await expect(page.getByText("Version 2", { exact: false })).toBeVisible();
  await expect(page.getByRole("link", { name: "v1" })).toBeVisible();

  await page.getByRole("button", { name: "Archive team" }).click();
  await expect(
    page.getByRole("button", { name: "Restore team" }),
  ).toBeVisible();
});

test("new user can create a team from a Poképaste URL", async ({ page }) => {
  const email = `pokepaste-browser-${Date.now()}@example.test`;
  await page.goto("/register");
  await page.getByLabel("Display name").fill("Poképaste Browser");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel(/Password/).fill("browser-test-password");
  await page.getByRole("button", { name: "Create account" }).click();
  await page.getByRole("link", { name: "Import team" }).first().click();
  await page.getByLabel("Poképaste URL", { exact: true }).check();
  await page
    .getByLabel("Poképaste URL", { exact: true })
    .last()
    .fill("https://pokepast.es/6bbca2da7c6e2365");
  await page.getByRole("button", { name: "Preview team" }).click();
  await expect(page.getByText("Ready to save.")).toBeVisible();
  await page.getByRole("button", { name: "Save team" }).click();
  await expect(
    page.getByRole("heading", { name: "DuskLass reg m-b life orb" }),
  ).toBeVisible();
});
