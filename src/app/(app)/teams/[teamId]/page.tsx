import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { TeamManagement, TeamNotes } from "@/components/team-management";
import { ItemIcon, PokemonArt } from "@/components/pokemon-art";
import { natureEffectFor } from "@/lib/nature-effects";
import { currentUserId } from "@/modules/auth/sessions";
import { listNotes } from "@/modules/notes/service";
import { getTeamDetail, listTeamVersions } from "@/modules/teams/service";
import { parseShowdownTeam } from "@/modules/teams/showdown-text";
import { semanticTeamDiff } from "@/modules/teams/versioning";

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
  searchParams,
}: {
  params: Promise<{ teamId: string }>;
  searchParams: Promise<{ version?: string }>;
}) {
  const userId = await currentUserId();
  if (!userId) redirect("/login");
  const teamId = (await params).teamId;
  const requestedVersion = (await searchParams).version;
  const [team, latestTeam, versions] = await Promise.all([
    getTeamDetail(userId, teamId, requestedVersion),
    getTeamDetail(userId, teamId),
    listTeamVersions(userId, teamId),
  ]);
  if (!team) notFound();
  if (!latestTeam) notFound();
  const selectedIndex = versions.findIndex(
    (version) => version.id === team.version_id,
  );
  const previousVersion =
    selectedIndex >= 0 ? versions[selectedIndex + 1] : undefined;
  const previous = previousVersion
    ? await getTeamDetail(userId, teamId, previousVersion.id)
    : null;
  const historicalDiff =
    previous?.source_text && team.source_text
      ? semanticTeamDiff(
          parseShowdownTeam(previous.source_text),
          parseShowdownTeam(team.source_text),
        )
      : [];
  const subjects = [
    { type: "team" as const, id: teamId, label: "Team" },
    {
      type: "team_version" as const,
      id: team.version_id,
      label: `Version ${team.version_number}`,
    },
    ...team.slots.map((slot) => ({
      type: "slot_identity" as const,
      id: slot.slot_identity_id,
      label: slot.nickname ?? slot.form_name ?? slot.species_name,
    })),
  ];
  const noteGroups = await Promise.all(
    subjects.map(async (subject) => ({
      subject,
      notes: await listNotes(userId, subject.type, subject.id),
    })),
  );
  const notes = noteGroups.flatMap(({ subject, notes: rows }) =>
    rows.map((note) => ({
      id: note.id,
      subjectType: note.subject_type,
      subjectId: note.subject_id,
      subjectLabel: subject.label,
      markdown: note.markdown_source,
      html: note.sanitized_render_cache,
      revision: note.revision,
    })),
  );

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
          {team.change_summary && <p>{team.change_summary}</p>}
          {team.description && <p>{team.description}</p>}
          <p className="muted">
            Created{" "}
            <time dateTime={team.created_at.toISOString()}>
              {team.created_at.toLocaleDateString("en-AU")}
            </time>
          </p>
          <div className="tag-row">
            <span className="status-badge">{team.status}</span>
            {team.tags.map((tag) => (
              <span className="tag-badge" key={tag}>
                {tag}
              </span>
            ))}
          </div>
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

      {team.source_text && (
        <details className="panel source-panel">
          <summary>
            View retained{" "}
            {team.source_kind === "pokepaste" ? "Poképaste" : "Showdown"} source
          </summary>
          <pre>{team.source_text}</pre>
        </details>
      )}

      <nav className="version-nav" aria-label="Team version history">
        <strong>Versions</strong>
        {versions.map((version) => (
          <Link
            key={version.id}
            className={
              version.id === team.version_id
                ? "version-link current"
                : "version-link"
            }
            href={`/teams/${teamId}?version=${version.id}`}
          >
            v{version.version_number}
          </Link>
        ))}
      </nav>
      {previousVersion && (
        <details className="panel history-diff">
          <summary>
            Compare v{team.version_number} with v
            {previousVersion.version_number}
          </summary>
          {historicalDiff.length ? (
            <ul>
              {historicalDiff.map((change, index) => (
                <li key={`${change.slotNumber}-${change.field}-${index}`}>
                  <strong>
                    Slot {change.slotNumber} {change.field}:
                  </strong>{" "}
                  <del>{change.before}</del> → <ins>{change.after}</ins>
                </li>
              ))}
            </ul>
          ) : (
            <p>No semantic changes found.</p>
          )}
        </details>
      )}

      <div className="set-grid">
        {team.slots.map((slot) => {
          const displayName = slot.form_name ?? slot.species_name;
          const imageSlug = slot.form_slug ?? slot.species_slug;
          const natureEffect = natureEffectFor(slot.nature_slug);

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
                    <div
                      className={`ev-stat ev-${key}${
                        natureEffect?.increased === key
                          ? " nature-increased"
                          : natureEffect?.decreased === key
                            ? " nature-decreased"
                            : ""
                      }`}
                      key={key}
                    >
                      <div className="ev-label">
                        <span className="ev-stat-name">
                          {label}
                          {natureEffect?.increased === key && (
                            <span
                              className="nature-marker"
                              aria-label={`${slot.nature_name} nature increases ${label}`}
                              title={`${slot.nature_name} nature increases ${label}`}
                            >
                              ↑
                            </span>
                          )}
                          {natureEffect?.decreased === key && (
                            <span
                              className="nature-marker"
                              aria-label={`${slot.nature_name} nature decreases ${label}`}
                              title={`${slot.nature_name} nature decreases ${label}`}
                            >
                              ↓
                            </span>
                          )}
                        </span>
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
      {team.version_id === latestTeam.version_id && (
        <TeamManagement
          team={{
            id: teamId,
            title: latestTeam.title,
            description: latestTeam.description,
            status: latestTeam.status,
            teamRevision: latestTeam.team_revision,
            sourceText: latestTeam.source_text ?? "",
            tags: latestTeam.tags,
          }}
          subjects={subjects}
          notes={notes}
        />
      )}
      {team.version_id !== latestTeam.version_id && (
        <TeamNotes subjects={subjects} initialNotes={notes} />
      )}
    </AppShell>
  );
}
