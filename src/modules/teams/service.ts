import { v7 as uuidv7 } from "uuid";
import type { Kysely, Transaction } from "kysely";
import { db } from "@/db/client";
import type { Database } from "@/db/types";
import { AppError } from "@/lib/errors";
import { fetchPokepaste } from "./pokepaste";
import { parseShowdownTeam } from "./showdown-text";
import type {
  CatalogNames,
  ParsedTeamDraft,
  TeamImportDraft,
  TeamMetadataInput,
  TeamStatus,
  VersionSaveMode,
  VersionSavePreview,
} from "./types";
import { validateParsedTeam } from "./validation";
import { semanticTeamDiff } from "./versioning";

const DEFAULT_RULESET = "gen9championsvgc2026regmb";
type Executor = Kysely<Database> | Transaction<Database>;

type EntityMaps = {
  species: Map<string, string>;
  forms: Map<string, { id: string; speciesId: string }>;
  items: Map<string, string>;
  abilities: Map<string, string>;
  natures: Map<string, string>;
  moves: Map<string, string>;
};

function cleanTags(tags: string[]): string[] {
  return [
    ...new Map(
      tags
        .map((tag) => tag.trim())
        .filter(Boolean)
        .slice(0, 20)
        .map((tag) => [tag.toLocaleLowerCase(), tag]),
    ).values(),
  ];
}

function validateMetadata(input: TeamMetadataInput): TeamMetadataInput {
  const title = input.title.trim();
  const description = input.description.trim();
  if (!title || title.length > 120)
    throw new AppError("VALIDATION_FAILED", "Team metadata needs attention.", {
      title: ["Enter a title of 120 characters or fewer."],
    });
  if (description.length > 2_000)
    throw new AppError("VALIDATION_FAILED", "Team metadata needs attention.", {
      description: ["Description must be 2,000 characters or fewer."],
    });
  if (!(["active", "testing", "archived"] as string[]).includes(input.status))
    throw new AppError("VALIDATION_FAILED", "Choose a valid team status.");
  return { ...input, title, description, tags: cleanTags(input.tags) };
}

