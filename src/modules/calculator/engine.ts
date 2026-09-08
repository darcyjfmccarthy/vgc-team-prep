import "server-only";

import {
  calculate,
  Field,
  Generations,
  Move,
  Pokemon,
  toID,
  type StatsTable,
} from "@smogon/calc";
import type { Generation } from "@smogon/calc/dist/data/interface";
import type {
  CalculationConfidence,
  DamageCombatantInput,
  DamageEvaluationRequest,
  DamageEvaluationResult,
  DamageOptions,
  DamageWarning,
} from "@/modules/calculator/types";
import { championsBaseStatOverrides } from "@/modules/calculator/champions-stats";

const ENGINE_VERSION = "0.11.0" as const;
const MECHANICS_VERSION = "champions-2026-testing.v1";
const CATALOG_VERSION = `smogon-gen9-${ENGINE_VERSION}`;
const generation = Generations.get(9);

const unsupportedResult = (
  warnings: DamageWarning[],
): DamageEvaluationResult => ({
  confidence: "unsupported",
  rolls: [],
  damage: { min: 0, max: 0 },
  percentage: { min: 0, max: 0 },
  defenderHp: 0,
  ko: { chance: null, hits: 0, summary: "Unsupported calculation" },
  description: "This combination cannot be calculated by the current engine.",
  assumptions: [
    "Pokémon Champions battles are evaluated at level 50 with perfect IVs.",
    "Stat Points are applied inside the nature multiplier.",
  ],
  warnings,
  versions: {
    engine: { name: "@smogon/calc", version: ENGINE_VERSION },
    mechanics: MECHANICS_VERSION,
    catalog: CATALOG_VERSION,
  },
});

function addFallbackWarning(
  warnings: DamageWarning[],
  code: string,
  message: string,
): void {
  warnings.push({ code, message });
}

function makePokemon(
  input: DamageCombatantInput,
  warnings: DamageWarning[],
): Pokemon | null {
  const species = generation.species.get(toID(input.species));
  if (!species) {
    warnings.push({
      code: "UNSUPPORTED_SPECIES",
      message: `${input.species} is not present in the pinned engine catalog.`,
    });
    return null;
  }

  let nature = input.nature;
  if (!generation.natures.get(toID(nature))) {
    nature = "Serious";
    addFallbackWarning(
      warnings,
      "UNKNOWN_NATURE_FALLBACK",
      `${input.nature} is unknown; the result uses a neutral Serious nature.`,
    );
  }

  let item = input.item ?? undefined;
  if (item && !generation.items.get(toID(item))) {
    addFallbackWarning(
      warnings,
      "UNKNOWN_ITEM_FALLBACK",
      `${item} is unknown; the result omits its effect.`,
    );
    item = undefined;
  }

  let ability = input.ability ?? undefined;
  if (ability && !generation.abilities.get(toID(ability))) {
    addFallbackWarning(
      warnings,
      "UNKNOWN_ABILITY_FALLBACK",
      `${ability} is unknown; the result omits its effect.`,
    );
    ability = undefined;
  }

  if (input.species.toLowerCase().includes("-mega"))
    addFallbackWarning(
      warnings,
      "CHAMPIONS_MEGA_FALLBACK",
      `${input.species} uses the pinned engine's Gen 9-compatible Mega data; Champions-specific ability behavior may differ.`,
    );

  const baseStats = championsBaseStatOverrides(
    species.baseStats as Readonly<StatsTable>,
    input.statPoints,
  );
  const options = {
    level: 50,
    item,
    ability,
    nature,
    ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
    evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
    boosts: input.boosts,
    status: input.status,
    moves: input.moves,
    overrides: { baseStats },
  };
  const uninjured = new Pokemon(generation, species.name, options);
  if (input.currentHp && input.currentHp > uninjured.maxHP())
    addFallbackWarning(
      warnings,
      "CURRENT_HP_CLAMPED",
      `${input.species}'s current HP was clamped to its calculated maximum of ${uninjured.maxHP()}.`,
    );
  return new Pokemon(generation, species.name, {
    ...options,
    curHP: input.currentHp
      ? Math.min(input.currentHp, uninjured.maxHP())
      : undefined,
  });
}

