import { describe, expect, it } from "vitest";
import { damageEvaluationSchema } from "@/modules/calculator/validation";

const combatant = {
  species: "Garchomp",
  level: 50,
  item: null,
  ability: "Rough Skin",
  nature: "Jolly",
  statPoints: { hp: 0, atk: 32, def: 0, spa: 0, spd: 2, spe: 32 },
  boosts: { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
  status: "",
  currentHp: null,
  moves: ["Earthquake"],
};

describe("damage evaluation validation", () => {
  it("accepts a normalized Champions request", () => {
    expect(
      damageEvaluationSchema.safeParse({
        ruleset: "gen9championsvgc2026regmb",
        attacker: combatant,
        defender: { ...combatant, species: "Incineroar" },
        move: "Earthquake",
        battle: {
          gameType: "doubles",
          spreadModifier: true,
          weather: "",
          terrain: "",
          attackerHelpingHand: false,
          defenderReflect: false,
          defenderLightScreen: false,
          criticalHit: false,
        },
      }).success,
    ).toBe(true);
  });

  it("rejects illegal Stat Point totals and stages", () => {
    const parsed = damageEvaluationSchema.safeParse({
      ruleset: "gen9championsvgc2026regmb",
      attacker: {
        ...combatant,
        statPoints: { ...combatant.statPoints, hp: 3 },
        boosts: { ...combatant.boosts, atk: 7 },
      },
      defender: combatant,
      move: "Earthquake",
      battle: {
        gameType: "doubles",
        spreadModifier: false,
        weather: "",
        terrain: "",
        attackerHelpingHand: false,
        defenderReflect: false,
        defenderLightScreen: false,
        criticalHit: false,
      },
    });
    expect(parsed.success).toBe(false);
  });
});
