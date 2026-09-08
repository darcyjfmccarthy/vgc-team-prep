import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { TeamWorkspace } from "@/components/team-workspace";
import { currentUserId } from "@/modules/auth/sessions";
import { getTeamDetail, listTeamVersions } from "@/modules/teams/service";

export default async function TeamLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ teamId: string }>;
}) {
  const userId = await currentUserId();
  if (!userId) redirect("/login");
  const teamId = (await params).teamId;
  const [team, versions] = await Promise.all([
    getTeamDetail(userId, teamId),
    listTeamVersions(userId, teamId),
  ]);
  if (!team) notFound();
  return (
    <AppShell>
      <TeamWorkspace
        team={{
          id: teamId,
          title: team.title,
          status: team.status,
          ruleset: team.ruleset_name,
          tags: team.tags,
          latestVersion: team.version_id,
        }}
        versions={versions.map((version) => ({
          id: version.id,
          number: version.version_number,
        }))}
      >
        {children}
      </TeamWorkspace>
    </AppShell>
  );
}
