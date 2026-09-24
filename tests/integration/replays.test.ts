import { readFile } from "node:fs/promises";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import * as parser from "@/modules/replays/parser";
import { v7 as uuid } from "uuid";
import { sql } from "kysely";
import { db } from "@/db/client";
import {
  importPokepaste,
  getTeamDetail,
  saveTeamRevision,
} from "@/modules/teams/service";
import {
  correctReplay,
  factsFromRecords,
  getReplayNote,
  listImportItems,
  listReplayRecords,
  processReplay,
  replaySource,
  saveReplayNote,
  submitReplays,
} from "@/modules/replays/service";
import { summarize } from "@/modules/replays/analytics";
import { claimJob, completeJob } from "@/jobs/queue";

describe("replay persistence and ownership", () => {
  const userId = uuid(),
    otherId = uuid();
  let team: { teamId: string; versionId: string };
  let urls: string;
  beforeAll(async () => {
    for (const id of [userId, otherId])
      await db
        .insertInto("users")
        .values({
          id,
          email_normalized: `${id}@example.test`,
          password_hash: "unused-test-hash",
          display_name: "Replay test",
          account_state: "active",
          deleted_at: null,
        })
        .execute();
    team = await importPokepaste(
      userId,
      "https://pokepast.es/58cbd5a41861cdc2",
    );
    urls = await readFile("games.txt", "utf8");
  });
  afterAll(async () => {
    await db.destroy();
  });
  it("queues atomically, deduplicates concurrently and retains exact source", async () => {
    await Promise.all([
      submitReplays(userId, { ...team, urls }),
      submitReplays(userId, { ...team, urls }),
    ]);
    const rows = await listReplayRecords(userId, team.teamId);
    expect(rows).toHaveLength(3);
    const jobs = await db
      .selectFrom("jobs")
      .selectAll()
      .where("user_id", "=", userId)
      .execute();
    expect(jobs).toHaveLength(3);
    // Exercise actual claim/dispatch/complete semantics, using the same service as the worker.
    for (let i = 0; i < 3; i++) {
      const job = await claimJob("replay-integration", userId);
      expect(job).toBeTruthy();
      await processReplay(job!.user_id!, job!.subject_id);
      await completeJob(job!.id, "succeeded");
    }
    const records = await listReplayRecords(userId, team.teamId);
    expect(records.every((r) => r.status === "succeeded")).toBe(true);
    expect(summarize(factsFromRecords(records))).toMatchObject({
      wins: 2,
      losses: 1,
      setWins: 1,
    });
    expect(await replaySource(userId, records[0].id)).toMatchObject({
      raw_log: await readFile(
        `src/modules/replays/fixtures/${records[0].provider_replay_id}.log`,
        "utf8",
      ),
    });
    expect(
      (await listImportItems(userId, team.teamId)).filter(
        (i) => i.submission_status === "duplicate",
      ),
    ).toHaveLength(3);
  });
  it("keeps immutable attribution, notes and correction overlays across reparsing", async () => {
    const [game] = await listReplayRecords(userId, team.teamId);
    const detail = (await getTeamDetail(userId, team.teamId, team.versionId))!;
    expect(detail.sealed_at).toBeTruthy();
    await expect(
      db
        .updateTable("team_versions")
        .set({ change_summary: "mutated" })
        .where("id", "=", team.versionId)
        .execute(),
    ).rejects.toThrow(/immutable/);
    await saveReplayNote(
      userId,
      team.teamId,
      `game:${game.id}`,
      "**Keep this note**",
    );
    await saveReplayNote(
      userId,
      team.teamId,
      `set:${game.output!.series!.key}`,
      "Set review",
    );
    await correctReplay(userId, game.id, {
      side: "p1",
      result: "tie",
      versionId: team.versionId,
      reason: "Test correction overlay",
    });
    await processReplay(userId, game.id);
    const changed = (await listReplayRecords(userId, team.teamId)).find(
      (g) => g.id === game.id,
    )!;
    expect(changed.result).toBe("tie");
    expect(changed.output!.winner).toBe("p2");
    expect(await getReplayNote(userId, `game:${game.id}`)).toBe(
      "**Keep this note**",
    );
    expect(await getReplayNote(userId, `set:${game.output!.series!.key}`)).toBe(
      "Set review",
    );
    const revision = await saveTeamRevision(userId, team.teamId, {
      kind: "showdown_text",
      value: detail.source_text!.replace("Life Orb", "Focus Sash"),
      mode: "create_version",
      expectedRevision: detail.version_revision,
      changeSummary: "Later version",
    });
    expect(revision.versionId).not.toBe(team.versionId);
    expect(
      (await listReplayRecords(userId, team.teamId)).every(
        (g) => g.team_version_id === team.versionId,
      ),
    ).toBe(true);
    const count = await db
      .selectFrom("parser_runs")
      .select(sql<number>`count(*)::int`.as("count"))
      .where("game_id", "=", game.id)
      .executeTakeFirstOrThrow();
    expect(count.count).toBe(2);
  });
  it("denies cross-account access and reports per-URL validation errors", async () => {
    const [game] = await listReplayRecords(userId, team.teamId);
    await expect(listReplayRecords(otherId, team.teamId)).rejects.toThrow();
    await expect(submitReplays(otherId, { ...team, urls })).rejects.toThrow();
    await expect(processReplay(otherId, game.id)).rejects.toThrow();
    expect(await replaySource(otherId, game.id)).toBeUndefined();
    await expect(
      saveReplayNote(otherId, team.teamId, `game:${game.id}`, "bad"),
    ).rejects.toThrow();
    await submitReplays(userId, { ...team, urls: "https://example.com/bad" });
    expect(
      (await listImportItems(userId, team.teamId)).some(
        (i) => i.submission_status === "failed" && i.submission_error,
      ),
    ).toBe(true);
  });
  it("preserves the accepted interpretation and notes when a reparse fails", async () => {
    const [game] = await listReplayRecords(userId, team.teamId);
    const parse = vi.spyOn(parser, "parseReplay").mockImplementationOnce(() => {
      throw new Error("simulated parser failure");
    });
    try {
      await expect(processReplay(userId, game.id)).rejects.toThrow(
        "Replay processing failed",
      );
    } finally {
      parse.mockRestore();
    }
    const failed = (await listReplayRecords(userId, team.teamId)).find(
      (g) => g.id === game.id,
    )!;
    expect(failed.status).toBe("failed");
    expect(failed.parser_run_id).toBe(game.parser_run_id);
    expect(factsFromRecords([failed])).toHaveLength(1);
    expect(await getReplayNote(userId, `game:${game.id}`)).toBe(
      "**Keep this note**",
    );
  });
  it("requests input for ambiguous versions and accepts an explicit correction", async () => {
    const otherTeam = await importPokepaste(
      otherId,
      "https://pokepast.es/58cbd5a41861cdc2",
    );
    const original = (await getTeamDetail(otherId, otherTeam.teamId))!;
    await saveTeamRevision(otherId, otherTeam.teamId, {
      kind: "showdown_text",
      value: original.source_text!.replace("Life Orb", "Focus Sash"),
      mode: "create_version",
      expectedRevision: original.version_revision,
      changeSummary: "Ambiguous roster",
    });
    await submitReplays(otherId, {
      teamId: otherTeam.teamId,
      urls: urls.split(/\s+/)[0],
    });
    const [queued] = await listReplayRecords(otherId, otherTeam.teamId);
    await processReplay(otherId, queued.id);
    const [ambiguous] = await listReplayRecords(otherId, otherTeam.teamId);
    expect(ambiguous.status).toBe("needs_input");
    expect(ambiguous.user_side).toBe("p1");
    expect(ambiguous.team_version_id).toBeNull();
    expect(factsFromRecords([ambiguous])).toHaveLength(0);
    await correctReplay(otherId, queued.id, {
      side: "p1",
      result: null,
      versionId: otherTeam.versionId,
      reason: "Confirm original spread",
    });
    await processReplay(otherId, queued.id);
    const [confirmed] = await listReplayRecords(otherId, otherTeam.teamId);
    expect(confirmed.status).toBe("succeeded");
    expect(factsFromRecords([confirmed])).toHaveLength(1);
  });
});
