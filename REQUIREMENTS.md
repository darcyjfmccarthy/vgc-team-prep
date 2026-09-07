# Functional requirements

Priority notation:

- **P0:** required for the first usable product
- **P1:** important follow-up
- **P2:** longer-term expansion

## FR-1. Accounts and identity

- **FR-1.1 — P0:** A user shall be able to register, log in, log out, and reset their password. ✅
- **FR-1.2 — P0:** User data shall be associated with an account and accessible across devices. ✅
- **FR-1.3 — P0:** Passwords shall never be stored in plaintext and shall be processed according to the controls in NFR-4. ✅
- **FR-1.4 — P0:** A user shall be able to provide the relevant Pokémon Showdown username when importing replays. A Showdown username is an unverified replay-ingestion parameter, not an identity claimed or reserved by an application account.
- **FR-1.5 — P0:** The user shall be able to select which player in a replay represents them when this cannot be inferred reliably.
- **FR-1.6 — P1:** Support third-party authentication, such as Google.
- **FR-1.7 — P1:** Allow users to permanently delete their account and associated data.

## FR-2. Team library and versioning

- **FR-2.1 — P0:** Users shall be able to create a team by: ✅
  - Pasting Pokémon Showdown export text.
  - Importing a Poképaste URL.
- **FR-2.2 — P0:** A team shall store format or ruleset, title, description, tags, creation date, and status such as active or testing. ✅
- **FR-2.3 — P0:** Each Pokémon set shall support species, form, nickname, gender where relevant, level, item, ability, nature, moves, EVs, and any Pokémon Champions mechanics relevant to the set, including Mega Evolution where applicable. IVs are out of scope. ✅
- **FR-2.4 — P0:** Import validation shall report unsupported species, illegal or malformed values, incomplete sets, and inaccessible pastes. ✅
- **FR-2.5 — P0:** The system shall distinguish between: ✅
  - A persistent **team identity**, such as “Sydney team.”
  - Immutable **team versions**, such as “v7 before changing Flutter Mane's bulk.”
- **FR-2.6 — P0:** Editing a competitively meaningful property shall create, or explicitly update, a team version. ✅
- **FR-2.7 — P0:** Historical replays shall remain associated with the exact team version used in those games.
- **FR-2.10 — P1:** Users shall be able to organize teams into folders, events, seasons, or preparation projects.
- **FR-2.11 — P1:** Users shall be able to export a team in Showdown format and generate a shareable Poképaste-compatible representation.
- **FR-2.12 — P1:** Support teams with incomplete or exploratory slots without corrupting analytics.

## FR-3. Replay ingestion

- **FR-3.1 — P0:** Users shall be able to add one or more Pokémon Showdown replay URLs.
- **FR-3.2 — P0:** The system shall support bulk paste or import of replay URLs.
- **FR-3.3 — P0:** A replay shall be associated with a team and, wherever possible, its exact team version.
- **FR-3.4 — P0:** The system shall retrieve and retain sufficient source data to reparse a replay later.
- **FR-3.5 — P0:** Duplicate replay imports shall be detected and shall not double-count statistics.
- **FR-3.6 — P0:** Invalid, private, deleted, unsupported, or incomplete replays shall produce actionable errors.
- **FR-3.7 — P0:** Users shall be able to correct replay ownership, team association, result, or other incorrectly inferred metadata.
- **FR-3.8 — P0:** The system shall detect separate replay URLs belonging to the same best-of-three using the identifiers encoded in the URLs or replay metadata, group them automatically, and display both the individual games and aggregate set result.
- **FR-3.9 — P1:** A browser extension or Showdown-side workflow shall allow one-click or automatic replay capture.
- **FR-3.10 — P1:** Support CSV or structured imports from tools such as PASRS where technically feasible.
- **FR-3.11 — P1:** Support manual match entries for Pokémon Champions games or unavailable replays, clearly marking the data as user-entered.

## FR-4. Replay parsing and battle representation

- **FR-4.1 — P0:** For every supported replay, the parser shall identify:
  - Format and timestamp.
  - Players and result.
  - Both team previews where exposed.
  - Leads and selected Pokémon.
  - Moves used.
  - Switches and fainting.
  - Mega Evolution usage and resulting form where applicable.
