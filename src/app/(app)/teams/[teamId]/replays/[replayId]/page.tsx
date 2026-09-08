import Link from "next/link";
import { notFound } from "next/navigation";
import { prototypeGames } from "@/lib/prototype-data";

export default async function TeamReplayDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ teamId: string; replayId: string }>;
  searchParams: Promise<{ version?: string }>;
}) {
  const { teamId, replayId } = await params;
  const version = (await searchParams).version;
  const replay = prototypeGames.find((game) => game.id === replayId);
  if (!replay) notFound();

  return (
    <>
      <Link
        href={`/teams/${teamId}/replays${version ? `?version=${version}` : ""}`}
      >
        ← Team replays
      </Link>
      <section className="page-heading">
        <p className="eyebrow">
          {replay.format} · {replay.playedAt}
        </p>
        <h2>{replay.opponent}</h2>
        <p className="muted">{replay.score} · Parsed fixture record</p>
      </section>
      <div className="detail-grid">
        <section className="panel">
          <h2>Battle summary</h2>
          <dl className="compact-dl">
            <div>
              <dt>Your lead</dt>
              <dd>{replay.leads}</dd>
            </div>
            <div>
              <dt>Result</dt>
              <dd>{replay.result}</dd>
            </div>
            <div>
              <dt>Team version</dt>
              <dd>Selected workspace version</dd>
            </div>
          </dl>
        </section>
        <section className="panel">
          <h2>Source & parser</h2>
          <p className="muted">
            Source retained · parser v0.1 · import status: {replay.status}
          </p>
          <a
            href="https://replay.pokemonshowdown.com/"
            target="_blank"
            rel="noreferrer"
          >
            Open original replay
          </a>
        </section>
        <section className="panel detail-wide">
          <h2>Parsed timeline</h2>
          <ol className="timeline">
            <li>Team preview recorded</li>
            <li>{replay.leads} selected as lead</li>
            <li>Turn events are represented as fixture content</li>
            <li>Result recorded as {replay.result}</li>
          </ol>
        </section>
        <section className="panel detail-wide">
          <h2>Corrections</h2>
          <p className="muted">
            Ownership, team version, and result corrections will save here when
            replay ingestion is built.
          </p>
          <button type="button" className="secondary" disabled>
            Edit fixture metadata
          </button>
        </section>
      </div>
    </>
  );
}
