import { promises as fs } from "node:fs";
import path from "node:path";
import { FileMigrationProvider, Migrator, sql } from "kysely";
import { db } from "../src/db/client";

const migrator = new Migrator({
  db,
  provider: new FileMigrationProvider({
    fs,
    path,
    migrationFolder: path.join(process.cwd(), "src", "db", "migrations"),
  }),
});

async function main(): Promise<void> {
  const command = process.argv[2] ?? "status";
  if (command === "migrate") {
    const { error, results } = await migrator.migrateToLatest();
    results?.forEach((result) =>
      console.log(`${result.status}: ${result.migrationName}`),
    );
    if (error) throw error;
  } else if (command === "rollback") {
    const { error, results } = await migrator.migrateDown();
    results?.forEach((result) =>
      console.log(`${result.status}: ${result.migrationName}`),
    );
    if (error) throw error;
  } else if (command === "status") {
    const migrations = await migrator.getMigrations();
    migrations.forEach((migration) =>
      console.log(
        `${migration.executedAt ? "applied" : "pending"}: ${migration.name}`,
      ),
    );
  } else if (command === "test-migrations") {
    const up = await migrator.migrateToLatest();
    if (up.error) throw up.error;
    const down = await migrator.migrateDown();
    if (down.error) throw down.error;
    const again = await migrator.migrateToLatest();
    if (again.error) throw again.error;
  } else if (command === "reset") {
    const target = new URL(
      process.env.DATABASE_URL ??
        "postgresql://vgc:vgc@127.0.0.1:55432/vgc_dev",
    );
    if (
      !["localhost", "127.0.0.1", "::1"].includes(target.hostname) ||
      !/^vgc_(dev|test)/.test(target.pathname.slice(1))
    )
      throw new Error(
        "db:reset refuses a non-local non-vgc_dev/test database.",
      );
    await sql`drop schema public cascade; create schema public`.execute(db);
    const result = await migrator.migrateToLatest();
    if (result.error) throw result.error;
  } else throw new Error(`Unknown database command: ${command}`);
}

main().finally(() => db.destroy());
