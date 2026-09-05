"use server";

import { revalidatePath } from "next/cache";
import { AppError, type ActionResult } from "@/lib/errors";
import { correlationId } from "@/lib/logging";
import { currentUserId } from "@/modules/auth/sessions";
import { importPokepaste, previewPokepaste } from "@/modules/teams/service";

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
    message: "Unable to process that Poképaste.",
    correlationId: id,
  };
}

async function userOrThrow(): Promise<string> {
  const userId = await currentUserId();
  if (!userId) throw new AppError("FORBIDDEN", "Sign in to manage teams.");
  return userId;
}

export async function previewPokepasteAction(
  url: string,
): Promise<ActionResult<Awaited<ReturnType<typeof previewPokepaste>>>> {
  const id = correlationId();
  try {
    await userOrThrow();
    return { ok: true, data: await previewPokepaste(url), correlationId: id };
  } catch (error) {
    return fail(error, id);
  }
}

export async function importPokepasteAction(
  url: string,
): Promise<ActionResult<{ teamId: string }>> {
  const id = correlationId();
  try {
    const result = await importPokepaste(await userOrThrow(), url);
    revalidatePath("/");
    revalidatePath("/teams");
    return { ok: true, data: { teamId: result.teamId }, correlationId: id };
  } catch (error) {
    return fail(error, id);
  }
}
