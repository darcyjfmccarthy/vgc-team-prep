import { v5 as uuidv5 } from "uuid";
import { db } from "../src/db/client";
import { hashPassword } from "../src/modules/auth/passwords";
import {
  getTeamDetail,
  importPokepaste,
  listTeamVersions,
  saveTeamRevision,
  setTeamArchived,
  updateTeamMetadata,
} from "../src/modules/teams/service";
import { listNotes, saveNote } from "../src/modules/notes/service";
import { readFile } from "node:fs/promises";
import { seedReplayCatalog } from "./seed-replay-catalog";
import { PARSER_VERSION } from "../src/modules/replays/parser";
import {
  listReplayRecords,
  processReplay,
  submitReplays,
} from "../src/modules/replays/service";

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
  await seedReplayCatalog();
  const users = [];
  for (const [email, displayName] of [
    ["player-one@example.test", "Player One"],
    ["player-two@example.test", "Player Two"],
  ] as const) {
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
          display_name: displayName,
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
    users.push(user);
  }
  const manifest = `https://pokepast.es/6bbca2da7c6e2365\n${await readFile("teams.txt", "utf8")}`;
  for (const line of manifest
    .split(/\r?\n/)
    .map((value) => value.trim())
    .filter((value) => value && !value.startsWith("#"))) {
    const playerOneTeam = await importPokepaste(users[0]!.id, line);
    const detail = await getTeamDetail(users[0]!.id, playerOneTeam.teamId);
    if (detail && detail.tags.length === 0)
      await updateTeamMetadata(users[0]!.id, playerOneTeam.teamId, {
        title: detail.title,
        description: "Seeded versioned team",
        status: "testing",
        tags: ["seeded", detail.ruleset_slug],
        expectedRevision: detail.team_revision,
      });
    if (!(await listNotes(users[0]!.id, "team", playerOneTeam.teamId)).length)
      await saveNote(users[0]!.id, {
        subjectType: "team",
        subjectId: playerOneTeam.teamId,
        markdown: "**Practice focus**\n- Review lead options",
      });
    if (
      (await listTeamVersions(users[0]!.id, playerOneTeam.teamId)).length ===
        1 &&
      detail?.source_text?.includes("Froslassite")
    )
      await saveTeamRevision(users[0]!.id, playerOneTeam.teamId, {
        kind: "showdown_text",
        value: detail.source_text.replace("Froslassite", "Focus Sash"),
        mode: "create_version",
        expectedRevision: detail.version_revision,
        changeSummary: "Seeded item adjustment",
      });
    const playerTwoTeam = await importPokepaste(users[1]!.id, line, {
      title: "Archived practice team",
    });
    const playerTwoDetail = await getTeamDetail(
      users[1]!.id,
      playerTwoTeam.teamId,
    );
    if (playerTwoDetail?.status !== "archived")
      await setTeamArchived(users[1]!.id, playerTwoTeam.teamId, true);
    if (line === "https://pokepast.es/58cbd5a41861cdc2") {
      const before = await listReplayRecords(
        users[0]!.id,
        playerOneTeam.teamId,
      );
      if (!before.length)
        await submitReplays(users[0]!.id, {
          teamId: playerOneTeam.teamId,
          versionId: playerOneTeam.versionId,
          urls: await readFile("games.txt", "utf8"),
        });
      for (const game of await listReplayRecords(
        users[0]!.id,
        playerOneTeam.teamId,
      )) {
        if (
          game.status !== "succeeded" ||
          game.parser_version !== PARSER_VERSION
        ) {
          await processReplay(users[0]!.id, game.id);
          await db
            .updateTable("jobs")
            .set({ status: "succeeded", completed_at: new Date() })
            .where("user_id", "=", users[0]!.id)
            .where("subject_id", "=", game.id)
            .where("kind", "=", "replay.import")
            .where("status", "=", "available")
            .execute();
        }
      }
    }
  }
  console.log(
    "Seeded player-one@example.test and player-two@example.test / correct-horse-battery-staple",
  );
}

main().finally(() => db.destroy());
