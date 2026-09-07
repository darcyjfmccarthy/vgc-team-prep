import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { currentUserId } from "@/modules/auth/sessions";
import { listTeams } from "@/modules/teams/service";
import type { TeamStatus } from "@/modules/teams/types";

export const dynamic = "force-dynamic";

export default async function TeamsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const userId = await currentUserId();
  if (!userId) redirect("/login");
  const requested = (await searchParams).status;
  const status = (["active", "testing", "archived"] as string[]).includes(
    requested ?? "",
  )
    ? (requested as TeamStatus)
    : undefined;
  const teams = await listTeams(userId, status);
  return (
    <AppShell>
      <div className="title-row">
        <h1>Teams</h1>
        <Link className="button" href="/teams/import">
          Import team
        </Link>
      </div>
      <nav className="filter-row" aria-label="Filter teams by status">
        <Link href="/teams">All</Link>
        <Link href="/teams?status=active">Active</Link>
        <Link href="/teams?status=testing">Testing</Link>
        <Link href="/teams?status=archived">Archived</Link>
      </nav>
      <div className="team-list">
        {teams.map((team) => (
          <Link key={team.id} className="team-card" href={`/teams/${team.id}`}>
            <strong>{team.title}</strong>
            <span>
              v{team.version_number} · {team.ruleset_name}
            </span>
            <span>
              {team.status}
              {team.tags.length ? ` · ${team.tags.join(", ")}` : ""}
            </span>
          </Link>
        ))}
      </div>
    </AppShell>
  );
}
