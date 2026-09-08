"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { StatusBadge } from "@/components/prototype-ui";

export function TeamWorkspace({
  team,
  versions,
  children,
}: {
  team: {
    id: string;
    title: string;
    status: string;
    ruleset: string;
    tags: string[];
    latestVersion: string;
  };
  versions: Array<{ id: string; number: number }>;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const selected = searchParams.get("version") ?? team.latestVersion;
  const selectedVersion =
    versions.find((version) => version.id === selected) ?? versions[0];
  const suffix = selected ? `?version=${selected}` : "";
  const tabs = [
    { href: `/teams/${team.id}${suffix}`, label: "Overview", exact: true },
    { href: `/teams/${team.id}/roster${suffix}`, label: "Roster" },
    { href: `/teams/${team.id}/replays${suffix}`, label: "Replays" },
    { href: `/teams/${team.id}/statistics${suffix}`, label: "Statistics" },
    { href: `/teams/${team.id}/matchups${suffix}`, label: "Matchups" },
    { href: `/teams/${team.id}/calculator${suffix}`, label: "Calculator" },
    { href: `/teams/${team.id}/notes${suffix}`, label: "Notes" },
  ];
  return (
    <section className="team-workspace">
      <header className="team-workspace-header">
        <div className="breadcrumb">
          <Link href="/teams">Teams</Link>
          <span aria-hidden="true">/</span>
          <span>{team.title}</span>
        </div>
        <div className="team-header-main">
          <div>
            <p className="eyebrow">{team.ruleset}</p>
            <h1>{team.title}</h1>
            <div className="tag-row">
              <StatusBadge value={team.status} />
              {team.tags.map((tag) => (
                <span key={tag} className="tag-badge">
                  {tag}
                </span>
              ))}
            </div>
          </div>
          <div className="team-header-actions">
            <label className="version-select">
              Version
              <select
                value={selected}
                onChange={(event) => {
                  router.push(`${pathname}?version=${event.target.value}`);
                }}
              >
                <option value={team.latestVersion}>
                  v{versions[0]?.number} · latest
                </option>
                {versions.slice(1).map((version) => (
                  <option key={version.id} value={version.id}>
                    v{version.number}
                  </option>
                ))}
              </select>
            </label>
            <Link
              className="button"
              href={`/teams/${team.id}/replays${suffix}`}
            >
              Add replays
            </Link>
            <Link
              className="button secondary"
              href={`/teams/${team.id}/settings${suffix}`}
            >
              Team settings
            </Link>
          </div>
        </div>
        <nav aria-label="Team workspace" className="team-tabs">
          {tabs.map((tab) => {
            const tabPath = tab.href.split("?")[0];
            const active = tab.exact
              ? pathname === `/teams/${team.id}`
              : pathname === tabPath || pathname.startsWith(`${tabPath}/`);
            return (
              <Link
                key={tab.label}
                href={tab.href}
                className={active ? "active" : ""}
                aria-current={active ? "page" : undefined}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
        {selectedVersion?.id !== team.latestVersion && (
          <p className="historical-notice">
            Viewing historical v{selectedVersion?.number}. New work remains
            attached to the latest team version.
          </p>
        )}
      </header>
      {children}
    </section>
  );
}
