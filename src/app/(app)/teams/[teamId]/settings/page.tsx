import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { TeamManagement } from "@/components/team-management";
import { currentUserId } from "@/modules/auth/sessions";
import { getTeamDetail, listTeamVersions } from "@/modules/teams/service";

export const dynamic = "force-dynamic";
export default async function TeamSettingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ teamId: string }>;
  searchParams: Promise<{ version?: string }>;
}) {
  const userId = await currentUserId();
  if (!userId) redirect("/login");
  const teamId = (await params).teamId;
  const [team, latest, versions] = await Promise.all([
    getTeamDetail(userId, teamId, (await searchParams).version),
    getTeamDetail(userId, teamId),
    listTeamVersions(userId, teamId),
  ]);
  if (!team || !latest) notFound();
  return (
    <>
      <section className="page-heading">
        <p className="eyebrow">Team configuration</p>
        <h2>Team settings</h2>
        <p className="muted">
          Metadata does not alter history. Competitive revisions create a new
          immutable version.
        </p>
      </section>
      <section className="panel source-panel">
        <div className="section-heading">
          <h2>Version history</h2>
          <span className="muted">v{team.version_number} selected</span>
        </div>
        <nav className="version-nav" aria-label="Team version history">
          {versions.map((version) => (
            <Link
              key={version.id}
              className={
                version.id === team.version_id
                  ? "version-link current"
                  : "version-link"
              }
              href={`/teams/${teamId}/settings?version=${version.id}`}
            >
              v{version.version_number}
              {version.id === latest.version_id ? " · latest" : ""}
            </Link>
          ))}
        </nav>
        {team.change_summary && <p>{team.change_summary}</p>}
      </section>
      {team.source_text && (
        <details className="panel source-panel">
          <summary>
            View retained{" "}
            {team.source_kind === "pokepaste" ? "Poképaste" : "Showdown"} source
          </summary>
          <pre>{team.source_text}</pre>
        </details>
      )}
      {team.version_id === latest.version_id && (
        <TeamManagement
          team={{
            id: teamId,
            title: latest.title,
            description: latest.description,
            status: latest.status,
            teamRevision: latest.team_revision,
            sourceText: latest.source_text ?? "",
            tags: latest.tags,
          }}
          subjects={[]}
          notes={[]}
          includeNotes={false}
        />
      )}
    </>
  );
}
