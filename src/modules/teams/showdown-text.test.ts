import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { parseShowdownTeam } from "./showdown-text";
import { validateParsedTeam } from "./validation";

const fixture = readFileSync(
  path.join(import.meta.dirname, "fixtures", "6bbca2da7c6e2365.txt"),
  "utf8",
);

describe("parseShowdownTeam", () => {
  it("parses the captured Poképaste fixture", () => {
    const parsed = parseShowdownTeam(fixture);
    expect(parsed.errors).toEqual([]);
    expect(parsed.slots).toHaveLength(6);
    expect(parsed.slots[0]).toMatchObject({
      species: "Froslass-Mega",
      gender: "F",
      item: "Froslassite",
      level: 50,
      nature: "Timid",
    });
    expect(parsed.slots[5]).toMatchObject({
      species: "Scovillain-Mega",
      isShiny: true,
      evs: { hp: 32, atk: 0, def: 15, spa: 0, spd: 15, spe: 4 },
    });
    expect(validateParsedTeam(parsed)).toEqual([]);
  });

  it("handles CRLF and marks malformed EVs", () => {
    const parsed = parseShowdownTeam(
      "Kingambit @ Life Orb\r\nAbility: Defiant\r\nLevel: 50\r\nEVs: nope\r\nAdamant Nature\r\n- Protect",
    );
    expect(parsed.errors.map((issue) => issue.code)).toContain("INVALID_EVS");
  });
});
