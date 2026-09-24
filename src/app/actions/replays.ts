"use server";
import { revalidatePath } from "next/cache";
import { currentUserId } from "@/modules/auth/sessions";
import { AppError } from "@/lib/errors";
import {
  correctReplay,
  requeueReplay,
  saveReplayNote,
  submitReplays,
} from "@/modules/replays/service";
import type { Result, Side } from "@/modules/replays/types";
export async function replayAction(
  _previous: { message: string },
  form: FormData,
): Promise<{ message: string }> {
  try {
    const userId = await currentUserId();
    if (!userId) throw new AppError("FORBIDDEN", "Sign in to manage replays.");
    const text = (key: string) => String(form.get(key) ?? "");
    const teamId = text("teamId"),
      operation = text("operation");
    if (operation === "import")
      await submitReplays(userId, {
        teamId,
        versionId: text("versionId") || null,
        username: text("username"),
        side: (text("side") as Side) || null,
        urls: text("urls"),
      });
    else if (operation === "reparse")
      await requeueReplay(userId, text("gameId"));
    else if (operation === "correct")
      await correctReplay(userId, text("gameId"), {
        side: text("side") as Side,
        result: (text("result") as Result) || null,
        versionId: text("versionId"),
        reason: text("reason"),
      });
    else if (operation === "note")
      await saveReplayNote(
        userId,
        teamId,
        text("subjectKey"),
        text("markdown"),
      );
    else throw new AppError("VALIDATION_FAILED", "Unknown replay action.");
    revalidatePath(`/teams/${teamId}`, "layout");
    return {
      message:
        operation === "note"
          ? "Note saved."
          : operation === "import"
            ? "Import queued. Results will appear as each replay is processed."
            : "Replay queued for processing.",
    };
  } catch (error) {
    return {
      message:
        error instanceof AppError
          ? error.message
          : "Check the form values and try again.",
    };
  }
}
