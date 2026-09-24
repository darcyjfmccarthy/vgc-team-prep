"use client";
import Link from "next/link";
import { useState } from "react";
import type {
  compositions,
  pokemonUsage,
  Rate,
} from "@/modules/replays/analytics";
import {
  BattleIcon,
  PokemonPortrait,
  PokemonLabel,
  RateBar,
} from "./battle-visuals";

type Usage = ReturnType<typeof pokemonUsage>;
export type PokemonStatistics = {
  species: string;
  usage: Usage;
  moves: { name: string; uses: number; usage: Rate }[];
  games: { id: string; label: string }[];
};
type Compositions = ReturnType<typeof compositions>;
const colors = [
  "#9caaff",
  "#77dbc0",
  "#f3c879",
  "#eb96b8",
  "#7fc8ee",
  "#bf9be9",
];

function MoveDonut({ pokemon }: { pokemon: PokemonStatistics }) {
  const [selected, setSelected] = useState<string | null>(null);
  const total = pokemon.moves.reduce((sum, m) => sum + m.uses, 0);
  const selectedMove = pokemon.moves.find((m) => m.name === selected);
  return (
    <article
      className="usage-card move-card"
      aria-label={`${pokemon.species} move usage`}
    >
      <header>
        <PokemonPortrait species={pokemon.species} />
        <div>
          <h3>{pokemon.species}</h3>
          <span className="muted">{pokemon.usage.revealed} games brought</span>
        </div>
      </header>
      <div className="move-chart">
        <div className="move-donut">
          <svg
            viewBox="0 0 120 120"
            role="img"
            aria-label={`${pokemon.species}: ${total} recorded move uses. Shares and counts are listed alongside.`}
          >
            <circle
              cx="60"
              cy="60"
              r="48"
              fill="none"
              stroke="var(--border)"
              strokeWidth="14"
            />
            {pokemon.moves.map((move, i) => {
              const share = total ? (move.uses / total) * 100 : 0;
              const start = total
                ? (pokemon.moves
                    .slice(0, i)
                    .reduce((sum, m) => sum + m.uses, 0) /
                    total) *
                  100
                : 0;
              return share > 0 ? (
                <circle
                  key={move.name}
                  cx="60"
                  cy="60"
                  r="48"
                  pathLength="100"
                  fill="none"
                  stroke={colors[i % colors.length]}
                  strokeWidth={selected === move.name ? 18 : 14}
                  strokeDasharray={`${share} ${100 - share}`}
                  strokeDashoffset={-start}
                  transform="rotate(-90 60 60)"
                  opacity={selected && selected !== move.name ? 0.25 : 1}
                />
              ) : null;
            })}
          </svg>
          <div className="donut-center" aria-live="polite">
            <strong>{selectedMove ? selectedMove.uses : total}</strong>
            <small>{selectedMove ? `of ${total} uses` : "move uses"}</small>
          </div>
        </div>
        <div className="move-legend">
          {pokemon.moves.map((move, i) => (
            <button
              type="button"
              key={move.name}
              aria-pressed={selected === move.name}
              onClick={() =>
                setSelected(selected === move.name ? null : move.name)
              }
            >
              <span
                className="legend-dot"
                style={{ background: colors[i % colors.length] }}
              />
              <span>
                <strong>{move.name}</strong>
                <small>
                  {move.usage.numerator}/{move.usage.denominator} games when
                  brought
                </small>
              </span>
              <span className="legend-share">
                {total ? `${Math.round((move.uses / total) * 100)}%` : "—"}
                <small>
                  {move.uses}/{total} uses
                </small>
              </span>
            </button>
          ))}
        </div>
      </div>
      {!total && (
        <p className="quiet-note">No moves observed in these games.</p>
      )}
    </article>
  );
}

