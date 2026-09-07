import type {
  ParsedTeamDraft,
  ParsedTeamSlot,
  SemanticDiffEntry,
} from "./types";

const fields: Array<keyof ParsedTeamSlot> = [
  "species",
  "nickname",
  "gender",
  "level",
  "item",
  "ability",
  "nature",
  "isShiny",
  "moves",
  "evs",
];

function display(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object")
    return Object.entries(value as Record<string, number>)
      .map(([key, amount]) => `${key.toUpperCase()} ${amount}`)
      .join(", ");
  return String(value);
}

export function semanticTeamDiff(
  before: ParsedTeamDraft,
  after: ParsedTeamDraft,
): SemanticDiffEntry[] {
  const changes: SemanticDiffEntry[] = [];
  const size = Math.max(before.slots.length, after.slots.length);
  for (let index = 0; index < size; index += 1) {
    const oldSlot = before.slots[index];
    const newSlot = after.slots[index];
    if (!oldSlot || !newSlot) {
      changes.push({
        slotNumber: index + 1,
        field: "slot",
        before: oldSlot?.species ?? "—",
        after: newSlot?.species ?? "—",
      });
      continue;
    }
    for (const field of fields) {
      const beforeValue = display(oldSlot[field]);
      const afterValue = display(newSlot[field]);
      if (beforeValue !== afterValue)
        changes.push({
          slotNumber: index + 1,
          field,
          before: beforeValue,
          after: afterValue,
        });
    }
  }
  return changes;
}
