import type { Combatant, ParsedReplay, Side } from "@/modules/replays/types";
import { battleHighlights, readableTurn } from "@/modules/replays/presentation";
import { PokemonPortrait, PokemonLabel } from "./battle-visuals";

function FormationSlot({ pokemon }: { pokemon?: Combatant }) {
  return (
    <div className={`formation-slot${pokemon ? "" : " unrevealed"}`}>
      {pokemon ? (
        <>
          <PokemonPortrait species={pokemon.species} />
          <strong>{pokemon.species}</strong>
          <span>
            {pokemon.mega ? <span className="mega-chip">✧ Mega</span> : null}
            {pokemon.fainted ? (
              <span className="fainted-chip">Fainted</span>
            ) : pokemon.fainted === false ? (
              <span className="survived-chip">Survived</span>
            ) : null}
          </span>
        </>
      ) : (
        <>
          <span className="unknown-pokemon">?</span>
          <strong>Unrevealed</strong>
          <small>Not shown in the replay</small>
        </>
      )}
    </div>
  );
}
export function BattleFormation({
  replay,
  side,
  label,
}: {
  replay: ParsedReplay;
  side: Side;
  label: string;
}) {
  const roster = replay.pokemon.filter((p) => p.side === side);
  const uncertain = replay.identityUncertain[side];
  const leads = uncertain ? [] : roster.filter((p) => p.lead);
  const backs = uncertain ? [] : roster.filter((p) => p.selected && !p.lead);
  const bench = roster.filter((p) => !p.selected);
  return (
    <section className={`formation-panel side-${side}`}>
      <header>
        <p className="eyebrow">{label}</p>
        <h2>{replay.players[side].name ?? "Unknown player"}</h2>
        <span className="muted">
          {replay.players[side].rating
            ? `${replay.players[side].rating} rating · `
            : ""}
          {replay.sheet === "open"
            ? "Open team sheets"
            : "Team sheets not exposed"}
        </span>
      </header>
      <div className="formation-label">
        <span>Lead</span>
        <i />
      </div>
      <div className="formation-pair">
        {[0, 1].map((i) => (
          <FormationSlot key={i} pokemon={leads[i]} />
        ))}
      </div>
      <div className="formation-label">
        <span>Back</span>
        <i />
      </div>
      <div className="formation-pair">
        {[0, 1].map((i) => (
          <FormationSlot key={i} pokemon={backs[i]} />
        ))}
      </div>
      {!replay.selectionKnown[side] && (
        <p className="quiet-note">
          {uncertain
            ? "Pokémon identities are uncertain in this replay."
            : "Not all four choices were revealed."}
        </p>
      )}
      {bench.length > 0 && (
        <div className="formation-bench">
          <span>
            {replay.selectionKnown[side] ? "Not brought" : "Also at preview"}
          </span>
          <div>
            {bench.map((p) => (
              <PokemonLabel key={p.key} species={p.species} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
export function BattleStory({
  replay,
  perspective,
}: {
  replay: ParsedReplay;
  perspective?: Side;
}) {
  const highlights = battleHighlights(replay, perspective);
  const turns = [
    ...new Set(replay.events.filter((e) => e.turn > 0).map((e) => e.turn)),
  ];
  return (
    <section className="battle-story">
      <div className="analysis-heading">
        <div>
          <p className="eyebrow">How it played out</p>
          <h2>Battle highlights</h2>
        </div>
        <p>Faints, Mega Evolutions, field changes, and key events.</p>
      </div>
      <div className="story-turns">
        {turns.map((turn) => {
          const events = highlights.filter((h) => h.turn === turn);
          const actions = readableTurn(replay, turn, perspective);
          return (
            <article className="story-turn" key={turn}>
              <div className="turn-number">
                <small>TURN</small>
                <strong>{turn}</strong>
              </div>
              <div className="turn-body">
                {events.length > 0 ? (
                  <ul>
                    {events.map((event) => (
                      <li key={event.sequence}>
                        {event.species && (
                          <PokemonPortrait species={event.species} small />
                        )}
                        <span>{event.text}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="muted">
                    {
                      replay.events.filter(
                        (e) => e.turn === turn && e.kind === "move",
                      ).length
                    }{" "}
                    moves played · no faints or major field changes
                  </p>
                )}
                <details>
                  <summary>Moves & events this turn</summary>
                  <ol>
                    {actions.map((action) => (
                      <li key={action.sequence}>{action.text}</li>
                    ))}
                  </ol>
                </details>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
