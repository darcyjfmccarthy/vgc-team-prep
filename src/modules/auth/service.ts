import { createHash, randomBytes } from "node:crypto";
import { v7 as uuidv7 } from "uuid";
import { db } from "@/db/client";
import { env } from "@/lib/config";
import { AppError } from "@/lib/errors";
import { hashPassword, passwordPolicy, verifyPassword } from "./passwords";
import { createSession, revokeAllSessions } from "./sessions";

const normaliseEmail = (email: string) => email.trim().toLowerCase();
const tokenHash = (token: string) =>
  createHash("sha256").update(token).digest();

function validatePassword(password: string): void {
  if (
    password.length < passwordPolicy.min ||
    password.length > passwordPolicy.max
  )
    throw new AppError(
      "VALIDATION_FAILED",
      `Password must be ${passwordPolicy.min}–${passwordPolicy.max} characters.`,
      { password: ["Choose a longer passphrase."] },
    );
}

async function recordEmail(
  recipient: string,
  subject: string,
  textBody: string,
): Promise<void> {
  if (env.EMAIL_DRIVER !== "file")
    throw new AppError("PROVIDER_UNAVAILABLE", "Email is unavailable.");
  await db
    .insertInto("email_outbox")
    .values({ id: uuidv7(), recipient, subject, text_body: textBody })
    .execute();
}

export async function register(input: {
  email: string;
  password: string;
  displayName?: string;
}): Promise<{ userId: string }> {
  const email = normaliseEmail(input.email);
  if (!/^\S+@\S+\.\S+$/.test(email))
    throw new AppError("VALIDATION_FAILED", "Enter a valid email address.", {
      email: ["Enter a valid email address."],
    });
  validatePassword(input.password);
  const existing = await db
    .selectFrom("users")
    .select("id")
    .where("email_normalized", "=", email)
    .executeTakeFirst();
  if (existing)
    throw new AppError(
      "VALIDATION_FAILED",
      "Unable to create an account with those details.",
      { email: ["Unable to create an account with those details."] },
    );
  const id = uuidv7();
  await db
    .insertInto("users")
    .values({
      id,
      email_normalized: email,
      password_hash: await hashPassword(input.password),
      display_name: input.displayName?.trim() || null,
      account_state: "active",
      deleted_at: null,
    })
    .execute();
  await createSession(id);
  return { userId: id };
}

export async function login(input: {
  email: string;
  password: string;
}): Promise<void> {
  const user = await db
    .selectFrom("users")
    .selectAll()
    .where("email_normalized", "=", normaliseEmail(input.email))
    .where("account_state", "=", "active")
    .where("deleted_at", "is", null)
    .executeTakeFirst();
  if (!user || !(await verifyPassword(input.password, user.password_hash)))
    throw new AppError(
      "INVALID_CREDENTIALS",
      "Email or password is incorrect.",
    );
  await createSession(user.id);
}

export async function requestPasswordReset(emailInput: string): Promise<void> {
  const email = normaliseEmail(emailInput);
  const user = await db
    .selectFrom("users")
    .selectAll()
    .where("email_normalized", "=", email)
    .where("account_state", "=", "active")
    .executeTakeFirst();
  if (!user) return;
  const token = randomBytes(32).toString("base64url");
  await db.transaction().execute(async (trx) => {
    await trx
      .updateTable("password_reset_tokens")
      .set({ invalidated_at: new Date() })
      .where("user_id", "=", user.id)
      .where("used_at", "is", null)
      .where("invalidated_at", "is", null)
      .execute();
    await trx
      .insertInto("password_reset_tokens")
      .values({
        id: uuidv7(),
        user_id: user.id,
        token_hash: tokenHash(token),
        expires_at: new Date(Date.now() + 30 * 60 * 1000),
        used_at: null,
        invalidated_at: null,
      })
      .execute();
  });
  await recordEmail(
    user.email_normalized,
    "Reset your VGC Team Prep password",
    `${env.APP_URL}/reset-password?token=${token}`,
  );
}

export async function resetPassword(
  token: string,
  password: string,
): Promise<void> {
  validatePassword(password);
  const reset = await db
    .selectFrom("password_reset_tokens")
    .selectAll()
    .where("token_hash", "=", tokenHash(token))
    .where("used_at", "is", null)
    .where("invalidated_at", "is", null)
    .executeTakeFirst();
  if (!reset || reset.expires_at <= new Date())
    throw new AppError(
      "VALIDATION_FAILED",
      "That password reset link is invalid or expired.",
    );
  await db.transaction().execute(async (trx) => {
    await trx
      .updateTable("users")
      .set({
        password_hash: await hashPassword(password),
        updated_at: new Date(),
      })
      .where("id", "=", reset.user_id)
      .execute();
    await trx
      .updateTable("password_reset_tokens")
      .set({ used_at: new Date() })
      .where("id", "=", reset.id)
      .execute();
  });
  await revokeAllSessions(reset.user_id);
}
