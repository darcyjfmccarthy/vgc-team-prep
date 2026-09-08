import { notFound, redirect } from "next/navigation";
import { StatCard } from "@/components/prototype-ui";
import { currentUserId } from "@/modules/auth/sessions";
import { getTeamDetail } from "@/modules/teams/service";

export const dynamic = "force-dynamic";
const rows = [
  ["Froslass", "24 / 29", "11 / 29", "16 / 24"],
  ["Incineroar", "22 / 29", "13 / 29", "15 / 22"],
  ["Rillaboom", "20 / 29", "6 / 29", "14 / 20"],
  ["Scovillain", "15 / 29", "4 / 29", "9 / 15"],
];
export default async function TeamStatisticsPage({
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
  const usageRows = rows.map((row, index) => [
    team.slots[index]?.nickname ??
      team.slots[index]?.form_name ??
      team.slots[index]?.species_name ??
      row[0],
    ...row.slice(1),
  ]);
  return (
    <>
      <section className="page-heading">
        <p className="eyebrow">Personal performance</p>
        <h2>Statistics</h2>
        <p className="muted">
          All rates state their observed numerator and denominator.
        </p>
      </section>
      <form className="filter-bar" aria-label="Statistics filters">
        <label>
          Version
          <select defaultValue={team.version_id}>
            <option>{`v${team.version_number} · selected`}</option>
          </select>
        </label>
        <label>
          Date range
          <select>
            <option>All recorded games</option>
          </select>
        </label>
        <label>
          Result
          <select>
            <option>All results</option>
          </select>
        </label>
        <label>
          Match format
          <select>
            <option>BO1 and BO3</option>
          </select>
        </label>
        <button type="button" className="secondary" disabled>
          Apply filters
        </button>
      </form>
      <section className="metric-grid">
        <StatCard
          label="Game win rate"
          value="62%"
          detail="18 wins / 29 games"
        />
        <StatCard label="Set win rate" value="70%" detail="7 wins / 10 sets" />
        <StatCard label="Known leads" value="25" detail="25 known / 29 games" />
        <StatCard
          label="Unknown observations"
          value="4"
          detail="Excluded only where needed"
        />
      </section>
      <div className="analytics-grid">
        <section className="panel">
          <h2>Your Pokémon</h2>
          <div
            className="table-scroll"
            role="region"
            aria-label="Your Pokémon usage"
            tabIndex={0}
          >
            <table className="data-table">
              <thead>
                <tr>
                  <th>Pokémon</th>
                  <th>Selected</th>
                  <th>Led</th>
                  <th>Won selected</th>
                </tr>
              </thead>
              <tbody>
                {usageRows.map((row) => (
                  <tr key={row[0]}>
                    {row.map((cell) => (
                      <td key={cell}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <section className="panel">
          <h2>Opponent preview</h2>
          <div
            className="table-scroll"
            role="region"
            aria-label="Opponent Pokémon usage"
            tabIndex={0}
          >
            <table className="data-table">
              <thead>
                <tr>
                  <th>Pokémon</th>
                  <th>Preview</th>
                  <th>Led</th>
                  <th>Record</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Flutter Mane</td>
                  <td>12 / 29</td>
                  <td>7 / 29</td>
                  <td>8–4</td>
                </tr>
                <tr>
                  <td>Urshifu</td>
                  <td>10 / 29</td>
                  <td>6 / 29</td>
                  <td>5–5</td>
                </tr>
                <tr>
                  <td>Rillaboom</td>
                  <td>9 / 29</td>
                  <td>3 / 29</td>
                  <td>6–3</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
        <section className="panel">
          <h2>Lead pairs</h2>
          <p>
            <strong>Froslass + Incineroar</strong>
            <br />
            <span className="muted">8 leads / 25 known leads · 6 wins / 8</span>
          </p>
          <p>
            <strong>Froslass + Rillaboom</strong>
            <br />
            <span className="muted">5 leads / 25 known leads · 3 wins / 5</span>
          </p>
        </section>
        <section className="panel">
          <h2>Four-Pokémon selections</h2>
          <p>
            <strong>Froslass · Incineroar · Rillaboom · Scovillain</strong>
            <br />
            <span className="muted">7 selections / 29 games · 5 wins / 7</span>
          </p>
        </section>
      </div>
    </>
  );
}
