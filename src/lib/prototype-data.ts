type TeamSlot = {
  slot_number: number;
  nickname: string | null;
  species_name: string;
  form_name: string | null;
  species_slug: string;
  form_slug: string | null;
  is_shiny: boolean;
};

export type PrototypeGame = {
  id: string;
  teamId: string;
  opponent: string;
  result: "win" | "loss" | "unknown";
  format: "BO1" | "BO3";
  status: "parsed" | "needs input" | "failed";
  playedAt: string;
  score: string;
  leads: string;
};

export type PrototypeMatchup = {
  id: string;
  teamId: string;
  target: string;
  kind: "Opposing team" | "Archetype";
  status: "ready" | "needs review" | "untested";
  leads: string;
  backs: string;
  evidenceCount: number;
  updatedAt: string;
};

export const prototypeGames: PrototypeGame[] = [
  {
    id: "replay-moonlit-1",
    teamId: "all",
    opponent: "MoonlitKite",
    result: "win",
    format: "BO3",
    status: "parsed",
    playedAt: "Today, 8:42 pm",
    score: "2–1",
    leads: "Froslass + Incineroar",
  },
  {
    id: "replay-rain-2",
    teamId: "all",
    opponent: "Rain balance",
    result: "loss",
    format: "BO1",
    status: "parsed",
    playedAt: "Yesterday, 7:15 pm",
    score: "0–1",
    leads: "Scovillain + Rillaboom",
  },
  {
    id: "replay-amber-3",
    teamId: "all",
    opponent: "AmberCrow",
    result: "unknown",
    format: "BO3",
    status: "needs input",
    playedAt: "4 Sep, 6:04 pm",
    score: "Awaiting player side",
    leads: "Unknown",
  },
  {
    id: "replay-private-4",
    teamId: "all",
    opponent: "Private replay",
    result: "unknown",
    format: "BO1",
    status: "failed",
    playedAt: "3 Sep, 9:18 pm",
    score: "Source unavailable",
    leads: "—",
  },
];

export const prototypeMatchups: PrototypeMatchup[] = [
  {
    id: "matchup-rain",
    teamId: "all",
    target: "Rain balance",
    kind: "Archetype",
    status: "needs review",
    leads: "Froslass + Rillaboom",
    backs: "Incineroar + Scovillain",
    evidenceCount: 5,
    updatedAt: "Reviewed 2 days ago",
  },
  {
    id: "matchup-trick-room",
    teamId: "all",
    target: "Hard Trick Room",
    kind: "Archetype",
    status: "ready",
    leads: "Incineroar + Froslass",
    backs: "Rillaboom + Scovillain",
    evidenceCount: 8,
    updatedAt: "Reviewed yesterday",
  },
  {
    id: "matchup-amber",
    teamId: "all",
    target: "AmberCrow’s six",
    kind: "Opposing team",
    status: "untested",
    leads: "Choose after team preview",
    backs: "Rillaboom + flexible slot",
    evidenceCount: 0,
    updatedAt: "Created today",
  },
];

export const knowledgeEntries = [
  {
    id: "knowledge-pelagia",
    name: "Pelagia rain",
    kind: "Opposing team",
    detail: "Fast rain mode with a bulky redirector and late-game cleaner.",
    tags: ["rain", "speed control"],
  },
  {
    id: "knowledge-trick-room",
    name: "Hard Trick Room core",
    kind: "Archetype",
    detail: "Slow attackers supported by reliable Trick Room and redirection.",
    tags: ["trick room", "closed sheet"],
  },
  {
    id: "knowledge-fairy",
    name: "Choice Specs Flutter Mane",
    kind: "Opposing set",
    detail:
      "Fast special attacker; common speed benchmark and spread damage threat.",
    tags: ["fairy", "special attacker"],
  },
];

export function fixtureForTeam<T extends { id: string }>(team: T) {
  return {
    games: prototypeGames.map((game) => ({ ...game, teamId: team.id })),
    matchups: prototypeMatchups.map((matchup) => ({
      ...matchup,
      teamId: team.id,
    })),
  };
}

export function rosterLabel(slot: TeamSlot): string {
  return slot.nickname ?? slot.form_name ?? slot.species_name;
}
