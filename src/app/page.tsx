import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { EmptyState, StatCard, StatusBadge } from "@/components/prototype-ui";
import { knowledgeEntries } from "@/lib/prototype-data";
import { currentUserId } from "@/modules/auth/sessions";
import { listTeams } from "@/modules/teams/service";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const userId = await currentUserId();
  if (!userId) redirect("/login");

  const teams = await listTeams(userId);
  const active = teams.find((team) => team.status === "active") ?? teams[0];

  return (
    <AppShell>
      <section className="home-hero">
        <div>
          <p className="eyebrow">Private preparation workspace</p>
          <h1>Choose a team. Prepare with context.</h1>
          <p>
            Every replay, statistic, matchup plan, and calculation starts from a
            versioned team workspace.
          </p>
        </div>
        <Link className="button" href="/teams/import">
          Import a team
        </Link>
      </section>

      {active ? (
        <section className="active-team panel">
          <div>
            <p className="eyebrow">Continue preparing</p>
            <h2>{active.title}</h2>
            <p className="muted">
              v{active.version_number} · {active.ruleset_name}
            </p>
            <div className="tag-row">
              <StatusBadge value={active.status} />
              {active.tags.map((tag) => (
                <span className="tag-badge" key={tag}>
                  {tag}
                </span>
              ))}
            </div>
          </div>
          <Link className="button secondary" href={`/teams/${active.id}`}>
            Open team workspace
          </Link>
        </section>
      ) : (
        <EmptyState title="Your first team starts here">
          Import a Showdown export or Poképaste to create a versioned team
          workspace.
        </EmptyState>
      )}

      <section className="metric-grid" aria-label="Workspace summary">
        <StatCard
          label="Teams"
          value={String(teams.length)}
          detail="All versioned team identities"
        />
        <StatCard
          label="Active"
          value={String(
            teams.filter((team) => team.status === "active").length,
          )}
          detail="Teams marked active"
        />
        <StatCard
          label="Testing"
          value={String(
            teams.filter((team) => team.status === "testing").length,
          )}
          detail="Teams still being refined"
        />
        <StatCard
          label="Knowledge"
          value={String(knowledgeEntries.length)}
          detail="Reusable opposing sets and archetypes"
        />
      </section>

      <div className="dashboard-grid">
        <section className="panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Your workspaces</p>
              <h2>Recent teams</h2>
            </div>
            <Link href="/teams">All teams</Link>
          </div>
          <div className="home-list">
            {teams.slice(0, 4).map((team) => (
              <Link
                className="home-list-item"
                href={`/teams/${team.id}`}
                key={team.id}
              >
                <span>
                  <strong>{team.title}</strong>
                  <small>{team.ruleset_name}</small>
                </span>
                <span>v{team.version_number} →</span>
              </Link>
            ))}
          </div>
        </section>
        <section className="panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Across teams</p>
              <h2>Recent knowledge</h2>
            </div>
            <Link href="/knowledge">Knowledge library</Link>
          </div>
          <div className="home-list">
            {knowledgeEntries.map((entry) => (
              <div className="home-list-item" key={entry.id}>
                <span>
                  <strong>{entry.name}</strong>
                  <small>{entry.kind}</small>
                </span>
                <span className="muted">Reusable</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
