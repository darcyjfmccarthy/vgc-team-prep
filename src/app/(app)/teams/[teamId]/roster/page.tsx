import { notFound, redirect } from "next/navigation";
import { TeamRosterGrid } from "@/components/team-roster";
import { currentUserId } from "@/modules/auth/sessions";
import { getTeamDetail } from "@/modules/teams/service";

export const dynamic = "force-dynamic";
export default async function TeamRosterPage({
  params,
  searchParams,
}: {
  params: Promise<{ teamId: string }>;
  searchParams: Promise<{ version?: string }>;
}) {
  const userId = await currentUserId();
  if (!userId) redirect("/login");
  const team = await getTeamDetail(
    userId,
    (await params).teamId,
    (await searchParams).version,
  );
  if (!team) notFound();
  return (
    <>
      <section className="page-heading">
        <p className="eyebrow">Team composition</p>
        <h2>Roster</h2>
        <p className="muted">
          Read-only version view. Edit competitive details from Team settings.
        </p>
      </section>
      <TeamRosterGrid slots={team.slots} evMax={team.ev_max_per_stat} />
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
    </>
  );
}
