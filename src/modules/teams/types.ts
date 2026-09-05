export type EvStat = "hp" | "atk" | "def" | "spa" | "spd" | "spe";

export type TeamEvs = Record<EvStat, number>;

export type ParsedTeamSlot = {
  slotNumber: number;
  species: string;
  nickname: string | null;
  gender: "M" | "F" | null;
  item: string | null;
  ability: string | null;
  level: number | null;
  isShiny: boolean;
  nature: string | null;
  evs: TeamEvs;
  moves: string[];
  unsupportedLines: string[];
  startLine: number;
};

export type FieldIssue = {
  code: string;
  message: string;
  slotNumber?: number;
  line?: number;
  field?: string;
};

export type ParsedTeamDraft = {
  rawText: string;
  slots: ParsedTeamSlot[];
  errors: FieldIssue[];
  warnings: FieldIssue[];
};

export type CatalogNames = {
  species: ReadonlySet<string>;
  items: ReadonlySet<string>;
  abilities: ReadonlySet<string>;
  natures: ReadonlySet<string>;
  moves: ReadonlySet<string>;
};

export type Pokepaste = {
  id: string;
  canonicalUrl: string;
  title: string | null;
  author: string | null;
  formatId: string | null;
  teamText: string;
};
