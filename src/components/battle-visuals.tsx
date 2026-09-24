import { PokemonArt } from "./pokemon-art";
import type { Rate } from "@/modules/replays/analytics";

export function BattleIcon({
  name,
}: {
  name: "chart" | "moves" | "team" | "opponent" | "trophy" | "clock" | "arrow";
}) {
  const paths = {
    chart: (
      <>
        <path d="M4 19h16M7 15V9m5 6V4m5 11v-6" />
      </>
    ),
    moves: (
      <>
        <path d="m13 2-9 12h7l-1 8 10-13h-7z" />
      </>
    ),
    team: (
      <>
        <circle cx="8" cy="7" r="3" />
        <path d="M2 20v-3a6 6 0 0 1 12 0v3M16 4a3 3 0 0 1 0 6m2 3a5 5 0 0 1 4 5v2" />
      </>
    ),
    opponent: (
      <>
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="4" />
        <path d="M12 1v4m0 14v4M1 12h4m14 0h4" />
      </>
    ),
    trophy: (
      <>
        <path d="M8 3h8v7a4 4 0 0 1-8 0zM8 5H4v3a4 4 0 0 0 4 4m8-7h4v3a4 4 0 0 1-4 4m-4 2v6m-4 0h8" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    arrow: <path d="M5 12h14m-5-5 5 5-5 5" />,
  };
  return (
    <svg
      className="battle-icon"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}
export function PokemonPortrait({
  species,
  small = false,
}: {
  species: string;
  small?: boolean;
}) {
  // Use the preview form for battle analytics; Mega status is indicated separately.
  const slug = species
    .replace(/-Mega(?:-[XY])?$/i, "")
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "");
  return (
    <span
      className={`battle-portrait${small ? " is-small" : ""}`}
      role="img"
      aria-label={species}
      title={species}
    >
      <PokemonArt slug={slug} isShiny={false} />
    </span>
  );
}
export function PokemonLabel({ species }: { species: string }) {
  return (
    <span className="pokemon-label">
      <PokemonPortrait species={species} small />
      <span>{species}</span>
    </span>
  );
}
export function RateBar({
  label,
  metric,
  tone = "blue",
}: {
  label: string;
  metric: Rate;
  tone?: "blue" | "green" | "gold";
}) {
  return (
    <div className={`usage-rate tone-${tone}`}>
      <div>
        <span>{label}</span>
        <span>
          <strong>
            {metric.rate === null ? "—" : `${Math.round(metric.rate * 100)}%`}
          </strong>{" "}
          <small>
            {metric.numerator}/{metric.denominator}
          </small>
        </span>
      </div>
      <div className="usage-track" aria-hidden="true">
        <i style={{ width: `${(metric.rate ?? 0) * 100}%` }} />
      </div>
      {metric.unknownCount > 0 && (
        <small className="usage-unknown">
          {metric.unknownCount} {metric.unknownCount === 1 ? "game" : "games"}{" "}
          not fully revealed
        </small>
      )}
    </div>
  );
}
