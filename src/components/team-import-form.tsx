"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  importPokepasteAction,
  previewPokepasteAction,
} from "@/app/actions/teams";
import type { ParsedTeamDraft } from "@/modules/teams/types";

export function TeamImportForm() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [draft, setDraft] = useState<ParsedTeamDraft | null>(null);
  const [issues, setIssues] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function preview() {
    setBusy(true);
    setMessage(null);
    const result = await previewPokepasteAction(url);
    setBusy(false);
    if (!result.ok) {
      setMessage(result.message);
      setDraft(null);
      return;
    }
    setDraft(result.data.draft);
    setIssues(result.data.issues.map((issue) => issue.message));
  }
  async function save() {
    setBusy(true);
    const result = await importPokepasteAction(url);
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
      <label htmlFor="paste-url">Poképaste URL</label>
      <div className="inline-form">
        <input
          id="paste-url"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="https://pokepast.es/..."
        />
        <button type="button" onClick={preview} disabled={busy || !url}>
          {busy ? "Checking…" : "Preview"}
        </button>
      </div>
      {message && (
        <p className="error" role="alert">
          {message}
        </p>
      )}
      {draft && (
        <>
          <h2>Preview</h2>
          <p>
            {draft.slots.length} sets detected.{" "}
            {issues.length
              ? `${issues.length} validation issue(s) need attention.`
              : "Ready to save."}
          </p>
          {issues.length > 0 && (
            <ul className="error-list">
              {issues.map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
          )}
          <div className="slot-preview">
            {draft.slots.map((slot) => (
              <article key={slot.slotNumber}>
                <h3>{slot.species}</h3>
                <p>
                  {slot.item ?? "No item"} · {slot.ability ?? "No ability"}
                </p>
                <p>{slot.moves.join(" · ")}</p>
              </article>
            ))}
          </div>
          <button
            type="button"
            onClick={save}
            disabled={busy || issues.length > 0}
          >
            {busy ? "Saving…" : "Save team"}
          </button>
        </>
      )}
    </section>
  );
}
