import { notFound, redirect } from "next/navigation";
import { TeamNotes } from "@/components/team-management";
import { currentUserId } from "@/modules/auth/sessions";
import { listNotes } from "@/modules/notes/service";
import { getTeamDetail } from "@/modules/teams/service";

export const dynamic = "force-dynamic";
export default async function TeamNotesPage({
  params,
  searchParams,
}: {
  params: Promise<{ teamId: string }>;
  searchParams: Promise<{ version?: string }>;
}) {
  const userId = await currentUserId();
  if (!userId) redirect("/login");
  const teamId = (await params).teamId;
  const team = await getTeamDetail(
    userId,
    teamId,
    (await searchParams).version,
  );
  if (!team) notFound();
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
  const grouped = await Promise.all(
    subjects.map(async (subject) => ({
      subject,
      notes: await listNotes(userId, subject.type, subject.id),
    })),
  );
  const notes = grouped.flatMap(({ subject, notes: rows }) =>
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
    <>
      <section className="page-heading">
        <p className="eyebrow">Reusable preparation</p>
        <h2>Notes</h2>
        <p className="muted">
          Attach an observation to the team, this version, or a specific Pokémon
          slot.
        </p>
      </section>
      <TeamNotes subjects={subjects} initialNotes={notes} />
    </>
  );
}
