import { config as loadEnv } from "dotenv";
import { z } from "zod";

loadEnv({ path: ".env.local", quiet: true });

const schema = z.object({
  APP_ENV: z.enum(["local", "test", "production"]).default("local"),
  APP_URL: z.url().default("http://localhost:3000"),
  DATABASE_URL: z
    .string()
    .min(1)
    .default("postgresql://vgc:vgc@127.0.0.1:55432/vgc_dev"),
  SESSION_SECRET: z
    .string()
    .min(32)
    .default("local-development-secret-change-me-32-bytes"),
  EMAIL_DRIVER: z.enum(["file", "ses"]).default("file"),
  REPLAY_PROVIDER_MODE: z.enum(["fixtures", "connected"]).default("fixtures"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("debug"),
});

const parsed = schema.parse(process.env);

if (
  parsed.APP_ENV === "production" &&
  (parsed.EMAIL_DRIVER === "file" || parsed.REPLAY_PROVIDER_MODE === "fixtures")
) {
  throw new Error(
    "Production refuses development email and fixture provider modes.",
  );
}

export const env = parsed;
