import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { currentUserId } from "@/modules/auth/sessions";
import { listTeams } from "@/modules/teams/service";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const userId = await currentUserId();
  if (!userId) redirect("/login");
  const teams = await listTeams(userId);
  return (
    <AppShell>
      <section className="hero">
        <p className="eyebrow">Private preparation workspace</p>
        <h1>Your teams</h1>
        <p>
          Import a Poképaste, keep its source, and review every set before
          battle analysis begins.
        </p>
        <Link className="button" href="/teams/import">
          Import a Poképaste
        </Link>
      </section>
      <section>
        <h2>Recent teams</h2>
        {teams.length ? (
          <div className="team-list">
            {teams.map((team) => (
              <Link
                key={team.id}
                className="team-card"
                href={`/teams/${team.id}`}
              >
                <strong>{team.title}</strong>
                <span>
                  v{team.version_number} · {team.ruleset_name}
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <p>No teams yet.</p>
        )}
      </section>
    </AppShell>
  );
}
