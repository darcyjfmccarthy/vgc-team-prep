import { expect, type Page, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

async function openSeededTeam(page: Page): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Email").fill("player-one@example.test");
  await page.getByLabel("Password").fill("correct-horse-battery-staple");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(
    page.getByRole("heading", { name: "Choose a team. Prepare with context." }),
  ).toBeVisible();
  await page.goto("/teams");
  await page.getByRole("link", { name: /DuskLass reg m-b life orb/ }).click();
}

test("seeded user can view the visual Pokémon team", async ({ page }) => {
  await openSeededTeam(page);

  await expect(
    page.getByRole("heading", { name: "DuskLass reg m-b life orb" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Preparation at a glance" }),
  ).toBeVisible();
  const primaryNavigation = page.getByRole("navigation", {
    name: "Primary navigation",
  });
  await expect(primaryNavigation.getByRole("link")).toHaveCount(4);
  await expect(
    primaryNavigation.getByRole("link", { name: "Knowledge" }),
  ).toBeVisible();
  await expect(
    primaryNavigation.getByRole("link", { name: "Replays" }),
  ).toHaveCount(0);
  const teamNavigation = page.getByRole("navigation", {
    name: "Team workspace",
  });
  await expect(
    teamNavigation.getByRole("link", { name: "Statistics" }),
  ).toBeVisible();
  await expect(
    teamNavigation.getByRole("link", { name: "Calculator" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Roster", exact: true }).click();
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
  await page.getByRole("link", { name: "Roster", exact: true }).click();

  await expect(page.locator(".set-card")).toHaveCount(6);
  const hasHorizontalOverflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth >
      document.documentElement.clientWidth,
  );
  expect(hasHorizontalOverflow).toBe(false);
});

test("team calculator prefills sets and evaluates both perspectives", async ({
  page,
}) => {
  await openSeededTeam(page);
  await page.getByRole("link", { name: "Calculator" }).click();

  await expect(
    page.getByRole("heading", { name: "Damage calculator" }),
  ).toBeVisible();
  const roster = page.getByRole("complementary", { name: "Team attackers" });
  await expect(roster.getByRole("button")).toHaveCount(6);
  await expect(
    roster.getByRole("button", { name: "Use Froslass-Mega as attacker" }),
  ).toHaveAttribute("aria-pressed", "true");

  const attacker = page.getByRole("region", { name: "Attacker" });
  const defender = page.getByRole("region", { name: "Defender" });
  await expect(attacker.getByLabel("Pokémon or form")).toHaveValue(
    "Froslass-Mega",
  );
  await defender.getByLabel("Pokémon or form").fill("Garchomp");
  await defender.getByLabel("Move 1").fill("Earthquake");

  const result = page.getByRole("region", { name: "Result" });
  await expect(result.getByText("approximate", { exact: true })).toBeVisible();
  await expect(result.locator(".damage-range")).toContainText("HP");
  await expect(result.getByText(/@smogon\/calc 0\.11\.0/)).toBeAttached();

  await page
    .getByRole("combobox", { name: "Version", exact: true })
    .selectOption({ label: "v1" });
  await expect(page.locator(".calculator-version")).toHaveText("v1");
  await expect(attacker.getByLabel("Item")).toHaveValue("Froslassite");
  await defender.getByLabel("Pokémon or form").fill("Garchomp");
  await defender.getByLabel("Move 1").fill("Earthquake");

  await roster
    .getByRole("button", { name: "Use Basculegion as attacker" })
    .click();
  await expect(attacker.getByLabel("Pokémon or form")).toHaveValue(
    "Basculegion",
  );
  await expect(page.getByLabel("Attacking move")).toHaveValue("Wave Crash");
  await expect(result.getByText("verified", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Swap sides" }).click();
  await expect(attacker.getByLabel("Pokémon or form")).toHaveValue("Garchomp");
  await expect(page.getByLabel("Attacking move")).toHaveValue("Earthquake");
  await expect(result.locator(".damage-range")).toContainText("HP");
});

test("calculator roster remains contained on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await openSeededTeam(page);
  await page.getByRole("link", { name: "Calculator" }).click();
  await expect(
    page
      .getByRole("complementary", { name: "Team attackers" })
      .getByRole("button"),
  ).toHaveCount(6);
  const hasHorizontalOverflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth >
      document.documentElement.clientWidth,
  );
  expect(hasHorizontalOverflow).toBe(false);
});

test("calculator evaluation route requires authentication", async ({
  page,
}) => {
  const response = await page.request.post("/api/v1/damage/evaluate", {
    data: {},
  });
  expect(response.status()).toBe(401);
  await expect(response.json()).resolves.toMatchObject({
    ok: false,
    code: "UNAUTHENTICATED",
  });
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
  await expect(
    page.getByRole("heading", { name: "Choose a team. Prepare with context." }),
  ).toBeVisible();
  await page.goto("/teams/import");
  await page.getByLabel("Pokémon Showdown export text").fill(source);
  await page.getByRole("button", { name: "Preview team" }).click();
  await expect(page.getByText("Ready to save.")).toBeVisible();
  await page.getByLabel("Title").fill("E2E import team");
  await page.getByLabel(/Tags/).fill("browser, phase one");
  await page.getByRole("button", { name: "Save team" }).click();
  await expect(
    page.getByRole("heading", { name: "E2E import team" }),
  ).toBeVisible();

  await page.getByRole("link", { name: "Team settings" }).click();

  await page.getByLabel("Description").fill("Managed in the browser");
  await page.getByRole("button", { name: "Save details" }).click();
  await expect(page.getByText("Team details saved.")).toBeVisible();
  await page.getByRole("link", { name: "Notes" }).click();
  await page.getByLabel("New note").fill("**Lead plan**\n- Protect");
  await page.getByRole("button", { name: "Add note" }).click();
  await page.reload();
  await expect(page.getByText("Lead plan", { exact: true })).toBeVisible();

  await page.getByRole("link", { name: "Team settings" }).click();

  await page
    .getByLabel("Updated Showdown text")
    .fill(source.replace("Froslassite", "Focus Sash"));
  await page.getByRole("button", { name: "Preview revision" }).click();
  await expect(page.getByText(/Slot 1 item/)).toBeVisible();
  await page.getByLabel("Change summary").fill("Browser item change");
  await page.getByRole("button", { name: "Save revision" }).click();
  await expect(
    page
      .getByRole("combobox", { name: "Version", exact: true })
      .locator("option:checked"),
  ).toHaveText(/v2.*latest/);
  await page.getByRole("link", { name: "Team settings" }).click();
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
  await expect(
    page.getByRole("heading", { name: "Choose a team. Prepare with context." }),
  ).toBeVisible();
  await page.goto("/teams/import");
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
