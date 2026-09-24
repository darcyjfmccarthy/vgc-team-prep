# Replay ingestion and analysis

This slice implements the replay journey in [01-product.md](01-product.md), the module and PostgreSQL-worker boundaries in [02-architecture.md](02-architecture.md), the provenance invariants in [03-domain-and-data.md](03-domain-and-data.md), and the observation/metric definitions in [05-processing-and-analytics.md](05-processing-and-analytics.md). Verification follows [06-quality-security-operations.md](06-quality-security-operations.md).

## Run the supplied example

```text
npm run db:migrate
npm run db:seed
npm run dev
```

Sign in as `player-one@example.test` with the development password printed by the seed command. Open **Copy of Copy of Worlds 2026**, then **Replays** or **Statistics**. The seed imports the team in `teams.txt` and processes the three URLs in `games.txt`. It also retains the original M-B team for existing regression scenarios. Re-running seeds does not duplicate games or overwrite notes.

For new imports, run `npm run worker:dev` in another terminal. Fixture mode serves the checked-in `.log` files. Set `REPLAY_PROVIDER_MODE=connected` in local configuration to retrieve other supported Showdown replays. The application queues imports immediately; the replay view refreshes while work is pending. Failed imports have an explicit retry action on their detail page.

## Sample evidence

The three supplied public logs were retrieved on 2026-09-18 from the URLs in `games.txt`, with `.log` appended. Their `.json` responses are retained alongside them as provider fixtures. The team fixture comes from `https://pokepast.es/58cbd5a41861cdc2/raw`; its metadata is normalized from that paste's JSON representation.

| Game | Replay ID suffix | Result for AI damage calc | Turns |
| ---- | ---------------- | ------------------------- | ----- |
| 1    | 2683340564       | Loss                      | 7     |
| 2    | 2683342314       | Win by opponent forfeit   | 1     |
| 3    | 2683342984       | Win                       | 8     |

The set is a **2–1 win** against `killerjc123`. Every game contains `uhtml|bestof` metadata linking to `game-bestof3-gen9championsvgc2026regmcbo3-2683340563`, with an explicit game number. Grouping uses this evidence; player/time similarity alone never creates a set. Duplicated game numbers, incompatible formats/pairings, different user perspectives, nonconsecutive games, implausible time windows, and games after a decisive result prevent a completed set result.

Game 2 ends before either side reveals all four choices. The unknown slots remain unknown. For example, Rillaboom leads all three games (3/3); full-selection bring rates have only two eligible games (2/2 for Rillaboom), while win-when-led is 2/3.

## Implementation boundaries

### Analysis experience

Statistics opens with separate game and set records, then an explorer with four views: team usage, move usage, opponents, and combinations. Pokémon portraits anchor each card. Bring/lead/back bars retain their eligible-game denominators; opponent records are presented from the user's perspective. Lead pairs, selections, and common partners show their members visually and link to contributing games.

Each Pokémon has a move donut whose slices represent **executed move uses / all observed move uses for that Pokémon**. Its keyboard-accessible legend highlights a slice and also lists **games using the move / eligible games brought**, a separate metric. Zero-use roster moves stay visible. Charts have textual counts, and filtering retains the small-sample notice and unknown-selection handling.

Games are listed once within their set, with outcome and lineup sprites. Add replays opens the import form directly. A game review shows both players' leads and backs, explicit unrevealed slots, Mega/faint status, damage bars, and readable turn highlights. Mirrored species are identified by side. Player/version corrections live in a collapsed settings section unless input is required; raw logs and JSON are nested diagnostics.

Damage bars sum observed public-health percentage-point losses: **100 HP points means one full health bar**, not 100 raw HP. Dealt damage is conservatively credited to the immediately active opposing move only when the log supplies no other damage source. Poison, weather, recoil, unmeasurable HP changes, and uncertain combatant identities are not credited as direct attacks. Taken damage includes all measurable HP loss. These are observed estimates, not reconstructed damage rolls or causal KO statistics.

### Processing

- `replays/provider.ts` strictly validates provider URLs and downloads bounded plain-text `.log` responses with a timeout and no redirects. `.log` and `.json` input URLs normalize to the same replay identity. Private suffixes are preserved.
- `replays/parser.ts` is a deterministic pure transformation, based on [Showdown's simulator protocol](https://github.com/smogon/pokemon-showdown/blob/master/sim/SIM-PROTOCOL.md). It records previews, leads, revealed selections, moves, switches, fainting, Mega forms, public HP, statuses, stat changes, items, abilities, weather, terrain, effects, and source-line references. Provider HTML is inspected as text, never rendered as HTML.
- Stable within-game combatant keys distinguish roster members from active battle positions. Mega transformations preserve the base roster identity; regional forms remain distinct. Illusion/duplicate-species ambiguity is flagged and excludes the affected side from usage statistics.
- `replays/service.ts` owns authenticated submission, source retention, parser-run publication, attribution, correction overlays, notes, and retry/reparse operations. The worker uses the same service. Sources are immutable per game; each successful reparse appends a parser run. Notes and corrections are independent records.
- `replays/sets.ts` derives set membership and outcomes from accepted records. Set notes use the stable provider series key scoped to the account. Sets and individual games have separate denominators.
- `replays/analytics.ts` rebuilds metrics from the effective records. Percentages retain integer numerators and denominators. Unknown selections are counted separately; ties/unknown outcomes are excluded from win rates. Opposing Pokémon wins are explicitly from the opponent perspective.

The initial persistence uses indexed game/import/source/correction tables and append-only JSONB parser snapshots containing the typed combatants and event sequence. This implements the fact boundary without prematurely adding separate rows for every event. Set membership and metric summaries are disposable derived views. Normalized event tables, materialized summaries, and SQL aggregation remain follow-up work if measurements require them; 10,000-game performance has not been certified.

## Supported scope and uncertainty

The service currently accepts Champions Regulation M-B and M-C doubles formats, including Bo3. The parser retains unsupported event lines with warnings. Missing result/timestamp/selection information stays unknown. A fully observed roster is necessary for bring/back/composition denominators; confirmed individual appearances can still contribute to win-when-selected.

Public HP fractions are observations, potentially rounded, not reconstructed exact HP or damage rolls. Move order is execution order, not inferred Speed. The protocol move target is retained; spread targets and causal KO credit are not invented. Team sheets reveal possible moves; they do not prove those moves were used. A Mega form in a paste maps to its pre-Mega preview species for attribution.

User-supplied side/version is explicit attribution. Otherwise, username or a unique matching roster resolves the side; multiple matching team versions require confirmation. Source facts and result overrides remain separately inspectable. The current correction form changes side, result, and version within the same team. Moving games to another team, manual set splitting/merging, and manual team-sheet-state corrections are follow-up work.

## Verification

Unit fixtures cover all three games, deterministic output, source references, Mega Evolution, partial selections, Illusion flags, unknown commands, incomplete logs, HP validation, URL restrictions, set consistency, and metric denominators. Integration tests cover transactional enqueue/deduplication, source retention, actual job claiming, team-version sealing, correction overlays, note preservation, and tenant isolation. The browser test covers the seeded set, turn-one forfeit, notes, result filtering, and mobile overflow.

Run `npm test`, `npm run test:integration`, and `npm run test:e2e` after migrating/seeding a local database. Migration rollback checks must use a disposable database: replay tables contain retained evidence.
