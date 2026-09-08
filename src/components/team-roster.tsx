import { ItemIcon, PokemonArt } from "@/components/pokemon-art";
import { natureEffectFor } from "@/lib/nature-effects";

const evLabels = [
  ["hp", "HP"],
  ["atk", "Atk"],
  ["def", "Def"],
  ["spa", "SpA"],
  ["spd", "SpD"],
  ["spe", "Spe"],
] as const;
type Slot = {
  id: string;
  slot_identity_id: string;
  slot_number: number;
  nickname: string | null;
  gender: string | null;
  level: number;
  is_shiny: boolean;
  species_slug: string;
  species_name: string;
  form_slug: string | null;
  form_name: string | null;
  item_slug: string | null;
  item_name: string | null;
  ability_name: string | null;
  nature_slug: string | null;
  nature_name: string | null;
  hp: number;
  atk: number;
  def: number;
  spa: number;
  spd: number;
  spe: number;
  moves: Array<{
    name: string;
    typeSlug: string | null;
    typeName: string | null;
  }>;
};

export function TeamRosterGrid({
  slots,
  evMax,
}: {
  slots: Slot[];
  evMax: number;
}) {
  return (
    <div className="set-grid">
      {slots.map((slot) => {
        const displayName = slot.form_name ?? slot.species_name;
        const nature = natureEffectFor(slot.nature_slug);
        return (
          <article key={slot.id} className="set-card">
            <header className="set-card-header">
              <PokemonArt
                slug={slot.form_slug ?? slot.species_slug}
                isShiny={slot.is_shiny}
              />
              <div className="set-identity">
                <div className="set-badges">
                  {slot.is_shiny && (
                    <span className="shiny-badge">✦ Shiny</span>
                  )}
                  <span className="slot-number">Slot {slot.slot_number}</span>
                </div>
                {slot.nickname && (
                  <p className="set-nickname">{slot.nickname}</p>
                )}
                <h2>
                  {displayName}
                  {slot.gender ? ` (${slot.gender})` : ""}
                </h2>
                <div className="item-row" data-testid="item-treatment">
                  {slot.item_slug && <ItemIcon slug={slot.item_slug} />}
                  <span>{slot.item_name ?? "No held item"}</span>
                </div>
              </div>
            </header>
            <dl className="set-details">
              <div>
                <dt>Ability</dt>
                <dd>{slot.ability_name ?? "Unknown"}</dd>
              </div>
              <div>
                <dt>Nature</dt>
                <dd>{slot.nature_name ?? "Unknown"}</dd>
              </div>
              <div>
                <dt>Level</dt>
                <dd>{slot.level}</dd>
              </div>
            </dl>
            <section className="set-section" aria-labelledby={`evs-${slot.id}`}>
              <h3 id={`evs-${slot.id}`}>Effort values</h3>
              <div className="ev-grid">
                {evLabels.map(([key, label]) => (
                  <div
                    className={`ev-stat ev-${key}${nature?.increased === key ? " nature-increased" : nature?.decreased === key ? " nature-decreased" : ""}`}
                    key={key}
                  >
                    <div className="ev-label">
                      <span className="ev-stat-name">
                        {label}
                        {nature?.increased === key && (
                          <span
                            className="nature-marker"
                            aria-label={`${slot.nature_name} nature increases ${label}`}
                          >
                            ↑
                          </span>
                        )}
                        {nature?.decreased === key && (
                          <span
                            className="nature-marker"
                            aria-label={`${slot.nature_name} nature decreases ${label}`}
                          >
                            ↓
                          </span>
                        )}
                      </span>
                      <strong>{slot[key]}</strong>
                    </div>
                    <progress
                      value={slot[key]}
                      max={evMax}
                      aria-label={`${label}: ${slot[key]} of ${evMax}`}
                    />
                  </div>
                ))}
              </div>
            </section>
            <section
              className="set-section"
              aria-labelledby={`moves-${slot.id}`}
            >
              <h3 id={`moves-${slot.id}`}>Moves</h3>
              <ul className="move-grid">
                {slot.moves.map((move) => (
                  <li
                    key={move.name}
                    className="move-pill"
                    data-type={move.typeSlug ?? "unknown"}
                  >
                    <span>{move.name}</span>
                    <small>{move.typeName ?? "Unknown"}</small>
                  </li>
                ))}
              </ul>
            </section>
          </article>
        );
      })}
    </div>
  );
}
