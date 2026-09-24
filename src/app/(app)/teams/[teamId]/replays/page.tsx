import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { currentUserId } from "@/modules/auth/sessions";
import { getTeamDetail, listTeamVersions } from "@/modules/teams/service";
import {
  factsFromRecords,
  getReplayNote,
  listImportItems,
  listReplayRecords,
} from "@/modules/replays/service";
import { groupSets } from "@/modules/replays/sets";
import { ReplayForm, ReplayRefresh } from "@/components/replay-form";
import { ReplaySummary, ReplayTable } from "@/components/replay-ui";
import { renderSafeMarkdown } from "@/modules/notes/markdown";
export const dynamic = "force-dynamic";
export default async function TeamReplaysPage({
  params,
  searchParams,
}: {
  params: Promise<{ teamId: string }>;
  searchParams: Promise<{ version?: string; import?: string }>;
}) {
  const userId = await currentUserId();
  if (!userId) redirect("/login");
  const { teamId } = await params,
    { version, import: showImport } = await searchParams;
  const team = await getTeamDetail(userId, teamId, version);
  if (!team) notFound();
  const [all, versions, items] = await Promise.all([
    listReplayRecords(userId, teamId),
    listTeamVersions(userId, teamId),
    listImportItems(userId, teamId),
  ]);
  const records = version
    ? all.filter((r) => r.team_version_id === version || !r.team_version_id)
    : all;
  const facts = factsFromRecords(records),
    sets = groupSets(facts);
  const groupedIds = new Set(
    sets.flatMap((set) => set.games.map((game) => game.id)),
  );
  const otherGames = records.filter((game) => !groupedIds.has(game.id));
  const notes = await Promise.all(
    sets.map((s) => getReplayNote(userId, `set:${s.key}`)),
  );
  return (
    <>
      <section className="page-heading split-heading">
        <div>
          <p className="eyebrow">Replay evidence</p>
          <h2>Games and sets</h2>
          <p className="muted">
            Import replay URLs to review results and battle events.
          </p>
        </div>
        <ReplayRefresh
          active={all.some((g) =>
            ["queued", "fetching", "parsing"].includes(g.status),
          )}
        />
      </section>
      <details
        className="panel replay-import-panel"
        open={!all.length || showImport === "1"}
      >
        <summary>Import replays</summary>
        <ReplayForm
          teamId={teamId}
          operation="import"
          label="Import replay URLs"
        >
          <label>
            Replay URLs
            <textarea
              name="urls"
              required
              rows={4}
              placeholder="https://replay.pokemonshowdown.com/…"
            />
          </label>
          <div className="filter-bar">
            <label>
              Team version
              <select
                name="versionId"
                defaultValue={version ?? team.version_id}
              >
                {versions.map((v) => (
                  <option key={v.id} value={v.id}>
                    v{v.version_number}
                  </option>
                ))}
                <option value="">Infer if unambiguous</option>
              </select>
            </label>
            <label>
              Showdown username (optional)
              <input name="username" maxLength={100} />
            </label>
            <label>
              Your side
              <select name="side">
                <option value="">Infer from username or team</option>
                <option value="p1">Player 1</option>
                <option value="p2">Player 2</option>
              </select>
            </label>
          </div>
        </ReplayForm>
      </details>
      <ReplaySummary facts={facts} />
      {sets.map((set, i) => (
        <section key={set.key} className="panel">
          <h2>
            Best of three · {set.wins}–{set.losses} ·{" "}
            {set.result === "unknown" ? "incomplete" : set.result}
          </h2>
          {set.warning && <p role="status">{set.warning}</p>}
          <ReplayTable
            records={set.games.map((g) => records.find((r) => r.id === g.id)!)}
          />
          <details>
            <summary>Set notes</summary>
            <div
              className="markdown-content"
              dangerouslySetInnerHTML={{ __html: renderSafeMarkdown(notes[i]) }}
            />
            <ReplayForm operation="note" teamId={teamId} label="Save set note">
              <input type="hidden" name="subjectKey" value={`set:${set.key}`} />
              <label>
                Notes
                <textarea name="markdown" defaultValue={notes[i]} rows={3} />
              </label>
            </ReplayForm>
          </details>
        </section>
      ))}
      {(otherGames.length > 0 || !records.length) && (
        <section className="panel">
          <h2>{sets.length ? "Other games" : "Games"}</h2>
          <ReplayTable records={otherGames} />
        </section>
      )}
      <details className="panel replay-import-panel">
        <summary>Import activity</summary>
        <p className="muted">
          Duplicate URLs link to the existing game and count once.
        </p>
        <ul>
          {items.map((item) => (
            <li key={item.id}>
              {item.game_id ? (
                <Link
                  href={`/teams/${item.game_team_id}/replays/${item.game_id}`}
                >
                  Replay
                </Link>
              ) : (
                item.original_url
              )}{" "}
              ·{" "}
              {item.submission_status === "duplicate"
                ? "duplicate"
                : (item.status ?? item.submission_status)}
              {(item.error_detail || item.submission_error) &&
                ` · ${item.error_detail ?? item.submission_error}`}
            </li>
          ))}
        </ul>
        {!items.length && <p>No imports yet.</p>}
      </details>
    </>
  );
}
