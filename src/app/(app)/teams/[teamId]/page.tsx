import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { ItemIcon, PokemonArt } from "@/components/pokemon-art";
import { currentUserId } from "@/modules/auth/sessions";
import { getTeamDetail } from "@/modules/teams/service";

export const dynamic = "force-dynamic";

const evLabels = [
  ["hp", "HP"],
  ["atk", "Atk"],
  ["def", "Def"],
  ["spa", "SpA"],
  ["spd", "SpD"],
  ["spe", "Spe"],
] as const;

export default async function TeamPage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const userId = await currentUserId();
  if (!userId) redirect("/login");
  const team = await getTeamDetail(userId, (await params).teamId);
  if (!team) notFound();

  return (
    <AppShell>
      <Link href="/teams">← Teams</Link>
      <section className="title-row team-title-row">
        <div>
          <p className="eyebrow">{team.ruleset_name}</p>
          <h1>{team.title}</h1>
          <p className="muted">
            Version {team.version_number}
            {team.source_author ? ` · by ${team.source_author}` : ""}
          </p>
        </div>
        {team.source_url && (
          <a
            className="button secondary"
            href={team.source_url}
            target="_blank"
            rel="noreferrer"
          >
            Open source
          </a>
        )}
      </section>

      <div className="set-grid">
        {team.slots.map((slot) => {
          const displayName = slot.form_name ?? slot.species_name;
          const imageSlug = slot.form_slug ?? slot.species_slug;

          return (
            <article key={slot.id} className="set-card">
              <header className="set-card-header">
                <PokemonArt slug={imageSlug} isShiny={slot.is_shiny} />
                <div className="set-identity">
                  <div className="set-badges">
                    {slot.is_shiny && (
                      <span className="shiny-badge">✦ Shiny</span>
                    )}
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

              <section
                className="set-section"
                aria-labelledby={`evs-${slot.id}`}
              >
                <h3 id={`evs-${slot.id}`}>Effort values</h3>
                <div className="ev-grid">
                  {evLabels.map(([key, label]) => (
                    <div className={`ev-stat ev-${key}`} key={key}>
                      <div className="ev-label">
                        <span>{label}</span>
                        <strong>{slot[key]}</strong>
                      </div>
                      <progress
                        value={slot[key]}
                        max={team.ev_max_per_stat}
                        aria-label={`${label}: ${slot[key]} of ${team.ev_max_per_stat}`}
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

      <p className="asset-credit muted">
        Sprites provided by{" "}
        <a
          href="https://play.pokemonshowdown.com/sprites/"
          target="_blank"
          rel="noreferrer"
        >
          Pokémon Showdown
        </a>
        . Pokémon artwork belongs to its respective rights holders.
      </p>
    </AppShell>
  );
}