- **FR-4.2 — P0:** The parser shall preserve unknown information as unknown rather than inventing a value.
- **FR-4.3 — P0:** Users shall be able to open the original replay and inspect the parsed record.
- **FR-4.4 — P0:** Parser output shall include parser version and import status.
- **FR-4.5 — P0:** Previously imported replays shall be reprocessable after parser improvements without losing user notes.
- **FR-4.6 — P1:** Parse additional revealed information such as items, abilities, speed order, damage events, status, weather, terrain, and targeting.
- **FR-4.7 — P1:** Support mechanics with imperfect observability, including Illusion, without presenting uncertain conclusions as facts.
- **FR-4.8 — P1:** Detect likely open-team-sheet versus closed-team-sheet games where possible, while allowing manual correction.

## FR-5. Games, sets, and sessions

- **FR-5.1 — P0:** A replay shall represent a game, while automatically associated games shall also be represented as a best-of-three set.
- **FR-5.3 — P0:** Set-level results shall not treat each game as an independent match.
- **FR-5.4 — P0:** Users shall be able to record game-level and set-level notes.
- **FR-5.5 — P2:** Users shall be able to group games into ladder sessions, testing blocks, tournaments, or practice sets.
- **FR-5.6 — P0:** Store available context including ladder rating, opponent, open- or closed-team-sheet status, and best-of-one or best-of-three format.

## FR-6. Personal performance analytics

- **FR-6.1 — P0:** Display games played, wins, losses, and win rate for each team and team version.
- **FR-6.2 — P0:** Display set-level records separately from game-level records.
- **FR-6.3 — P0:** For each Pokémon on the user's team, report:
  - Selection or bring rate.
  - Lead rate.
  - Back rate.
  - Win rate when selected.
  - Win rate when led.
  - Mega Evolution usage where applicable.
  - Move usage.
- **FR-6.4 — P0:** For opposing Pokémon, report:
  - Team-preview frequency.
  - Attendance or bring rate.
  - Lead frequency.
  - Wins, losses, and win rate.
  - Sample size.
- **FR-6.5 — P0:** Report lead-pair, four-Pokémon selection, and common-partner statistics.
- **FR-6.6 — P0:** Every percentage shall expose its underlying numerator and denominator.
- **FR-6.7 — P0:** Analytics shall be filterable by team version, date range, format or ruleset, result, opposing Pokémon, and best-of-one or best-of-three format.
- **FR-6.8 — P1:** Add filters for Showdown username, ladder, rating range, event, tag, open- or closed-team-sheet status, and opponent.
- **FR-6.9 — P1:** Show trends over time, including rating, win rate, matchup performance, and team changes.
- **FR-6.10 — P1:** Compare two team versions and show changes in performance and usage.
- **FR-6.11 — P1:** Avoid presenting small samples as strong conclusions; show warnings or uncertainty intervals.
- **FR-6.12 — P1:** Allow drill-down from every aggregate statistic to the contributing games.
- **FR-6.13 — P2:** Support user-defined metrics, saved queries, and custom dashboards.

## FR-7. Matchup preparation

A matchup represents a relationship between one of the user's teams and either an opposing team, an archetype, or selected opposing Pokémon.

- **FR-7.1 — P0:** Users shall be able to create matchup pages manually or from an observed or imported opposing team.
- **FR-7.2 — P0:** A matchup page shall support:
  - Opponent team or archetype.
  - Preferred lead options.
  - Preferred back Pokémon.
  - Alternative compositions.
  - General game plan.
  - Win conditions.
  - Key threats and failure modes.
  - Turn-one options.
  - Free-form notes.
- **FR-7.3 — P0:** Leads and backs shall be represented structurally, not only as text.
- **FR-7.4 — P0:** A matchup page shall link to relevant replays and personal results.
- **FR-7.5 — P0:** Users shall be able to associate saved damage calculations with the matchup.
- **FR-7.6 — P0:** Matchup plans shall survive new team versions while warning when referenced Pokémon, moves, items, abilities, or spreads no longer exist or are no longer applicable.
- **FR-7.7 — P1:** Support archetype-level pages, such as rain or specific Mega cores.
- **FR-7.8 — P1:** Allow cloning an archetype plan into a plan for a particular opponent's team.
- **FR-7.9 — P1:** Show empirical results against the matchup, including sample size and linked games.
- **FR-7.11 — P1:** Support tags and review states such as untested, testing, stable, and needs revision.

## FR-8. Persistent damage calculator

- **FR-8.1 — P0:** Provide an accurate damage calculator for the currently supported Pokémon Champions rules and mechanics.
- **FR-8.2 — P0:** A calculator combatant may reference:
  - A Pokémon in one of the user's teams.
  - A saved opposing set.
  - A standard metagame set.
  - An ad hoc custom set.
