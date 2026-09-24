import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseReplay } from "./parser";
import {
  battleHighlights,
  battleImpact,
  observedHpLoss,
  readableTurn,
} from "./presentation";
const log = readFileSync(
  new URL(
    "./fixtures/gen9championsvgc2026regmcbo3-2683342314.log",
    import.meta.url,
  ),
  "utf8",
);
describe("human-readable battle review", () => {
  it("measures observed direct attacks in the supplied one-turn game", () => {
    const replay = parseReplay(log),
      rows = battleImpact(replay);
    expect(
      rows.find((p) => p.side === "p1" && p.species === "Salamence")?.dealt,
    ).toBeCloseTo(100);
    expect(
      rows.find((p) => p.side === "p1" && p.species === "Rillaboom")?.dealt,
    ).toBeCloseTo(66);
    expect(
      rows.find((p) => p.side === "p2" && p.species === "Indeedee")?.dealt,
    ).toBeCloseTo(52);
    expect(
      battleHighlights(replay).some((e) => e.text === "killerjc123 forfeited."),
    ).toBe(true);
    expect(
      readableTurn(replay, 1).some((e) => e.text.includes("used Draco Meteor")),
    ).toBe(true);
    expect(readableTurn(replay, 1).every((e) => !e.text.includes("|"))).toBe(
      true,
    );
    expect(battleHighlights(replay, "p1").map((e) => e.text)).toEqual(
      expect.arrayContaining([
        "Your Salamence Mega Evolved.",
        "Their Salamence fainted.",
      ]),
    );
  });
  it("does not credit recoil or poison as direct attack damage", () => {
    const replay = parseReplay(
      `|player|p1|A\n|player|p2|B\n|gametype|doubles\n|poke|p1|Pikachu\n|poke|p2|Eevee\n|start\n|switch|p1a: Pikachu|Pikachu|100/100\n|switch|p2a: Eevee|Eevee|100/100\n|turn|1\n|move|p1a: Pikachu|Thunderbolt|p2a: Eevee\n|-damage|p2a: Eevee|60/100\n|-damage|p1a: Pikachu|90/100|[from] item: Life Orb\n|-damage|p2a: Eevee|50/100|[from] psn\n|win|A`,
    );
    const rows = battleImpact(replay);
    expect(rows[0].dealt).toBeCloseTo(40);
    expect(rows[0].taken).toBeCloseTo(10);
    expect(rows[1].taken).toBeCloseTo(50);
    expect(rows[1].dealt).toBe(0);
    replay.identityUncertain.p1 = true;
    expect(battleImpact(replay).some((r) => r.side === "p1")).toBe(false);
  });
  it("leaves unobservable HP changes unmeasured", () => {
    const event = parseReplay(log).events.find((e) => e.kind === "damage")!;
    expect(observedHpLoss({ ...event, healthBefore: null })).toBeNull();
    expect(
      observedHpLoss({
        ...event,
        healthAfter: {
          current: 0,
          max: null,
          status: "fnt",
          precision: "public",
        },
      }),
    ).toBeCloseTo(100);
  });
});
