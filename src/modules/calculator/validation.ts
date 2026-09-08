import { z } from "zod";

const statPoints = z.object({
  hp: z.int().min(0).max(32),
  atk: z.int().min(0).max(32),
  def: z.int().min(0).max(32),
  spa: z.int().min(0).max(32),
  spd: z.int().min(0).max(32),
  spe: z.int().min(0).max(32),
});

const boosts = z.object({
  atk: z.int().min(-6).max(6),
  def: z.int().min(-6).max(6),
  spa: z.int().min(-6).max(6),
  spd: z.int().min(-6).max(6),
  spe: z.int().min(-6).max(6),
});

const combatant = z.object({
  species: z.string().trim().min(1).max(80),
  level: z.literal(50),
  item: z.string().trim().max(80).nullable(),
  ability: z.string().trim().max(80).nullable(),
  nature: z.string().trim().min(1).max(20),
  statPoints: statPoints.refine(
    (value) => Object.values(value).reduce((sum, stat) => sum + stat, 0) <= 66,
    "Stat Points cannot total more than 66.",
  ),
  boosts,
  status: z.enum(["", "brn", "par", "psn", "tox", "slp", "frz"]),
  currentHp: z.int().positive().nullable(),
  moves: z.array(z.string().trim().min(1).max(80)).max(4),
});

export const damageEvaluationSchema = z.object({
  ruleset: z.string().trim().min(1).max(100),
  attacker: combatant,
  defender: combatant,
  move: z.string().trim().min(1).max(80),
  battle: z.object({
    gameType: z.literal("doubles"),
    spreadModifier: z.boolean(),
    weather: z.enum(["", "Sun", "Rain", "Sand", "Hail", "Snow"]),
    terrain: z.enum(["", "Electric", "Grassy", "Psychic", "Misty"]),
    attackerHelpingHand: z.boolean(),
    defenderReflect: z.boolean(),
    defenderLightScreen: z.boolean(),
    criticalHit: z.boolean(),
  }),
});
