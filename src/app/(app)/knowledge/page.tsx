import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { knowledgeEntries } from "@/lib/prototype-data";
import { currentUserId } from "@/modules/auth/sessions";

export const dynamic = "force-dynamic";
export default async function KnowledgePage() {
  if (!(await currentUserId())) redirect("/login");
  return (
    <AppShell>
      <section className="page-heading split-heading">
        <div>
          <p className="eyebrow">Reusable knowledge</p>
          <h1>Knowledge</h1>
          <p className="muted">
            Opposing teams, canonical sets, and archetypes for future
            preparation.
          </p>
        </div>
        <button type="button" className="button" disabled>
          New knowledge entry
        </button>
      </section>
      <form className="filter-bar" aria-label="Knowledge filters">
        <label>
          Search
          <input placeholder="Search sets and archetypes" disabled />
        </label>
        <label>
          Kind
          <select>
            <option>All knowledge</option>
            <option>Opposing team</option>
            <option>Opposing set</option>
            <option>Archetype</option>
          </select>
        </label>
      </form>
      <div className="knowledge-grid">
        {knowledgeEntries.map((entry) => (
          <article className="panel knowledge-card" key={entry.id}>
            <p className="eyebrow">{entry.kind}</p>
            <h2>{entry.name}</h2>
            <p>{entry.detail}</p>
            <div className="tag-row">
              {entry.tags.map((tag) => (
                <span className="tag-badge" key={tag}>
                  {tag}
                </span>
              ))}
            </div>
            <button type="button" className="secondary" disabled>
              Open entry
            </button>
          </article>
        ))}
      </div>
    </AppShell>
  );
}
