"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createTeamAction, previewTeamImportAction } from "@/app/actions/teams";
import type { TeamImportDraft, TeamStatus } from "@/modules/teams/types";

export function TeamImportForm() {
  const router = useRouter();
  const [kind, setKind] = useState<"showdown_text" | "pokepaste">(
    "showdown_text",
  );
  const [value, setValue] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<TeamStatus>("testing");
  const [tags, setTags] = useState("");
  const [preview, setPreview] = useState<TeamImportDraft | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function check() {
    setBusy(true);
    setMessage(null);
    const result = await previewTeamImportAction({ kind, value });
    setBusy(false);
    if (!result.ok) {
      setMessage(result.message);
      setPreview(null);
      return;
    }
    setPreview(result.data);
    if (!title && result.data.sourceTitle) setTitle(result.data.sourceTitle);
  }

  async function save() {
    setBusy(true);
    setMessage(null);
    const result = await createTeamAction({
      kind,
      value,
      metadata: {
        title: title || preview?.sourceTitle || "Imported team",
        description,
        status,
        tags: tags.split(","),
      },
    });
    setBusy(false);
    if (!result.ok) {
      setMessage(result.message);
      return;
    }
    router.push(`/teams/${result.data.teamId}`);
    router.refresh();
  }

  return (
    <section className="panel">
      <fieldset className="choice-row">
        <legend>Import source</legend>
        <label>
          <input
            type="radio"
            name="source-kind"
            checked={kind === "showdown_text"}
            onChange={() => {
              setKind("showdown_text");
              setPreview(null);
            }}
          />{" "}
          Showdown text
        </label>
        <label>
          <input
            type="radio"
            name="source-kind"
            checked={kind === "pokepaste"}
            onChange={() => {
              setKind("pokepaste");
              setPreview(null);
            }}
          />{" "}
          Poképaste URL
        </label>
      </fieldset>
      <label htmlFor="team-source">
        {kind === "pokepaste"
          ? "Poképaste URL"
          : "Pokémon Showdown export text"}
        {kind === "pokepaste" ? (
          <input
            id="team-source"
            value={value}
            onChange={(event) => {
              setValue(event.target.value);
              setPreview(null);
            }}
            placeholder="https://pokepast.es/..."
          />
        ) : (
          <textarea
            id="team-source"
            value={value}
            onChange={(event) => {
              setValue(event.target.value);
              setPreview(null);
            }}
            rows={16}
            placeholder="Paste all six sets here"
          />
        )}
      </label>
      <button type="button" onClick={check} disabled={busy || !value.trim()}>
        {busy ? "Checking…" : "Preview team"}
      </button>
      {message && (
        <p className="error" role="alert">
          {message}
        </p>
      )}
      {preview && (
        <div className="preview-stack">
          <div aria-live="polite">
            <h2>Preview</h2>
            <p>
              {preview.draft.slots.length} sets detected · {preview.rulesetName}
            </p>
            {preview.issues.length ? (
              <ul className="error-list">
                {preview.issues.map((issue, index) => (
                  <li key={`${issue.code}-${index}`}>
                    {issue.slotNumber ? `Slot ${issue.slotNumber}: ` : ""}
                    {issue.message}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="success">Ready to save.</p>
            )}
          </div>
          <div className="slot-preview">
            {preview.draft.slots.map((slot) => (
              <article key={slot.slotNumber}>
                <h3>{slot.species}</h3>
                <p>
                  {slot.item ?? "No item"} · {slot.ability ?? "No ability"}
                </p>
                <p>{slot.moves.join(" · ")}</p>
              </article>
            ))}
          </div>
          <div className="form-grid">
            <label>
              Title
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                maxLength={120}
                required
              />
            </label>
            <label>
              Status
              <select
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value as TeamStatus)
                }
              >
                <option value="testing">Testing</option>
                <option value="active">Active</option>
                <option value="archived">Archived</option>
              </select>
            </label>
          </div>
          <label>
            Description
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              maxLength={2000}
            />
          </label>
          <label>
            Tags <span className="muted">(comma-separated)</span>
            <input
              value={tags}
              onChange={(event) => setTags(event.target.value)}
              placeholder="regional, rain matchup"
            />
          </label>
          <button
            type="button"
            onClick={save}
            disabled={busy || preview.issues.length > 0 || !title.trim()}
          >
            {busy ? "Saving…" : "Save team"}
          </button>
        </div>
      )}
    </section>
  );
}
