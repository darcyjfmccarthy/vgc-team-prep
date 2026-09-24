import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { currentUserId } from "@/modules/auth/sessions";
import { listTeamVersions } from "@/modules/teams/service";
import {
  getReplayNote,
  listReplayRecords,
  replaySource,
} from "@/modules/replays/service";
import { battleImpact } from "@/modules/replays/presentation";
import { ReplayForm, ReplayRefresh } from "@/components/replay-form";
import { BattleFormation, BattleStory } from "@/components/battle-review";
import { DamageChart } from "@/components/damage-chart";
import { BattleIcon } from "@/components/battle-visuals";
import { renderSafeMarkdown } from "@/modules/notes/markdown";
export const dynamic = "force-dynamic";
export default async function TeamReplayDetailPage({
  params,
}: {
  params: Promise<{ teamId: string; replayId: string }>;
}) {
  const userId = await currentUserId();
  if (!userId) redirect("/login");
  const { teamId, replayId } = await params;
  const records = await listReplayRecords(userId, teamId),
    game = records.find((r) => r.id === replayId);
  if (!game) notFound();
  const [source, note, versions] = await Promise.all([
    replaySource(userId, replayId),
    getReplayNote(userId, `game:${replayId}`),
    listTeamVersions(userId, teamId),
  ]);
  const p = game.output,
    version = versions.find((v) => v.id === game.team_version_id);
  const ownSide = game.user_side ?? "p1",
    otherSide = ownSide === "p1" ? "p2" : "p1";
  const impact = p ? battleImpact(p) : [];
  const siblings = p?.series
    ? records
        .filter((r) => r.output?.series?.key === p.series?.key)
        .sort(
          (a, b) => a.output!.series!.gameNumber - b.output!.series!.gameNumber,
        )
    : [];
  return (
    <div className="analysis-page">
      <Link className="back-link" href={`/teams/${teamId}/replays`}>
        ← Games and sets
      </Link>
      <section className="battle-heading">
        <div>
          <p className="eyebrow">
            {p?.series
              ? `Best of three · Game ${p.series.gameNumber}`
              : "Game review"}
          </p>
          <h2>
            {game.user_side && p
              ? `vs ${p.players[otherSide].name}`
              : p
                ? `${p.players.p1.name} vs ${p.players.p2.name}`
                : "Processing replay"}
          </h2>
          <div className="battle-meta">
            <span className={`outcome-pill result-${game.result}`}>
              {game.result === "win"
                ? "Victory"
                : game.result === "loss"
                  ? "Defeat"
                  : game.result === "tie"
                    ? "Draw"
                    : "Awaiting result"}
            </span>
            <span>
              <BattleIcon name="clock" />
              {p?.turns ?? "—"} {p?.turns === 1 ? "turn" : "turns"}
            </span>
            {version && <span>Team v{version.version_number}</span>}
            {p?.occurredAt && (
              <span>
                {new Date(p.occurredAt).toLocaleDateString("en-AU", {
                  day: "numeric",
                  month: "long",
                  timeZone: "UTC",
                })}
              </span>
            )}
          </div>
        </div>
        <a
          className="button"
          href={game.canonical_url}
          target="_blank"
          rel="noreferrer"
        >
          Watch replay ↗
        </a>
      </section>
      {siblings.length > 1 && (
        <nav className="set-game-nav" aria-label="Games in this set">
          {siblings.map((g) => (
            <Link
              key={g.id}
              aria-current={g.id === replayId ? "page" : undefined}
              href={`/teams/${teamId}/replays/${g.id}`}
            >
              Game {g.output!.series!.gameNumber}
              <span className={`form-result result-${g.result}`}>
                {g.result === "win" ? "W" : g.result === "loss" ? "L" : "–"}
              </span>
            </Link>
          ))}
          <Link href={`/teams/${teamId}/statistics`}>Team statistics →</Link>
        </nav>
      )}
      {["queued", "fetching", "parsing"].includes(game.status) && (
        <ReplayRefresh active />
      )}
      {game.error_detail && <p role="alert">{game.error_detail}</p>}
      {p && (
        <>
          <div className="battle-formations">
            <BattleFormation
              replay={p}
              side={ownSide}
              label={game.user_side ? "Your four" : "Player 1"}
            />
            <BattleFormation
              replay={p}
              side={otherSide}
              label={game.user_side ? "Their four" : "Player 2"}
            />
          </div>
          <section className="battle-impact">
            <div className="analysis-heading">
              <div>
                <p className="eyebrow">Making an impact</p>
                <h2>Damage by Pokémon</h2>
              </div>
              <p>
                Approximate HP removed and lost, from the visible health bars.
              </p>
            </div>
            <div className="impact-columns">
              <section className="usage-card">
                <h3>{game.user_side ? "Your team" : "Player 1"}</h3>
                <DamageChart rows={impact.filter((r) => r.side === ownSide)} />
              </section>
              <section className="usage-card">
                <h3>{game.user_side ? "Their team" : "Player 2"}</h3>
                <DamageChart
                  rows={impact.filter((r) => r.side === otherSide)}
                />
              </section>
            </div>
          </section>
          <BattleStory replay={p} perspective={game.user_side ?? undefined} />
        </>
      )}
      <section className="battle-notes">
        <h2>Your takeaways</h2>
        {note && (
          <div
            className="markdown-content"
            dangerouslySetInnerHTML={{ __html: renderSafeMarkdown(note) }}
          />
        )}
        <details open={!note}>
          <summary>{note ? "Edit game note" : "Add a game note"}</summary>
          <ReplayForm teamId={teamId} operation="note" label="Save game note">
            <input type="hidden" name="subjectKey" value={`game:${replayId}`} />
            <label>
              Notes
              <textarea
                name="markdown"
                defaultValue={note}
                rows={3}
                placeholder="What worked? What would you change next time?"
              />
            </label>
          </ReplayForm>
        </details>
      </section>
      <details
        className="replay-utilities"
        open={game.status === "needs_input"}
      >
        <summary>
          {game.status === "needs_input"
            ? "Confirm your player or team version"
            : "Game settings & import details"}
        </summary>
        <section>
          <h3>Player and team version</h3>
          <ReplayForm
            teamId={teamId}
            operation="correct"
            label="Save correction and reprocess"
          >
            <input type="hidden" name="gameId" value={replayId} />
            <div className="filter-bar">
              <label>
                Your player
                <select name="side" defaultValue={game.user_side ?? "p1"}>
                  <option value="p1">{p?.players.p1.name ?? "Player 1"}</option>
                  <option value="p2">{p?.players.p2.name ?? "Player 2"}</option>
                </select>
              </label>
              <label>
                Exact team version
                <select
                  name="versionId"
                  defaultValue={game.team_version_id ?? ""}
                  required
                >
                  <option value="" disabled>
                    Choose version
                  </option>
                  {versions.map((v) => (
                    <option key={v.id} value={v.id}>
                      v{v.version_number}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Result
                <select name="result" defaultValue="">
                  <option value="">Use replay result</option>
                  {["win", "loss", "tie", "unknown"].map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
              </label>
            </div>
            <label>
              Reason
              <input name="reason" required maxLength={1000} />
            </label>
          </ReplayForm>
        </section>
        <details>
          <summary>Parser diagnostics</summary>
          <p>
            {p?.parserVersion ?? "Not parsed"} · {game.status}
          </p>
          {!!p?.warnings.length && (
            <ul>
              {p.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          )}
          <ReplayForm
            teamId={teamId}
            operation="reparse"
            label={source ? "Reprocess retained source" : "Retry retrieval"}
          >
            <input type="hidden" name="gameId" value={replayId} />
          </ReplayForm>
          {source && (
            <details>
              <summary>Retained raw log</summary>
              <pre className="replay-source">{source.raw_log}</pre>
            </details>
          )}
          {p && (
            <details>
              <summary>Parsed record (JSON)</summary>
              <pre className="replay-source">{JSON.stringify(p, null, 2)}</pre>
            </details>
          )}
        </details>
      </details>
    </div>
  );
}