async function catalogMaps(executor: Executor = db): Promise<EntityMaps> {
  const [species, forms, items, abilities, natures, moves] = await Promise.all([
    executor.selectFrom("species").select(["id", "display_name"]).execute(),
    executor
      .selectFrom("forms")
      .select(["id", "species_id", "display_name"])
      .execute(),
    executor.selectFrom("items").select(["id", "display_name"]).execute(),
    executor.selectFrom("abilities").select(["id", "display_name"]).execute(),
    executor.selectFrom("natures").select(["id", "display_name"]).execute(),
    executor.selectFrom("moves").select(["id", "display_name"]).execute(),
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

async function prepareText(
  sourceText: string,
  source: Omit<
    TeamImportDraft,
    "sourceText" | "draft" | "issues" | "rulesetId" | "rulesetName"
  >,
): Promise<TeamImportDraft> {
  const ruleset = await db
    .selectFrom("rulesets")
    .selectAll()
    .where("canonical_slug", "=", source.sourceFormatId)
    .where("state", "in", ["active", "testing"])
    .executeTakeFirst();
  if (!ruleset)
    throw new AppError(
      "VALIDATION_FAILED",
      "That format is not available in the local catalog.",
    );
  const maps = await catalogMaps();
  const catalog: CatalogNames = {
    species: new Set([...maps.species.keys(), ...maps.forms.keys()]),
    items: new Set(maps.items.keys()),
    abilities: new Set(maps.abilities.keys()),
    natures: new Set(maps.natures.keys()),
    moves: new Set(maps.moves.keys()),
    teamSize: ruleset.team_size,
    evMaxPerStat: ruleset.ev_max_per_stat,
    evTotal: ruleset.ev_total,
  };
  const draft = parseShowdownTeam(sourceText);
  return {
    ...source,
    sourceText,
    rulesetId: ruleset.id,
    rulesetName: ruleset.display_name,
    draft,
    issues: validateParsedTeam(draft, catalog),
  };
}

export async function previewShowdownText(
  sourceText: string,
  rulesetSlug = DEFAULT_RULESET,
): Promise<TeamImportDraft> {
  if (!sourceText.trim())
    throw new AppError(
      "VALIDATION_FAILED",
      "Paste a Showdown team before previewing.",
      { sourceText: ["Showdown text is required."] },
    );
  return prepareText(sourceText, {
    sourceKind: "showdown_text",
    sourceUrl: null,
    sourceTitle: null,
    sourceAuthor: null,
    sourceFormatId: rulesetSlug,
  });
}

export async function previewPokepaste(url: string): Promise<TeamImportDraft> {
  const paste = await fetchPokepaste(url);
  if (!paste.formatId)
    throw new AppError(
      "VALIDATION_FAILED",
      "The Poképaste does not identify a supported format.",
    );
  return prepareText(paste.teamText, {
    sourceKind: "pokepaste",
    sourceUrl: paste.canonicalUrl,
    sourceTitle: paste.title,
    sourceAuthor: paste.author,
    sourceFormatId: paste.formatId,
  });
}

async function replaceTags(
  executor: Executor,
  userId: string,
  teamId: string,
  tags: string[],
): Promise<void> {
  await executor
    .deleteFrom("tag_assignments")
    .where("user_id", "=", userId)
    .where("subject_type", "=", "team")
    .where("subject_id", "=", teamId)
    .execute();
  for (const label of cleanTags(tags)) {
    const normalized = label.toLocaleLowerCase();
    const id = uuidv7();
    await executor
      .insertInto("tags")
      .values({
        id,
        user_id: userId,
        label,
        label_normalized: normalized,
        color: null,
      })
      .onConflict((oc) =>
        oc
          .columns(["user_id", "label_normalized"])
          .doUpdateSet({ label, updated_at: new Date() }),
      )
      .execute();
    const tag = await executor
      .selectFrom("tags")
      .select("id")
      .where("user_id", "=", userId)
      .where("label_normalized", "=", normalized)
      .executeTakeFirstOrThrow();
    await executor
      .insertInto("tag_assignments")
      .values({
        tag_id: tag.id,
        user_id: userId,
        subject_type: "team",
        subject_id: teamId,
      })
      .onConflict((oc) => oc.doNothing())
      .execute();
  }
}

async function insertSlots(
  executor: Executor,
  teamId: string,
  versionId: string,
  draft: ParsedTeamDraft,
  identities?: Map<number, string>,
): Promise<void> {
  const catalog = await catalogMaps(executor);
  for (const slot of draft.slots) {
    const form = catalog.forms.get(slot.species);
    const speciesId = form?.speciesId ?? catalog.species.get(slot.species);
    const itemId = slot.item ? catalog.items.get(slot.item) : null;
    const abilityId = slot.ability ? catalog.abilities.get(slot.ability) : null;
    const natureId = slot.nature ? catalog.natures.get(slot.nature) : null;
    if (!speciesId || !abilityId || !natureId || !itemId)
      throw new AppError(
        "VALIDATION_FAILED",
        "The local catalog could not resolve a set.",
      );
    let slotIdentityId = identities?.get(slot.slotNumber);
    if (!slotIdentityId) {
      slotIdentityId = uuidv7();
      await executor
        .insertInto("slot_identities")
        .values({
          id: slotIdentityId,
          team_id: teamId,
          label: slot.nickname,
          retired_at: null,
        })
        .execute();
    }
    const slotId = uuidv7();
    await executor
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
    await executor
      .insertInto("team_slot_evs")
      .values({ team_slot_id: slotId, ...slot.evs })
      .execute();
    await executor
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
}

async function createTeam(
  userId: string,
  prepared: TeamImportDraft,
  metadata?: Partial<TeamMetadataInput>,
): Promise<{ teamId: string; versionId: string }> {
  if (prepared.issues.length)
    throw new AppError("VALIDATION_FAILED", "The team has validation errors.", {
      source: prepared.issues.map((issue) => issue.message),
    });
  const values = validateMetadata({
    title: metadata?.title ?? prepared.sourceTitle ?? "Imported team",
    description: metadata?.description ?? "",
    status: metadata?.status ?? "testing",
    tags: metadata?.tags ?? [],
  });
  const teamId = uuidv7();
  const versionId = uuidv7();
  await db.transaction().execute(async (trx) => {
    await trx
      .insertInto("teams")
      .values({
        id: teamId,
        user_id: userId,
        title: values.title,
        description: values.description || null,
        status: values.status,
        archived_at: values.status === "archived" ? new Date() : null,
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
        ruleset_id: prepared.rulesetId,
        catalog_version_id: (
          await trx
            .selectFrom("rulesets")
            .select("catalog_version_id")
            .where("id", "=", prepared.rulesetId)
            .executeTakeFirstOrThrow()
        ).catalog_version_id,
        change_summary:
          prepared.sourceKind === "pokepaste"
            ? "Imported from Poképaste"
            : "Imported from Showdown text",
        source_kind: prepared.sourceKind,
        source_text: prepared.sourceText,
        source_url: prepared.sourceUrl,
        source_title: prepared.sourceTitle,
        source_author: prepared.sourceAuthor,
        source_format_id: prepared.sourceFormatId,
        sealed_at: null,
        revision: 1,
      })
      .execute();
    await insertSlots(trx, teamId, versionId, prepared.draft);
    await replaceTags(trx, userId, teamId, values.tags);
  });
  return { teamId, versionId };
}

export async function importShowdownText(
  userId: string,
  sourceText: string,
  metadata?: Partial<TeamMetadataInput>,
) {
  return createTeam(userId, await previewShowdownText(sourceText), metadata);
}

export async function importPokepaste(
  userId: string,
  url: string,
  metadata?: Partial<TeamMetadataInput>,
): Promise<{ teamId: string; versionId: string }> {
  const prepared = await previewPokepaste(url);
  const existing = await db
    .selectFrom("team_versions")
    .innerJoin("teams", "teams.id", "team_versions.team_id")
    .select(["teams.id as team_id", "team_versions.id as version_id"])
    .where("teams.user_id", "=", userId)
    .where("team_versions.source_url", "=", prepared.sourceUrl)
    .executeTakeFirst();
  return existing
    ? { teamId: existing.team_id, versionId: existing.version_id }
    : createTeam(userId, prepared, metadata);
}

export async function listTeams(userId: string, status?: TeamStatus) {
  let query = db
    .selectFrom("teams")
    .innerJoin("team_versions", (join) =>
      join
        .onRef("team_versions.team_id", "=", "teams.id")
        .on("team_versions.version_number", "=", (eb) =>
          eb
            .selectFrom("team_versions as latest")
            .select((inner) =>
              inner.fn.max("latest.version_number").as("max_version"),
            )
            .whereRef("latest.team_id", "=", "teams.id"),
        ),
    )
    .innerJoin("rulesets", "rulesets.id", "team_versions.ruleset_id")
    .select([
      "teams.id",
      "teams.title",
      "teams.description",
      "teams.status",
      "teams.created_at",
      "teams.revision",
      "team_versions.id as version_id",
      "team_versions.version_number",
      "rulesets.display_name as ruleset_name",
    ])
    .where("teams.user_id", "=", userId)
    .where("teams.deleted_at", "is", null);
  if (status) query = query.where("teams.status", "=", status);
  const teams = await query.orderBy("teams.updated_at", "desc").execute();
  const assignments = teams.length
    ? await db
        .selectFrom("tag_assignments")
        .innerJoin("tags", "tags.id", "tag_assignments.tag_id")
        .select(["tag_assignments.subject_id", "tags.label"])
        .where("tag_assignments.user_id", "=", userId)
        .where(
          "tag_assignments.subject_id",
          "in",
          teams.map((team) => team.id),
        )
        .execute()
    : [];
  return teams.map((team) => ({
    ...team,
    tags: assignments
      .filter((tag) => tag.subject_id === team.id)
      .map((tag) => tag.label),
  }));
}

export async function listTeamVersions(userId: string, teamId: string) {
  return db
    .selectFrom("team_versions")
    .innerJoin("teams", "teams.id", "team_versions.team_id")
    .select([
      "team_versions.id",
      "team_versions.version_number",
      "team_versions.change_summary",
      "team_versions.source_kind",
      "team_versions.created_at",
      "team_versions.sealed_at",
      "team_versions.revision",
    ])
    .where("teams.user_id", "=", userId)
    .where("teams.id", "=", teamId)
    .orderBy("team_versions.version_number", "desc")
    .execute();
}

export async function getTeamDetail(
  userId: string,
  teamId: string,
  versionId?: string,
) {
  let query = db
    .selectFrom("teams")
    .innerJoin("team_versions", "team_versions.team_id", "teams.id")
    .innerJoin("rulesets", "rulesets.id", "team_versions.ruleset_id")
    .select([
      "teams.id",
      "teams.title",
      "teams.description",
      "teams.status",
      "teams.created_at",
      "teams.revision as team_revision",
      "team_versions.id as version_id",
      "team_versions.version_number",
      "team_versions.source_kind",
      "team_versions.source_text",
      "team_versions.source_url",
      "team_versions.source_title",
      "team_versions.source_author",
      "team_versions.source_format_id",
      "team_versions.change_summary",
      "team_versions.created_at as version_created_at",
      "team_versions.sealed_at",
      "team_versions.revision as version_revision",
      "rulesets.id as ruleset_id",
      "rulesets.display_name as ruleset_name",
      "rulesets.ev_max_per_stat",
    ])
    .where("teams.id", "=", teamId)
    .where("teams.user_id", "=", userId)
    .where("teams.deleted_at", "is", null);
  query = versionId
    ? query.where("team_versions.id", "=", versionId)
    : query.orderBy("team_versions.version_number", "desc").limit(1);
  const team = await query.executeTakeFirst();
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
      "team_slots.slot_identity_id",
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
      "natures.canonical_slug as nature_slug",
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
  const moves = slots.length
    ? await db
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
        .execute()
    : [];
  const tags = await db
    .selectFrom("tag_assignments")
    .innerJoin("tags", "tags.id", "tag_assignments.tag_id")
    .select("tags.label")
    .where("tag_assignments.user_id", "=", userId)
    .where("tag_assignments.subject_type", "=", "team")
    .where("tag_assignments.subject_id", "=", teamId)
    .orderBy("tags.label")
    .execute();
  return {
    ...team,
    tags: tags.map((tag) => tag.label),
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

function detailAsDraft(
  detail: NonNullable<Awaited<ReturnType<typeof getTeamDetail>>>,
): ParsedTeamDraft {
  return {
    rawText: detail.source_text ?? "",
    errors: [],
    warnings: [],
    slots: detail.slots.map((slot) => ({
      slotNumber: slot.slot_number,
      species: slot.form_name ?? slot.species_name,
      nickname: slot.nickname,
      gender: slot.gender as "M" | "F" | null,
      item: slot.item_name,
      ability: slot.ability_name,
      level: slot.level,
      isShiny: slot.is_shiny,
      nature: slot.nature_name,
      evs: {
        hp: slot.hp,
        atk: slot.atk,
        def: slot.def,
        spa: slot.spa,
        spd: slot.spd,
        spe: slot.spe,
      },
      moves: slot.moves.map((move) => move.name),
      unsupportedLines: [],
      startLine: 0,
    })),
  };
}

export async function previewTeamRevision(
  userId: string,
  teamId: string,
  input:
    | { kind: "showdown_text"; value: string }
    | { kind: "pokepaste"; value: string },
): Promise<VersionSavePreview> {
  const current = await getTeamDetail(userId, teamId);
  if (!current) throw new AppError("NOT_FOUND", "Team not found.");
  const prepared =
    input.kind === "pokepaste"
      ? await previewPokepaste(input.value)
      : await previewShowdownText(
          input.value,
          current.source_format_id ?? DEFAULT_RULESET,
        );
  const mappings = prepared.draft.slots.map((slot, index) => {
    const previous = current.slots[index];
    const same =
      previous &&
      (previous.form_name ?? previous.species_name) === slot.species;
    return {
      slotNumber: slot.slotNumber,
      slotIdentityId: same ? previous.slot_identity_id : null,
      preserved: Boolean(same),
      reason: same
        ? "Species and form are unchanged."
        : "Species or form changed; a new slot identity will be created.",
    };
  });
  return {
    teamId,
    currentVersionId: current.version_id,
    currentVersionNumber: current.version_number,
    expectedRevision: current.version_revision,
    replaceEligible: current.sealed_at === null,
    diff: semanticTeamDiff(detailAsDraft(current), prepared.draft),
    slotMappings: mappings,
    importDraft: prepared,
  };
}

export async function saveTeamRevision(
  userId: string,
  teamId: string,
  input: {
    kind: "showdown_text" | "pokepaste";
    value: string;
    mode: VersionSaveMode;
    expectedRevision: number;
    changeSummary: string;
  },
) {
  const preview = await previewTeamRevision(
    userId,
    teamId,
    input.kind === "pokepaste"
      ? { kind: "pokepaste", value: input.value }
      : { kind: "showdown_text", value: input.value },
  );
  if (preview.importDraft.issues.length)
    throw new AppError(
      "VALIDATION_FAILED",
      "The revised team has validation errors.",
      { source: preview.importDraft.issues.map((issue) => issue.message) },
    );
  if (!preview.diff.length)
    throw new AppError(
      "VALIDATION_FAILED",
      "The submitted team has no changes.",
    );
  if (input.expectedRevision !== preview.expectedRevision)
    throw new AppError(
      "REVISION_CONFLICT",
      "This version changed in another session. Refresh and try again.",
    );
  if (input.mode === "replace_draft" && !preview.replaceEligible)
    throw new AppError(
      "VALIDATION_FAILED",
      "This version is sealed and must be followed by a new version.",
    );
  const summary = input.changeSummary.trim();
  if (summary.length > 500)
    throw new AppError(
      "VALIDATION_FAILED",
      "Change summary must be 500 characters or fewer.",
    );
  return db.transaction().execute(async (trx) => {
    const ownedTeam = await trx
      .selectFrom("teams")
      .select("id")
      .where("id", "=", teamId)
      .where("user_id", "=", userId)
      .forUpdate()
      .executeTakeFirst();
    if (!ownedTeam) throw new AppError("NOT_FOUND", "Team not found.");
    const locked = await trx
      .selectFrom("team_versions")
      .select([
        "team_versions.id",
        "team_versions.revision",
        "team_versions.sealed_at",
        "team_versions.version_number",
      ])
      .where("team_versions.team_id", "=", teamId)
      .orderBy("team_versions.version_number", "desc")
      .limit(1)
      .forUpdate()
      .executeTakeFirst();
    if (
      !locked ||
      locked.id !== preview.currentVersionId ||
      locked.revision !== input.expectedRevision
    )
      throw new AppError(
        "REVISION_CONFLICT",
        "This version changed in another session. Refresh and try again.",
      );
    const identities = new Map(
      preview.slotMappings
        .filter((mapping) => mapping.slotIdentityId)
        .map((mapping) => [mapping.slotNumber, mapping.slotIdentityId!]),
    );
    if (input.mode === "replace_draft") {
      if (locked.sealed_at)
        throw new AppError(
          "VALIDATION_FAILED",
          "This version is sealed and cannot be replaced.",
        );
      const slotIds = await trx
        .selectFrom("team_slots")
        .select("id")
        .where("team_version_id", "=", locked.id)
        .execute();
      if (slotIds.length)
        await trx
          .deleteFrom("team_slots")
          .where(
            "id",
            "in",
            slotIds.map((slot) => slot.id),
          )
          .execute();
      await trx
        .updateTable("team_versions")
        .set({
          ruleset_id: preview.importDraft.rulesetId,
          source_kind: preview.importDraft.sourceKind,
          source_text: preview.importDraft.sourceText,
          source_url: preview.importDraft.sourceUrl,
          source_title: preview.importDraft.sourceTitle,
          source_author: preview.importDraft.sourceAuthor,
          source_format_id: preview.importDraft.sourceFormatId,
          change_summary: summary || "Replaced draft version",
          revision: (eb) => eb("revision", "+", 1),
        })
        .where("id", "=", locked.id)
        .execute();
      await insertSlots(
        trx,
        teamId,
        locked.id,
        preview.importDraft.draft,
        identities,
      );
      return { versionId: locked.id, versionNumber: locked.version_number };
    }
    const versionId = uuidv7();
    const ruleset = await trx
      .selectFrom("rulesets")
      .select("catalog_version_id")
      .where("id", "=", preview.importDraft.rulesetId)
      .executeTakeFirstOrThrow();
    await trx
      .insertInto("team_versions")
      .values({
        id: versionId,
        team_id: teamId,
        version_number: locked.version_number + 1,
        ruleset_id: preview.importDraft.rulesetId,
        catalog_version_id: ruleset.catalog_version_id,
        change_summary: summary || null,
        source_kind: preview.importDraft.sourceKind,
        source_text: preview.importDraft.sourceText,
        source_url: preview.importDraft.sourceUrl,
        source_title: preview.importDraft.sourceTitle,
        source_author: preview.importDraft.sourceAuthor,
        source_format_id: preview.importDraft.sourceFormatId,
        sealed_at: null,
        revision: 1,
      })
      .execute();
    await insertSlots(
      trx,
      teamId,
      versionId,
      preview.importDraft.draft,
      identities,
    );
    await trx
      .updateTable("teams")
      .set({ updated_at: new Date(), revision: (eb) => eb("revision", "+", 1) })
      .where("id", "=", teamId)
      .where("user_id", "=", userId)
      .execute();
    return { versionId, versionNumber: locked.version_number + 1 };
  });
}

export async function updateTeamMetadata(
  userId: string,
  teamId: string,
  input: TeamMetadataInput,
): Promise<void> {
  const values = validateMetadata(input);
  await db.transaction().execute(async (trx) => {
    const result = await trx
      .updateTable("teams")
      .set({
        title: values.title,
        description: values.description || null,
        status: values.status,
        archived_at: values.status === "archived" ? new Date() : null,
        updated_at: new Date(),
        revision: (eb) => eb("revision", "+", 1),
      })
      .where("id", "=", teamId)
      .where("user_id", "=", userId)
      .where("deleted_at", "is", null)
      .where("revision", "=", values.expectedRevision ?? -1)
      .executeTakeFirst();
    if (result.numUpdatedRows !== 1n)
      throw new AppError(
        "REVISION_CONFLICT",
        "This team changed in another session. Refresh and try again.",
      );
    await replaceTags(trx, userId, teamId, values.tags);
  });
}

export async function setTeamArchived(
  userId: string,
  teamId: string,
  archived: boolean,
): Promise<void> {
  const result = await db
    .updateTable("teams")
    .set({
      status: archived ? "archived" : "testing",
      archived_at: archived ? new Date() : null,
      updated_at: new Date(),
      revision: (eb) => eb("revision", "+", 1),
    })
    .where("id", "=", teamId)
    .where("user_id", "=", userId)
    .where("deleted_at", "is", null)
    .executeTakeFirst();
  if (result.numUpdatedRows !== 1n)
    throw new AppError("NOT_FOUND", "Team not found.");
}
