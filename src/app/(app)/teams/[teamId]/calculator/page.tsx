export default function TeamCalculatorPage() {
  return (
    <>
      <section className="page-heading">
        <p className="eyebrow">Team tools</p>
        <h2>Calculator</h2>
        <p className="muted">
          Damage calculations belong to this team workspace, but calculator
          functionality remains outside this prototype pass.
        </p>
      </section>
      <section className="empty-state panel">
        <h2>Calculator reserved for this team</h2>
        <p className="muted">
          Future calculations will reference this team&apos;s Pokémon and
          selected version rather than living in a global library.
        </p>
      </section>
    </>
  );
}
