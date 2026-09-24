import { createHash } from "node:crypto";
import { v7 as uuid } from "uuid";
import { z } from "zod";
import { db } from "@/db/client";
import { AppError } from "@/lib/errors";
import { enqueueJob } from "@/jobs/queue";
import { getTeamDetail, listTeamVersions } from "@/modules/teams/service";
import { parseReplay, previewSpecies, toId } from "./parser";
import { fetchReplayLog, parseReplayUrl } from "./provider";
import type { ParsedReplay, ReplayFact, Result, Side } from "./types";
import { groupSets } from "./sets";

const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
const importInput = z.object({
  teamId: z.uuid(),
  versionId: z.uuid().nullable().optional(),
  urls: z.string().min(1).max(30_000),
  username: z.string().max(100).optional(),
  side: z.enum(["p1", "p2"]).nullable().optional(),
});
export async function submitReplays(
  userId: string,
  input: z.input<typeof importInput>,
) {
  const data = importInput.parse(input);
  if (!(await getTeamDetail(userId, data.teamId, data.versionId ?? undefined)))
    throw new AppError("NOT_FOUND", "Team or version was not found.");
  const urls = data.urls.split(/\s+/).filter(Boolean);
  if (!urls.length || urls.length > 100)
    throw new AppError(
      "VALIDATION_FAILED",
      "Import between 1 and 100 replay URLs at a time.",
    );
  return db.transaction().execute(async (trx) => {
    const batchId = uuid();
    await trx
      .insertInto("replay_import_batches")
      .values({ id: batchId, user_id: userId, team_id: data.teamId })
      .execute();
    for (const url of urls) {
      let locator: ReturnType<typeof parseReplayUrl>;
      try {
        locator = parseReplayUrl(url);
      } catch (error) {
        await trx
          .insertInto("replay_import_items")
          .values({
            id: uuid(),
            batch_id: batchId,
            original_url: url,
            game_id: null,
            status: "failed",
            error_detail:
              error instanceof Error ? error.message : "Invalid replay URL.",
          })
          .execute();
        continue;
      }
      const gameId = uuid();
      const inserted = await trx
        .insertInto("games")
        .values({
          id: gameId,
          user_id: userId,
          team_id: data.teamId,
          team_version_id: data.versionId ?? null,
          provider_replay_id: locator.id,
          canonical_url: locator.canonicalUrl,
          requested_username: data.username?.trim() || null,
          requested_side: data.side ?? null,
          user_side: null,
          status: "queued",
          error_detail: null,
          parser_run_id: null,
        })
        .onConflict((oc) =>
          oc.columns(["user_id", "provider_replay_id"]).doNothing(),
        )
        .returning("id")
        .executeTakeFirst();
      const existing =
        inserted ??
        (await trx
          .selectFrom("games")
          .select("id")
          .where("user_id", "=", userId)
          .where("provider_replay_id", "=", locator.id)
          .executeTakeFirstOrThrow());
      await trx
        .insertInto("replay_import_items")
        .values({
          id: uuid(),
          batch_id: batchId,
          original_url: url,
          game_id: existing.id,
          status: inserted ? "queued" : "duplicate",
          error_detail: null,
        })
        .execute();
      if (inserted)
        await enqueueJob(
          {
            kind: "replay.import",
            userId,
            subjectType: "game",
            subjectId: gameId,
            idempotencyKey: gameId,
            correlationId: batchId,
          },
          trx,
        );
    }
    return { batchId };
  });
}
type Team = NonNullable<Awaited<ReturnType<typeof getTeamDetail>>>;
export function inferSide(
  parsed: ParsedReplay,
  roster: string[],
  username?: string | null,
): Side | null {
  if (username) {
    const matches = (["p1", "p2"] as const).filter(
      (s) => toId(parsed.players[s].name ?? "") === toId(username),
    );
    return matches.length === 1 ? matches[0] : null;
  }
  const expected = roster
    .map((s) => toId(previewSpecies(s)))
    .sort()
    .join("|");
  const matches = (["p1", "p2"] as const).filter(
    (side) =>
      parsed.previewKnown[side] &&
      parsed.pokemon
        .filter((p) => p.side === side && p.preview)
        .map((p) => toId(previewSpecies(p.species)))
        .sort()
        .join("|") === expected,
  );
  return matches.length === 1 ? matches[0] : null;
}
function matchesTeam(parsed: ParsedReplay, side: Side, team: Team) {
  const expected = team.slots
    .map((p) => toId(previewSpecies(p.form_name ?? p.species_name)))
    .sort()
    .join("|");
  const observed = parsed.pokemon
    .filter((p) => p.side === side && p.preview)
    .map((p) => toId(previewSpecies(p.species)))
    .sort()
    .join("|");
  return (
    expected === observed &&
    parsed.formatId?.replace(/bo3$/, "") ===
      team.ruleset_slug.replace(/bo3$/, "")
  );
}
export async function processReplay(userId: string, gameId: string) {
  const game = await db
    .selectFrom("games")
    .selectAll()
    .where("user_id", "=", userId)
    .where("id", "=", gameId)
    .executeTakeFirst();
  if (!game) throw new AppError("NOT_FOUND", "Replay was not found.");
  try {
    await db
      .updateTable("games")
      .set({ status: "fetching", error_detail: null })
      .where("id", "=", gameId)
      .execute();
    let source = await db
      .selectFrom("replay_sources")
      .selectAll()
      .where("game_id", "=", gameId)
      .executeTakeFirst();
    if (!source) {
      const log = await fetchReplayLog(game.canonical_url);
      await db
        .insertInto("replay_sources")
        .values({ game_id: gameId, raw_log: log, checksum: hash(log) })
        .onConflict((oc) => oc.column("game_id").doNothing())
        .execute();
      source = await db
        .selectFrom("replay_sources")
        .selectAll()
        .where("game_id", "=", gameId)
        .executeTakeFirstOrThrow();
    }
    await db
      .updateTable("games")
      .set({ status: "parsing" })
      .where("id", "=", gameId)
      .execute();
    const parsed = parseReplay(source.raw_log, {
      formatId: parseReplayUrl(game.canonical_url).formatId,
    });
    if (
      !/^gen9championsvgc2026regm[bc](?:bo3)?$/.test(parsed.formatId ?? "") ||
      parsed.warnings.some((w) => w.startsWith("Unsupported battle type"))
    )
      throw new AppError(
        "VALIDATION_FAILED",
        "This parser supports Champions VGC Regulation M-B and M-C doubles replays.",
      );
    const team = await getTeamDetail(
      userId,
      game.team_id,
      game.team_version_id ?? undefined,
    );
    if (!team) throw new AppError("NOT_FOUND", "Team version was not found.");
    const correction = await db
      .selectFrom("game_corrections")
      .selectAll()
      .where("game_id", "=", gameId)
      .orderBy("created_at", "desc")
      .orderBy("id", "desc")
      .executeTakeFirst();
    const side =
      correction?.user_side ??
      game.requested_side ??
      inferSide(
        parsed,
        team.slots.map((s) => s.form_name ?? s.species_name),
        game.requested_username,
      );
    let versionId = game.team_version_id;
    if (!versionId && side) {
      const candidates: string[] = [];
      for (const version of await listTeamVersions(userId, game.team_id)) {
        const detail = await getTeamDetail(userId, game.team_id, version.id);
        if (detail && matchesTeam(parsed, side, detail))
          candidates.push(version.id);
      }
      if (candidates.length === 1) versionId = candidates[0];
    }
    const attributedTeam =
      versionId && versionId !== team.version_id
        ? await getTeamDetail(userId, game.team_id, versionId)
        : team;
    const associationValid =
      side && attributedTeam && matchesTeam(parsed, side, attributedTeam);
    if (!associationValid)
      parsed.warnings.push(
        "Player side or team roster does not match; confirm attribution before using statistics.",
      );
    if (!versionId)
      parsed.warnings.push(
        "Exact team version is ambiguous. Choose the version used in this game.",
      );
    const resultKnown =
      parsed.outcome !== "unknown" ||
      (correction?.result && correction.result !== "unknown");
    const status =
      side && versionId && associationValid && resultKnown
        ? "succeeded"
        : "needs_input";
    parsed.attributionReady = status === "succeeded";
    parsed.attributedSide = side;
    parsed.attributedVersionId = versionId;
    if (associationValid && attributedTeam) {
      for (const pokemon of parsed.pokemon.filter((p) => p.side === side)) {
        pokemon.slotIdentityId = attributedTeam.slots.find(
          (slot) =>
            toId(previewSpecies(slot.form_name ?? slot.species_name)) ===
            toId(previewSpecies(pokemon.species)),
        )?.slot_identity_id;
      }
    }
    await db.transaction().execute(async (trx) => {
      // Lock publication so concurrent retries cannot expose a half-written interpretation.
      const current = await trx
        .selectFrom("games")
        .selectAll()
        .where("id", "=", gameId)
        .forUpdate()
        .executeTakeFirstOrThrow();
      if (
        current.team_version_id !== game.team_version_id ||
        current.updated_at.getTime() !== game.updated_at.getTime()
      )
        throw new AppError(
          "REVISION_CONFLICT",
          "Replay attribution changed during parsing. Retry with the latest correction.",
        );
      const runId = uuid();
      const version = versionId
        ? await trx
            .selectFrom("team_versions")
            .select("catalog_version_id")
            .where("id", "=", versionId)
            .executeTakeFirst()
        : null;
      await trx
        .insertInto("parser_runs")
        .values({
          id: runId,
          game_id: gameId,
          parser_version: parsed.parserVersion,
          catalog_version_id: version?.catalog_version_id ?? null,
          output: parsed,
          output_checksum: hash(JSON.stringify(parsed)),
        })
        .execute();
      await trx
        .updateTable("games")
        .set({
          parser_run_id: runId,
          team_version_id: versionId,
          user_side: side,
          status,
          error_detail: null,
          updated_at: new Date(),
        })
        .where("id", "=", gameId)
        .execute();
    });
  } catch (error) {
    const message =
      error instanceof AppError
        ? error.message
        : error instanceof Error &&
            /Replay (log|is missing)/.test(error.message)
          ? error.message
          : "Replay processing failed. Retry from the retained source.";
    await db
      .updateTable("games")
      .set({ status: "failed", error_detail: message, updated_at: new Date() })
      .where("id", "=", gameId)
      .execute();
    throw new AppError("PROVIDER_UNAVAILABLE", message);
  }
}
export function effectiveResult(
  parsed: ParsedReplay,
  side: Side | null,
): Result {
  return parsed.outcome === "tie"
    ? "tie"
    : parsed.outcome === "completed" && side && parsed.winner
      ? parsed.winner === side
        ? "win"
        : "loss"
      : "unknown";
}
export async function listReplayRecords(userId: string, teamId: string) {
  if (!(await getTeamDetail(userId, teamId)))
    throw new AppError("NOT_FOUND", "Team was not found.");
  const rows = await db
    .selectFrom("games")
    .leftJoin("parser_runs", "parser_runs.id", "games.parser_run_id")
    .selectAll("games")
    .select(["parser_runs.output", "parser_runs.parser_version"])
    .where("games.user_id", "=", userId)
    .where("games.team_id", "=", teamId)
    .orderBy("games.created_at")
    .orderBy("games.id")
    .execute();
  const corrections = rows.length
    ? await db
        .selectFrom("game_corrections")
        .selectAll()
        .where("user_id", "=", userId)
        .where(
          "game_id",
          "in",
          rows.map((r) => r.id),
        )
        .orderBy("created_at", "desc")
        .orderBy("id", "desc")
        .execute()
    : [];
  return rows.map((row) => {
    const correction = corrections.find((c) => c.game_id === row.id);
    const side = correction?.user_side ?? row.user_side;
    return {
      ...row,
      user_side: side,
      result:
        correction?.result ??
        (row.output
          ? effectiveResult(row.output, side)
          : ("unknown" as Result)),
      corrected: !!correction,
    };
  });
}
export type ReplayRecord = Awaited<
  ReturnType<typeof listReplayRecords>
