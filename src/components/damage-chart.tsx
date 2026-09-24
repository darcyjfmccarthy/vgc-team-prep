"use client";
import { useState } from "react";
import type { battleImpact } from "@/modules/replays/presentation";
import { PokemonLabel } from "./battle-visuals";
export function DamageChart({
  rows,
}: {
  rows: ReturnType<typeof battleImpact>;
}) {
  const [metric, setMetric] = useState<"dealt" | "taken">("dealt");
  const maximum = Math.max(100, ...rows.map((r) => r[metric]));
  return (
    <div className="impact-chart">
      <div className="segmented-control" aria-label="Damage measure">
        <button
          type="button"
          aria-pressed={metric === "dealt"}
          onClick={() => setMetric("dealt")}
        >
          Damage dealt
        </button>
        <button
          type="button"
          aria-pressed={metric === "taken"}
          onClick={() => setMetric("taken")}
        >
          Damage taken
        </button>
      </div>
      <div className="impact-rows">
        {rows.map((row) => (
          <div className="impact-row" key={row.key}>
            <PokemonLabel species={row.species} />
            <div className="impact-track">
              <span style={{ width: `${(row[metric] / maximum) * 100}%` }} />
            </div>
            <strong>
              {row[metric] ? `≈ ${Math.round(row[metric])}` : "0"}
              <small>HP pts</small>
            </strong>
          </div>
        ))}
      </div>
      {!rows.length && <p>No reliable HP observations for this side.</p>}
      <p className="quiet-note">
        100 HP points = one full health bar. Totals can exceed 100 across
        targets or after healing.{" "}
        {metric === "dealt"
          ? "Only damage directly linked to an opposing move is credited."
          : "Includes observed attacks, recoil, weather, and other HP loss."}
        {rows.some((r) => r.unmeasured)
          ? " Some HP changes could not be measured."
          : ""}
      </p>
    </div>
  );
}
