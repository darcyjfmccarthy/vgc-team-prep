import { hostname } from "node:os";
import { claimJob, completeJob } from "./queue";
import { db } from "@/db/client";
import { processReplay } from "@/modules/replays/service";
import { log } from "@/lib/logging";

async function runOnce(): Promise<boolean> {
  const job = await claimJob(`${hostname()}:${process.pid}`);
  if (!job) return false;
  try {
    if (job.kind === "replay.import" && job.user_id)
      await processReplay(job.user_id, job.subject_id);
    else if (job.kind !== "development.succeed")
      throw new Error("Unsupported job");
    await completeJob(job.id, "succeeded");
  } catch {
    log("job_failed", {
      jobId: job.id,
      kind: job.kind,
      correlationId: job.correlation_id,
      attempt: job.attempt_count,
    });
    await completeJob(
      job.id,
      "failed",
      job.kind === "replay.import"
        ? "REPLAY_PROCESSING_FAILED"
        : "DEVELOPMENT_FAILURE",
    );
  }
  return true;
}

async function main() {
  if (process.argv.includes("--once")) {
    await runOnce();
    return;
  }
  while (true) {
    if (!(await runOnce()))
      await new Promise((resolve) => setTimeout(resolve, 1_000));
  }
}

main().finally(() => {
  if (process.argv.includes("--once")) void db.destroy();
});
