# Processing and analytics specification

## Replay ingestion state machine

```text
submitted -> queued -> fetching -> fetched -> parsing -> needs_input -> succeeded
                         |            |          |             |
                         +---------- failed <----+-------------+
                                      |
                                   retryable
```

`duplicate` is a terminal successful import-item outcome pointing to the existing game. A batch completes when every item is terminal or needs input.

### Submission and deduplication

1. Trim and parse each URL using a strict provider-specific locator parser.
2. Reject non-HTTPS, unknown host, credentials, unexpected port, or unparseable replay identifiers.
3. Normalize to `(provider, providerReplayId)` and canonical URL.
4. Within one transaction, create the batch/items and reserve unique user/provider/replay keys.
5. Existing succeeded records become `duplicate`; an existing active item is linked rather than enqueued again; retryable failed items may be explicitly retried.
6. Insert the replay-import job in the same PostgreSQL transaction, so accepted work cannot be lost between separate systems.

Content checksum is a secondary duplicate signal. It creates a review warning rather than automatic merging when provider IDs differ, because separate URLs may be intentional games or corrected uploads.

### Retrieval

The Showdown client retrieves the most complete permitted replay representation, with timeout, maximum response bytes, content-type validation, redirect revalidation, and per-origin throttling. Store the exact source plus metadata/checksum in PostgreSQL before parsing. Map provider responses to stable failure codes without exposing network internals.

### Parsing

The parser is a pure transformation:

```text
(raw replay source, parser version, catalog version, ruleset configuration)
  -> parsed facts + warnings + confidence/provenance
```

It cannot read user state or write the database. Fixtures assert deterministic output. Unrecognized lines are retained as warnings/raw event references; they do not invent facts. All optional observations use explicit `known/value` semantics at the contract boundary and nullable facts in storage.

The application validates parser output, resolves canonical IDs, stores a new parser run and fact set transactionally, then selects it as current. Failed runs do not replace the last accepted interpretation.

### Ownership and exact-version attribution

Attribution order:

1. Explicit import side/version supplied by the user.
2. Unique player-side match against the selected normalized Showdown alias.
3. Unique team version whose preview/selected roster matches the exposed user side under the ruleset.
4. Persistent team match with ambiguous version.
5. `needs_input` with candidates and reasons.

Never infer identity from a globally claimed Showdown username. Automatic version association requires a deterministic unique match; otherwise the game may link to the team with `team_version_id = null` until corrected.

### User corrections and reprocessing

Parser facts are append-only per parser run. Corrections are overlays with author/time/reason. Reprocessing creates a new run, recalculates associations and BO3 candidates, and reapplies compatible corrections. Incompatible correction paths are preserved but flagged for review. Notes and manual evidence links are separate roots and unaffected.

## Best-of-three grouping

Grouping uses provider-documented/observed identifiers first. Implement it as a versioned strategy that produces a grouping key, game number, and confidence.

Automatic grouping is allowed only when all available hard constraints agree:

- Same owner and compatible player pairing.
- Same supported ruleset and BO3 context.
- Provider series identifier or URL/metadata encoding links the games.
- Unique game numbers/no duplicate membership.
- Plausible timestamp window when timestamps exist.

An exact provider series ID yields `exact`; a deterministic composite encoded by the provider yields `strong`. Time/player similarity alone is not sufficient for automatic grouping and can only generate a suggestion. Users can split/merge/reorder through audited corrections.

Set outcome is calculated from game outcomes under the ruleset and stored/rebuilt as derived state. Incomplete or unknown games produce an incomplete/unknown set result. Set analytics count one completed set; game analytics count its individual games.

## Analytics fact boundary

Canonical inputs are effective game facts, accepted parser observations, team slot links, and set membership. Start with direct indexed PostgreSQL queries. If profiling shows a target cannot be met, add the smallest disposable summary table or materialized view needed; it records source/parser/metric version and a high-water mark and can be rebuilt without changing canonical records.

Every metric response includes:

- `unit`: game or set.
- Integer `numerator` and `denominator`.
- Decimal `rate = numerator / denominator`, null at denominator zero.
- `sampleSize` when it differs from denominator.
- `unknownCount` when unknown observations materially affect interpretation.
- Stable `metricKey` and normalized filter echo.

## P0 metric definitions

Definitions below assume effective user ownership/result and games matching the requested filters.