function damageRolls(damage: number | number[] | number[][]): number[] {
  if (typeof damage === "number") return [damage];
  if (damage.every((value) => typeof value === "number"))
    return damage as number[];
  let totals = [0];
  for (const hit of damage as number[][]) {
    const next = new Set<number>();
    for (const total of totals) for (const roll of hit) next.add(total + roll);
    totals = [...next];
  }
  return totals.sort((left, right) => left - right);
}

function confidenceFor(warnings: DamageWarning[]): CalculationConfidence {
  return warnings.length ? "approximate" : "verified";
}

export function calculateDamage(
  input: DamageEvaluationRequest,
): DamageEvaluationResult {
  const warnings: DamageWarning[] = [];
  if (!input.ruleset.toLowerCase().includes("champions"))
    addFallbackWarning(
      warnings,
      "RULESET_FALLBACK",
      `${input.ruleset} is evaluated with the ${MECHANICS_VERSION} mechanics profile.`,
    );

  const attacker = makePokemon(input.attacker, warnings);
  const defender = makePokemon(input.defender, warnings);
  const moveData = generation.moves.get(toID(input.move));
  if (!moveData)
    return unsupportedResult([
      ...warnings,
      {
        code: "UNSUPPORTED_MOVE",
        message: `${input.move} is not present in the pinned engine catalog.`,
      },
    ]);
  if (moveData.category === "Status")
    return unsupportedResult([
      ...warnings,
      {
        code: "STATUS_MOVE",
        message: `${input.move} does not deal direct damage.`,
      },
    ]);
  if (!attacker || !defender) return unsupportedResult(warnings);

  const move = new Move(generation, moveData.name, {
    isCrit: input.battle.criticalHit,
    overrides: {
      target: input.battle.spreadModifier ? "allAdjacentFoes" : "adjacentFoe",
    },
  });
  const field = new Field({
    gameType: "Doubles",
    weather: input.battle.weather || undefined,
    terrain: input.battle.terrain || undefined,
    attackerSide: { isHelpingHand: input.battle.attackerHelpingHand },
    defenderSide: {
      isReflect: input.battle.defenderReflect,
      isLightScreen: input.battle.defenderLightScreen,
    },
  });

  const result = calculate(generation, attacker, defender, move, field);
  const [min, max] = result.range();
  const defenderHp = result.defender.maxHP();
  const ko = result.kochance();
  const assumptions = [
    "Pokémon Champions battles are evaluated at level 50 with perfect IVs.",
    "Stat Points are applied inside the nature multiplier.",
    input.battle.spreadModifier
      ? "The doubles spread-move modifier is applied."
      : "The selected move is treated as single-target.",
    "KO odds use the pinned engine's uniform damage-roll and residual-damage model.",
  ];

  return {
    confidence: confidenceFor(warnings),
    rolls: damageRolls(result.damage),
    damage: { min, max },
    percentage: {
      min: Number(((min / defenderHp) * 100).toFixed(1)),
      max: Number(((max / defenderHp) * 100).toFixed(1)),
    },
    defenderHp,
    ko: {
      chance: ko.chance ?? null,
      hits: ko.n,
      summary: ko.text,
    },
    description: result.desc(),
    assumptions,
    warnings,
    versions: {
      engine: { name: "@smogon/calc", version: ENGINE_VERSION },
      mechanics: MECHANICS_VERSION,
      catalog: CATALOG_VERSION,
    },
  };
}

function sortedNames<T extends { name: string }>(
  values: Iterable<T>,
): string[] {
  return [...values]
    .map((value) => value.name)
    .sort((left, right) => left.localeCompare(right));
}

export function listDamageOptions(gen: Generation = generation): DamageOptions {
  return {
    species: [...gen.species]
      .map((species) => ({
        name: species.name,
        abilities: species.abilities?.[0] ? [species.abilities[0]] : [],
      }))
      .sort((left, right) => left.name.localeCompare(right.name)),
    items: sortedNames(gen.items),
    abilities: sortedNames(gen.abilities),
    moves: sortedNames(gen.moves),
    natures: sortedNames(gen.natures),
  };
}
