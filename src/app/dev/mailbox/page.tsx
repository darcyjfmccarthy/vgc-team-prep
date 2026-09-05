import { notFound } from "next/navigation";
import { env } from "@/lib/config";
import { db } from "@/db/client";
import { AppShell } from "@/components/app-shell";

export const dynamic = "force-dynamic";

export default async function MailboxPage() {
  if (env.APP_ENV !== "local") notFound();
  const emails = await db
    .selectFrom("email_outbox")
    .selectAll()
    .orderBy("created_at", "desc")
    .limit(20)
    .execute();
  return (
    <AppShell>
      <h1>Development mailbox</h1>
      <p>Available only in local mode.</p>
      {emails.map((email) => (
        <article className="mail" key={email.id}>
          <strong>{email.subject}</strong>
          <span>To: {email.recipient}</span>
          <pre>{email.text_body}</pre>
        </article>
      ))}
    </AppShell>
  );
}
