import { v7 as uuidv7 } from "uuid";
import { db } from "@/db/client";
import { AppError } from "@/lib/errors";
import { fetchPokepaste } from "./pokepaste";
import { parseShowdownTeam } from "./showdown-text";
import type { ParsedTeamDraft } from "./types";
import { validateParsedTeam } from "./validation";

type EntityMaps = {
  species: Map<string, string>;
  forms: Map<string, { id: string; speciesId: string }>;
  items: Map<string, string>;
  abilities: Map<string, string>;
  natures: Map<string, string>;
  moves: Map<string, string>;
};

async function catalogMaps(): Promise<EntityMaps> {
  const [species, forms, items, abilities, natures, moves] = await Promise.all([
    db.selectFrom("species").select(["id", "display_name"]).execute(),
    db
      .selectFrom("forms")
      .select(["id", "species_id", "display_name"])
      .execute(),
    db.selectFrom("items").select(["id", "display_name"]).execute(),
    db.selectFrom("abilities").select(["id", "display_name"]).execute(),
    db.selectFrom("natures").select(["id", "display_name"]).execute(),
    db.selectFrom("moves").select(["id", "display_name"]).execute(),
  ]);
  return {
    species: new Map(species.map((row) => [row.display_name, row.id])),
    forms: new Map(
      forms
        .filter(
          (row): row is typeof row & { species_id: string } =>
            row.species_id !== null,
        )
        .map((row) => [
          row.display_name,
          { id: row.id, speciesId: row.species_id },
        ]),
    ),
    items: new Map(items.map((row) => [row.display_name, row.id])),
    abilities: new Map(abilities.map((row) => [row.display_name, row.id])),
    natures: new Map(natures.map((row) => [row.display_name, row.id])),
    moves: new Map(moves.map((row) => [row.display_name, row.id])),
  };
}

export async function previewPokepaste(url: string): Promise<{
  paste: Awaited<ReturnType<typeof fetchPokepaste>>;
  draft: ParsedTeamDraft;
  issues: ReturnType<typeof validateParsedTeam>;
}> {
  const paste = await fetchPokepaste(url);
  const draft = parseShowdownTeam(paste.teamText);
  return { paste, draft, issues: validateParsedTeam(draft) };
}

export async function importPokepaste(
  userId: string,
  url: string,
): Promise<{ teamId: string; versionId: string }> {
  const { paste, draft, issues } = await previewPokepaste(url);
  if (issues.length)
    throw new AppError(
      "VALIDATION_FAILED",
      "The Poképaste has validation errors.",
      { paste: issues.map((issue) => issue.message) },
    );
  if (paste.formatId !== "gen9championsvgc2026regmb")
    throw new AppError(
      "VALIDATION_FAILED",
      "This testing slice supports only gen9championsvgc2026regmb.",
    );
  const [ruleset, catalog, existing] = await Promise.all([
    db
      .selectFrom("rulesets")
      .selectAll()
      .where("canonical_slug", "=", paste.formatId)
      .executeTakeFirst(),
    catalogMaps(),
    db
      .selectFrom("team_versions")
      .innerJoin("teams", "teams.id", "team_versions.team_id")
      .select(["teams.id as team_id", "team_versions.id as version_id"])
      .where("teams.user_id", "=", userId)
      .where("team_versions.source_url", "=", paste.canonicalUrl)
      .executeTakeFirst(),
  ]);
  if (existing)
    return { teamId: existing.team_id, versionId: existing.version_id };
  if (!ruleset)
    throw new AppError(
      "VALIDATION_FAILED",
      "The paste format is not available in the local catalog.",
    );
  const teamId = uuidv7();
  const versionId = uuidv7();
  await db.transaction().execute(async (trx) => {
    await trx
      .insertInto("teams")
      .values({
        id: teamId,
        user_id: userId,
        title: paste.title ?? "Imported team",
        description: null,
        status: "testing",
        archived_at: null,
        deleted_at: null,
        revision: 1,
      })
      .execute();
    await trx
      .insertInto("team_versions")
      .values({
        id: versionId,
        team_id: teamId,
        version_number: 1,
        ruleset_id: ruleset.id,
        catalog_version_id: ruleset.catalog_version_id,
        change_summary: "Imported from Poképaste",
        source_kind: "pokepaste",
        source_text: paste.teamText,
        source_url: paste.canonicalUrl,
        source_title: paste.title,
        source_author: paste.author,
        source_format_id: paste.formatId,
        sealed_at: null,
        revision: 1,
      })
      .execute();
    for (const slot of draft.slots) {
      const form = catalog.forms.get(slot.species);
      const speciesId = form?.speciesId ?? catalog.species.get(slot.species);
      const itemId = slot.item ? catalog.items.get(slot.item) : null;
      const abilityId = slot.ability
        ? catalog.abilities.get(slot.ability)
        : null;
      const natureId = slot.nature ? catalog.natures.get(slot.nature) : null;
      if (!speciesId || !abilityId || !natureId || !itemId)
        throw new AppError(
          "VALIDATION_FAILED",
          "The local catalog could not resolve a set.",
        );
      const slotIdentityId = uuidv7();
      const slotId = uuidv7();
      await trx
        .insertInto("slot_identities")
        .values({
          id: slotIdentityId,
          team_id: teamId,
          label: slot.nickname,
          retired_at: null,
        })
        .execute();
      await trx
        .insertInto("team_slots")
        .values({
          id: slotId,
          team_version_id: versionId,
          slot_identity_id: slotIdentityId,
          slot_number: slot.slotNumber,
          species_id: speciesId,
          form_id: form?.id ?? null,
          nickname: slot.nickname,
          gender: slot.gender,
          level: slot.level ?? 50,
          item_id: itemId,
          ability_id: abilityId,
          nature_id: natureId,
          is_shiny: slot.isShiny,
        })
        .execute();
      await trx
        .insertInto("team_slot_evs")
        .values({ team_slot_id: slotId, ...slot.evs })
        .execute();
      await trx
        .insertInto("team_slot_moves")
        .values(
          slot.moves.map((move, index) => ({
            team_slot_id: slotId,
            ordinal: index + 1,
            move_id: catalog.moves.get(move)!,
          })),
        )
        .execute();
    }
  });
  return { teamId, versionId };
}

