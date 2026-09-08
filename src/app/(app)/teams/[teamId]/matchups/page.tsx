import { notFound, redirect } from "next/navigation";
import {
  EmptyState,
  MatchupCards,
  WarningBanner,
} from "@/components/prototype-ui";
import { fixtureForTeam } from "@/lib/prototype-data";
import { currentUserId } from "@/modules/auth/sessions";
import { getTeamDetail } from "@/modules/teams/service";

export const dynamic = "force-dynamic";
export default async function TeamMatchupsPage({
  params,
  searchParams,
}: {
  params: Promise<{ teamId: string }>;
  searchParams: Promise<{ version?: string }>;
}) {
  const userId = await currentUserId();
  if (!userId) redirect("/login");
  const teamId = (await params).teamId;
  const team = await getTeamDetail(
    userId,
    teamId,
    (await searchParams).version,
  );
  if (!team) notFound();
  const { matchups } = fixtureForTeam(team);
  return (
    <>
      <section className="page-heading split-heading">
        <div>
          <p className="eyebrow">Matchup preparation</p>
          <h2>Plans for this team</h2>
          <p className="muted">
            Structured leads, backs, compositions, and evidence stay attached to
            the team.
          </p>
        </div>
        <button type="button" className="button" disabled>
          New matchup plan
        </button>
      </section>
      <WarningBanner>
        Rain balance references a changed team slot. Review its lead and back
        choices before relying on it.
      </WarningBanner>
      <MatchupCards
        matchups={matchups}
        teamId={teamId}
        versionId={team.version_id}
      />
      <EmptyState title="No more matchup plans">
        Create plans from opposing teams or archetypes as preparation work
        grows.
      </EmptyState>
    </>
  );
}
