import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { currentUserId } from "@/modules/auth/sessions";
import { listTeams } from "@/modules/teams/service";

export const dynamic = "force-dynamic";

export default async function TeamsPage() {
  const userId = await currentUserId();
  if (!userId) redirect("/login");
  const teams = await listTeams(userId);
  return (
    <AppShell>
      <div className="title-row">
        <h1>Teams</h1>
        <Link className="button" href="/teams/import">
          Import team
        </Link>
      </div>
      <div className="team-list">
        {teams.map((team) => (
          <Link key={team.id} className="team-card" href={`/teams/${team.id}`}>
            <strong>{team.title}</strong>
            <span>
              v{team.version_number} · {team.ruleset_name}
            </span>
          </Link>
        ))}
      </div>
    </AppShell>
  );
}
