import type {
  BattleEvent,
  Combatant,
  Health,
  ParsedReplay,
  Side,
} from "./types";

export const PARSER_VERSION = "showdown-1.0.2";
export const toId = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]/g, "");
// Mega is a battle transformation; regional forms remain distinct.
export const previewSpecies = (value: string) =>
  value.replace(/-Mega(?:-[XY])?$/i, "");
const sideOf = (value = ""): Side | null =>
  /^p[12](?:[ab])?(?::|$)/.test(value) ? (value.slice(0, 2) as Side) : null;
const speciesOf = (details = "") => details.split(",")[0].trim();
const positive = (value: string | undefined) =>
  value && /^\d+$/.test(value) ? Number(value) : null;
export function parseHealth(value: string): Health | null {
  const match = /^(\d+)(?:\/(\d+))?(?: (\w+))?$/.exec(value);
  if (!match || (!match[2] && match[3] !== "fnt")) return null;
  const current = Number(match[1]);
  const max = match[2] ? Number(match[2]) : null;
  if (max !== null && (max <= 0 || current > max)) return null;
  return { current, max, status: match[3] ?? null, precision: "public" };
}
const kinds: Record<string, string> = {
  poke: "preview",
  switch: "switch",
  drag: "forced_switch",
  replace: "identity_reveal",
  move: "move",
  faint: "faint",
  detailschange: "form",
  "-formechange": "form",
  "-mega": "mega",
  "-damage": "damage",
  "-heal": "heal",
  "-sethp": "health",
  "-status": "status",
  "-curestatus": "status",
  "-weather": "weather",
  "-fieldstart": "field",
  "-fieldend": "field",
  "-fieldactivate": "field",
  "-sidestart": "side_condition",
  "-sideend": "side_condition",
  "-ability": "ability",
  "-item": "item",
  "-enditem": "item",
  "-boost": "stat_stage",
  "-unboost": "stat_stage",
  "-setboost": "stat_stage",
  "-clearboost": "stat_stage",
  "-clearallboost": "stat_stage",
  "-crit": "critical_hit",
  "-miss": "miss",
  "-immune": "immune",
  "-supereffective": "effectiveness",
  "-resisted": "effectiveness",
  "-singleturn": "effect",
  "-singlemove": "effect",
  "-activate": "effect",
  "-start": "effect",
  "-end": "effect",
  "-fail": "failure",
  "-block": "failure",
  cant: "unable_to_move",
  swap: "position",
  "-transform": "transform",
  win: "result",
  tie: "result",
  turn: "turn",
  showteam: "team_sheet",
  "-message": "message",
};
const informational = new Set([
  "",
  "j",
  "l",
  "join",
  "leave",
  "c",
  "c:",
  "chat",
  "html",
  "raw",
  "uhtml",
  "uhtmlchange",
  "t:",
  "gametype",
  "player",
  "gen",
  "tier",
  "rated",
  "rule",
  "clearpoke",
  "teampreview",
  "teamsize",
  "start",
  "upkeep",
  "inactive",
  "inactiveoff",
  "debug",
  "seed",
]);

