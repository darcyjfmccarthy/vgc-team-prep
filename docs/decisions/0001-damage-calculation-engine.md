# ADR 0001: Damage calculation engine

## Status

Accepted for the live calculator slice. Full Pokémon Champions certification remains pending a maintained conformance corpus and authoritative mechanics data.

## Decision

Use the MIT-licensed `@smogon/calc` package, pinned exactly at `0.11.0`, behind the application-owned `calculateDamage` interface. Run it only on the server and expose normalized application request/result types through `POST /api/v1/damage/evaluate`.

An application-owned adapter applies Pokémon Champions Stat Points exactly at level 50 through base-stat overrides. Recognized engine behavior covered by regression fixtures is labelled verified. Champions-specific behavior without conformance evidence may use an explicit Gen 9 fallback labelled approximate. Unknown species, moves, and non-damaging moves return unsupported results.

The package version, mechanics profile, catalog profile, assumptions, and fallback warnings are returned with every result. Upgrades require deliberate fixture review.

## Consequences

- The application does not embed or track a third-party calculator frontend as a Git submodule.
- Engine classes and provider-specific shapes cannot cross the calculator module boundary.
- Live calculations are ephemeral until the persistent calculation phase adds revisions, dependencies, and saved results.

## License and sources

- `@smogon/calc`: MIT, <https://github.com/smogon/damage-calc>
- npm release: <https://www.npmjs.com/package/@smogon/calc>
