"use server";

import { revalidatePath } from "next/cache";
import { AppError, type ActionResult } from "@/lib/errors";
import { correlationId } from "@/lib/logging";
import { currentUserId } from "@/modules/auth/sessions";
import {
  deleteNote,
  saveNote,
  type NoteSubjectType,
} from "@/modules/notes/service";
import {
  importPokepaste,
  importShowdownText,
  previewPokepaste,
  previewShowdownText,
  previewTeamRevision,
  saveTeamRevision,
  setTeamArchived,
  updateTeamMetadata,
} from "@/modules/teams/service";
import type {
  TeamImportDraft,
  TeamMetadataInput,
  VersionSaveMode,
  VersionSavePreview,
} from "@/modules/teams/types";

function fail<T>(error: unknown, id: string): ActionResult<T> {
  if (error instanceof AppError)
    return {
      ok: false,
      code: error.code,
      message: error.message,
      fieldErrors: error.fieldErrors,
      correlationId: id,
    };
  return {
    ok: false,
    code: "VALIDATION_FAILED",
    message: "Unable to process that request.",
    correlationId: id,
  };
}

async function userOrThrow(): Promise<string> {
  const userId = await currentUserId();
  if (!userId) throw new AppError("FORBIDDEN", "Sign in to manage teams.");
  return userId;
}

function refreshTeam(teamId?: string): void {
  revalidatePath("/");
  revalidatePath("/teams");
  if (teamId) revalidatePath(`/teams/${teamId}`);
}

export async function previewTeamImportAction(input: {
  kind: "showdown_text" | "pokepaste";
  value: string;
}): Promise<ActionResult<TeamImportDraft>> {
  const id = correlationId();
  try {
    await userOrThrow();
    return {
      ok: true,
      data:
        input.kind === "pokepaste"
          ? await previewPokepaste(input.value)
          : await previewShowdownText(input.value),
      correlationId: id,
    };
  } catch (error) {
    return fail(error, id);
  }
}

export async function createTeamAction(input: {
  kind: "showdown_text" | "pokepaste";
  value: string;
  metadata: Omit<TeamMetadataInput, "expectedRevision">;
}): Promise<ActionResult<{ teamId: string }>> {
  const id = correlationId();
  try {
    const userId = await userOrThrow();
    const result =
      input.kind === "pokepaste"
        ? await importPokepaste(userId, input.value, input.metadata)
        : await importShowdownText(userId, input.value, input.metadata);
    refreshTeam(result.teamId);
    return { ok: true, data: { teamId: result.teamId }, correlationId: id };
  } catch (error) {
    return fail(error, id);
  }
}

export async function previewTeamRevisionAction(
  teamId: string,
  input: { kind: "showdown_text" | "pokepaste"; value: string },
): Promise<ActionResult<VersionSavePreview>> {
  const id = correlationId();
  try {
    return {
      ok: true,
      data: await previewTeamRevision(
        await userOrThrow(),
        teamId,
        input.kind === "pokepaste"
          ? { kind: "pokepaste", value: input.value }
          : { kind: "showdown_text", value: input.value },
      ),
      correlationId: id,
    };
  } catch (error) {
    return fail(error, id);
  }
}

export async function saveTeamRevisionAction(
  teamId: string,
  input: {
    kind: "showdown_text" | "pokepaste";
    value: string;
    mode: VersionSaveMode;
    expectedRevision: number;
    changeSummary: string;
  },
): Promise<ActionResult<{ versionId: string; versionNumber: number }>> {
  const id = correlationId();
  try {
    const result = await saveTeamRevision(await userOrThrow(), teamId, input);
    refreshTeam(teamId);
    return { ok: true, data: result, correlationId: id };
  } catch (error) {
    return fail(error, id);
  }
}

export async function updateTeamMetadataAction(
  teamId: string,
  input: TeamMetadataInput,
): Promise<ActionResult<null>> {
  const id = correlationId();
  try {
    await updateTeamMetadata(await userOrThrow(), teamId, input);
    refreshTeam(teamId);
    return { ok: true, data: null, correlationId: id };
  } catch (error) {
    return fail(error, id);
  }
}

export async function setTeamArchivedAction(
  teamId: string,
  archived: boolean,
): Promise<ActionResult<null>> {
  const id = correlationId();
  try {
    await setTeamArchived(await userOrThrow(), teamId, archived);
    refreshTeam(teamId);
    return { ok: true, data: null, correlationId: id };
  } catch (error) {
    return fail(error, id);
  }
}

export async function saveNoteAction(input: {
  id?: string;
  subjectType: NoteSubjectType;
  subjectId: string;
  markdown: string;
  expectedRevision?: number;
}): Promise<ActionResult<{ id: string }>> {
  const id = correlationId();
  try {
    const noteId = await saveNote(await userOrThrow(), input);
    revalidatePath("/teams");
    return { ok: true, data: { id: noteId }, correlationId: id };
  } catch (error) {
    return fail(error, id);
  }
}

export async function deleteNoteAction(
  noteId: string,
): Promise<ActionResult<null>> {
  const id = correlationId();
  try {
    await deleteNote(await userOrThrow(), noteId);
    revalidatePath("/teams");
    return { ok: true, data: null, correlationId: id };
  } catch (error) {
    return fail(error, id);
  }
}