- **FR-8.3 — P0:** Users shall be able to save a calculation with a name, tags, notes, and optional matchup association.
- **FR-8.4 — P0:** A saved calculation shall store its semantic inputs, not merely rendered result text.
- **FR-8.5 — P0:** When a calculation references a team slot, it shall be recomputed automatically when a relevant spread, nature, item, ability, move, Mega form, or level changes.
- **FR-8.6 — P0:** Saved calculations shall clearly indicate whether they:
  - Follow the latest team version.
  - Are pinned to a historical team version.
  - Use a copied static set.
- **FR-8.8 — P0:** Results shall include damage range, percentage range, KO probability or guaranteed-NHKO summary, and relevant assumptions.
- **FR-8.9 — P0:** Users shall be able to specify and save ordinary calculator battle-state inputs and combined scenarios, including doubles modifier, weather, terrain, screens, Helping Hand, critical hit, stat stages, status, Mega form, and other supported field effects.
- **FR-8.10 — P0:** Both offensive and defensive perspectives shall be supported.
- **FR-8.11 — P0:** Users shall be able to search and filter saved calculations by team, Pokémon, opponent, matchup, tag, and outdated status.
- **FR-8.12 — P1:** Provide bulk calculation matrices, such as every team member into a target or a threat into every team member.
- **FR-8.14 — P1:** Identify EV breakpoints required to survive, KO, or outspeed under stated assumptions.
- **FR-8.15 — P1:** Show side-by-side results when comparing team versions or proposed spread changes.
- **FR-8.16 — P1:** Warn when a saved calculation becomes invalid because a move, mechanic, ruleset, or referenced Pokémon no longer applies.
- **FR-8.17 — P1:** Allow saved calculations to be embedded into Pokémon notes and matchup plans while retaining one canonical calculation.
- **FR-8.18 — P2:** Infer candidate calculations from replay damage observations, clearly labelling them as estimates.

## FR-9. Tournament and metagame ingestion

- **FR-9.1 — P2:** The system shall ingest relevant tournaments from Limitless through its documented API.
- **FR-9.2 — P2:** The system shall ingest available tournament and metagame information from LabMaus through a replaceable adapter.
- **FR-9.3 — P2:** External integrations shall preserve source, source identifier, retrieval time, and source URL.
- **FR-9.4 — P2:** Imports shall be idempotent and shall update existing tournament records rather than duplicating them.
- **FR-9.5 — P2:** Users shall be able to filter external data by ruleset, date, event tier, region, player count, placement, and data source where available.
- **FR-9.6 — P2:** The system shall display, where available:
  - Tournament standings.
  - Published teams.
  - Pokémon usage.
  - Common teammates and cores.
  - Items, moves, Mega forms, and abilities.
  - Pairings and match results.
- **FR-9.7 — P2:** Missing or unpublished information shall be visibly marked rather than inferred.
- **FR-9.8 — P2:** Species, forms, items, moves, rulesets, and player identities from different sources shall be normalized through canonical internal identifiers.
- **FR-9.9 — P2:** Source adapters shall isolate provider-specific authentication, schemas, throttling, and failures.
- **FR-9.10 — P2:** The application shall continue operating if an external provider is unavailable.
- **FR-9.11 — P2:** Users shall be able to trigger refreshes, subject to source limits and caching rules.
- **FR-9.12 — P2:** Add further sources such as RK9, Victory Road, official results, or user-supplied datasets where permitted.

## FR-11. Notes, search, and reusable knowledge

- **FR-11.1 — P0:** Users shall be able to attach notes to teams, team versions, Pokémon, replays, sets, and matchups.
- **FR-11.2 — P0:** Notes shall support plain text with basic formatting.
- **FR-11.3 — P1:** Provide search across teams, Pokémon, opponents, notes, matchups, and replays.
- **FR-11.6 — P0:** Users shall be able to create, edit, and reuse canonical opposing sets and archetype definitions across damage calculations, matchup plans, replay analysis, and future metagame or AI features.

## FR-12. Data portability

- **FR-12.1 — P1:** Users shall be able to export their structured application data in a documented, machine-readable format. Rich user-facing backup, restore, sharing, and collaboration features are deferred until their utility and storage costs justify them.

## FR-13. Future AI capabilities

