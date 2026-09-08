"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { PokemonArt } from "@/components/pokemon-art";
import type {
  DamageBattleState,
  DamageBoosts,
  DamageCombatantInput,
  DamageEvaluationRequest,
  DamageEvaluationResult,
  DamageOptions,
  DamageStats,
} from "@/modules/calculator/types";

type TeamMember = {
  id: string;
  slotNumber: number;
  displayName: string;
  species: string;
  spriteSlug: string;
  isShiny: boolean;
  level: 50;
  item: string | null;
  ability: string | null;
  nature: string;
  statPoints: DamageStats;
  moves: string[];
};

const emptyStats = (): DamageStats => ({
  hp: 0,
  atk: 0,
  def: 0,
  spa: 0,
  spd: 0,
  spe: 0,
});
const emptyBoosts = (): DamageBoosts => ({
  atk: 0,
  def: 0,
  spa: 0,
  spd: 0,
  spe: 0,
});
const emptyCombatant = (): DamageCombatantInput => ({
  species: "",
  level: 50,
  item: null,
  ability: null,
  nature: "Serious",
  statPoints: emptyStats(),
  boosts: emptyBoosts(),
  status: "",
  currentHp: null,
  moves: [],
});
const defaultBattle: DamageBattleState = {
  gameType: "doubles",
  spreadModifier: false,
  weather: "",
  terrain: "",
  attackerHelpingHand: false,
  defenderReflect: false,
  defenderLightScreen: false,
  criticalHit: false,
};
const stats = [
  ["hp", "HP"],
  ["atk", "Atk"],
  ["def", "Def"],
  ["spa", "SpA"],
  ["spd", "SpD"],
  ["spe", "Spe"],
] as const;
const boostStats = stats.slice(1) as Array<
  readonly [keyof DamageBoosts, string]
>;

function memberCombatant(member: TeamMember): DamageCombatantInput {
  return {
    species: member.species,
    level: 50,
    item: member.item,
    ability: member.ability,
    nature: member.nature,
    statPoints: { ...member.statPoints },
    boosts: emptyBoosts(),
    status: "",
    currentHp: null,
    moves: [...member.moves],
  };
}

