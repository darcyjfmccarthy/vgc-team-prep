import type { EvStat } from "@/modules/teams/types";

export type NatureAdjustedStat = Exclude<EvStat, "hp">;

export type NatureEffect = {
  increased: NatureAdjustedStat;
  decreased: NatureAdjustedStat;
} | null;

export const natureEffects: Readonly<Record<string, NatureEffect>> = {
  hardy: null,
  lonely: { increased: "atk", decreased: "def" },
  brave: { increased: "atk", decreased: "spe" },
  adamant: { increased: "atk", decreased: "spa" },
  naughty: { increased: "atk", decreased: "spd" },
  bold: { increased: "def", decreased: "atk" },
  docile: null,
  relaxed: { increased: "def", decreased: "spe" },
  impish: { increased: "def", decreased: "spa" },
  lax: { increased: "def", decreased: "spd" },
  timid: { increased: "spe", decreased: "atk" },
  hasty: { increased: "spe", decreased: "def" },
  serious: null,
  jolly: { increased: "spe", decreased: "spa" },
  naive: { increased: "spe", decreased: "spd" },
  modest: { increased: "spa", decreased: "atk" },
  mild: { increased: "spa", decreased: "def" },
  quiet: { increased: "spa", decreased: "spe" },
  bashful: null,
  rash: { increased: "spa", decreased: "spd" },
  calm: { increased: "spd", decreased: "atk" },
  gentle: { increased: "spd", decreased: "def" },
  sassy: { increased: "spd", decreased: "spe" },
  careful: { increased: "spd", decreased: "spa" },
  quirky: null,
};

export function natureEffectFor(slug: string | null): NatureEffect {
  return slug ? (natureEffects[slug] ?? null) : null;
}