export async function listTeams(userId: string) {
  return db
    .selectFrom("teams")
    .innerJoin("team_versions", "team_versions.team_id", "teams.id")
    .innerJoin("rulesets", "rulesets.id", "team_versions.ruleset_id")
    .select([
      "teams.id",
      "teams.title",
      "teams.status",
      "team_versions.id as version_id",
      "team_versions.version_number",
      "rulesets.display_name as ruleset_name",
    ])
    .where("teams.user_id", "=", userId)
    .where("teams.deleted_at", "is", null)
    .orderBy("teams.updated_at", "desc")
    .execute();
}

export async function getTeamDetail(userId: string, teamId: string) {
  const team = await db
    .selectFrom("teams")
    .innerJoin("team_versions", "team_versions.team_id", "teams.id")
    .innerJoin("rulesets", "rulesets.id", "team_versions.ruleset_id")
    .select([
      "teams.id",
      "teams.title",
      "teams.status",
      "team_versions.id as version_id",
      "team_versions.version_number",
      "team_versions.source_url",
      "team_versions.source_title",
      "team_versions.source_author",
      "rulesets.display_name as ruleset_name",
      "rulesets.ev_max_per_stat",
    ])
    .where("teams.id", "=", teamId)
    .where("teams.user_id", "=", userId)
    .where("teams.deleted_at", "is", null)
    .executeTakeFirst();
  if (!team) return null;
  const slots = await db
    .selectFrom("team_slots")
    .innerJoin("species", "species.id", "team_slots.species_id")
    .leftJoin("forms", "forms.id", "team_slots.form_id")
    .leftJoin("items", "items.id", "team_slots.item_id")
    .leftJoin("abilities", "abilities.id", "team_slots.ability_id")
    .leftJoin("natures", "natures.id", "team_slots.nature_id")
    .innerJoin("team_slot_evs", "team_slot_evs.team_slot_id", "team_slots.id")
    .select([
      "team_slots.id",
      "team_slots.slot_number",
      "team_slots.nickname",
      "team_slots.gender",
      "team_slots.level",
      "team_slots.is_shiny",
      "species.canonical_slug as species_slug",
      "species.display_name as species_name",
      "forms.canonical_slug as form_slug",
      "forms.display_name as form_name",
      "items.canonical_slug as item_slug",
      "items.display_name as item_name",
      "abilities.display_name as ability_name",
      "natures.display_name as nature_name",
      "team_slot_evs.hp",
      "team_slot_evs.atk",
      "team_slot_evs.def",
      "team_slot_evs.spa",
      "team_slot_evs.spd",
      "team_slot_evs.spe",
    ])
    .where("team_slots.team_version_id", "=", team.version_id)
    .orderBy("team_slots.slot_number")
    .execute();
  const moves = await db
    .selectFrom("team_slot_moves")
    .innerJoin("moves", "moves.id", "team_slot_moves.move_id")
    .leftJoin("types", "types.id", "moves.type_id")
    .select([
      "team_slot_moves.team_slot_id",
      "team_slot_moves.ordinal",
      "moves.display_name as name",
      "types.canonical_slug as type_slug",
      "types.display_name as type_name",
    ])
    .where(
      "team_slot_moves.team_slot_id",
      "in",
      slots.map((slot) => slot.id),
    )
    .orderBy("team_slot_moves.ordinal")
    .execute();
  return {
    ...team,
    slots: slots.map((slot) => ({
      ...slot,
      moves: moves
        .filter((move) => move.team_slot_id === slot.id)
        .map(({ name, type_name, type_slug }) => ({
          name,
          typeName: type_name,
          typeSlug: type_slug,
        })),
    })),
  };
}
