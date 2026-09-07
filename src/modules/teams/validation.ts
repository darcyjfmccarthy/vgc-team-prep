import type { CatalogNames, FieldIssue, ParsedTeamDraft } from "./types";

export const fixtureCatalogNames: CatalogNames = {
  species: new Set([
    "Froslass-Mega",
    "Basculegion",
    "Kingambit",
    "Sneasler",
    "Lycanroc-Dusk",
    "Scovillain-Mega",
  ]),
  items: new Set([
    "Froslassite",
    "Sitrus Berry",
    "Life Orb",
    "White Herb",
    "Focus Sash",
    "Scovillainite",
  ]),
  abilities: new Set([
    "Cursed Body",
    "Adaptability",
    "Defiant",
    "Unburden",
    "Tough Claws",
    "Moody",
  ]),
  natures: new Set(["Timid", "Adamant", "Bold"]),
  moves: new Set([
    "Blizzard",
    "Shadow Ball",
    "Aurora Veil",
    "Protect",
    "Wave Crash",
    "Last Respects",
    "Aqua Jet",
    "Kowtow Cleave",
    "Sucker Punch",
    "Swords Dance",
    "Close Combat",
    "Gunk Shot",
    "Fake Out",
    "Accelerock",
    "Rock Slide",
    "Giga Drain",
    "Overheat",
    "Rage Powder",
  ]),
};

function unknown(kind: string, value: string, slotNumber: number): FieldIssue {
  return {
    code: `UNKNOWN_${kind.toUpperCase()}`,
    message: `Unsupported ${kind}: ${value}.`,
    slotNumber,
  };
}

export function validateParsedTeam(
  draft: ParsedTeamDraft,
  catalog: CatalogNames = fixtureCatalogNames,
): FieldIssue[] {
  const issues: FieldIssue[] = [...draft.errors];
  const teamSize = catalog.teamSize ?? 6;
  const evMax = catalog.evMaxPerStat ?? 32;
  const evTotalRequired = catalog.evTotal ?? 66;
  if (draft.slots.length !== teamSize)
    issues.push({
      code: "TEAM_SIZE",
      message: `This ruleset requires exactly ${teamSize} Pokémon.`,
    });
  for (const slot of draft.slots) {
    const evTotal = Object.values(slot.evs).reduce(
      (sum, value) => sum + value,
      0,
    );
    if (!catalog.species.has(slot.species))
      issues.push(unknown("species or form", slot.species, slot.slotNumber));
    if (slot.item && !catalog.items.has(slot.item))
      issues.push(unknown("item", slot.item, slot.slotNumber));
    if (!slot.ability)
      issues.push({
        code: "MISSING_ABILITY",
        message: "Ability is required.",
        slotNumber: slot.slotNumber,
      });
    else if (!catalog.abilities.has(slot.ability))
      issues.push(unknown("ability", slot.ability, slot.slotNumber));
    if (slot.level !== 50)
      issues.push({
        code: "INVALID_LEVEL",
        message: "This ruleset requires level 50.",
        slotNumber: slot.slotNumber,
      });
    if (!slot.nature)
      issues.push({
        code: "MISSING_NATURE",
        message: "Nature is required.",
        slotNumber: slot.slotNumber,
      });
    else if (!catalog.natures.has(slot.nature))
      issues.push(unknown("nature", slot.nature, slot.slotNumber));
    if (slot.moves.length < 1 || slot.moves.length > 4)
      issues.push({
        code: "MOVE_COUNT",
        message: "Each set needs one to four moves.",
        slotNumber: slot.slotNumber,
      });
    if (new Set(slot.moves).size !== slot.moves.length)
      issues.push({
        code: "DUPLICATE_MOVE",
        message: "A set cannot contain duplicate moves.",
        slotNumber: slot.slotNumber,
      });
    for (const move of slot.moves)
      if (!catalog.moves.has(move))
        issues.push(unknown("move", move, slot.slotNumber));
    for (const [stat, value] of Object.entries(slot.evs))
      if (!Number.isInteger(value) || value < 0 || value > evMax)
        issues.push({
          code: "INVALID_EV",
          message: `${stat} EV must be between 0 and ${evMax}.`,
          slotNumber: slot.slotNumber,
        });
    if (evTotal !== evTotalRequired)
      issues.push({
        code: "EV_TOTAL",
        message: `This ruleset requires exactly ${evTotalRequired} total EVs.`,
        slotNumber: slot.slotNumber,
      });
  }
  return issues;
}
