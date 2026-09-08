import type { DamageStats } from "@/modules/calculator/types";
import { natureEffectFor } from "@/lib/nature-effects";

export const emptyDamageStats = (): DamageStats => ({
  hp: 0,
  atk: 0,
  def: 0,
  spa: 0,
  spd: 0,
  spe: 0,
});

export function championsBaseStatOverrides(
  baseStats: Readonly<DamageStats>,
  statPoints: DamageStats,
): DamageStats {
  return {
    hp: baseStats.hp + statPoints.hp,
    atk: baseStats.atk + statPoints.atk,
    def: baseStats.def + statPoints.def,
    spa: baseStats.spa + statPoints.spa,
    spd: baseStats.spd + statPoints.spd,
    spe: baseStats.spe + statPoints.spe,
  };
}

export function computeChampionsStat(
  stat: keyof DamageStats,
  base: number,
  points: number,
  nature: string,
): number {
  const beforeNature = base + 20 + points;
  if (stat === "hp") return base + 75 + points;
  const effect = natureEffectFor(nature.toLowerCase());
  const multiplier =
    effect?.increased === stat ? 1.1 : effect?.decreased === stat ? 0.9 : 1;
  return Math.floor(beforeNature * multiplier);
}
