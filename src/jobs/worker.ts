import { hostname } from "node:os";
import { claimJob, completeJob } from "./queue";
import { db } from "@/db/client";

async function runOnce(): Promise<boolean> {
  const job = await claimJob(`${hostname()}:${process.pid}`);
  if (!job) return false;
  await completeJob(
    job.id,
    job.kind === "development.fail" ? "failed" : "succeeded",
    job.kind === "development.fail" ? "DEVELOPMENT_FAILURE" : undefined,
  );
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
