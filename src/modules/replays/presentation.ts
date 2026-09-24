import type { BattleEvent, Health, ParsedReplay, Side } from "./types";

function hpFraction(hp: Health | null): number | null {
  if (!hp) return null;
  if (hp.current === 0) return 0;
  return hp.max ? hp.current / hp.max : null;
}
export function observedHpLoss(event: BattleEvent): number | null {
  if (event.kind !== "damage") return null;
  const before = hpFraction(event.healthBefore),
    after = hpFraction(event.healthAfter);
  return before === null || after === null
    ? null
    : Math.max(0, (before - after) * 100);
}

// HP points are summed public-health percentages, not exact damage rolls.
// Credit only an opposing move with no alternative damage source in the log.
export function battleImpact(replay: ParsedReplay) {
  const rows = replay.pokemon
    .filter((p) => p.selected && !replay.identityUncertain[p.side])
    .map((p) => ({
      key: p.key,
      species: p.species,
      side: p.side,
      dealt: 0,
      taken: 0,
      unmeasured: 0,
      moves: Object.values(p.moves).reduce((sum, n) => sum + n, 0),
    }));
  let move: BattleEvent | null = null;
  for (const event of replay.events) {
    if (event.kind === "move") {
      move = event;
      continue;
    }
    if (
      [
        "turn",
        "switch",
        "forced_switch",
        "unable_to_move",
        "weather",
        "field",
        "heal",
        "result",
      ].includes(event.kind)
    )
      move = null;
    if (event.kind !== "damage") continue;
    const target = rows.find((r) => r.key === event.actor);
    const loss = observedHpLoss(event);
    if (!target) continue;
    if (loss === null) {
      target.unmeasured++;
      continue;
    }
    target.taken += loss;
    const attacker = rows.find((r) => r.key === move?.actor);
    if (
      attacker &&
      move?.turn === event.turn &&
      attacker.side !== target.side &&
      !event.args.some((arg) => arg.startsWith("[from]"))
    )
      attacker.dealt += loss;
  }
  return rows;
}

function combatantLabel(
  replay: ParsedReplay,
  key: string | null,
  perspective?: Side,
) {
  const pokemon = replay.pokemon.find((p) => p.key === key);
  if (!pokemon) return "A Pokémon";
  const owner = perspective
    ? pokemon.side === perspective
      ? "Your"
      : "Their"
    : `${replay.players[pokemon.side].name ?? pokemon.side}'s`;
  return `${owner} ${pokemon.species}`;
}

export function battleHighlights(replay: ParsedReplay, perspective?: Side) {
  const name = (key: string | null) => combatantLabel(replay, key, perspective);
  const highlights: {
    sequence: number;
    turn: number;
    species: string | null;
    text: string;
    kind: string;
  }[] = [];
  for (const e of replay.events) {
    const actor = name(e.actor);
    let text: string | null = null;
    if (e.kind === "faint") text = `${actor} fainted.`;
    if (e.kind === "mega") text = `${actor} Mega Evolved.`;
    if (e.kind === "message") text = e.value;
    if (e.kind === "side_condition")
      text = `${e.args[0]?.split(": ")[1] ?? "A side"}: ${e.value?.replace(/^move: /, "")} ${e.command === "-sideend" ? "ended" : "went up"}.`;
    if (e.kind === "status")
      text = `${actor} ${e.command === "-curestatus" ? "recovered from" : "was affected by"} ${{ par: "paralysis", brn: "a burn", slp: "sleep", psn: "poison", tox: "bad poison", frz: "freezing" }[e.value ?? ""] ?? e.value}.`;
    if (e.kind === "field")
      text = `${e.value?.replace(/^move: /, "")} ${e.command === "-fieldend" ? "ended" : "began"}.`;
    if (e.kind === "weather" && !e.args.includes("[upkeep]"))
      text = e.value === "none" ? "The weather cleared." : `${e.value} began.`;
    if (e.kind === "critical_hit") text = `${actor} took a critical hit.`;
    if (e.kind === "miss") text = `${actor}'s attack missed.`;
    if (text)
      highlights.push({
        sequence: e.sequence,
        turn: e.turn,
        species: replay.pokemon.find((p) => p.key === e.actor)?.species ?? null,
        text,
        kind: e.kind,
      });
  }
  return highlights;
}

export function readableTurn(
  replay: ParsedReplay,
  turn: number,
  perspective?: Side,
) {
  const name = (key: string | null) => combatantLabel(replay, key, perspective);
  const highlights = new Map(
    battleHighlights(replay, perspective).map((h) => [h.sequence, h.text]),
  );
  return replay.events
    .filter((e) => e.turn === turn)
    .flatMap((e) => {
      const actor = name(e.actor);
      let text: string | null = null;
      if (e.kind === "move")
        text = `${actor} used ${e.value}${e.target ? ` toward ${name(e.target)}` : ""}.`;
      if (["switch", "forced_switch", "lead"].includes(e.kind))
        text = `${actor} ${e.kind === "lead" ? "led" : "entered the field"}.`;
      if (e.kind === "damage") {
        const loss = observedHpLoss(e);
        text =
          loss === null
            ? `${actor} took damage.`
            : `${actor} lost about ${Math.round(loss)} HP points.`;
      }
      if (e.kind === "heal") text = `${actor} recovered HP.`;
      if (e.kind === "unable_to_move")
        text = `${actor} couldn't move${e.value ? ` (${e.value.replace(/^move: /, "")})` : ""}.`;
      if (!text) text = highlights.get(e.sequence) ?? null;
      return text
        ? [
            {
              sequence: e.sequence,
              species:
                replay.pokemon.find((p) => p.key === e.actor)?.species ?? null,
              text,
            },
          ]
        : [];
    });
}
