import { beforeAll, describe, expect, it } from "vitest";
import { v7 as uuidv7 } from "uuid";
import { db } from "@/db/client";
import { hashPassword } from "@/modules/auth/passwords";
import { readFile } from "node:fs/promises";
import { listNotes, saveNote } from "@/modules/notes/service";
import {
  getTeamDetail,
  importPokepaste,
  importShowdownText,
  listTeamVersions,
  listTeams,
  saveTeamRevision,
  setTeamArchived,
  updateTeamMetadata,
} from "@/modules/teams/service";

describe("Poképaste team import", () => {
  beforeAll(async () => {
    const user = await db
      .selectFrom("users")
      .select("id")
      .where("email_normalized", "=", "player-one@example.test")
      .executeTakeFirst();
    if (!user) throw new Error("Run db:seed before integration tests.");
  });

  it("is idempotent and retains six parsed sets", async () => {
    const user = { id: uuidv7() };
    await db
      .insertInto("users")
      .values({
        id: user.id,
        email_normalized: `pokepaste-${user.id}@example.test`,
        password_hash: await hashPassword("integration-test-password"),
        display_name: "Poképaste test",
        account_state: "active",
        deleted_at: null,
      })
      .execute();
    const first = await importPokepaste(
      user.id,
      "https://pokepast.es/6bbca2da7c6e2365",
    );
    const second = await importPokepaste(
      user.id,
      "https://pokepast.es/6bbca2da7c6e2365",
    );
    expect(second).toEqual(first);
    const detail = await getTeamDetail(user.id, first.teamId, first.versionId);
    expect(detail?.title).toBe("DuskLass reg m-b life orb");
    expect(detail?.slots).toHaveLength(6);
    expect(detail?.ev_max_per_stat).toBe(32);
    expect(detail?.slots[0]?.form_slug).toBe("froslass-mega");
    expect(detail?.slots[0]?.item_slug).toBe("froslassite");
    expect(detail?.slots[0]?.nature_slug).toBe("timid");
    expect(detail?.slots[0]?.moves[0]).toEqual({
      name: "Blizzard",
      typeName: "Ice",
      typeSlug: "ice",
    });
    expect(detail?.slots[5]?.is_shiny).toBe(true);
  });

  it("creates from Showdown text and manages metadata, versions, tags, notes, and archive state", async () => {
    const user = await db
      .selectFrom("users")
      .select("id")
      .where("email_normalized", "=", "player-one@example.test")
      .executeTakeFirstOrThrow();
    const source = await readFile(
      "src/modules/teams/fixtures/6bbca2da7c6e2365.txt",
      "utf8",
    );
    const created = await importShowdownText(user.id, source, {
      title: "Text team",
      description: "Imported directly",
      status: "active",
      tags: ["Regional", "regional", "Practice"],
    });
    let detail = await getTeamDetail(user.id, created.teamId);
    expect(detail?.source_kind).toBe("showdown_text");
    expect(detail?.source_text).toBe(source);
    expect(detail?.tags).toEqual(["Practice", "regional"]);

    await updateTeamMetadata(user.id, created.teamId, {
      title: "Sydney team",
      description: "Metadata only",
      status: "testing",
      tags: ["Bo3"],
      expectedRevision: detail!.team_revision,
    });
    detail = await getTeamDetail(user.id, created.teamId);
    expect(detail?.version_number).toBe(1);
    expect(detail?.title).toBe("Sydney team");

    const changed = source.replace("Froslassite", "Focus Sash");
    const revised = await saveTeamRevision(user.id, created.teamId, {
      kind: "showdown_text",
      value: changed,
      mode: "create_version",
      expectedRevision: detail!.version_revision,
      changeSummary: "Changed Froslass item",
    });
    expect(revised.versionNumber).toBe(2);
    const versions = await listTeamVersions(user.id, created.teamId);
    expect(versions.map((version) => version.version_number)).toEqual([2, 1]);
    expect(
      (await getTeamDetail(user.id, created.teamId, created.versionId))
        ?.slots[0]?.item_name,
    ).toBe("Froslassite");
    expect(
      (await getTeamDetail(user.id, created.teamId))?.slots[0]?.item_name,
    ).toBe("Focus Sash");
    const firstSlotIdentity = (
      await getTeamDetail(user.id, created.teamId, created.versionId)
    )?.slots[0]?.slot_identity_id;
    expect(
      (await getTeamDetail(user.id, created.teamId))?.slots[0]
        ?.slot_identity_id,
    ).toBe(firstSlotIdentity);

    const latest = await getTeamDetail(user.id, created.teamId);
    await saveTeamRevision(user.id, created.teamId, {
      kind: "showdown_text",
      value: changed.replace("Focus Sash", "Life Orb"),
      mode: "replace_draft",
      expectedRevision: latest!.version_revision,
      changeSummary: "Replace the unsealed draft",
    });
    expect(
      (await listTeamVersions(user.id, created.teamId)).map(
        (version) => version.version_number,
      ),
    ).toEqual([2, 1]);
    expect(
      (await getTeamDetail(user.id, created.teamId))?.slots[0]?.item_name,
    ).toBe("Life Orb");

    await saveNote(user.id, {
      subjectType: "team",
      subjectId: created.teamId,
      markdown: "**Lead plan**\n- Protect",
    });
    expect(
      (await listNotes(user.id, "team", created.teamId))[0]
        ?.sanitized_render_cache,
    ).toContain("<strong>Lead plan</strong>");
    await setTeamArchived(user.id, created.teamId, true);
    expect(
      (await listTeams(user.id, "archived")).some(
        (team) => team.id === created.teamId,
      ),
    ).toBe(true);

    const otherUser = await db
      .selectFrom("users")
      .select("id")
      .where("email_normalized", "=", "player-two@example.test")
      .executeTakeFirstOrThrow();
    expect(await getTeamDetail(otherUser.id, created.teamId)).toBeNull();
    await expect(
      listNotes(otherUser.id, "team", created.teamId),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });

    const sealed = await getTeamDetail(user.id, created.teamId);
    await db
      .updateTable("team_versions")
      .set({ sealed_at: new Date() })
      .where("id", "=", sealed!.version_id)
      .execute();
    await expect(
      db
        .updateTable("team_slots")
        .set({ nickname: "Mutated" })
        .where("id", "=", sealed!.slots[0]!.id)
        .execute(),
    ).rejects.toThrow("sealed team version children are immutable");
    await expect(
      saveTeamRevision(user.id, created.teamId, {
        kind: "showdown_text",
        value: changed,
        mode: "replace_draft",
        expectedRevision: sealed!.version_revision,
        changeSummary: "Forbidden replacement",
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_FAILED" });
  });
});
