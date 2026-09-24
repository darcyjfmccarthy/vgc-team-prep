import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { currentUserId } from "@/modules/auth/sessions";
import { getTeamDetail, listTeamVersions } from "@/modules/teams/service";
import { factsFromRecords, listReplayRecords } from "@/modules/replays/service";
import { compositions, pokemonUsage, rate } from "@/modules/replays/analytics";
import { ReplaySummary, ReplayTable } from "@/components/replay-ui";
import {
  StatisticsDashboard,
  type PokemonStatistics,
} from "@/components/statistics-dashboard";
import { previewSpecies, toId } from "@/modules/replays/parser";
export const dynamic = "force-dynamic";
type Filters = {
  version?: string;
  from?: string;
  to?: string;
  result?: string;
  opponent?: string;
  context?: string;
  format?: string;
};
export default async function TeamStatisticsPage({
  params,
  searchParams,
}: {
  params: Promise<{ teamId: string }>;
  searchParams: Promise<Filters>;
}) {
  const userId = await currentUserId();
  if (!userId) redirect("/login");
  const { teamId } = await params,
    filter = await searchParams;
  const team = await getTeamDetail(userId, teamId, filter.version);
  if (!team) notFound();
  const [records, versions] = await Promise.all([
    listReplayRecords(userId, teamId),
    listTeamVersions(userId, teamId),
  ]);
  const all = factsFromRecords(records);
  const facts = all.filter(
    (g) =>
      (!filter.version || g.versionId === filter.version) &&
      (!filter.result || g.result === filter.result) &&
      (!filter.context || g.parsed.context === filter.context) &&
      (!filter.format || g.parsed.formatId === filter.format) &&
      (!filter.from ||
        (!!g.parsed.occurredAt &&
          Date.parse(g.parsed.occurredAt) >= Date.parse(filter.from))) &&
      (!filter.to ||
        (!!g.parsed.occurredAt &&
          Date.parse(g.parsed.occurredAt) <
            Date.parse(filter.to) + 86400000)) &&
      (!filter.opponent ||
        g.parsed.pokemon.some(
          (p) =>
            p.side !== g.userSide &&
            toId(p.species) === toId(filter.opponent ?? ""),
        )),
  );
  const species = [
    ...new Set([
      ...team.slots.map((s) => previewSpecies(s.form_name ?? s.species_name)),
      ...facts.flatMap((g) =>
        g.parsed.pokemon
          .filter((p) => p.side === g.userSide)
          .map((p) => p.species),
      ),
    ]),
  ];
  const opponents = [
    ...new Set(
      facts.flatMap((g) =>
        g.parsed.pokemon
          .filter((p) => p.side !== g.userSide)
          .map((p) => p.species),
      ),
    ),
  ];
  const rosterSlots = team.slots;
  function pokemonView(species: string, opponent = false): PokemonStatistics {
    const usage = pokemonUsage(facts, species, opponent);
    const roster = !opponent
      ? rosterSlots.find(
          (s) =>
            toId(previewSpecies(s.form_name ?? s.species_name)) ===
            toId(species),
        )
      : null;
    const names = [
      ...new Set([
        ...(roster?.moves.map((m) => m.name) ?? []),
        ...usage.moves.map((m) => m.name),
      ]),
    ];
    return {
      species,
      usage,
      moves: names.map(
        (name) =>
          usage.moves.find((m) => m.name === name) ?? {
            name,
            uses: 0,
            usage: rate(0, usage.moveGames),
          },
      ),
      games: facts
        .filter((g) =>
          g.parsed.pokemon.some(
            (p) =>
              (opponent ? p.side !== g.userSide : p.side === g.userSide) &&
              toId(p.species) === toId(species) &&
              p.selected &&
              !g.parsed.identityUncertain[p.side],
          ),
        )
        .map((g) => ({
          id: g.id,
          label: `${g.parsed.series ? `Game ${g.parsed.series.gameNumber}` : "Game"} · ${g.result} vs ${g.parsed.players[g.userSide === "p1" ? "p2" : "p1"].name ?? "opponent"}`,
        })),
    };
  }
  const activeFilters = !!(
    filter.from ||
    filter.to ||
    filter.result ||
    filter.opponent ||
    filter.context ||
    filter.format
  );
  return (
    <div className="analysis-page">
      <section className="page-heading split-heading">
        <div>
          <p className="eyebrow">From practice to a plan</p>
          <h2>Statistics</h2>
          <p className="muted">Get to know how your team plays.</p>
        </div>
        <Link
          className="button secondary"
          href={`/teams/${teamId}/replays?import=1${filter.version ? `&version=${filter.version}` : ""}`}
        >
          Add replays ↗
        </Link>
      </section>
      <details className="analysis-filters" open={activeFilters}>
        <summary>
          <span>Filter games</span>
          <span className="muted">
            {filter.version ? `Version ${team.version_number}` : "All versions"}{" "}
            · {facts.length} games{activeFilters ? " · filters applied" : ""}
          </span>
        </summary>
        <form className="filter-bar" aria-label="Statistics filters">
          <label>
            Version
            <select name="version" defaultValue={filter.version ?? ""}>
              <option value="">All versions</option>
              {versions.map((v) => (
                <option key={v.id} value={v.id}>
                  v{v.version_number}
                </option>
              ))}
            </select>
          </label>
          <label>
            From (UTC)
            <input type="date" name="from" defaultValue={filter.from} />
          </label>
          <label>
            Through (UTC)
            <input type="date" name="to" defaultValue={filter.to} />
          </label>
          <label>
            Result
            <select name="result" defaultValue={filter.result}>
              <option value="">All results</option>
              {["win", "loss", "tie", "unknown"].map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </label>
          <label>
            Opponent Pokémon
            <input
              name="opponent"
              defaultValue={filter.opponent}
              placeholder="e.g. Salamence"
            />
          </label>
          <label>
            Match format
            <select name="context" defaultValue={filter.context}>
              <option value="">All</option>
              <option value="bo3">Best of three</option>
              <option value="bo1">Best of one</option>
            </select>
          </label>
          <label>
            Ruleset
            <select name="format" defaultValue={filter.format}>
              <option value="">All</option>
              {[
                ...new Map(
                  all.map((g) => [g.parsed.formatId, g.parsed.format]),
                ).entries(),
              ]
                .filter(([id]) => id)
                .map(([id, name]) => (
                  <option value={id!} key={id}>
                    {name ?? id}
                  </option>
                ))}
            </select>
          </label>
          <button>Apply filters</button>
          <Link href={`/teams/${teamId}/statistics`}>Clear filters</Link>
        </form>
      </details>
      <ReplaySummary facts={facts} />
      {facts.length > 0 ? (
        <>
          <div className="sample-note">
            <span className="sample-dot" />
            <span>
              {facts.length < 20 ? "Early days." : "Your practice sample."}{" "}
              {facts.length} games in this view
              {facts.length < 20
                ? " — useful observations, not firm conclusions yet."
                : "."}
            </span>
          </div>
          <StatisticsDashboard
            teamId={teamId}
            pokemon={species.map((s) => pokemonView(s))}
            opponents={opponents
              .map((s) => pokemonView(s, true))
              .sort((a, b) => b.usage.revealed - a.usage.revealed)}
            groups={{
              leads: compositions(facts, "leads"),
              selection: compositions(facts, "selection"),
              partners: compositions(facts, "partners"),
            }}
          />
          <section className="analysis-recent">
            <div className="analysis-heading">
              <h2>Games behind the numbers</h2>
              <Link href={`/teams/${teamId}/replays`}>All replays →</Link>
            </div>
            <ReplayTable
              records={records.filter((r) => facts.some((g) => g.id === r.id))}
            />
          </section>
        </>
      ) : (
        <section className="analysis-empty">
          <h2>
            {all.length
              ? "No games match these filters"
              : "Your team’s story starts here"}
          </h2>
          <p>
            {all.length
              ? "Try a wider date range or clear your filters."
              : "Add a few replays to see bring rates, favourite moves, and your strongest combinations."}
          </p>
          <Link
            className="button"
            href={
              all.length
                ? `/teams/${teamId}/statistics`
                : `/teams/${teamId}/replays`
            }
          >
            {all.length ? "Clear filters" : "Import your first replays"}
          </Link>
        </section>
      )}
    </div>
  );
}
