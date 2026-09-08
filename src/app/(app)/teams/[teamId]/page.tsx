import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  GameTable,
  MatchupCards,
  PokemonStrip,
  StatCard,
  WarningBanner,
} from "@/components/prototype-ui";
import { fixtureForTeam } from "@/lib/prototype-data";
import { currentUserId } from "@/modules/auth/sessions";
import { getTeamDetail } from "@/modules/teams/service";

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
  const teamId = (await params).teamId;
  const team = await getTeamDetail(
    userId,
    teamId,
    (await searchParams).version,
  );
  if (!team) notFound();
  const fixture = fixtureForTeam(team);
  return (
    <>
      <section className="overview-hero">
        <div>
          <p className="eyebrow">Team dashboard</p>
          <h2>Preparation at a glance</h2>
          <p className="muted">
            A version-aware view of results, rehearsal, and matchup work.
          </p>
        </div>
        <Link
          className="button secondary"
          href={`/teams/${teamId}/statistics?version=${team.version_id}`}
        >
          Open statistics
        </Link>
      </section>
      <section className="metric-grid" aria-label="Team performance">
        <StatCard
          label="Games"
          value="18–11"
          detail="62% · 18 wins / 29 games"
        />
        <StatCard label="Sets" value="7–3" detail="70% · 7 wins / 10 sets" />
        <StatCard
          label="Selection"
          value="Froslass"
          detail="83% · 24 selected / 29 games"
        />
        <StatCard label="Latest session" value="4–1" detail="5 games · Today" />
      </section>
      <WarningBanner>
        One replay needs your player-side confirmation, and the Rain balance
        plan needs review after this version change.
      </WarningBanner>
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
      <div className="dashboard-grid">
        <section className="panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Evidence</p>
              <h2>Recent games & sets</h2>
            </div>
            <Link href={`/teams/${teamId}/replays?version=${team.version_id}`}>
              All replays
            </Link>
          </div>
          <GameTable
            games={fixture.games.slice(0, 3)}
            teamId={teamId}
            versionId={team.version_id}
            compact
          />
        </section>
        <section className="panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Preparation</p>
              <h2>Matchup readiness</h2>
            </div>
            <Link href={`/teams/${teamId}/matchups?version=${team.version_id}`}>
              All matchups
            </Link>
          </div>
          <MatchupCards
            matchups={fixture.matchups.slice(0, 2)}
            teamId={teamId}
            versionId={team.version_id}
          />
        </section>
      </div>
    </>
  );
}
