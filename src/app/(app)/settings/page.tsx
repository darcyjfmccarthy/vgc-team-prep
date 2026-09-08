import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { currentUserId } from "@/modules/auth/sessions";

export const dynamic = "force-dynamic";
export default async function ProfilePage() {
  if (!(await currentUserId())) redirect("/login");
  return (
    <AppShell>
      <section className="page-heading">
        <p className="eyebrow">Account</p>
        <h1>Profile</h1>
        <p className="muted">
          Account-level preferences are visually complete; unbuilt controls are
          intentionally presentational.
        </p>
      </section>
      <div className="settings-grid">
        <section className="panel">
          <h2>Profile</h2>
          <label>
            Display name
            <input defaultValue="Competitive player" disabled />
          </label>
          <label>
            Email
            <input defaultValue="player@example.com" disabled />
          </label>
          <button type="button" disabled>
            Save profile
          </button>
        </section>
        <section className="panel">
          <h2>Showdown aliases</h2>
          <p className="muted">
            Aliases help replay ownership inference; they are never verified
            identities.
          </p>
          <label>
            Showdown username
            <input placeholder="your-showdown-name" disabled />
          </label>
          <button type="button" disabled>
            Add alias
          </button>
        </section>
        <section className="panel">
          <h2>Sessions & security</h2>
          <p>Current session · This device</p>
          <button type="button" className="secondary" disabled>
            Manage sessions
          </button>
        </section>
        <section className="panel">
          <h2>Preferences</h2>
          <label>
            Default workspace
            <select disabled>
              <option>Last opened team</option>
            </select>
          </label>
          <label>
            Dense tables
            <input type="checkbox" defaultChecked disabled />
          </label>
        </section>
      </div>
    </AppShell>
  );
}
