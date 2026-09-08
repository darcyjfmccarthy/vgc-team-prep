import { currentUserId } from "@/modules/auth/sessions";
import { calculateDamage } from "@/modules/calculator/engine";
import { damageEvaluationSchema } from "@/modules/calculator/validation";
import { correlationId, log } from "@/lib/logging";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const requestId = correlationId();
  const userId = await currentUserId();
  if (!userId)
    return Response.json(
      {
        ok: false,
        code: "UNAUTHENTICATED",
        message: "Sign in to use the damage calculator.",
        correlationId: requestId,
      },
      { status: 401 },
    );

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      {
        ok: false,
        code: "INVALID_JSON",
        message: "The calculation request was not valid JSON.",
        correlationId: requestId,
      },
      { status: 400 },
    );
  }

  const parsed = damageEvaluationSchema.safeParse(body);
  if (!parsed.success)
    return Response.json(
      {
        ok: false,
        code: "VALIDATION_FAILED",
        message: "Check the calculator inputs and try again.",
        issues: parsed.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
        correlationId: requestId,
      },
      { status: 400 },
    );

  const startedAt = performance.now();
  try {
    const result = calculateDamage(parsed.data);
    const durationMs = performance.now() - startedAt;
    if (durationMs > 150)
      log("calculator.evaluation_slow", {
        correlationId: requestId,
        durationMs: Math.round(durationMs),
        confidence: result.confidence,
      });
    return Response.json(
      { ok: true, data: result, correlationId: requestId },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    log("calculator.evaluation_failed", {
      correlationId: requestId,
      errorType: error instanceof Error ? error.name : "unknown",
    });
    return Response.json(
      {
        ok: false,
        code: "CALCULATION_FAILED",
        message: "The damage engine could not evaluate these inputs.",
        correlationId: requestId,
      },
      { status: 422 },
    );
  }
}
