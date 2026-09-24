import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PokemonStrip } from "@/components/prototype-ui";
import { ReplaySummary, ReplayTable } from "@/components/replay-ui";
import { currentUserId } from "@/modules/auth/sessions";
import { getTeamDetail } from "@/modules/teams/service";
import { factsFromRecords, listReplayRecords } from "@/modules/replays/service";
export const dynamic = "force-dynamic";
export default async function TeamOverviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ teamId: string }>;
  searchParams: Promise<{ version?: string }>;
}) {
  const userId = await currentUserId();
  if (!userId) redirect("/login");
  const { teamId } = await params,
    { version } = await searchParams;
  const team = await getTeamDetail(userId, teamId, version);
  if (!team) notFound();
  const records = (await listReplayRecords(userId, teamId)).filter(
    (r) => !version || r.team_version_id === version,
  );
  return (
    <>
      <section className="overview-hero">
        <div>
          <p className="eyebrow">Team dashboard</p>
          <h2>Preparation at a glance</h2>
          <p className="muted">
            Results and replay evidence for{" "}
            {version ? `v${team.version_number}` : "all team versions"}.
          </p>
        </div>
        <Link
          className="button secondary"
          href={`/teams/${teamId}/statistics${version ? `?version=${version}` : ""}`}
        >
          Open statistics
        </Link>
      </section>
      <ReplaySummary facts={factsFromRecords(records)} />
      <section className="panel roster-summary">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Current version</p>
            <h2>Roster</h2>
          </div>
          <Link href={`/teams/${teamId}/roster?version=${team.version_id}`}>
            View full roster
          </Link>
        </div>
        <PokemonStrip slots={team.slots} />
      </section>
      <section className="panel">
        <div className="section-heading">
          <h2>Recent games & sets</h2>
          <Link
            href={`/teams/${teamId}/replays${version ? `?version=${version}` : ""}`}
          >
            All replays
          </Link>
        </div>
        <ReplayTable records={records.slice(-5)} />
      </section>
    </>
  );
}
