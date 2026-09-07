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
  teamSize?: number;
  evMaxPerStat?: number;
  evTotal?: number;
};

export type TeamStatus = "active" | "testing" | "archived";
export type TeamSourceKind = "showdown_text" | "pokepaste";
export type VersionSaveMode = "create_version" | "replace_draft";

export type TeamMetadataInput = {
  title: string;
  description: string;
  status: TeamStatus;
  tags: string[];
  expectedRevision?: number;
};

export type TeamImportDraft = {
  sourceKind: TeamSourceKind;
  sourceText: string;
  sourceUrl: string | null;
  sourceTitle: string | null;
  sourceAuthor: string | null;
  sourceFormatId: string;
  rulesetId: string;
  rulesetName: string;
  draft: ParsedTeamDraft;
  issues: FieldIssue[];
};

export type SemanticDiffEntry = {
  slotNumber: number;
  field: string;
  before: string;
  after: string;
};

export type SlotIdentityMapping = {
  slotNumber: number;
  slotIdentityId: string | null;
  preserved: boolean;
  reason: string;
};

export type VersionSavePreview = {
  teamId: string;
  currentVersionId: string;
  currentVersionNumber: number;
  expectedRevision: number;
  replaceEligible: boolean;
  diff: SemanticDiffEntry[];
  slotMappings: SlotIdentityMapping[];
  importDraft: TeamImportDraft;
};

export type Pokepaste = {
  id: string;
  canonicalUrl: string;
  title: string | null;
  author: string | null;
  formatId: string | null;
  teamText: string;
};
