import { v5 as uuid } from "uuid";
import { db } from "../src/db/client";
const stable = (value: string) =>
  uuid(value, "3f6d4f08-553c-4b9f-9972-dff1caf16bc9");
const slug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-");
export async function seedReplayCatalog() {
  for (const name of [
    "Gholdengo",
    "Raichu",
    "Arcanine",
    "Rillaboom",
    "Salamence",
  ])
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
    ["Raichu-Mega-Y", "Raichu"],
    ["Arcanine-Hisui", "Arcanine"],
    ["Salamence-Mega", "Salamence"],
  ])
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
  for (const [table, names] of [
    ["items", ["Grassy Seed", "Raichunite Y", "Miracle Seed", "Salamencite"]],
    [
      "abilities",
      [
        "Good as Gold",
        "Lightning Rod",
        "Rock Head",
        "Grassy Surge",
        "Aerilate",
        "Intimidate",
      ],
    ],
    ["natures", ["Jolly"]],
  ] as const)
    for (const name of names)
      await db
        .insertInto(table)
        .values({
          id: stable(`${table}:${name}`),
          canonical_slug: slug(name),
          display_name: name,
        })
        .onConflict((oc) => oc.column("id").doNothing())
        .execute();
  for (const [name, type] of [
    ["Make It Rain", "Steel"],
    ["Nasty Plot", "Dark"],
    ["Dire Claw", "Poison"],
    ["Rock Tomb", "Rock"],
    ["Zap Cannon", "Electric"],
    ["Focus Blast", "Fighting"],
    ["Flare Blitz", "Fire"],
    ["Head Smash", "Rock"],
    ["Extreme Speed", "Normal"],
    ["Grassy Glide", "Grass"],
    ["High Horsepower", "Ground"],
    ["U-turn", "Bug"],
    ["Hyper Voice", "Normal"],
    ["Draco Meteor", "Dragon"],
    ["Tailwind", "Flying"],
  ])
    await db
      .insertInto("moves")
      .values({
        id: stable(`moves:${name}`),
        canonical_slug: slug(name),
        display_name: name,
        type_id: stable(`type:${type}`),
      })
      .onConflict((oc) => oc.column("id").doNothing())
      .execute();
  await db
    .insertInto("rulesets")
    .values({
      id: stable("ruleset:gen9championsvgc2026regmc"),
      canonical_slug: "gen9championsvgc2026regmc",
      display_name: "Pokémon Champions VGC 2026 Regulation M-C (testing)",
      catalog_version_id: stable("catalog:champions-2026-testing"),
      team_size: 6,
      bring_size: 4,
      ev_max_per_stat: 32,
      ev_total: 66,
      state: "testing",
    })
    .onConflict((oc) => oc.column("id").doNothing())
    .execute();
}
