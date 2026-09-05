import { v5 as uuidv5 } from "uuid";
import { db } from "../src/db/client";
import { hashPassword } from "../src/modules/auth/passwords";
import { importPokepaste } from "../src/modules/teams/service";
import { readFile } from "node:fs/promises";

const namespace = "3f6d4f08-553c-4b9f-9972-dff1caf16bc9";
const stable = (name: string) => uuidv5(name, namespace);
const slug = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

async function ensureCatalog(): Promise<void> {
  const catalogId = stable("catalog:champions-2026-testing");
  await db
    .insertInto("catalog_versions")
    .values({
      id: catalogId,
      version_label: "champions-2026-testing",
      checksum: "fixture-6bbca2da7c6e2365",
      source_name: "local-fixture",
    })
    .onConflict((oc) => oc.column("id").doNothing())
    .execute();
  const species = [
    "Froslass",
    "Basculegion",
    "Kingambit",
    "Sneasler",
    "Lycanroc",
    "Scovillain",
  ];
  for (const name of species)
    await db
      .insertInto("species")
      .values({
        id: stable(`species:${name}`),
        canonical_slug: slug(name),
        display_name: name,
      })
      .onConflict((oc) => oc.column("id").doNothing())
      .execute();
  for (const [name, base] of [
    ["Froslass-Mega", "Froslass"],
    ["Lycanroc-Dusk", "Lycanroc"],
    ["Scovillain-Mega", "Scovillain"],
  ] as const)
    await db
      .insertInto("forms")
      .values({
        id: stable(`form:${name}`),
        species_id: stable(`species:${base}`),
        canonical_slug: slug(name),
        display_name: name,
      })
      .onConflict((oc) => oc.column("id").doNothing())
      .execute();
  for (const [table, values] of [
    [
      "items",
      [
        "Froslassite",
        "Sitrus Berry",
        "Life Orb",
        "White Herb",
        "Focus Sash",
        "Scovillainite",
      ],
    ],
    [
      "abilities",
      [
        "Cursed Body",
        "Adaptability",
        "Defiant",
        "Unburden",
        "Tough Claws",
        "Moody",
      ],
    ],
    ["natures", ["Timid", "Adamant", "Bold"]],
  ] as const) {
    for (const name of values)
      await db
        .insertInto(table)
        .values({
          id: stable(`${table}:${name}`),
          canonical_slug: slug(name),
          display_name: name,
        })
        .onConflict((oc) => oc.column("id").doNothing())
        .execute();
  }

  const typeNames = [
    "Bug",
    "Dark",
    "Dragon",
    "Electric",
    "Fairy",
    "Fighting",
    "Fire",
    "Flying",
    "Ghost",
    "Grass",
    "Ground",
    "Ice",
    "Normal",
    "Poison",
    "Psychic",
    "Rock",
    "Steel",
    "Stellar",
    "Water",
  ] as const;
  for (const name of typeNames)
    await db
      .insertInto("types")
      .values({
        id: stable(`type:${name}`),
        canonical_slug: slug(name),
        display_name: name,
      })
      .onConflict((oc) => oc.column("id").doNothing())
      .execute();

  const moves = [
    ["Blizzard", "Ice"],
    ["Shadow Ball", "Ghost"],
    ["Aurora Veil", "Ice"],
    ["Protect", "Normal"],
    ["Wave Crash", "Water"],
    ["Last Respects", "Ghost"],
    ["Aqua Jet", "Water"],
    ["Kowtow Cleave", "Dark"],
    ["Sucker Punch", "Dark"],
    ["Swords Dance", "Normal"],
    ["Close Combat", "Fighting"],
    ["Gunk Shot", "Poison"],
    ["Fake Out", "Normal"],
    ["Accelerock", "Rock"],
    ["Rock Slide", "Rock"],
    ["Giga Drain", "Grass"],
    ["Overheat", "Fire"],
    ["Rage Powder", "Bug"],
  ] as const;
  for (const [name, typeName] of moves)
    await db
      .insertInto("moves")
      .values({
        id: stable(`moves:${name}`),
        canonical_slug: slug(name),
        display_name: name,
        type_id: stable(`type:${typeName}`),
      })
      .onConflict((oc) =>
        oc.column("id").doUpdateSet({ type_id: stable(`type:${typeName}`) }),
      )
      .execute();
  await db
    .insertInto("rulesets")
    .values({
      id: stable("ruleset:gen9championsvgc2026regmb"),
      canonical_slug: "gen9championsvgc2026regmb",
      display_name: "Pokémon Champions VGC 2026 Regulation M-B (testing)",
      catalog_version_id: catalogId,
      team_size: 6,
      bring_size: 4,
      ev_max_per_stat: 32,
      ev_total: 66,
      state: "testing",
    })
    .onConflict((oc) => oc.column("id").doNothing())
    .execute();
}

async function main(): Promise<void> {
  await ensureCatalog();
  const email = "player-one@example.test";
  let user = await db
    .selectFrom("users")
    .selectAll()
    .where("email_normalized", "=", email)
    .executeTakeFirst();
  if (!user) {
    const id = stable(`user:${email}`);
    await db
      .insertInto("users")
      .values({
        id,
        email_normalized: email,
        password_hash: await hashPassword("correct-horse-battery-staple"),
        display_name: "Player One",
        account_state: "active",
        deleted_at: null,
      })
      .execute();
    user = await db
      .selectFrom("users")
      .selectAll()
      .where("id", "=", id)
      .executeTakeFirstOrThrow();
  }
  const manifest = await readFile("teams.txt", "utf8");
  for (const line of manifest
    .split(/\r?\n/)
    .map((value) => value.trim())
    .filter((value) => value && !value.startsWith("#")))
    await importPokepaste(user.id, line);
  console.log("Seeded player-one@example.test / correct-horse-battery-staple");
}

main().finally(() => db.destroy());