| Metric                         | Numerator                                         | Denominator                                                                                           |
| ------------------------------ | ------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Game win rate                  | Completed games won                               | Completed games with win/loss result                                                                  |
| Set win rate                   | Completed BO3 sets won                            | Completed BO3 sets with win/loss result                                                               |
| User selection/bring rate      | Games where slot was selected                     | Games where selection is known and slot was available on that exact team version                      |
| User lead rate                 | Games where selected slot was a lead              | Games where user leads are known and slot was available; UI may additionally show lead-among-selected |
| User back rate                 | Games where selected slot was not a lead          | Games where selection and leads are known and slot was available                                      |
| Win rate when selected         | Won games where slot selected                     | Completed games where slot selection is known and selected                                            |
| Win rate when led              | Won games where slot led                          | Completed games where user leads are known and slot led                                               |
| Mega usage                     | Games where slot Mega Evolved                     | Games where slot was selected and Mega observation is known/applicable                                |
| Move usage                     | Games where selected slot used move at least once | Games where slot was selected and its move events are observable                                      |
| Opponent preview frequency     | Games with species at preview                     | Games with known opponent preview                                                                     |
| Opponent attendance/bring rate | Games with species selected/revealed              | Games where opponent selection is fully known; partial revelation is reported separately              |
| Opponent lead frequency        | Games with species led                            | Games with known opponent leads                                                                       |
| Opponent species win rate      | User losses against species attendance            | Completed games where opponent attendance for that species is known                                   |

“Wins/losses” on opposing Pokémon are from the opposing Pokémon perspective in storage/query naming, but the UI must label perspective explicitly. The metric query may return both `userWins` and `opponentWins` to remove ambiguity.

Lead pairs are unordered canonical pairs of two slot identities. Four-Pokémon selections are unordered canonical combinations normalized by slot ID. Common partners count co-selection per unordered pair. Denominators are eligible games with complete required observations, not all imported games.

Ties/unknown results are shown but excluded from win-rate denominators. BO3 filters do not remove individual games from game metrics; they select games whose match context is BO3. Only set-level metrics produce set rates.

## Filtering and reproducibility

Filters are applied to canonical effective facts before aggregation. Date boundaries are inclusive start/exclusive end in UTC. Team-version filters match exact stored attribution. Opposing Pokémon matches canonical form/species rules explicitly selected by the metric; no accidental form collapsing.

For reproducibility, each metric has a stable key/version, normalized filters, and golden input/output tests. If stored summaries are later introduced, results also carry their fact watermark. P1 drill-down runs the same metric definition and returns exactly its contributing record IDs.

## Damage calculation lifecycle

### Semantic input

A normalized input fully describes attacker, defender, move, ruleset/mechanics version, HP/stat state, stat stages, status, field effects, doubles state, critical-hit mode, and all supported modifiers. Set references are resolved to a snapshot before evaluation. Defaults are made explicit in the normalized input and assumptions list.

### Evaluation

1. Validate legal/range constraints against the selected ruleset/catalog.
2. Resolve reference-mode combatants and record dependencies.
3. Normalize and checksum semantic inputs.
4. Call the isolated engine wrapper.
5. Convert engine output to the application result contract without losing raw integer rolls/distribution.
6. Store the engine/mechanics/catalog versions and assumptions for saved calculations.

KO probability must state the model assumptions, including roll distribution, starting HP, recovery/residual effects, and multi-hit handling. If the reference engine cannot support a scenario accurately, return `unsupported`, not an approximation presented as fact.

### Dependency invalidation

When a team successor is saved, compare watched fields for each `follow_latest` dependency. Unchanged semantic inputs remain current. Changed inputs enqueue recomputation and show the prior result as recomputing/outdated until success. Removed slots, moves, incompatible rulesets, or unsupported mechanics mark invalid and preserve the last result for history. Pinned/static calculations do not follow later versions.

Up to 100 affected calculations must become visibly current/outdated/recomputing within two seconds; larger recomputation is inserted into the PostgreSQL jobs table if inline work would violate write latency.

## Data-quality flags

Shared flags include `unknown`, `partial_observation`, `ambiguous_identity`, `ambiguous_team_version`, `user_corrected`, `unsupported_event`, `stale_dependency`, and `invalid_dependency`. UI tables expose these flags and analytics do not silently upgrade them to certainty.