>[number];
export function factsFromRecords(rows: ReplayRecord[]): ReplayFact[] {
  return rows
    .filter(
      (r) =>
        r.output &&
        (r.status === "succeeded" ||
          (r.output.attributionReady === true &&
            r.output.attributedSide === r.user_side &&
            r.output.attributedVersionId === r.team_version_id)),
    )
    .map((r) => ({
      id: r.id,
      teamId: r.team_id,
      versionId: r.team_version_id,
      userSide: r.user_side,
      result: r.result,
      parsed: r.output!,
    }));
}
export async function listImportItems(userId: string, teamId: string) {
  return db
    .selectFrom("replay_import_items as items")
    .innerJoin(
      "replay_import_batches as batches",
      "batches.id",
      "items.batch_id",
    )
    .leftJoin("games", "games.id", "items.game_id")
    .select([
      "items.id",
      "items.original_url",
      "items.game_id",
      "items.status as submission_status",
      "items.error_detail as submission_error",
      "games.status",
      "games.error_detail",
      "games.team_id as game_team_id",
      "batches.created_at",
    ])
    .where("batches.user_id", "=", userId)
    .where("batches.team_id", "=", teamId)
    .orderBy("batches.created_at", "desc")
    .limit(100)
    .execute();
}
export async function replaySource(userId: string, gameId: string) {
  return db
    .selectFrom("replay_sources")
    .innerJoin("games", "games.id", "replay_sources.game_id")
    .selectAll("replay_sources")
    .where("games.id", "=", gameId)
    .where("games.user_id", "=", userId)
    .executeTakeFirst();
}
export async function requeueReplay(userId: string, gameId: string) {
  return db.transaction().execute(async (trx) => {
    const game = await trx
      .selectFrom("games")
      .selectAll()
      .where("id", "=", gameId)
      .where("user_id", "=", userId)
      .forUpdate()
      .executeTakeFirst();
    if (!game) throw new AppError("NOT_FOUND", "Replay was not found.");
    if (["queued", "fetching", "parsing"].includes(game.status)) return;
    await trx
      .updateTable("games")
      .set({ status: "queued", error_detail: null })
      .where("id", "=", gameId)
      .execute();
    await enqueueJob(
      {
        kind: "replay.import",
        userId,
        subjectType: "game",
        subjectId: gameId,
        idempotencyKey: `${gameId}:${uuid()}`,
        correlationId: uuid(),
      },
      trx,
    );
  });
}
export async function correctReplay(
  userId: string,
  gameId: string,
  input: {
    side: Side;
    result: Result | null;
    versionId: string;
    reason: string;
  },
) {
  const data = z
    .object({
      side: z.enum(["p1", "p2"]),
      result: z.enum(["win", "loss", "tie", "unknown"]).nullable(),
      versionId: z.uuid(),
      reason: z.string().trim().min(1).max(1000),
    })
    .parse(input);
  const game = await db
    .selectFrom("games")
    .selectAll()
    .where("id", "=", gameId)
    .where("user_id", "=", userId)
    .executeTakeFirst();
  if (!game) throw new AppError("NOT_FOUND", "Replay was not found.");
  if (!(await getTeamDetail(userId, game.team_id, data.versionId)))
    throw new AppError("NOT_FOUND", "Team version was not found.");
  await db.transaction().execute(async (trx) => {
    await trx
      .insertInto("game_corrections")
      .values({
        id: uuid(),
        game_id: gameId,
        user_id: userId,
        user_side: data.side,
        result: data.result,
        reason: data.reason,
      })
      .execute();
    await trx
      .updateTable("games")
      .set({
        team_version_id: data.versionId,
        user_side: data.side,
        updated_at: new Date(),
      })
      .where("id", "=", gameId)
      .execute();
  });
  await requeueReplay(userId, gameId);
}
export async function getReplayNote(userId: string, subjectKey: string) {
  return (
    (
      await db
        .selectFrom("replay_annotations")
        .select("markdown")
        .where("user_id", "=", userId)
        .where("subject_key", "=", subjectKey)
        .executeTakeFirst()
    )?.markdown ?? ""
  );
}
export async function saveReplayNote(
  userId: string,
  teamId: string,
  subjectKey: string,
  markdown: string,
) {
  const records = await listReplayRecords(userId, teamId);
  if (
    !records.some((r) => `game:${r.id}` === subjectKey) &&
    !groupSets(factsFromRecords(records)).some(
      (s) => `set:${s.key}` === subjectKey,
    )
  )
    throw new AppError("NOT_FOUND", "Game or set was not found.");
  if (markdown.length > 20_000)
    throw new AppError(
      "VALIDATION_FAILED",
      "Notes must be 20,000 characters or fewer.",
    );
  await db
    .insertInto("replay_annotations")
    .values({ user_id: userId, subject_key: subjectKey, markdown })
    .onConflict((oc) =>
      oc
        .columns(["user_id", "subject_key"])
        .doUpdateSet({ markdown, updated_at: new Date() }),
    )
    .execute();
}