function GameEvidence({
  pokemon,
  teamId,
}: {
  pokemon: PokemonStatistics;
  teamId: string;
}) {
  return (
    <details className="card-evidence">
      <summary>Games brought · {pokemon.games.length}</summary>
      {pokemon.games.length ? (
        <ul>
          {pokemon.games.map((g) => (
            <li key={g.id}>
              <Link href={`/teams/${teamId}/replays/${g.id}`}>{g.label}</Link>
            </li>
          ))}
        </ul>
      ) : (
        <p>No confirmed appearances in these games.</p>
      )}
    </details>
  );
}

export function StatisticsDashboard({
  pokemon,
  opponents,
  groups,
  teamId,
}: {
  pokemon: PokemonStatistics[];
  opponents: PokemonStatistics[];
  groups: {
    leads: Compositions;
    selection: Compositions;
    partners: Compositions;
  };
  teamId: string;
}) {
  const [tab, setTab] = useState<
    "team" | "moves" | "opponents" | "combinations"
  >("team");
  const [group, setGroup] = useState<keyof typeof groups>("leads");
  const tabs = [
    { id: "team", label: "Team usage", icon: "team" },
    { id: "moves", label: "Move usage", icon: "moves" },
    { id: "opponents", label: "Opponents", icon: "opponent" },
    { id: "combinations", label: "Combinations", icon: "chart" },
  ] as const;
  return (
    <section className="statistics-explorer">
      <nav className="analysis-tabs" aria-label="Explore statistics">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            aria-pressed={tab === t.id}
            onClick={() => setTab(t.id)}
          >
            <BattleIcon name={t.icon} />
            {t.label}
          </button>
        ))}
      </nav>
      {tab === "team" && (
        <div>
          <div className="analysis-heading">
            <div>
              <p className="eyebrow">The six, in practice</p>
              <h2>Your Pokémon</h2>
            </div>
            <p>Who you bring, who you lead, and how they perform.</p>
          </div>
          <div className="usage-card-grid">
            {pokemon.map((p) => (
              <article
                className={`usage-card${p.usage.revealed ? "" : " is-unused"}`}
                key={p.species}
              >
                <header>
                  <PokemonPortrait species={p.species} />
                  <div>
                    <h3>{p.species}</h3>
                    <span className="muted">
                      {p.usage.revealed
                        ? `Seen in ${p.usage.revealed} ${p.usage.revealed === 1 ? "game" : "games"}`
                        : "Not revealed in battle"}
                    </span>
                  </div>
                  <div className="pokemon-win">
                    <strong>
                      {p.usage.selectedWin.rate === null
                        ? "—"
                        : `${Math.round(p.usage.selectedWin.rate * 100)}%`}
                    </strong>
                    <span>win when brought</span>
                    <small>
                      {p.usage.selectedWin.numerator}/
                      {p.usage.selectedWin.denominator} games
                    </small>
                  </div>
                </header>
                <div className="usage-bars">
                  <RateBar label="Brought" metric={p.usage.bring} />
                  <RateBar label="Led" metric={p.usage.lead} tone="green" />
                  <RateBar label="In back" metric={p.usage.back} tone="gold" />
                </div>
                <footer>
                  <span>
                    Wins when led{" "}
                    <strong>
                      {p.usage.ledWin.numerator}/{p.usage.ledWin.denominator}
                    </strong>
                  </span>
                  <span>
                    Mega Evolved{" "}
                    <strong>
                      {p.usage.mega.numerator}/{p.usage.mega.denominator}
                    </strong>
                  </span>
                </footer>
                <GameEvidence pokemon={p} teamId={teamId} />
              </article>
            ))}
          </div>
          <p className="quiet-note">
            Bring and back rates use games where all four choices were revealed.
            A forfeit can leave a choice unknown; that game is excluded from
            those rates.
          </p>
        </div>
      )}
      {tab === "moves" && (
        <div>
          <div className="analysis-heading">
            <div>
              <p className="eyebrow">What actually gets clicked</p>
              <h2>Move usage</h2>
            </div>
            <p>
              Each ring splits a Pokémon’s recorded move uses. Select a move to
              highlight it.
            </p>
          </div>
          <div className="move-card-grid">
            {pokemon.map((p) => (
              <MoveDonut pokemon={p} key={p.species} />
            ))}
          </div>
        </div>
      )}
      {tab === "opponents" && (
        <div>
          <div className="analysis-heading">
            <div>
              <p className="eyebrow">Across the field</p>
              <h2>Opposing Pokémon</h2>
            </div>
            <p>Your results against Pokémon revealed in battle.</p>
          </div>
          {!opponents.length && (
            <p className="analysis-empty">
              No opponent observations match these filters.
            </p>
          )}
          <div className="usage-card-grid opponent-card-grid">
            {opponents.map((p) => (
              <article className="usage-card" key={p.species}>
                <header>
                  <PokemonPortrait species={p.species} />
                  <div>
                    <h3>{p.species}</h3>
                    <span className="muted">
                      Seen at preview {p.usage.preview.numerator}/
                      {p.usage.preview.denominator} games
                    </span>
                  </div>
                </header>
                <div className="matchup-record">
                  <strong>
                    {p.usage.losses}
                    <span>W</span> <span className="muted">–</span>{" "}
                    {p.usage.wins}
                    <span>L</span>
                  </strong>
                  <span>Your record when they brought it</span>
                </div>
                <RateBar
                  label="Your win rate"
                  tone="green"
                  metric={{
                    ...p.usage.selectedWin,
                    numerator: p.usage.losses,
                    rate: p.usage.selectedWin.denominator
                      ? p.usage.losses / p.usage.selectedWin.denominator
                      : null,
                  }}
                />
                <div className="opponent-facts">
                  <span>
                    Brought{" "}
                    <strong>
                      {p.usage.bring.numerator}/{p.usage.bring.denominator}
                    </strong>
                  </span>
                  <span>
                    Led{" "}
                    <strong>
                      {p.usage.lead.numerator}/{p.usage.lead.denominator}
                    </strong>
                  </span>
                  <span>
                    Revealed <strong>{p.usage.revealed} games</strong>
                  </span>
                </div>
                {p.usage.bring.unknownCount > 0 && (
                  <small className="muted">
                    {p.usage.bring.unknownCount} selections not fully revealed
                  </small>
                )}
                <GameEvidence pokemon={p} teamId={teamId} />
              </article>
            ))}
          </div>
        </div>
      )}
      {tab === "combinations" && (
        <div>
          <div className="analysis-heading">
            <div>
              <p className="eyebrow">Better together</p>
              <h2>Team combinations</h2>
            </div>
            <p>Your most-used openings and selections.</p>
          </div>
          <div className="segmented-control" aria-label="Composition type">
            {(
              [
                { id: "leads", name: "Lead pairs" },
                { id: "selection", name: "Four-Pokémon selections" },
                { id: "partners", name: "Common partners" },
              ] as const
            ).map((t) => (
              <button
                type="button"
                key={t.id}
                aria-pressed={group === t.id}
                onClick={() => setGroup(t.id)}
              >
                {t.name}
              </button>
            ))}
          </div>
          <div className="composition-grid">
            {groups[group].map((row, i) => (
              <article className="composition-card" key={row.key}>
                <div className="composition-rank">
                  {String(i + 1).padStart(2, "0")}
                  <span>{row.frequency.numerator} games</span>
                </div>
                <div className="composition-pokemon">
                  {row.names.map((n) => (
                    <PokemonLabel key={n} species={n} />
                  ))}
                </div>
                <RateBar label="Frequency" metric={row.frequency} />
                <RateBar label="Win rate" metric={row.winRate} tone="green" />
                <details className="card-evidence">
                  <summary>View {row.games.length} games</summary>
                  <ul>
                    {row.games.map((id, index) => (
                      <li key={id}>
                        <Link href={`/teams/${teamId}/replays/${id}`}>
                          Appearance {index + 1}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </details>
              </article>
            ))}
          </div>
          {!groups[group].length && (
            <p className="analysis-empty">
              No complete {group === "leads" ? "leads" : "selections"} observed
              for these filters yet.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
