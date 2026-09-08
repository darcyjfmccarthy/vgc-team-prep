import { describe, expect, it } from "vitest";
import type {
  DamageCombatantInput,
  DamageEvaluationRequest,
} from "@/modules/calculator/types";
import {
  calculateDamage,
  listDamageOptions,
} from "@/modules/calculator/engine";

const combatant = (
  species: string,
  overrides: Partial<DamageCombatantInput> = {},
): DamageCombatantInput => ({
  species,
  level: 50,
  item: null,
  ability: null,
  nature: "Serious",
  statPoints: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
  boosts: { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
  status: "",
  currentHp: null,
  moves: [],
  ...overrides,
});

const request = (
  overrides: Partial<DamageEvaluationRequest> = {},
): DamageEvaluationRequest => ({
  ruleset: "gen9championsvgc2026regmb",
  attacker: combatant("Garchomp", { moves: ["Earthquake"] }),
  defender: combatant("Incineroar"),
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
  ...overrides,
});

describe("damage engine adapter", () => {
  it("returns a versioned verified damage distribution", () => {
    const result = calculateDamage(request());
    expect(result.confidence).toBe("verified");
    expect(result.rolls).toEqual([
      156, 158, 158, 162, 164, 164, 168, 170, 170, 174, 174, 176, 180, 180, 182,
      186,
    ]);
    expect(result.damage.min).toBe(Math.min(...result.rolls));
    expect(result.damage.max).toBe(Math.max(...result.rolls));
    expect(result.percentage.min).toBeGreaterThan(0);
    expect(result.ko.summary).toMatch(/HKO|chance|KO/);
    expect(result.versions.engine).toEqual({
      name: "@smogon/calc",
      version: "0.11.0",
    });
  });

  it("applies Champions Stat Points beyond the standard EV cap", () => {
    const uninvested = calculateDamage(request());
    const invested = calculateDamage(
      request({
        attacker: combatant("Garchomp", {
          nature: "Adamant",
          statPoints: { hp: 0, atk: 32, def: 0, spa: 0, spd: 0, spe: 0 },
          moves: ["Earthquake"],
        }),
      }),
    );
    expect(invested.damage.min).toBeGreaterThan(uninvested.damage.min);
  });

  it("maps spread, screen, Helping Hand, and critical-hit field state", () => {
    const base = calculateDamage(request());
    const spread = calculateDamage(
      request({ battle: { ...request().battle, spreadModifier: true } }),
    );
    const reflect = calculateDamage(
      request({ battle: { ...request().battle, defenderReflect: true } }),
    );
    const helpingHand = calculateDamage(
      request({ battle: { ...request().battle, attackerHelpingHand: true } }),
    );
    const critical = calculateDamage(
      request({ battle: { ...request().battle, criticalHit: true } }),
    );
    expect(spread.damage.max).toBeLessThan(base.damage.max);
    expect(reflect.damage.max).toBeLessThan(base.damage.max);
    expect(helpingHand.damage.min).toBeGreaterThan(base.damage.min);
    expect(critical.damage.min).toBeGreaterThan(base.damage.min);
  });

  it("covers special damage, weather, terrain, status, items, and abilities", () => {
    const specialRequest = request({
      attacker: combatant("Charizard", { moves: ["Flamethrower"] }),
      defender: combatant("Venusaur"),
      move: "Flamethrower",
    });
    const special = calculateDamage(specialRequest);
    const sun = calculateDamage({
      ...specialRequest,
      battle: { ...specialRequest.battle, weather: "Sun" },
    });
    const lightScreen = calculateDamage({
      ...specialRequest,
      battle: { ...specialRequest.battle, defenderLightScreen: true },
    });
    expect(special.damage).toEqual({ min: 110, max: 132 });
    expect(sun.damage.min).toBeGreaterThan(special.damage.min);
    expect(lightScreen.damage.max).toBeLessThan(special.damage.max);

    const physical = request({
      attacker: combatant("Azumarill", {
        ability: "Huge Power",
        item: "Choice Band",
        moves: ["Liquidation"],
      }),
      defender: combatant("Garchomp"),
      move: "Liquidation",
    });
    const boosted = calculateDamage(physical);
    const burned = calculateDamage({
      ...physical,
      attacker: { ...physical.attacker, status: "brn" },
    });
    const noAbilityOrItem = calculateDamage({
      ...physical,
      attacker: { ...physical.attacker, ability: null, item: null },
    });
    expect(boosted.damage.min).toBeGreaterThan(noAbilityOrItem.damage.min);
    expect(burned.damage.max).toBeLessThan(boosted.damage.max);

    const electric = request({
      attacker: combatant("Pikachu", { moves: ["Thunderbolt"] }),
      defender: combatant("Blastoise"),
      move: "Thunderbolt",
    });
    const noTerrain = calculateDamage(electric);
    const terrain = calculateDamage({
      ...electric,
      battle: { ...electric.battle, terrain: "Electric" },
    });
    expect(terrain.damage.min).toBeGreaterThan(noTerrain.damage.min);
  });

  it("labels explicit Gen 9 fallbacks as approximate", () => {
    const result = calculateDamage(
      request({
        attacker: combatant("Froslass-Mega", {
          ability: "A Champions-only Ability",
          moves: ["Blizzard"],
        }),
        move: "Blizzard",
      }),
    );
    expect(result.confidence).toBe("approximate");
    expect(result.warnings.map((warning) => warning.code)).toEqual(
      expect.arrayContaining([
        "UNKNOWN_ABILITY_FALLBACK",
        "CHAMPIONS_MEGA_FALLBACK",
      ]),
    );
  });

  it("returns unsupported instead of inventing unknown damage", () => {
    expect(
      calculateDamage(request({ move: "Imaginary Move" })).confidence,
    ).toBe("unsupported");
    expect(calculateDamage(request({ move: "Swords Dance" })).confidence).toBe(
      "unsupported",
    );
  });

  it("returns total possible rolls for multi-hit moves", () => {
    const result = calculateDamage(
      request({
        attacker: combatant("Ambipom", { moves: ["Double Hit"] }),
        defender: combatant("Blissey"),
        move: "Double Hit",
      }),
    );
    expect(result.rolls[0]).toBe(result.damage.min);
    expect(result.rolls.at(-1)).toBe(result.damage.max);
    expect(result.rolls.every((roll) => roll >= result.damage.min)).toBe(true);
  });

  it("provides sorted editor options and recognized default abilities", () => {
    const options = listDamageOptions();
    const garchomp = options.species.find(({ name }) => name === "Garchomp");
    expect(garchomp?.abilities).toContain("Sand Veil");
    expect(options.moves).toContain("Earthquake");
    expect(options.natures).toContain("Serious");
    expect(
      options.species[0]!.name.localeCompare(options.species[1]!.name),
    ).toBeLessThanOrEqual(0);
  });

  it("keeps warmed single evaluations below the p95 target", () => {
    calculateDamage(request());
    const durations = Array.from({ length: 100 }, () => {
      const start = performance.now();
      calculateDamage(request());
      return performance.now() - start;
    }).sort((left, right) => left - right);
    expect(durations[94]).toBeLessThan(150);
  });
});
