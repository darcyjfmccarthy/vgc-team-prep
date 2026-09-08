import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { EmptyState, StatusBadge } from "@/components/prototype-ui";
import { currentUserId } from "@/modules/auth/sessions";
import { listTeams } from "@/modules/teams/service";

export const dynamic = "force-dynamic";
export default async function TeamsPage() {
  const userId = await currentUserId();
  if (!userId) redirect("/login");
  const teams = await listTeams(userId);
  return (
    <AppShell>
      <section className="page-heading split-heading">
        <div>
          <p className="eyebrow">Team library</p>
          <h1>Teams</h1>
          <p className="muted">Versioned identities for every team you test.</p>
        </div>
        <Link className="button" href="/teams/import">
          Import team
        </Link>
      </section>
      <form className="filter-bar" aria-label="Team filters">
        <label>
          Search
          <input placeholder="Search teams, tags, or format" disabled />
        </label>
        <label>
          Status
          <select defaultValue="all">
            <option value="all">All statuses</option>
            <option>Active</option>
            <option>Testing</option>
            <option>Archived</option>
          </select>
        </label>
        <label>
          Ruleset
          <select>
            <option>All rulesets</option>
          </select>
        </label>
      </form>
      {teams.length ? (
        <div className="team-library">
          {teams.map((team) => (
            <Link
              key={team.id}
              className="team-library-card"
              href={`/teams/${team.id}`}
            >
              <div className="team-card-sprites" aria-hidden="true">
                <span>●</span>
                <span>●</span>
                <span>●</span>
                <span>●</span>
                <span>●</span>
                <span>●</span>
              </div>
              <div>
                <h2>{team.title}</h2>
                <p>
                  {team.ruleset_name} · v{team.version_number}
                </p>
                <div className="tag-row">
                  <StatusBadge value={team.status} />
                  {team.tags.map((tag) => (
                    <span className="tag-badge" key={tag}>
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              <span className="muted">Updated workspace →</span>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState title="No teams yet">
          Import a Showdown export or Poképaste to create a team workspace.
        </EmptyState>
      )}
    </AppShell>
  );
}