- **FR-13.1 — P2:** Users shall be able to request asynchronous matchup preparation.
- **FR-13.2 — P2:** AI preparation shall use selected teams, personal replays, saved plans, calculations, reusable opposing sets and archetypes, and external tournament evidence.
- **FR-13.3 — P2:** Generated claims shall link back to supporting replays, calculations, or tournament records.
- **FR-13.4 — P2:** AI output shall distinguish fact, statistical observation, inference, and suggestion.
- **FR-13.5 — P2:** Users shall be able to accept, edit, reject, or regenerate individual suggestions.
- **FR-13.6 — P2:** AI-generated content shall not overwrite user-authored plans without confirmation.
- **FR-13.7 — P2:** Preparation jobs shall retain status, inputs, model and version metadata, output, and failure information.
- **FR-13.8 — P2:** The system shall support evaluation of AI recommendations against subsequent games and user feedback.

## FR-14. Administration and operations

- **FR-14.2 — P0:** Replay parser, background job, and integration failures shall be logged and observable using the controls in NFR-8, without exposing unnecessary private content.
- **FR-14.3 — P1:** Administrators shall be able to manage supported formats, rulesets, and source adapters.
- **FR-14.4 — P1:** Feature flags shall permit gradual rollout and rollback of new capabilities.
- **FR-14.5 — P1:** Background jobs shall support retry, deduplication, and dead-letter handling. ✅

## FR-15. Advertising and cost recovery

- **FR-15.1 — P2:** The application shall support configurable advertising placements so operating costs can be offset without redesigning core pages.
- **FR-15.2 — P2:** Advertising shall be disabled by default until an advertising provider and monetisation approach are explicitly configured.
- **FR-15.3 — P2:** Administrators shall be able to enable or disable advertising globally and configure approved placements without deploying a new application version.
- **FR-15.4 — P2:** Advertisements shall not interrupt replay import, team editing, damage calculation, or matchup preparation workflows, and the application shall remain usable when ads are blocked or fail to load.
- **FR-15.5 — P2:** Private team data, notes, replays, calculations, and matchup information shall not be supplied to advertising providers or used for ad targeting.
- **FR-15.6 — P2:** The system shall support any consent, disclosure, age-related, and privacy controls required by the selected advertising provider and served jurisdictions.
- **FR-15.7 — P2:** Administrators shall be able to measure aggregate ad delivery and revenue without exposing users' private competitive data.
- **FR-15.8 — P2:** The product may offer an ad-free option if usage and revenue data justify it.

# Non-functional requirements

## NFR-1. Accuracy and data integrity

- Damage results must match the chosen reference calculation engine for a maintained regression suite.
- Replay parsing must be tested against representative Pokémon Champions mechanics and known edge cases.
- Aggregates must be reproducible from their underlying records.
- Historical games must not change attribution when a current team is edited.
- Every derived record should retain its source version, including parser version, calculator version, and external-data retrieval version.
- Unknown data must remain explicitly unknown.
- Imports, refreshes, retries, and reparses must be idempotent.

## NFR-2. Performance

Initial targets for normal operating load:

- Authenticated application pages: p95 interactive load under 2.5 seconds on a typical broadband connection.
- Common API reads: p95 under 500 ms, excluding uncached third-party calls.
- Team save and note save: p95 under 750 ms.
- Single replay submission acknowledgement: under 1 second.
- Normal replay parsing completion: p95 under 10 seconds.
- Single damage calculation: p95 under 150 ms.
- Automatic recalculation after a spread change: visible results under 2 seconds for up to 100 dependent calculations.
- Analytics for up to 10,000 personal games: p95 under 2 seconds for common filters.

## NFR-3. Availability and resilience

- Initial monthly availability target: at least 99.5%.
- External-data failures must not prevent access to teams, replays, plans, or saved calculations.
- Background imports must use bounded retries with backoff.
- The system must degrade gracefully when Showdown, Poképaste, Limitless, LabMaus, email, advertising, or AI providers are unavailable.
- Restore procedures must be documented and periodically tested.

## NFR-4. Security

- All traffic must use TLS.
- Passwords must be stored using a modern, adaptive, salted password hash; neither plaintext nor reversibly encrypted passwords may be retained. ✅
- Sessions and tokens must expire, rotate where appropriate, and support revocation. ✅
- Authorization must be checked server-side for every private resource. ✅
- Secrets must be stored in an AWS secrets-management facility, not source code or client bundles.
- Rate limiting and abuse controls must cover authentication, replay import, external refresh, and future AI endpoints.
- Dependencies and container images must receive automated vulnerability scanning.
- Production access and sensitive administrative actions must be audited.
- Personally identifiable information and sensitive preparation data must be encrypted at rest using managed AWS encryption.
- Third-party scripts, including advertising scripts, must be constrained so they cannot access private application data.

