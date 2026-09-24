export type Side = "p1" | "p2";
export type Result = "win" | "loss" | "tie" | "unknown";
export type Health = {
  current: number;
  max: number | null;
  status: string | null;
  precision: "public";
};
export interface Combatant {
  key: string;
  side: Side;
  species: string;
  speciesId: string;
  slotIdentityId?: string;
  nickname: string | null;
  form: string | null;
  preview: boolean;
  selected: boolean | null;
  lead: boolean | null;
  mega: boolean | null;
  fainted: boolean | null;
  item: string | null;
  ability: string | null;
  sheetMoves: string[];
  moves: Record<string, number>;
  switches: number;
  health: Health | null;
}
export interface BattleEvent {
  sequence: number;
  line: number;
  turn: number;
  kind: string;
  command: string;
  actor: string | null;
  target: string | null;
  value: string | null;
  healthBefore: Health | null;
  healthAfter: Health | null;
  args: string[];
  raw: string;
}
export interface ParsedReplay {
  attributionReady?: boolean;
  attributedSide?: Side | null;
  attributedVersionId?: string | null;
  parserVersion: string;
  format: string | null;
  formatId: string | null;
  occurredAt: string | null;
  timestampSource: "battle" | "upload" | null;
  players: Record<Side, { name: string | null; rating: number | null }>;
  winner: Side | null;
  outcome: "completed" | "tie" | "unknown";
  turns: number;
  context: "bo1" | "bo3" | "unknown";
  sheet: "open" | "closed" | "unknown";
  series: { key: string; gameNumber: number; strategyVersion: string } | null;
  previewKnown: Record<Side, boolean>;
  selectionKnown: Record<Side, boolean>;
  leadsKnown: Record<Side, boolean>;
  identityUncertain: Record<Side, boolean>;
  pokemon: Combatant[];
  events: BattleEvent[];
  warnings: string[];
}
export interface ReplayFact {
  id: string;
  teamId: string;
  versionId: string | null;
  userSide: Side | null;
  result: Result;
  parsed: ParsedReplay;
}
