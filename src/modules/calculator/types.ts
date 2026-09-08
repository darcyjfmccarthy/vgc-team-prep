import type { EvStat } from "@/modules/teams/types";

export type CalculationConfidence = "verified" | "approximate" | "unsupported";

export type DamageStats = Record<EvStat, number>;
export type DamageBoosts = Record<Exclude<EvStat, "hp">, number>;
export type DamageStatus = "" | "brn" | "par" | "psn" | "tox" | "slp" | "frz";

export type DamageCombatantInput = {
  species: string;
  level: 50;
  item: string | null;
  ability: string | null;
  nature: string;
  statPoints: DamageStats;
  boosts: DamageBoosts;
  status: DamageStatus;
  currentHp: number | null;
  moves: string[];
};

export type DamageBattleState = {
  gameType: "doubles";
  spreadModifier: boolean;
  weather: "" | "Sun" | "Rain" | "Sand" | "Hail" | "Snow";
  terrain: "" | "Electric" | "Grassy" | "Psychic" | "Misty";
  attackerHelpingHand: boolean;
  defenderReflect: boolean;
  defenderLightScreen: boolean;
  criticalHit: boolean;
};

export type DamageEvaluationRequest = {
  ruleset: string;
  attacker: DamageCombatantInput;
  defender: DamageCombatantInput;
  move: string;
  battle: DamageBattleState;
};

export type DamageWarning = {
  code: string;
  message: string;
};

export type DamageEvaluationResult = {
  confidence: CalculationConfidence;
  rolls: number[];
  damage: { min: number; max: number };
  percentage: { min: number; max: number };
  defenderHp: number;
  ko: { chance: number | null; hits: number; summary: string };
  description: string;
  assumptions: string[];
  warnings: DamageWarning[];
  versions: {
    engine: { name: "@smogon/calc"; version: "0.11.0" };
    mechanics: string;
    catalog: string;
  };
};

export type DamageOption = {
  name: string;
  abilities?: string[];
  moves?: string[];
};

export type DamageOptions = {
  species: DamageOption[];
  items: string[];
  abilities: string[];
  moves: string[];
  natures: string[];
};
