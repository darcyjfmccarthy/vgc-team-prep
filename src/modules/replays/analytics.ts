import { previewSpecies, toId } from "./parser";
import { groupSets } from "./sets";
import type { Combatant, ReplayFact } from "./types";

export function rate(numerator: number, denominator: number, unknownCount = 0) {
  return {
    numerator,
    denominator,
    rate: denominator ? numerator / denominator : null,
    unknownCount,
  };
}
export type Rate = ReturnType<typeof rate>;
export const displayRate = (m: Rate) =>
  `${m.rate === null ? "—" : `${Math.round(m.rate * 100)}%`} (${m.numerator}/${m.denominator})${m.unknownCount ? ` · ${m.unknownCount} unknown` : ""}`;
const decided = (g: ReplayFact) => g.result === "win" || g.result === "loss";
export function summarize(games: ReplayFact[]) {
  const sets = groupSets(games);
  const wins = games.filter((g) => g.result === "win").length,
    losses = games.filter((g) => g.result === "loss").length;
  const setWins = sets.filter((s) => s.result === "win").length,
    setLosses = sets.filter((s) => s.result === "loss").length;
  return {
    games: games.length,
    wins,
    losses,
    ties: games.filter((g) => g.result === "tie").length,
    unknown: games.filter((g) => g.result === "unknown").length,
    winRate: rate(wins, wins + losses),
    sets,
    setWins,
    setLosses,
    setWinRate: rate(setWins, setWins + setLosses),
    metricVersion: "replay-metrics-1",
  };
}
export function pokemonUsage(
  games: ReplayFact[],
  species: string,
  opponent = false,
) {
  const observations = games.flatMap((g) => {
    if (!g.userSide) return [];
    const side = opponent ? (g.userSide === "p1" ? "p2" : "p1") : g.userSide;
    const pokemon = g.parsed.pokemon.find(
      (p) =>
        p.side === side &&
        toId(previewSpecies(p.species)) === toId(previewSpecies(species)),
    );
    return [{ g, side, p: pokemon, usable: !g.parsed.identityUncertain[side] }];
  });
  const eligible = observations.filter(
    (o) => o.usable && (opponent || o.p?.preview),
  );
  const selected = eligible.filter((o) => o.p?.selected === true);
  const selectionKnown = eligible.filter(
    (o) => o.g.parsed.selectionKnown[o.side],
  );
  const leadKnown = eligible.filter((o) => o.g.parsed.leadsKnown[o.side]);
  const backKnown = eligible.filter(
    (o) => o.g.parsed.leadsKnown[o.side] && o.g.parsed.selectionKnown[o.side],
  );
  const wins = (o: (typeof eligible)[number]) =>
    o.g.result === (opponent ? "loss" : "win");
  const selectedDecided = selected.filter((o) => decided(o.g));
  const ledDecided = leadKnown.filter((o) => o.p?.lead && decided(o.g));
  const megaKnown = selected.filter((o) => o.p?.mega !== null);
  const moveKnown = selected.filter((o) => o.g.parsed.outcome !== "unknown");
  const moveNames = [
    ...new Set(selected.flatMap((o) => Object.keys(o.p!.moves))),
  ].sort();
  return {
    species,
    moveGames: moveKnown.length,
    preview: rate(
      observations.filter((o) => o.p?.preview).length,
      observations.filter((o) => o.g.parsed.previewKnown[o.side]).length,
    ),
    revealed: selected.length,
    bring: rate(
      selectionKnown.filter((o) => o.p?.selected).length,
      selectionKnown.length,
      eligible.length - selectionKnown.length,
    ),
    lead: rate(
      leadKnown.filter((o) => o.p?.lead).length,
      leadKnown.length,
      eligible.length - leadKnown.length,
    ),
    back: rate(
      backKnown.filter((o) => o.p?.selected && !o.p.lead).length,
      backKnown.length,
      eligible.length - backKnown.length,
    ),
    selectedWin: rate(
      selectedDecided.filter(wins).length,
      selectedDecided.length,
    ),
    ledWin: rate(ledDecided.filter(wins).length, ledDecided.length),
    wins: selectedDecided.filter(wins).length,
    losses: selectedDecided.filter((o) => !wins(o)).length,
    mega: rate(megaKnown.filter((o) => o.p?.mega).length, megaKnown.length),
    moves: moveNames.map((name) => ({
      name,
      uses: selected.reduce((sum, o) => sum + (o.p!.moves[name] ?? 0), 0),
      usage: rate(
        moveKnown.filter((o) => o.p!.moves[name]).length,
        moveKnown.length,
      ),
    })),
  };
}
export function compositions(
  games: ReplayFact[],
  kind: "leads" | "selection" | "partners",
) {
  const eligible = games.filter(
    (g) =>
      g.userSide &&
      !g.parsed.identityUncertain[g.userSide] &&
      (kind === "leads"
        ? g.parsed.leadsKnown[g.userSide]
        : g.parsed.selectionKnown[g.userSide]),
  );
  const counts = new Map<
    string,
    { names: string[]; games: string[]; wins: number; decided: number }
  >();
  for (const game of eligible) {
    const roster = game.parsed.pokemon
      .filter(
        (p) =>
          p.side === game.userSide && (kind === "leads" ? p.lead : p.selected),
      )
      .sort((a, b) =>
        (a.slotIdentityId ?? a.speciesId).localeCompare(
          b.slotIdentityId ?? b.speciesId,
        ),
      );
    const groups: Combatant[][] =
      kind === "partners"
        ? roster.flatMap((p, i) => roster.slice(i + 1).map((q) => [p, q]))
        : [roster];
    for (const group of groups) {
      const key = group.map((p) => p.slotIdentityId ?? p.speciesId).join("|");
      const entry = counts.get(key) ?? {
        names: group.map((p) => p.species),
        games: [],
        wins: 0,
        decided: 0,
      };
      entry.games.push(game.id);
      entry.wins += game.result === "win" ? 1 : 0;
      entry.decided += decided(game) ? 1 : 0;
      counts.set(key, entry);
    }
  }
  return [...counts.entries()]
    .map(([key, row]) => ({
      key,
      ...row,
      frequency: rate(row.games.length, eligible.length),
      winRate: rate(row.wins, row.decided),
    }))
    .sort((a, b) => b.games.length - a.games.length);
}
