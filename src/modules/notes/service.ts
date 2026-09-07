import { v7 as uuidv7 } from "uuid";
import { db } from "@/db/client";
import { AppError } from "@/lib/errors";
import { renderSafeMarkdown } from "./markdown";

export type NoteSubjectType = "team" | "team_version" | "slot_identity";

async function assertSubjectOwnership(
  userId: string,
  type: NoteSubjectType,
  subjectId: string,
): Promise<void> {
  let owned = false;
  if (type === "team")
    owned = Boolean(
      await db
        .selectFrom("teams")
        .select("id")
        .where("id", "=", subjectId)
        .where("user_id", "=", userId)
        .executeTakeFirst(),
    );
  else if (type === "team_version")
    owned = Boolean(
      await db
        .selectFrom("team_versions")
        .innerJoin("teams", "teams.id", "team_versions.team_id")
        .select("team_versions.id")
        .where("team_versions.id", "=", subjectId)
        .where("teams.user_id", "=", userId)
        .executeTakeFirst(),
    );
  else
    owned = Boolean(
      await db
        .selectFrom("slot_identities")
        .innerJoin("teams", "teams.id", "slot_identities.team_id")
        .select("slot_identities.id")
        .where("slot_identities.id", "=", subjectId)
        .where("teams.user_id", "=", userId)
        .executeTakeFirst(),
    );
  if (!owned) throw new AppError("NOT_FOUND", "Note subject not found.");
}

export async function listNotes(
  userId: string,
  subjectType: NoteSubjectType,
  subjectId: string,
) {
  await assertSubjectOwnership(userId, subjectType, subjectId);
  return db
    .selectFrom("notes")
    .selectAll()
    .where("user_id", "=", userId)
    .where("subject_type", "=", subjectType)
    .where("subject_id", "=", subjectId)
    .where("deleted_at", "is", null)
    .orderBy("updated_at", "desc")
    .execute();
}

export async function saveNote(
  userId: string,
  input: {
    id?: string;
    subjectType: NoteSubjectType;
    subjectId: string;
    markdown: string;
    expectedRevision?: number;
  },
) {
  await assertSubjectOwnership(userId, input.subjectType, input.subjectId);
  const markdown = input.markdown.trim();
  if (!markdown || markdown.length > 10_000)
    throw new AppError(
      "VALIDATION_FAILED",
      "A note must contain between 1 and 10,000 characters.",
      { markdown: ["Enter a note of 10,000 characters or fewer."] },
    );
  if (!input.id) {
    const id = uuidv7();
    await db
      .insertInto("notes")
      .values({
        id,
        user_id: userId,
        subject_type: input.subjectType,
        subject_id: input.subjectId,
        markdown_source: markdown,
        sanitized_render_cache: renderSafeMarkdown(markdown),
        deleted_at: null,
        revision: 1,
      })
      .execute();
    return id;
  }
  const result = await db
    .updateTable("notes")
    .set({
      markdown_source: markdown,
      sanitized_render_cache: renderSafeMarkdown(markdown),
      updated_at: new Date(),
      revision: (eb) => eb("revision", "+", 1),
    })
    .where("id", "=", input.id)
    .where("user_id", "=", userId)
    .where("deleted_at", "is", null)
    .where("revision", "=", input.expectedRevision ?? -1)
    .executeTakeFirst();
  if (result.numUpdatedRows !== 1n)
    throw new AppError(
      "REVISION_CONFLICT",
      "This note changed in another session. Refresh and try again.",
    );
  return input.id;
}

export async function deleteNote(
  userId: string,
  noteId: string,
): Promise<void> {
  const result = await db
    .updateTable("notes")
    .set({
      deleted_at: new Date(),
      updated_at: new Date(),
      revision: (eb) => eb("revision", "+", 1),
    })
    .where("id", "=", noteId)
    .where("user_id", "=", userId)
    .where("deleted_at", "is", null)
    .executeTakeFirst();
  if (result.numUpdatedRows !== 1n)
    throw new AppError("NOT_FOUND", "Note not found.");
}
