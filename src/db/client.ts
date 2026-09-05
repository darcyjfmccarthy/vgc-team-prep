import { Kysely, PostgresDialect } from "kysely";
import { Pool } from "pg";
import { env } from "@/lib/config";
import type { Database } from "./types";

const globalForDb = globalThis as unknown as {
  db?: Kysely<Database>;
  pool?: Pool;
};

export const db =
  globalForDb.db ??
  new Kysely<Database>({
    dialect: new PostgresDialect({
      pool:
        globalForDb.pool ?? new Pool({ connectionString: env.DATABASE_URL }),
    }),
  });

if (env.APP_ENV !== "production") globalForDb.db = db;