## NFR-5. Privacy

- Teams, replays, calculations, and plans shall be private by default.
- Users must explicitly choose to share data.
- Telemetry must avoid collecting team contents or strategic notes unless necessary and disclosed.
- Account deletion and export workflows must be supported.
- Retention periods for backups, logs, deleted data, and external-source caches must be documented.
- Future AI features must clearly state what data is sent to model providers and whether it may be retained.
- Advertising providers must not receive private competitive data, and non-essential advertising cookies or tracking must be subject to applicable consent requirements.

## NFR-6. Extensibility

- Replay parsers, calculation engines, tournament sources, authentication methods, advertising providers, and AI providers should be isolated behind defined interfaces.
- Core Pokémon entities must use stable canonical identifiers rather than display names. ✅
- Derived analytics should be separated from source facts.
- Database schema changes must use versioned, reversible migrations. ✅
- Public or internal APIs must be versioned when backward-incompatible changes occur.
- New analytics should be addable without rewriting replay ingestion.
- External providers must be replaceable without changing the core domain model.

## NFR-7. Maintainability and testability

- Core business logic must be testable independently from the web interface. ✅
- Team versioning, replay attribution, best-of-three detection, calculation invalidation, and aggregate statistics require automated unit and integration tests.
- Replay fixtures should cover common formats and difficult mechanics.
- Contract tests should detect upstream API or page-shape changes.
- Code should pass automated formatting, static analysis, tests, and migration checks before deployment. ✅
- Architectural decisions and external integration assumptions should be documented. ✅

## NFR-8. Observability

- Use structured logs with request and job correlation identifiers.
- Monitor latency, error rates, replay-parser failures, job queues, database health, and third-party integration failures.
- Alert on sustained service failures and unexpected parsing-error increases.
- Record external API freshness and the time of the last successful sync.
- Avoid exposing credentials, private team text, notes, or authentication tokens in logs.

## NFR-9. Backup and disaster recovery

Reasonable initial AWS targets:

- Automated encrypted database backups.
- Recovery point objective: no more than 24 hours of data loss initially, improving to 1 hour before broader release.
- Recovery time objective: service restoration within 8 hours initially, improving to 4 hours.
- Point-in-time recovery should be enabled for production once the data store supports it.
- Raw replay data must be included in the backup strategy; optional attachments are out of scope unless separately approved.

## NFR-10. Usability

- Importing a team and the first replay should require no specialist setup.
- Common tasks—adding replays, reviewing a matchup, and finding saved calculations—should be reachable in a few interactions.
- Bulk operations must show progress and per-item errors.
- Potentially destructive actions must require confirmation or offer recovery.
- Statistical views must show sample sizes and explain non-obvious metrics.
- The interface should be usable on desktop and mobile, with desktop prioritized for analysis-heavy workflows. ✅

## NFR-11. Accessibility

- Target WCAG 2.2 AA for core workflows.
- All interactive controls must be keyboard-accessible. ✅
- Information must not be conveyed solely through colour. ✅
- Tables and charts must have accessible labels or textual equivalents.
- Pokémon sprites must be decorative or have appropriate accessible names. ✅

## NFR-12. Compatibility

- Support current versions of Chrome, Firefox, Safari, and Edge.
- Use responsive layouts for common desktop, tablet, and phone sizes. ✅
- Do not require a browser extension for core functionality. ✅
- Preserve imported source text so future parsers can recover data after format changes. ✅

## NFR-13. Scalability and cost control

- The initial architecture should support a single serious user cheaply while allowing growth without redesigning the core data model. ✅
- Stateless application components should support horizontal scaling. ✅
- Long-running parsing, synchronization, and AI work should run asynchronously.
- Expensive external, advertising, and AI calls must be cached or rate-limited as appropriate and attributable.
- AWS budgets and cost alerts must be configured.
- Per-user storage and compute consumption should be measurable.
- Raw and derived data retention shall be reviewed against its product value and storage cost before introducing storage-heavy features.

## NFR-14. Legal and third-party constraints

- Respect third-party terms, rate limits, robots directives, licences, and attribution requirements.
- Prefer documented APIs over scraping.
- Do not imply endorsement by The Pokémon Company, Nintendo, Game Freak, Creatures, Pokémon Showdown, or tournament-data providers.
- Pokémon intellectual-property notices and asset licences must be reviewed before public deployment.
- Provider data should retain provenance and be removable if continued storage is no longer permitted.
- Advertising must comply with the selected provider's policies and all applicable privacy, consumer-protection, and age-related requirements.