export function parseReplay(
  log: string,
  metadata: { formatId?: string; uploadTime?: number } = {},
): ParsedReplay {
  if (!log.trim() || log.length > 4 * 1024 * 1024)
    throw new Error("Replay log is empty or too large.");
  const result: ParsedReplay = {
    parserVersion: PARSER_VERSION,
    format: null,
    formatId: metadata.formatId ?? null,
    occurredAt: null,
    timestampSource: null,
    players: {
      p1: { name: null, rating: null },
      p2: { name: null, rating: null },
    },
    winner: null,
    outcome: "unknown",
    turns: 0,
    context: metadata.formatId?.endsWith("bo3")
      ? "bo3"
      : metadata.formatId
        ? "bo1"
        : "unknown",
    sheet: "unknown",
    series: null,
    previewKnown: { p1: false, p2: false },
    selectionKnown: { p1: false, p2: false },
    leadsKnown: { p1: false, p2: false },
    identityUncertain: { p1: false, p2: false },
    pokemon: [],
    events: [],
    warnings: [],
  };
  const active = new Map<string, Combatant>();
  const bringSize: Record<Side, number | null> = { p1: null, p2: null };
  const sheets = new Set<Side>();
  let turn = 0;
  let started = false;
  const warn = (message: string) => {
    if (!result.warnings.includes(message)) result.warnings.push(message);
  };
  const make = (side: Side, species: string, preview: boolean): Combatant => {
    const pokemon: Combatant = {
      key: `${side}:${result.pokemon.filter((p) => p.side === side).length + 1}`,
      side,
      species,
      speciesId: toId(species),
      nickname: null,
      form: null,
      preview,
      selected: null,
      lead: null,
      mega: null,
      fainted: null,
      item: null,
      ability: null,
      sheetMoves: [],
      moves: {},
      switches: 0,
      health: null,
    };
    result.pokemon.push(pokemon);
    return pokemon;
  };
  const resolve = (ident: string) =>
    active.get(ident.split(":")[0]) ??
    result.pokemon.find(
      (p) => p.side === sideOf(ident) && p.nickname === ident.split(": ")[1],
    );
  for (const [index, raw] of log.split(/\r?\n/).entries()) {
    if (!raw.startsWith("|")) {
      if (raw.trim()) warn(`Unrecognized text at line ${index + 1}.`);
      continue;
    }
    const [, command, ...args] = raw.split("|");
    const [a = "", b = "", c = ""] = args;
    const side = sideOf(a);
    let actor = resolve(a);
    const before = actor?.health ?? null;
    if (command === "player" && side && b) {
      result.players[side].name = b;
      result.players[side].rating =
        positive(args[3]) ?? result.players[side].rating;
    }
    if (command === "gametype" && a !== "doubles")
      warn(`Unsupported battle type: ${a}.`);
    if (command === "tier") result.format = a;
    if (
      command === "t:" &&
      result.timestampSource !== "battle" &&
      positive(a)
    ) {
      const date = new Date(Number(a) * 1000);
      if (!Number.isNaN(date.getTime())) {
        result.occurredAt = date.toISOString();
        result.timestampSource = "battle";
      }
    }
    if ((command === "uhtml" || command === "uhtmlchange") && a === "bestof") {
      const key = raw.match(/href=["']\/(game-bestof3-[a-z0-9-]+)["']/)?.[1];
      const number = raw.match(/Game ([123])<\//)?.[1];
      if (key && number) {
        result.series = {
          key,
          gameNumber: Number(number),
          strategyVersion: "showdown-bestof-1",
        };
        result.context = "bo3";
      }
    }
    if (command === "poke" && side && b) {
      actor = make(side, speciesOf(b), true);
      result.previewKnown[side] = true;
    }
    if (
      (command === "teamsize" || command === "teampreview") &&
      positive(command === "teamsize" ? b : a)
    ) {
      if (side) bringSize[side] = Number(b);
      else {
        bringSize.p1 = Number(a);
        bringSize.p2 = Number(a);
      }
    }
    if (command === "showteam" && side) {
      sheets.add(side);
      for (const packed of args.slice(1).join("|").split("]")) {
        const fields = packed.split("|");
        const species = fields[1] || fields[0];
        const p = result.pokemon.find(
          (p) =>
            p.side === side &&
            toId(previewSpecies(p.species)) === toId(previewSpecies(species)),
        );
        if (p) {
          p.item = fields[2] || null;
          p.ability = fields[3] || null;
          p.sheetMoves = fields[4]?.split(",").filter(Boolean) ?? [];
        }
      }
    }
    if (command === "start") started = true;
    if (command === "turn") {
      turn = positive(a) ?? turn;
      result.turns = Math.max(result.turns, turn);
    }
    if (["switch", "drag", "replace"].includes(command) && side && b) {
      const species = speciesOf(b);
      const candidates = result.pokemon.filter(
        (p) =>
          p.side === side &&
          toId(previewSpecies(p.species)) === toId(previewSpecies(species)),
      );
      actor =
        candidates.length === 1 ? candidates[0] : make(side, species, false);
      if (candidates.length > 1 || command === "replace") {
        result.identityUncertain[side] = true;
        warn(
          `${side}: identity is uncertain (duplicate species or Illusion); usage excluded.`,
        );
      }
      actor.nickname = a.split(": ")[1] ?? null;
      actor.selected = true;
      actor.lead = actor.lead === true || (started && turn === 0);
      actor.switches += turn > 0 && command !== "replace" ? 1 : 0;
      actor.health = parseHealth(c);
      active.set(a.split(":")[0], actor);
    }
    if (command === "swap" && actor && side && /^[01]$/.test(b)) {
      const origin = a.split(":")[0],
        destination = `${side}${b === "0" ? "a" : "b"}`;
      const other = active.get(destination);
      active.set(destination, actor);
      if (other) active.set(origin, other);
      else active.delete(origin);
    }
    if (["detailschange", "-formechange"].includes(command) && actor)
      actor.form = speciesOf(b) || null;
    if (command === "-mega" && actor) {
      actor.mega = true;
      actor.item = c || actor.item;
    }
    if (command === "move" && actor && b)
      actor.moves[b] = (actor.moves[b] ?? 0) + 1;
    if (["-damage", "-heal", "-sethp"].includes(command) && actor)
      actor.health = parseHealth(b);
    if (command === "faint" && actor) {
      actor.fainted = true;
      actor.health = {
        current: 0,
        max: actor.health?.max ?? null,
        status: "fnt",
        precision: "public",
      };
    }
    if (command === "-ability" && actor) actor.ability = b || null;
    if (["-item", "-enditem"].includes(command) && actor)
      actor.item = b || actor.item;
    for (const field of args) {
      const reveal = /^\[from\] (ability|item): (.+)$/.exec(field);
      const source = args.find((arg) => arg.startsWith("[of] "));
      const owner = source ? resolve(source.slice(5)) : actor;
      if (reveal && owner) {
        if (reveal[1] === "ability") owner.ability = reveal[2];
        else owner.item = reveal[2];
      }
    }
    if (command === "win") {
      const winners = (["p1", "p2"] as const).filter(
        (s) => toId(result.players[s].name ?? "") === toId(a),
      );
      if (winners.length === 1) {
        result.winner = winners[0];
        result.outcome = "completed";
      } else warn("Winner could not be matched to a player.");
    }
    if (command === "tie") result.outcome = "tie";
    if (!kinds[command] && !informational.has(command))
      warn(`Unsupported event ${command} at line ${index + 1}.`);
    if (kinds[command] || !informational.has(command)) {
      const event: BattleEvent = {
        sequence: result.events.length + 1,
        line: index + 1,
        turn,
        kind:
          command === "switch" && turn === 0
            ? "lead"
            : (kinds[command] ?? "unknown"),
        command,
        actor: actor?.key ?? null,
        target: command === "move" ? (resolve(c)?.key ?? null) : null,
        value:
          command === "win" ||
          command === "-message" ||
          command === "-weather" ||
          command.startsWith("-field")
            ? a || null
            : b || null,
        healthBefore: before,
        healthAfter: actor?.health ?? null,
        args,
        raw,
      };
      result.events.push(event);
    }
  }
  if (!result.occurredAt && metadata.uploadTime) {
    const date = new Date(metadata.uploadTime * 1000);
    if (!Number.isNaN(date.getTime())) {
      result.occurredAt = date.toISOString();
      result.timestampSource = "upload";
    }
  }
  result.sheet = sheets.size === 2 ? "open" : "unknown";
  for (const side of ["p1", "p2"] as const) {
    const roster = result.pokemon.filter((p) => p.side === side);
    result.leadsKnown[side] =
      roster.filter((p) => p.lead).length === 2 &&
      !result.identityUncertain[side];
    result.selectionKnown[side] =
      bringSize[side] !== null &&
      roster.filter((p) => p.selected).length === bringSize[side] &&
      !result.identityUncertain[side];
    for (const p of roster) {
      if (result.selectionKnown[side] && p.selected === null)
        p.selected = false;
      if (result.leadsKnown[side] && p.lead === null) p.lead = false;
      if (result.outcome !== "unknown" && p.selected) {
        p.mega ??= false;
        p.fainted ??= false;
      }
    }
    if (!result.selectionKnown[side])
      warn(
        `${side}: full selection is unknown; only revealed Pokémon are certain.`,
      );
  }
  if (result.outcome === "unknown")
    warn("Replay has no confirmed result; it may be incomplete.");
  if (!result.players.p1.name || !result.players.p2.name || !started)
    throw new Error("Replay is missing players or battle start.");
  return result;
}
