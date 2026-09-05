import { db } from "../src/db/client";

async function main() {
  const [command, jobId] = process.argv.slice(2);
  if (command === "list")
    console.table(
      await db
        .selectFrom("jobs")
        .select([
          "id",
          "kind",
          "status",
          "attempt_count",
          "safe_error_code",
          "created_at",
        ])
        .orderBy("created_at", "desc")
        .execute(),
    );
  else if (command === "retry" && jobId)
    await db
      .updateTable("jobs")
      .set({
        status: "available",
        available_at: new Date(),
        safe_error_code: null,
      })
      .where("id", "=", jobId)
      .where("status", "=", "failed")
      .execute();
  else throw new Error("Use jobs:list or jobs:retry -- <jobId>.");
}
main().finally(() => db.destroy());
