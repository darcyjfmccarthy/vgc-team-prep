import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseHealth, parseReplay } from "./parser";
import { parseReplayUrl } from "./provider";
import { compositions, pokemonUsage, summarize } from "./analytics";
import { groupSets } from "./sets";
import type { ReplayFact } from "./types";

const ids = ["2683340564", "2683342314", "2683342984"];
const logs = ids.map((id) =>
  readFileSync(
    new URL(
      `./fixtures/gen9championsvgc2026regmcbo3-${id}.log`,
      import.meta.url,
    ),
    "utf8",
  ),
);
const parsed = logs.map((log) =>
  parseReplay(log, { formatId: "gen9championsvgc2026regmcbo3" }),
);
const facts: ReplayFact[] = parsed.map((p, i) => ({
  id: ids[i],
  teamId: "team",
  versionId: "v1",
  userSide: "p1",
  result: i === 0 ? "loss" : "win",
  parsed: p,
}));
describe("real Champions best-of-three", () => {
  it("extracts deterministic outcomes, dates, players, OTS and series metadata", () => {
    expect(parsed.map((p) => p.winner)).toEqual(["p2", "p1", "p1"]);
    expect(parsed.map((p) => p.turns)).toEqual([7, 1, 8]);
    for (const [i, p] of parsed.entries()) {
      expect(
        parseReplay(logs[i], { formatId: "gen9championsvgc2026regmcbo3" }),
      ).toEqual(p);
      expect(p.players.p1).toEqual({ name: "AI damage calc", rating: 1123 });
      expect(p.players.p2).toEqual({ name: "killerjc123", rating: 1168 });
      expect(p.sheet).toBe("open");
      expect(p.pokemon).toHaveLength(12);
      expect(p.series).toMatchObject({
        key: "game-bestof3-gen9championsvgc2026regmcbo3-2683340563",
        gameNumber: i + 1,
      });
      expect(p.timestampSource).toBe("battle");
      expect(
        p.events.every(
          (event, index) =>
            event.sequence === index + 1 &&
            logs[i].split(/\r?\n/)[event.line - 1] === event.raw,
        ),
      ).toBe(true);
    }
  });
  it("tracks Mega evolution, public HP, switches, moves and targets", () => {
    const salamence = parsed[0].pokemon.find(
      (p) => p.side === "p1" && p.species === "Salamence",
    )!;
    expect(salamence).toMatchObject({
      selected: true,
      lead: false,
      mega: true,
      form: "Salamence-Mega",
    });
    expect(salamence.moves["Hyper Voice"]).toBeGreaterThan(0);
    expect(
      parsed[0].events.some(
        (e) => e.kind === "damage" && e.healthBefore && e.healthAfter,
      ),
    ).toBe(true);
    expect(
      parsed[0].events.find((e) => e.kind === "move")?.target,
    ).toBeTruthy();
    expect(
      parsed[0].pokemon
        .filter((p) => p.side === "p1" && p.lead)
        .map((p) => p.species),
    ).toEqual(["Gholdengo", "Rillaboom"]);
  });
  it("counts three games but only one winning set, including incomplete imports", () => {
    expect(summarize(facts)).toMatchObject({
      games: 3,
      wins: 2,
      losses: 1,
      setWins: 1,
      setLosses: 0,
      winRate: { numerator: 2, denominator: 3 },
      setWinRate: { numerator: 1, denominator: 1 },
    });
    expect(groupSets([facts[0], facts[2]])[0].result).toBe("unknown");
    expect(groupSets([facts[0], facts[0], facts[2]])[0].warning).toContain(
      "Conflicting",
    );
    expect(
      groupSets(
        facts.map((f) => ({ ...f, parsed: { ...f.parsed, series: null } })),
      ),
    ).toEqual([]);
  });
  it("reports denominators and observed leads/compositions", () => {
    const rillaboom = pokemonUsage(facts, "Rillaboom");
    expect(rillaboom.lead).toMatchObject({ numerator: 3, denominator: 3 });
    expect(rillaboom.ledWin).toMatchObject({ numerator: 2, denominator: 3 });
    expect(compositions(facts, "leads").map((c) => c.games.length)).toEqual([
      2, 1,
    ]);
    expect(pokemonUsage([], "Rillaboom").bring.rate).toBeNull();
  });
});
describe("uncertainty and hostile inputs", () => {
  it("preserves partial selection rather than inventing an unobserved fourth Pokémon", () => {
    const p = parseReplay(
      logs[0].split("|turn|1")[0] + "|win|AI damage calc\n",
    );
    expect(p.selectionKnown.p1).toBe(false);
    expect(
      p.pokemon.find((p) => p.species === "Sneasler" && p.side === "p1")
        ?.selected,
    ).toBeNull();
    expect(
      pokemonUsage([{ ...facts[0], parsed: p }], "Sneasler").bring,
    ).toMatchObject({ numerator: 0, denominator: 0, unknownCount: 1 });
  });
  it("keeps unknown commands and incomplete results, and flags Illusion", () => {
    const p = parseReplay(
      logs[0].replace(
        /\|win\|[^\n]+/,
        "|newmechanic|p1a: Rillaboom|future\n|replace|p1a: Zoroark|Zoroark, L50|50/100",
      ),
    );
    expect(p.outcome).toBe("unknown");
    expect(p.identityUncertain.p1).toBe(true);
    expect(p.events.some((e) => e.kind === "unknown")).toBe(true);
    expect(
      pokemonUsage([{ ...facts[0], parsed: p }], "Rillaboom").lead.denominator,
    ).toBe(0);
  });
  it("rejects empty, malformed and oversized logs", () => {
    for (const log of [
      "",
      "<html>not a replay</html>",
      "x".repeat(4 * 1024 * 1024 + 1),
    ])
      expect(() => parseReplay(log)).toThrow();
    expect(parseHealth("45/100 par")).toEqual({
      current: 45,
      max: 100,
      status: "par",
      precision: "public",
    });
    expect(parseHealth("0 fnt")?.max).toBeNull();
    expect(parseHealth("200/100")).toBeNull();
  });
  it("canonicalizes .log/.json and blocks non-provider destinations", () => {
    const url = `https://replay.pokemonshowdown.com/gen9championsvgc2026regmcbo3-${ids[0]}`;
    expect(parseReplayUrl(`${url}.log`).canonicalUrl).toBe(url);
    expect(parseReplayUrl(`${url}.json`).canonicalUrl).toBe(url);
    for (const invalid of [
      url.replace("https:", "http:"),
      url.replace("replay.", "evil."),
      url.replace("https://", "https://user:pass@"),
      `${url}?next=https://evil.test`,
      "https://replay.pokemonshowdown.com/../../localhost",
    ])
      expect(() => parseReplayUrl(invalid)).toThrow();
  });
});
