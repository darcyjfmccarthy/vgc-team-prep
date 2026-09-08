import Link from "next/link";
import { PokemonArt } from "@/components/pokemon-art";
import type { PrototypeGame, PrototypeMatchup } from "@/lib/prototype-data";
import { rosterLabel } from "@/lib/prototype-data";

type TeamSlot = {
  slot_number: number;
  nickname: string | null;
  species_name: string;
  form_name: string | null;
  species_slug: string;
  form_slug: string | null;
  is_shiny: boolean;
};

export function StatusBadge({ value }: { value: string }) {
  return (
    <span className={`status-badge status-${value.replace(/\s/g, "-")}`}>
      {value}
    </span>
  );
}

export function StatCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <article className="metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}

export function PokemonStrip({ slots }: { slots: TeamSlot[] }) {
  return (
    <div className="pokemon-strip" aria-label="Team roster">
      {slots.map((slot) => (
        <div className="pokemon-strip-member" key={slot.slot_number}>
          <PokemonArt
            slug={slot.form_slug ?? slot.species_slug}
            isShiny={slot.is_shiny}
          />
          <span>{rosterLabel(slot)}</span>
        </div>
      ))}
    </div>
  );
}

export function GameTable({
  games,
  teamId,
  compact = false,
  versionId,
}: {
  games: PrototypeGame[];
  teamId: string;
  compact?: boolean;
  versionId?: string;
}) {
  return (
    <div
      className="table-scroll"
      role="region"
      aria-label="Replay games"
      tabIndex={0}
    >
      <table className="data-table">
        <thead>
          <tr>
            <th>Opponent</th>
            <th>Result</th>
            <th>Format</th>
            <th>Lead</th>
            {!compact && <th>Played</th>}
          </tr>
        </thead>
        <tbody>
          {games.map((game) => (
            <tr key={game.id}>
              <td>
                <Link
                  href={`/teams/${teamId}/replays/${game.id}${versionId ? `?version=${versionId}` : ""}`}
                >
                  {game.opponent}
                </Link>
              </td>
              <td>
                <StatusBadge
                  value={game.status === "parsed" ? game.result : game.status}
                />
                <span className="table-detail"> {game.score}</span>
              </td>
              <td>{game.format}</td>
              <td>{game.leads}</td>
              {!compact && <td>{game.playedAt}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function MatchupCards({
  matchups,
  teamId,
  versionId,
}: {
  matchups: PrototypeMatchup[];
  teamId: string;
  versionId?: string;
}) {
  return (
    <div className="matchup-grid">
      {matchups.map((matchup) => (
        <article className="matchup-card" key={matchup.id}>
          <div className="card-kicker">
            <span>{matchup.kind}</span>
            <StatusBadge value={matchup.status} />
          </div>
          <h3>
            <Link
              href={`/teams/${teamId}/matchups/${matchup.id}${versionId ? `?version=${versionId}` : ""}`}
            >
              {matchup.target}
            </Link>
          </h3>
          <dl className="compact-dl">
            <div>
              <dt>Lead</dt>
              <dd>{matchup.leads}</dd>
            </div>
            <div>
              <dt>Backs</dt>
              <dd>{matchup.backs}</dd>
            </div>
          </dl>
          <p className="muted">
            {matchup.evidenceCount} linked replays · {matchup.updatedAt}
          </p>
        </article>
      ))}
    </div>
  );
}

export function EmptyState({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="empty-state panel">
      <h2>{title}</h2>
      <p className="muted">{children}</p>
    </section>
  );
}

export function WarningBanner({ children }: { children: React.ReactNode }) {
  return (
    <aside className="warning-banner" aria-label="Needs attention">
      <strong>Needs attention</strong>
      <span>{children}</span>
    </aside>
  );
}
