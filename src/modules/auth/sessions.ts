import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { v7 as uuidv7 } from "uuid";
import { db } from "@/db/client";
import { env } from "@/lib/config";

const cookieName =
  env.APP_ENV === "production" ? "__Host-vgc_session" : "vgc_session";
const hashToken = (token: string) =>
  createHash("sha256").update(token).digest();

export async function createSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const now = new Date();
  await db
    .insertInto("sessions")
    .values({
      id: uuidv7(),
      user_id: userId,
      token_hash: hashToken(token),
      last_seen_at: now,
      idle_expires_at: new Date(now.getTime() + 12 * 60 * 60 * 1000),
      absolute_expires_at: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
      revoked_at: null,
      user_agent_summary: null,
    })
    .execute();
  const store = await cookies();
  store.set(cookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.APP_ENV === "production",
    path: "/",
    maxAge: 30 * 24 * 60 * 60,
  });
}

export async function currentUserId(): Promise<string | null> {
  const token = (await cookies()).get(cookieName)?.value;
  if (!token) return null;
  const now = new Date();
  const session = await db
    .selectFrom("sessions")
    .selectAll()
    .where("token_hash", "=", hashToken(token))
    .where("revoked_at", "is", null)
    .executeTakeFirst();
  if (
    !session ||
    session.idle_expires_at <= now ||
    session.absolute_expires_at <= now
  )
    return null;
  if (now.getTime() - session.last_seen_at.getTime() > 5 * 60 * 1000)
    await db
      .updateTable("sessions")
      .set({
        last_seen_at: now,
        idle_expires_at: new Date(now.getTime() + 12 * 60 * 60 * 1000),
      })
      .where("id", "=", session.id)
      .execute();
  return session.user_id;
}

export async function revokeCurrentSession(): Promise<void> {
  const store = await cookies();
  const token = store.get(cookieName)?.value;
  if (token)
    await db
      .updateTable("sessions")
      .set({ revoked_at: new Date() })
      .where("token_hash", "=", hashToken(token))
      .execute();
  store.delete(cookieName);
}

export async function revokeAllSessions(userId: string): Promise<void> {
  await db
    .updateTable("sessions")
    .set({ revoked_at: new Date() })
    .where("user_id", "=", userId)
    .where("revoked_at", "is", null)
    .execute();
}
