"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  deleteNoteAction,
  previewTeamRevisionAction,
  saveNoteAction,
  saveTeamRevisionAction,
  setTeamArchivedAction,
  updateTeamMetadataAction,
} from "@/app/actions/teams";
import type { TeamStatus, VersionSavePreview } from "@/modules/teams/types";

type NoteView = {
  id: string;
  subjectType: "team" | "team_version" | "slot_identity";
  subjectId: string;
  subjectLabel: string;
  markdown: string;
  html: string;
  revision: number;
};

export function TeamNotes({
  subjects,
  initialNotes,
}: {
  subjects: Array<{ type: NoteView["subjectType"]; id: string; label: string }>;
  initialNotes: NoteView[];
}) {
  const router = useRouter();
  const notes = initialNotes;
  const [subjectKey, setSubjectKey] = useState(
    `${subjects[0]?.type}:${subjects[0]?.id}`,
  );
  const [markdown, setMarkdown] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function create() {
    const [subjectType, subjectId] = subjectKey.split(":") as [
      NoteView["subjectType"],
      string,
    ];
    setBusy(true);
    const result = await saveNoteAction({ subjectType, subjectId, markdown });
    setBusy(false);
    if (!result.ok) {
      setMessage(result.message);
      return;
    }
    setMarkdown("");
    setMessage("Note saved.");
    router.refresh();
  }
  async function update(note: NoteView, value: string) {
    setBusy(true);
    const result = await saveNoteAction({
      id: note.id,
      subjectType: note.subjectType,
      subjectId: note.subjectId,
      markdown: value,
      expectedRevision: note.revision,
    });
    setBusy(false);
    if (!result.ok) {
      setMessage(result.message);
      return;
    }
    setMessage("Note updated.");
    router.refresh();
  }
  async function remove(id: string) {
    setBusy(true);
    const result = await deleteNoteAction(id);
    setBusy(false);
    if (!result.ok) {
      setMessage(result.message);
      return;
    }
    setMessage("Note deleted.");
    router.refresh();
  }
  return (
    <section className="panel manage-section">
      <h2>Notes</h2>
      <p className="muted">
        Supports paragraphs, lists, emphasis, safe links, and inline code.
      </p>
      {notes.map((note) => (
        <article className="note-card" key={note.id}>
          <strong>{note.subjectLabel}</strong>
          <div
            className="note-rendered"
            dangerouslySetInnerHTML={{ __html: note.html }}
          />
          <details>
            <summary>Edit note</summary>
            <textarea
              defaultValue={note.markdown}
              rows={5}
              id={`note-${note.id}`}
            />
            <div className="button-row">
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  const field = document.getElementById(
                    `note-${note.id}`,
                  ) as HTMLTextAreaElement;
                  void update(note, field.value);
                }}
              >
                Save changes
              </button>
              <button
                className="secondary"
                type="button"
                disabled={busy}
                onClick={() => void remove(note.id)}
              >
                Delete
              </button>
            </div>
          </details>
        </article>
      ))}
      <label>
        Attach to
        <select
          value={subjectKey}
          onChange={(event) => setSubjectKey(event.target.value)}
        >
          {subjects.map((subject) => (
            <option
              key={`${subject.type}:${subject.id}`}
              value={`${subject.type}:${subject.id}`}
            >
              {subject.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        New note
        <textarea
          value={markdown}
          onChange={(event) => setMarkdown(event.target.value)}
          rows={6}
          maxLength={10000}
        />
      </label>
      <button
        type="button"
        disabled={busy || !markdown.trim()}
        onClick={() => void create()}
      >
        {busy ? "Saving…" : "Add note"}
      </button>
      {message && <p role="status">{message}</p>}
    </section>
  );
}

export function TeamManagement({
  team,
  subjects,
  notes,
  includeNotes = true,
}: {
  team: {
    id: string;
    title: string;
    description: string | null;
    status: string;
    teamRevision: number;
    sourceText: string;
    tags: string[];
  };
  subjects: Array<{ type: NoteView["subjectType"]; id: string; label: string }>;
  notes: NoteView[];
  includeNotes?: boolean;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(team.title);
  const [description, setDescription] = useState(team.description ?? "");
  const [status, setStatus] = useState<TeamStatus>(team.status as TeamStatus);
  const [tags, setTags] = useState(team.tags.join(", "));
  const [teamRevision, setTeamRevision] = useState(team.teamRevision);
  const [kind, setKind] = useState<"showdown_text" | "pokepaste">(
    "showdown_text",
  );
  const [value, setValue] = useState(team.sourceText);
  const [preview, setPreview] = useState<VersionSavePreview | null>(null);
  const [summary, setSummary] = useState("");
  const [mode, setMode] = useState<"create_version" | "replace_draft">(
    "create_version",
  );
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function saveMetadata() {
    setBusy(true);
    const result = await updateTeamMetadataAction(team.id, {
      title,
      description,
      status,
      tags: tags.split(","),
      expectedRevision: teamRevision,
    });
    setBusy(false);
    if (!result.ok) setMessage(result.message);
    else {
      setTeamRevision((current) => current + 1);
      setMessage("Team details saved.");
      router.refresh();
    }
  }
  async function archive() {
    setBusy(true);
    const result = await setTeamArchivedAction(team.id, status !== "archived");
    setBusy(false);
    if (!result.ok) setMessage(result.message);
    else {
      setStatus(status === "archived" ? "testing" : "archived");
      setTeamRevision((current) => current + 1);
      setMessage(status === "archived" ? "Team restored." : "Team archived.");
      router.refresh();
    }
  }
  async function checkRevision() {
    setBusy(true);
    setMessage(null);
    const result = await previewTeamRevisionAction(team.id, { kind, value });
    setBusy(false);
    if (!result.ok) {
      setMessage(result.message);
      setPreview(null);
    } else setPreview(result.data);
  }
  async function commitRevision() {
    if (!preview) return;
    setBusy(true);
    const result = await saveTeamRevisionAction(team.id, {
      kind,
      value,
      mode,
      expectedRevision: preview.expectedRevision,
      changeSummary: summary,
    });
    setBusy(false);
    if (!result.ok) {
      setMessage(result.message);
      return;
    }
    router.push(`/teams/${team.id}?version=${result.data.versionId}`);
    router.refresh();
  }

  return (
    <div className="management-grid">
      <section className="panel manage-section">
        <h2>Team details</h2>
        <div className="form-grid">
          <label>
            Title
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={120}
            />
          </label>
          <label>
            Status
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as TeamStatus)}
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
            rows={4}
            maxLength={2000}
          />
        </label>
        <label>
          Tags <span className="muted">(comma-separated)</span>
          <input
            value={tags}
            onChange={(event) => setTags(event.target.value)}
          />
        </label>
        <div className="button-row">
          <button
            type="button"
            disabled={busy || !title.trim()}
            onClick={() => void saveMetadata()}
          >
            Save details
          </button>
          <button
            type="button"
            className="secondary"
            disabled={busy}
            onClick={() => void archive()}
          >
            {status === "archived" ? "Restore team" : "Archive team"}
          </button>
        </div>
      </section>
      <section className="panel manage-section">
        <h2>Revise competitive team</h2>
        <fieldset className="choice-row">
          <legend>Revision source</legend>
          <label>
            <input
              type="radio"
              checked={kind === "showdown_text"}
              onChange={() => {
                setKind("showdown_text");
                setValue(team.sourceText);
                setPreview(null);
              }}
            />{" "}
            Showdown text
          </label>
          <label>
            <input
              type="radio"
              checked={kind === "pokepaste"}
              onChange={() => {
                setKind("pokepaste");
                setValue("");
                setPreview(null);
              }}
            />{" "}
            Poképaste URL
          </label>
        </fieldset>
        <label>
          {kind === "pokepaste" ? "Poképaste URL" : "Updated Showdown text"}
          {kind === "pokepaste" ? (
            <input
              value={value}
              onChange={(event) => {
                setValue(event.target.value);
                setPreview(null);
              }}
            />
          ) : (
            <textarea
              value={value}
              onChange={(event) => {
                setValue(event.target.value);
                setPreview(null);
              }}
              rows={12}
            />
          )}
        </label>
        <button
          type="button"
          disabled={busy || !value.trim()}
          onClick={() => void checkRevision()}
        >
          Preview revision
        </button>
        {preview && (
          <div className="diff-panel" aria-live="polite">
            <h3>Changes from version {preview.currentVersionNumber}</h3>
            {preview.importDraft.issues.length ? (
              <ul className="error-list">
                {preview.importDraft.issues.map((issue, index) => (
                  <li key={`${issue.code}-${index}`}>{issue.message}</li>
                ))}
              </ul>
            ) : preview.diff.length ? (
              <ul>
                {preview.diff.map((change, index) => (
                  <li key={`${change.slotNumber}-${change.field}-${index}`}>
                    <strong>
                      Slot {change.slotNumber} {change.field}:
                    </strong>{" "}
                    <del>{change.before}</del> → <ins>{change.after}</ins>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No competitive changes detected.</p>
            )}
            <label>
              Change summary
              <input
                value={summary}
                onChange={(event) => setSummary(event.target.value)}
                maxLength={500}
              />
            </label>
            <h4>Slot continuity</h4>
            <ul>
              {preview.slotMappings.map((mapping) => (
                <li key={mapping.slotNumber}>
                  Slot {mapping.slotNumber}: {mapping.reason}
                </li>
              ))}
            </ul>
            <fieldset className="choice-row">
              <legend>Save behavior</legend>
              <label>
                <input
                  type="radio"
                  checked={mode === "create_version"}
                  onChange={() => setMode("create_version")}
                />{" "}
                Create version {preview.currentVersionNumber + 1}
              </label>
              <label>
                <input
                  type="radio"
                  checked={mode === "replace_draft"}
                  disabled={!preview.replaceEligible}
                  onChange={() => setMode("replace_draft")}
                />{" "}
                Replace unsealed draft
              </label>
            </fieldset>
            <button
              type="button"
              disabled={
                busy ||
                preview.importDraft.issues.length > 0 ||
                preview.diff.length === 0
              }
              onClick={() => void commitRevision()}
            >
              Save revision
            </button>
          </div>
        )}
        {message && (
          <p
            role="status"
            className={message.includes("Unable") ? "error" : ""}
          >
            {message}
          </p>
        )}
      </section>
      {includeNotes && <TeamNotes subjects={subjects} initialNotes={notes} />}
    </div>
  );
}
