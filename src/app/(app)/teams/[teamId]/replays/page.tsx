import { notFound, redirect } from "next/navigation";
import {
  EmptyState,
  GameTable,
  WarningBanner,
} from "@/components/prototype-ui";
import { fixtureForTeam } from "@/lib/prototype-data";
import { currentUserId } from "@/modules/auth/sessions";
import { getTeamDetail } from "@/modules/teams/service";

export const dynamic = "force-dynamic";
export default async function TeamReplaysPage({
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
  const { games } = fixtureForTeam(team);
  return (
    <>
      <section className="page-heading split-heading">
        <div>
          <p className="eyebrow">Replay evidence</p>
          <h2>Games and sets</h2>
          <p className="muted">
            Fixture view for the upcoming replay-import workflow.
          </p>
        </div>
        <button type="button" className="button" disabled>
          Paste replay URLs
        </button>
      </section>
      <WarningBanner>
        1 item needs player-side confirmation. 1 private replay could not be
        retrieved; update the URL before retrying.
      </WarningBanner>
      <section className="panel">
        <div className="section-heading">
          <h2>Latest import batch</h2>
          <span className="muted">2 parsed · 1 needs input · 1 failed</span>
        </div>
        <GameTable games={games} teamId={teamId} versionId={team.version_id} />
      </section>
      <EmptyState title="No older replay batches">
        When replay importing is available, each batch will keep progress and
        item-level outcomes here.
      </EmptyState>
    </>
  );
}
