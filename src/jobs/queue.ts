import { v7 as uuidv7 } from "uuid";
import { db } from "@/db/client";

export async function enqueueJob(input: {
  kind: string;
  userId?: string;
  subjectType: string;
  subjectId: string;
  idempotencyKey: string;
  correlationId: string;
  maxAttempts?: number;
}) {
  const existing = await db
    .selectFrom("jobs")
    .select("id")
    .where("kind", "=", input.kind)
    .where("idempotency_key", "=", input.idempotencyKey)
    .where("user_id", "is", input.userId ?? null)
    .executeTakeFirst();
  if (existing) return existing.id;
  const id = uuidv7();
  await db
    .insertInto("jobs")
    .values({
      id,
      kind: input.kind,
      user_id: input.userId ?? null,
      subject_type: input.subjectType,
      subject_id: input.subjectId,
      idempotency_key: input.idempotencyKey,
      status: "available",
      priority: 0,
      available_at: new Date(),
      lease_expires_at: null,
      leased_by: null,
      attempt_count: 0,
      max_attempts: input.maxAttempts ?? 3,
      safe_error_code: null,
      safe_error_detail: null,
      correlation_id: input.correlationId,
      completed_at: null,
    })
    .execute();
  return id;
}

export async function claimJob(workerId: string) {
  return db.transaction().execute(async (trx) => {
    const now = new Date();
    const job = await trx
      .selectFrom("jobs")
      .selectAll()
      .where((eb) =>
        eb.or([
          eb.and([
            eb("status", "in", ["available", "retry_wait"]),
            eb("available_at", "<=", now),
          ]),
          eb.and([
            eb("status", "=", "running"),
            eb("lease_expires_at", "<", now),
          ]),
        ]),
      )
      .orderBy("priority", "desc")
      .orderBy("available_at")
      .forUpdate()
      .skipLocked()
      .executeTakeFirst();
    if (!job) return null;
    const attemptCount = job.attempt_count + 1;
    await trx
      .updateTable("jobs")
      .set({
        status: "running",
        attempt_count: attemptCount,
        leased_by: workerId,
        lease_expires_at: new Date(now.getTime() + 60_000),
        updated_at: now,
      })
      .where("id", "=", job.id)
      .execute();
    await trx
      .insertInto("job_attempts")
      .values({
        id: uuidv7(),
        job_id: job.id,
        attempt_number: attemptCount,
        worker_id: workerId,
        started_at: now,
        finished_at: null,
        outcome: null,
        safe_error_code: null,
        duration_ms: null,
        correlation_id: job.correlation_id,
      })
      .execute();
    return { ...job, attempt_count: attemptCount };
  });
}

export async function completeJob(
  jobId: string,
  outcome: "succeeded" | "failed",
  code?: string,
) {
  const now = new Date();
  const job = await db
    .selectFrom("jobs")
    .selectAll()
    .where("id", "=", jobId)
    .executeTakeFirstOrThrow();
  const retry = outcome === "failed" && job.attempt_count < job.max_attempts;
  await db.transaction().execute(async (trx) => {
    await trx
      .updateTable("jobs")
      .set({
        status: retry ? "retry_wait" : outcome,
        available_at: retry ? new Date(now.getTime() + 1_000) : now,
        lease_expires_at: null,
        safe_error_code: code ?? null,
        updated_at: now,
        completed_at: retry ? null : now,
      })
      .where("id", "=", jobId)
      .execute();
    await trx
      .updateTable("job_attempts")
      .set({
        finished_at: now,
        outcome: retry ? "retry" : outcome,
        safe_error_code: code ?? null,
        duration_ms: 0,
      })
      .where("job_id", "=", jobId)
      .where("attempt_number", "=", job.attempt_count)
      .execute();
  });
}
