import Link from "next/link";
import { notFound } from "next/navigation";
import { WarningBanner } from "@/components/prototype-ui";
import { prototypeMatchups } from "@/lib/prototype-data";

export default async function TeamMatchupDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ teamId: string; matchupId: string }>;
  searchParams: Promise<{ version?: string }>;
}) {
  const { teamId, matchupId } = await params;
  const version = (await searchParams).version;
  const matchup = prototypeMatchups.find((item) => item.id === matchupId);
  if (!matchup) notFound();

  return (
    <>
      <Link
        href={`/teams/${teamId}/matchups${version ? `?version=${version}` : ""}`}
      >
        ← Team matchups
      </Link>
      <section className="page-heading">
        <p className="eyebrow">{matchup.kind}</p>
        <h2>{matchup.target}</h2>
        <p className="muted">{matchup.updatedAt}</p>
      </section>
      {matchup.status === "needs review" && (
        <WarningBanner>
          A referenced team slot changed after this plan was last validated.
        </WarningBanner>
      )}
      <div className="detail-grid">
        <section className="panel">
          <h2>Preferred composition</h2>
          <dl className="compact-dl">
            <div>
              <dt>Leads</dt>
              <dd>{matchup.leads}</dd>
            </div>
            <div>
              <dt>Backs</dt>
              <dd>{matchup.backs}</dd>
            </div>
            <div>
              <dt>Alternative</dt>
              <dd>Adapt to team preview</dd>
            </div>
          </dl>
        </section>
        <section className="panel">
          <h2>Evidence</h2>
          <p>
            <strong>{matchup.evidenceCount}</strong> linked team replays
          </p>
          <p className="muted">Personal results remain scoped to this team.</p>
        </section>
        <section className="panel detail-wide">
          <h2>Game plan</h2>
          <p>
            Preserve board control early, reveal the flexible slot late, and
            keep the speed-control answer available for the endgame.
          </p>
          <h3>Win conditions</h3>
          <p>Establish a favorable endgame with the chosen backs.</p>
          <h3>Key threats and failure modes</h3>
          <p>
            Opposing speed control should trigger the alternative composition.
          </p>
          <h3>Turn-one options</h3>
          <p>
            Default to pressure plus positioning while information is unknown.
          </p>
        </section>
      </div>
    </>
  );
}
