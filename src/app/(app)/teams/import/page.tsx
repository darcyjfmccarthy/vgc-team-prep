import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { TeamImportForm } from "@/components/team-import-form";
import { currentUserId } from "@/modules/auth/sessions";

export const dynamic = "force-dynamic";

export default async function ImportTeamPage() {
  if (!(await currentUserId())) redirect("/login");
  return (
    <AppShell>
      <h1>Import a team</h1>
      <p>
        Paste Showdown export text or provide a Poképaste URL, then preview the
        parsed team before saving.
      </p>
      <TeamImportForm />
    </AppShell>
  );
}
