import { toId } from "./parser";
import type { ReplayFact, Result } from "./types";

export interface BattleSet {
  key: string;
  games: ReplayFact[];
  wins: number;
  losses: number;
  result: Result;
  warning: string | null;
}
export function groupSets(games: ReplayFact[]): BattleSet[] {
  const groups = new Map<string, ReplayFact[]>();
  for (const game of games) {
    if (!game.parsed.series) continue;
    const key = game.parsed.series.key;
    groups.set(key, [...(groups.get(key) ?? []), game]);
  }
  return [...groups].map(([key, members]) => {
    members.sort(
      (a, b) => a.parsed.series!.gameNumber - b.parsed.series!.gameNumber,
    );
    const pairing = (g: ReplayFact) =>
      Object.values(g.parsed.players)
        .map((p) => toId(p.name ?? ""))
        .sort()
        .join("|");
    const numbers = members.map((g) => g.parsed.series!.gameNumber);
    const dates = members
      .map((g) =>
        g.parsed.occurredAt ? Date.parse(g.parsed.occurredAt) : null,
      )
      .filter((x): x is number => x !== null);
    const users = new Set(
      members
        .filter((g) => g.userSide)
        .map((g) => toId(g.parsed.players[g.userSide!].name ?? "")),
    );
    const conflict =
      members.some(
        (g) =>
          pairing(g) !== pairing(members[0]) ||
          g.parsed.formatId !== members[0].parsed.formatId ||
          g.parsed.context !== "bo3",
      ) ||
      new Set(numbers).size !== numbers.length ||
      users.size > 1 ||
      (dates.length > 1 &&
        Math.max(...dates) - Math.min(...dates) > 24 * 3600 * 1000);
    const wins = members.filter((g) => g.result === "win").length,
      losses = members.filter((g) => g.result === "loss").length;
    const complete =
      !conflict &&
      members.length <= 3 &&
      numbers.every((n, i) => n === i + 1) &&
      members.every((g) => g.result === "win" || g.result === "loss") &&
      (wins === 2 || losses === 2) &&
      !(members.length === 3 && members[0].result === members[1].result);
    return {
      key,
      games: members,
      wins,
      losses,
      result: complete ? (wins === 2 ? "win" : "loss") : "unknown",
      warning: conflict
        ? "Conflicting series evidence; excluded from set results."
        : complete
          ? null
          : "Incomplete set; awaiting a decisive, consistent record.",
    };
  });
}
