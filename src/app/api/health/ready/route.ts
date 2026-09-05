import { db } from "@/db/client";
export async function GET() {
  try {
    await db.selectFrom("users").select("id").limit(1).execute();
    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false }, { status: 503 });
  }
}
