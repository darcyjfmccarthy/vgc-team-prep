import Link from "next/link";
import { summarize } from "@/modules/replays/analytics";
import type { ReplayRecord } from "@/modules/replays/service";
import type { ReplayFact } from "@/modules/replays/types";
import { BattleIcon, PokemonPortrait } from "./battle-visuals";

export function ReplaySummary({ facts }: { facts: ReplayFact[] }) {
  const s = summarize(facts);
  return (
    <section className="performance-overview" aria-label="Team performance">
      <article className="performance-card">
        <div className="performance-label">
          <BattleIcon name="chart" />
          Game record<span>{s.games} played</span>
        </div>
        <div className="record-numbers">
          <strong>
            {s.wins}
            <small>W</small>
            <span> / </span>
            {s.losses}
            <small>L</small>
          </strong>
          <div className="recent-form" aria-label="Recent game results">
            {facts.slice(-8).map((g) => (
              <Link
                key={g.id}
                className={`form-result result-${g.result}`}
                href={`/teams/${g.teamId}/replays/${g.id}`}
                title={`${g.result} · ${g.parsed.players[g.userSide === "p1" ? "p2" : "p1"].name}`}
                aria-label={`Open ${g.result}, ${g.parsed.series ? `game ${g.parsed.series.gameNumber}` : "game"}`}
              >
                {g.result === "win" ? "W" : g.result === "loss" ? "L" : "–"}
              </Link>
            ))}
          </div>
        </div>
        <small>
          {s.ties || s.unknown
            ? `${s.ties} ties · ${s.unknown} undecided`
            : "Individual games, including games in a set"}
        </small>
      </article>
      <article className="performance-card win-rate-card">
        <div className="performance-label">
          <BattleIcon name="trophy" />
          Game win rate
        </div>
        <div className="record-numbers">
          <strong>
            {s.winRate.rate === null
              ? "—"
              : `${Math.round(s.winRate.rate * 100)}%`}
          </strong>
          <span className="rate-fraction">
            {s.wins}/{s.wins + s.losses}
            <small>decided games</small>
          </span>
        </div>
        <div className="record-bar" aria-hidden="true">
          <i style={{ width: `${(s.winRate.rate ?? 0) * 100}%` }} />
        </div>
      </article>
      <article className="performance-card">
        <div className="performance-label">
          <BattleIcon name="team" />
          Best-of-three sets<span>{s.sets.length} sets</span>
        </div>
        <div className="record-numbers">
          <strong>
            {s.setWins}
            <small>W</small>
            <span> / </span>
            {s.setLosses}
            <small>L</small>
          </strong>
          <span className="rate-fraction">
            {s.setWinRate.rate === null
              ? "—"
              : `${Math.round(s.setWinRate.rate * 100)}%`}
            <small>
              {s.setWins}/{s.setWins + s.setLosses} decided
            </small>
          </span>
        </div>
        <small>
          {s.sets.some((set) => set.result === "unknown")
            ? `${s.sets.filter((set) => set.result === "unknown").length} incomplete in this view`
            : "A set counts once, however many games it took"}
        </small>
      </article>
    </section>
  );
}
export function ReplayTable({ records }: { records: ReplayRecord[] }) {
  return (
    <div className="game-list">
      {records.map((game) => {
        const p = game.output,
          side = game.user_side;
        const own =
          p?.pokemon.filter((mon) => mon.side === side && mon.selected) ?? [];
        const opponent =
          p?.pokemon.filter(
            (mon) => side && mon.side !== side && mon.selected,
          ) ?? [];
        const label = p?.series ? `Game ${p.series.gameNumber}` : "Game";
        return (
          <article className="game-list-row" key={game.id}>
            <div className={`game-result result-${game.result}`}>
              {game.result === "win"
                ? "WIN"
                : game.result === "loss"
                  ? "LOSS"
                  : "—"}
            </div>
            <div className="game-list-title">
              <Link href={`/teams/${game.team_id}/replays/${game.id}`}>
                {label}
              </Link>
              <strong>
                {p && side
                  ? `vs ${p.players[side === "p1" ? "p2" : "p1"].name}`
                  : "Awaiting replay"}
              </strong>
              <small>
                {p?.turns
                  ? `${p.turns} ${p.turns === 1 ? "turn" : "turns"}`
                  : ""}
                {p?.occurredAt
                  ? ` · ${new Date(p.occurredAt).toLocaleDateString("en-AU", { day: "numeric", month: "short", timeZone: "UTC" })}`
                  : ""}
              </small>
            </div>
            <div className="game-lineups">
              <div aria-label="Your revealed Pokémon">
                <small>You</small>
                {own.map((mon) => (
                  <span
                    key={mon.key}
                    title={`${mon.species}${mon.lead ? " · lead" : " · back"}`}
                  >
                    <PokemonPortrait species={mon.species} small />
                  </span>
                ))}
              </div>
              <div aria-label="Opponent revealed Pokémon">
                <small>Them</small>
                {opponent.map((mon) => (
                  <span
                    key={mon.key}
                    title={`${mon.species}${mon.lead ? " · lead" : " · back"}`}
                  >
                    <PokemonPortrait species={mon.species} small />
                  </span>
                ))}
              </div>
            </div>
            <div className="game-list-end">
              {game.status !== "succeeded" && (
                <small>
                  {game.status === "needs_input"
                    ? "Needs confirmation"
                    : game.status.replaceAll("_", " ")}
                </small>
              )}
              <Link
                className="game-open"
                href={`/teams/${game.team_id}/replays/${game.id}`}
                aria-label={`Review ${label}`}
              >
                <BattleIcon name="arrow" />
              </Link>
            </div>
            {game.error_detail && <p role="status">{game.error_detail}</p>}
          </article>
        );
      })}
      {!records.length && (
        <p className="analysis-empty">
          No replays imported for this selection.
        </p>
      )}
    </div>
  );
}
