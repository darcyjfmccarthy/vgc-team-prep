import type {
  FieldIssue,
  ParsedTeamDraft,
  ParsedTeamSlot,
  TeamEvs,
} from "./types";

const zeroEvs = (): TeamEvs => ({
  hp: 0,
  atk: 0,
  def: 0,
  spa: 0,
  spd: 0,
  spe: 0,
});

const statNames: Record<string, keyof TeamEvs> = {
  HP: "hp",
  Atk: "atk",
  Def: "def",
  SpA: "spa",
  SpD: "spd",
  Spe: "spe",
};

function parseHeader(
  line: string,
): Omit<
  ParsedTeamSlot,
  | "slotNumber"
  | "ability"
  | "level"
  | "isShiny"
  | "nature"
  | "evs"
  | "moves"
  | "unsupportedLines"
  | "startLine"
> | null {
  const [left, itemPart] = line.split(/\s+@\s+/, 2);
  if (!left) return null;
  const match = left.match(/^(.*?)(?: \(([MF])\)| \(([^)]+)\))?$/);
  if (!match) return null;
  const name = match[1]?.trim();
  const gender = match[2] as "M" | "F" | undefined;
  const nicknameCandidate = match[3]?.trim();
  if (!name) return null;
  return {
    species: nicknameCandidate ?? name,
    nickname: nicknameCandidate ? name : null,
    gender: gender ?? null,
    item: itemPart?.trim() || null,
  };
}

function parseEvs(value: string): TeamEvs | null {
  const evs = zeroEvs();
  if (!value.trim()) return evs;
  for (const part of value.split("/")) {
    const match = part.trim().match(/^(\d+)\s+(HP|Atk|Def|SpA|SpD|Spe)$/);
    if (!match || !match[1] || !match[2]) return null;
    const stat = statNames[match[2]];
    if (!stat) return null;
    evs[stat] = Number(match[1]);
  }
  return evs;
}

function newSlot(
  header: string,
  slotNumber: number,
  startLine: number,
): ParsedTeamSlot | null {
  const parsed = parseHeader(header);
  if (!parsed) return null;
  return {
    ...parsed,
    slotNumber,
    ability: null,
    level: null,
    isShiny: false,
    nature: null,
    evs: zeroEvs(),
    moves: [],
    unsupportedLines: [],
    startLine,
  };
}

/** Parses a Showdown-compatible export without consulting the database or network. */
export function parseShowdownTeam(rawText: string): ParsedTeamDraft {
  const text = rawText.replace(/\r\n?/g, "\n").trim();
  const errors: FieldIssue[] = [];
  const warnings: FieldIssue[] = [];
  const slots: ParsedTeamSlot[] = [];
  const blocks = text ? text.split(/\n\s*\n/) : [];

  for (const [index, block] of blocks.entries()) {
    const lines = block.split("\n").map((line) => line.trimEnd());
    const startLine = text.slice(0, text.indexOf(block)).split("\n").length;
    const slot = newSlot(lines[0]?.trim() ?? "", index + 1, startLine);
    if (!slot) {
      errors.push({
        code: "INVALID_HEADER",
        message: "A set header is required.",
        slotNumber: index + 1,
        line: startLine,
      });
      continue;
    }
    for (const [lineIndex, sourceLine] of lines.slice(1).entries()) {
      const line = sourceLine.trim();
      const lineNumber = startLine + lineIndex + 1;
      if (!line) continue;
      if (line.startsWith("Ability:")) {
        slot.ability = line.slice("Ability:".length).trim() || null;
      } else if (line.startsWith("Level:")) {
        const level = Number(line.slice("Level:".length).trim());
        if (!Number.isInteger(level))
          errors.push({
            code: "INVALID_LEVEL",
            message: "Level must be a whole number.",
            slotNumber: slot.slotNumber,
            line: lineNumber,
            field: "level",
          });
        else slot.level = level;
      } else if (line === "Shiny: Yes") {
        slot.isShiny = true;
      } else if (line.startsWith("EVs:")) {
        const evs = parseEvs(line.slice("EVs:".length));
        if (!evs)
          errors.push({
            code: "INVALID_EVS",
            message: "EVs must use Showdown stat abbreviations.",
            slotNumber: slot.slotNumber,
            line: lineNumber,
            field: "evs",
          });
        else slot.evs = evs;
      } else if (line.endsWith(" Nature")) {
        slot.nature = line.slice(0, -" Nature".length).trim() || null;
      } else if (line.startsWith("- ")) {
        const move = line.slice(2).trim();
        if (!move)
          errors.push({
            code: "MISSING_MOVE",
            message: "Move lines need a move name.",
            slotNumber: slot.slotNumber,
            line: lineNumber,
            field: "moves",
          });
        else slot.moves.push(move);
      } else {
        slot.unsupportedLines.push(line);
        warnings.push({
          code: "UNSUPPORTED_LINE",
          message: `Retained unsupported line: ${line}`,
          slotNumber: slot.slotNumber,
          line: lineNumber,
        });
      }
    }
    slots.push(slot);
  }

  if (slots.length === 0)
    errors.push({
      code: "EMPTY_TEAM",
      message: "Paste at least one Pokémon set.",
    });
  if (slots.length > 6)
    errors.push({
      code: "TOO_MANY_SLOTS",
      message: "A team may contain at most six slots.",
    });
  return { rawText, slots, errors, warnings };
}
