import { notFound, redirect } from "next/navigation";
import { DamageCalculator } from "@/components/damage-calculator";
import { currentUserId } from "@/modules/auth/sessions";
import { listDamageOptions } from "@/modules/calculator/engine";
import { getTeamDetail } from "@/modules/teams/service";

export const dynamic = "force-dynamic";

export default async function TeamCalculatorPage({
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

  return (
    <>
      <section className="page-heading">
        <p className="eyebrow">Team tools</p>
        <h2>Damage calculator</h2>
        <p className="muted">
          Explore live, unsaved calculations against your selected team version.
        </p>
      </section>
      <DamageCalculator
        key={team.version_id}
        ruleset={team.ruleset_slug}
        versionLabel={`v${team.version_number}`}
        options={listDamageOptions()}
        members={team.slots.map((slot) => ({
          id: slot.id,
          slotNumber: slot.slot_number,
          displayName: slot.form_name ?? slot.species_name,
          species: slot.form_name ?? slot.species_name,
          spriteSlug: slot.form_slug ?? slot.species_slug,
          isShiny: slot.is_shiny,
          level: 50,
          item: slot.item_name,
          ability: slot.ability_name,
          nature: slot.nature_name ?? "Serious",
          statPoints: {
            hp: slot.hp,
            atk: slot.atk,
            def: slot.def,
            spa: slot.spa,
            spd: slot.spd,
            spe: slot.spe,
          },
          moves: slot.moves.map((move) => move.name),
        }))}
      />
    </>
  );
}
