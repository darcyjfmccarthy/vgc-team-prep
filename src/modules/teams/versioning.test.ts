import { describe, expect, it } from "vitest";
import { parseShowdownTeam } from "./showdown-text";
import { semanticTeamDiff } from "./versioning";

describe("semanticTeamDiff", () => {
  it("reports meaningful field changes", () => {
    const before = parseShowdownTeam(
      "Froslass @ Focus Sash\nAbility: Cursed Body\nLevel: 50\nTimid Nature\nEVs: 32 HP / 2 Atk / 32 Spe\n- Protect",
    );
    const after = parseShowdownTeam(
      "Froslass @ Life Orb\nAbility: Cursed Body\nLevel: 50\nTimid Nature\nEVs: 32 HP / 2 Atk / 32 Spe\n- Protect",
    );
    expect(semanticTeamDiff(before, after)).toEqual([
      { slotNumber: 1, field: "item", before: "Focus Sash", after: "Life Orb" },
    ]);
  });
});
