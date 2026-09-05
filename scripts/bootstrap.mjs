import {
  existsSync,
  copyFileSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
} from "node:fs";
import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";

if (!process.version.startsWith("v24.20.0"))
  throw new Error(`Node 24.20.0 is required; found ${process.version}.`);
if (!existsSync(".env.local")) {
  copyFileSync(".env.example", ".env.local");
  const secret = randomBytes(32).toString("hex");
  writeFileSync(
    ".env.local",
    readFileSync(".env.local", "utf8").replace(
      "SESSION_SECRET=",
      `SESSION_SECRET=${secret}`,
    ),
  );
}
mkdirSync(".local/mail", { recursive: true });
const docker = spawnSync("docker", ["compose", "up", "-d", "postgres"], {
  stdio: "inherit",
});
if (docker.status !== 0)
  throw new Error(
    "Docker Compose could not start PostgreSQL. Ensure Docker Desktop is running in Linux-container mode.",
  );
console.log(
  "Bootstrap complete. Run npm run db:migrate, npm run db:seed, then npm run dev.",
);