function CombatantEditor({
  heading,
  value,
  options,
  lists,
  onChange,
}: {
  heading: string;
  value: DamageCombatantInput;
  options: DamageOptions;
  lists: Record<
    "species" | "items" | "abilities" | "moves" | "natures",
    string
  >;
  onChange: (value: DamageCombatantInput) => void;
}) {
  function update<K extends keyof DamageCombatantInput>(
    key: K,
    next: DamageCombatantInput[K],
  ) {
    onChange({ ...value, [key]: next });
  }

  function selectSpecies(species: string) {
    const match = options.species.find(
      (option) => option.name.toLowerCase() === species.toLowerCase(),
    );
    onChange({
      ...value,
      species,
      ability: match?.abilities?.[0] ?? value.ability,
    });
  }

  const totalPoints = Object.values(value.statPoints).reduce(
    (sum, points) => sum + points,
    0,
  );
  return (
    <section className="calculator-combatant panel" aria-label={heading}>
      <div className="split-heading">
        <h3>{heading}</h3>
        <span className="tag-badge">Level 50</span>
      </div>
      <div className="calculator-fields">
        <label className="field-wide">
          Pokémon or form
          <input
            list={lists.species}
            value={value.species}
            placeholder="Search species"
            onChange={(event) => selectSpecies(event.target.value)}
          />
        </label>
        <label>
          Item
          <input
            list={lists.items}
            value={value.item ?? ""}
            placeholder="No item"
            onChange={(event) => update("item", event.target.value || null)}
          />
        </label>
        <label>
          Ability
          <input
            list={lists.abilities}
            value={value.ability ?? ""}
            placeholder="No ability"
            onChange={(event) => update("ability", event.target.value || null)}
          />
        </label>
        <label>
          Nature
          <input
            list={lists.natures}
            value={value.nature}
            onChange={(event) => update("nature", event.target.value)}
          />
        </label>
        <label>
          Status
          <select
            value={value.status}
            onChange={(event) =>
              update(
                "status",
                event.target.value as DamageCombatantInput["status"],
              )
            }
          >
            <option value="">Healthy</option>
            <option value="brn">Burned</option>
            <option value="par">Paralyzed</option>
            <option value="psn">Poisoned</option>
            <option value="tox">Badly poisoned</option>
            <option value="slp">Asleep</option>
            <option value="frz">Frozen</option>
          </select>
        </label>
        <label>
          Current HP
          <input
            type="number"
            min="1"
            value={value.currentHp ?? ""}
            placeholder="Full"
            onChange={(event) =>
              update(
                "currentHp",
                event.target.value ? Number(event.target.value) : null,
              )
            }
          />
        </label>
      </div>
      <fieldset className="calculator-stat-fieldset">
        <legend>Stat Points · {totalPoints}/66</legend>
        <div className="calculator-stat-grid">
          {stats.map(([key, label]) => (
            <label key={key}>
              {label}
              <input
                type="number"
                min="0"
                max="32"
                value={value.statPoints[key]}
                aria-invalid={
                  value.statPoints[key] > 32 || totalPoints > 66 || undefined
                }
                onChange={(event) =>
                  update("statPoints", {
                    ...value.statPoints,
                    [key]: Number(event.target.value),
                  })
                }
              />
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset className="calculator-stat-fieldset">
        <legend>Battle stat stages</legend>
        <div className="calculator-stat-grid boosts">
          {boostStats.map(([key, label]) => (
            <label key={key}>
              {label}
              <select
                value={value.boosts[key]}
                onChange={(event) =>
                  update("boosts", {
                    ...value.boosts,
                    [key]: Number(event.target.value),
                  })
                }
              >
                {Array.from({ length: 13 }, (_, index) => index - 6).map(
                  (stage) => (
                    <option key={stage} value={stage}>
                      {stage > 0 ? `+${stage}` : stage}
                    </option>
                  ),
                )}
              </select>
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset className="calculator-stat-fieldset">
        <legend>Moves</legend>
        <div className="calculator-move-grid">
          {Array.from({ length: 4 }, (_, index) => (
            <label key={index}>
              Move {index + 1}
              <input
                list={lists.moves}
                value={value.moves[index] ?? ""}
                onChange={(event) => {
                  const moves = [...value.moves];
                  moves[index] = event.target.value;
                  update("moves", moves.filter(Boolean));
                }}
              />
            </label>
          ))}
        </div>
      </fieldset>
    </section>
  );
}

export function DamageCalculator({
  ruleset,
  versionLabel,
  members,
  options,
}: {
  ruleset: string;
  versionLabel: string;
  members: TeamMember[];
  options: DamageOptions;
}) {
  const firstMember = members[0];
  const [attacker, setAttacker] = useState<DamageCombatantInput>(() =>
    firstMember ? memberCombatant(firstMember) : emptyCombatant(),
  );
  const [defender, setDefender] =
    useState<DamageCombatantInput>(emptyCombatant);
  const [selectedMember, setSelectedMember] = useState<string | null>(
    firstMember?.id ?? null,
  );
  const [attackerModified, setAttackerModified] = useState(false);
  const [move, setMove] = useState(firstMember?.moves[0] ?? "");
  const [battle, setBattle] = useState(defaultBattle);
  const [result, setResult] = useState<DamageEvaluationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listPrefix = useId().replaceAll(":", "");
  const lists = {
    species: `${listPrefix}-species`,
    items: `${listPrefix}-items`,
    abilities: `${listPrefix}-abilities`,
    moves: `${listPrefix}-moves`,
    natures: `${listPrefix}-natures`,
  };

  const request = useMemo<DamageEvaluationRequest | null>(() => {
    const attackerTotal = Object.values(attacker.statPoints).reduce(
      (sum, value) => sum + value,
      0,
    );
    const defenderTotal = Object.values(defender.statPoints).reduce(
      (sum, value) => sum + value,
      0,
    );
    if (
      !attacker.species ||
      !defender.species ||
      !move ||
      attackerTotal > 66 ||
      defenderTotal > 66
    )
      return null;
    return { ruleset, attacker, defender, move, battle };
  }, [attacker, battle, defender, move, ruleset]);

  useEffect(() => {
    if (!request) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/v1/damage/evaluate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(request),
          signal: controller.signal,
        });
        const payload = (await response.json()) as
          | { ok: true; data: DamageEvaluationResult }
          | { ok: false; message: string };
        if (!payload.ok) throw new Error(payload.message);
        setResult(payload.data);
      } catch (caught) {
        if (!controller.signal.aborted)
          setError(
            caught instanceof Error
              ? caught.message
              : "The calculation could not be completed.",
          );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 250);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [request]);

  function chooseMember(member: TeamMember) {
    const next = memberCombatant(member);
    setAttacker(next);
    setMove(next.moves[0] ?? "");
    setSelectedMember(member.id);
    setAttackerModified(false);
  }

  function updateAttacker(next: DamageCombatantInput) {
    setAttacker(next);
    setAttackerModified(true);
    setSelectedMember(null);
    if (!next.moves.includes(move)) setMove(next.moves[0] ?? "");
  }

  function swapSides() {
    setAttacker(defender);
    setDefender(attacker);
    setMove(defender.moves[0] ?? "");
    setSelectedMember(null);
    setAttackerModified(true);
  }

  return (
    <div className="calculator-shell">
      <aside className="calculator-roster" aria-label="Team attackers">
        <div>
          <p className="eyebrow">Your team</p>
          <p className="muted calculator-version">{versionLabel}</p>
        </div>
        <div className="calculator-roster-list">
          {members.map((member) => (
            <button
              type="button"
              className="calculator-roster-button"
              aria-pressed={selectedMember === member.id}
              aria-label={`Use ${member.displayName} as attacker`}
              key={member.id}
              onClick={() => chooseMember(member)}
            >
              <PokemonArt slug={member.spriteSlug} isShiny={member.isShiny} />
              <span>{member.displayName}</span>
            </button>
          ))}
        </div>
      </aside>
      <div className="calculator-main">
        <div className="calculator-toolbar panel">
          <div>
            <strong>Unsaved calculation</strong>
            <p className="muted">
              Team edits here are temporary and never change the stored set.
            </p>
          </div>
          <button type="button" className="secondary" onClick={swapSides}>
            Swap sides
          </button>
        </div>
        {attackerModified && (
          <p className="calculator-notice" role="status">
            What-if attacker: modified from the selected team set.
          </p>
        )}
        <div className="calculator-combatants">
          <CombatantEditor
            heading="Attacker"
            value={attacker}
            options={options}
            lists={lists}
            onChange={updateAttacker}
          />
          <CombatantEditor
            heading="Defender"
            value={defender}
            options={options}
            lists={lists}
            onChange={setDefender}
          />
        </div>
        <section
          className="calculator-battle panel"
          aria-labelledby="battle-state"
        >
          <div className="split-heading">
            <h3 id="battle-state">Move and battle state</h3>
            {loading && request && (
              <span className="muted">Recalculating…</span>
            )}
          </div>
          <div className="calculator-fields">
            <label>
              Attacking move
              <select
                value={move}
                onChange={(event) => setMove(event.target.value)}
              >
                {!attacker.moves.length && (
                  <option value="">Add a move above</option>
                )}
                {attacker.moves.map((name, index) => (
                  <option value={name} key={`${name}-${index}`}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Weather
              <select
                value={battle.weather}
                onChange={(event) =>
                  setBattle({
                    ...battle,
                    weather: event.target.value as DamageBattleState["weather"],
                  })
                }
              >
                <option value="">None</option>
                {["Sun", "Rain", "Sand", "Hail", "Snow"].map((value) => (
                  <option value={value} key={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Terrain
              <select
                value={battle.terrain}
                onChange={(event) =>
                  setBattle({
                    ...battle,
                    terrain: event.target.value as DamageBattleState["terrain"],
                  })
                }
              >
                <option value="">None</option>
                {["Electric", "Grassy", "Psychic", "Misty"].map((value) => (
                  <option value={value} key={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="choice-row calculator-toggles">
            {[
              ["spreadModifier", "Spread-move modifier"],
              ["attackerHelpingHand", "Helping Hand"],
              ["defenderReflect", "Defender Reflect"],
              ["defenderLightScreen", "Defender Light Screen"],
              ["criticalHit", "Critical hit"],
            ].map(([key, label]) => (
              <label key={key}>
                <input
                  type="checkbox"
                  checked={battle[key as keyof DamageBattleState] as boolean}
                  onChange={(event) =>
                    setBattle({ ...battle, [key]: event.target.checked })
                  }
                />
                {label}
              </label>
            ))}
          </div>
        </section>
        <section
          className="calculator-results panel"
          aria-labelledby="calculator-result-heading"
          aria-live="polite"
        >
          <div className="split-heading">
            <h3 id="calculator-result-heading">Result</h3>
            {result && request && (
              <span className={`calculation-confidence ${result.confidence}`}>
                {result.confidence}
              </span>
            )}
          </div>
          {error && request && <p className="calculator-error">{error}</p>}
          {!request && (
            <p className="muted">
              Choose a defender and a damaging move to calculate.
            </p>
          )}
          {result && request && (
            <>
              <p className="damage-range">
                {result.damage.min}–{result.damage.max} HP
                <span>
                  {result.percentage.min}–{result.percentage.max}%
                </span>
              </p>
              <p className="ko-summary">{result.ko.summary}</p>
              <p>{result.description}</p>
              {!!result.rolls.length && (
                <details>
                  <summary>Damage rolls ({result.rolls.length})</summary>
                  <p className="roll-list">{result.rolls.join(", ")}</p>
                </details>
              )}
              {!!result.warnings.length && (
                <div className="calculator-warning">
                  <strong>This result uses fallbacks</strong>
                  <ul>
                    {result.warnings.map((warning, index) => (
                      <li key={`${warning.code}-${index}`}>
                        {warning.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <details>
                <summary>Assumptions and versions</summary>
                <ul>
                  {result.assumptions.map((assumption) => (
                    <li key={assumption}>{assumption}</li>
                  ))}
                </ul>
                <p className="muted">
                  {result.versions.engine.name} {result.versions.engine.version}{" "}
                  · {result.versions.mechanics} · {result.versions.catalog}
                </p>
              </details>
            </>
          )}
        </section>
      </div>
      <datalist id={lists.species}>
        {options.species.map((option) => (
          <option key={option.name} value={option.name} />
        ))}
      </datalist>
      <datalist id={lists.items}>
        {options.items.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>
      <datalist id={lists.abilities}>
        {options.abilities.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>
      <datalist id={lists.moves}>
        {options.moves.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>
      <datalist id={lists.natures}>
        {options.natures.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>
    </div>
  );
}
