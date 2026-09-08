# Product specification

## Product outcome

VGC Team Prep is a private-by-default workspace for competitive Pokémon players. It connects versioned teams, replay evidence, performance analytics, matchup plans, and persistent damage calculations without allowing later team edits to rewrite history.

The first usable product is the P0 scope in `REQUIREMENTS.md`. P1 adds workflow depth and P2 adds ecosystem data, customization, AI, and monetization.

## Actors and access

| Actor             | Capabilities                                                                                                             |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Visitor           | Register, log in, reset password, and view only explicitly public future content                                         |
| User              | Manage only their own teams, games, plans, calculations, opposing sets, and notes                                        |
| Administrator     | P1: manage rulesets, provider settings, flags, and operational status; no implicit access to private competitive content |
| Background worker | Run queued feature work from the same codebase using scoped resource identifiers; never bypass tenant ownership checks   |
| External provider | Supply replay, paste, email, identity, metagame, advertising, or AI data through a constrained client module             |

An application account may store one or more unverified Showdown usernames. A Showdown name is an ingestion hint, never proof that the account owns that identity.

## P0 journeys and acceptance criteria

### 1. Onboard and import a team

1. The user registers or logs in.
2. They create a team by Showdown text or Poképaste URL.
3. The application parses into a draft and returns per-field warnings/errors without discarding the original text.
4. The user corrects recoverable issues and saves.
5. Saving creates one persistent team identity and its first immutable version.

Accepted when valid launch-ruleset teams can be persisted, incomplete imports remain recoverable validation drafts with actionable errors, inaccessible pastes do not create a false success, and all private reads/writes enforce account ownership. Persisting exploratory incomplete slots is P1 under FR-2.12.

### 2. Edit and version a team

Competitively meaningful changes include species/form, nickname when it affects display only (non-competitive), gender where mechanically relevant, level, item, ability, nature, moves, EVs, and supported special mechanics. Title, description, tags, status, folders, and notes are metadata and do not require a version.

The editor compares the draft with the latest version. If competitive fields changed, it must offer:

- **Create version** (default): save a new immutable version with an optional change summary.
- **Replace unreferenced draft version:** allowed only when the version has no games, pinned calculations, or other historical references and has never been published/exported as a version.

Once referenced, a version and its slots are immutable. “Update version” in FR-2.6 is therefore implemented only for an unreferenced draft; historical records are never mutated.

### 3. Import replays

1. The user pastes one or many URLs, selects a team, optionally selects a team version, and supplies a Showdown username/player side.
2. The server validates and normalizes URLs, creates an import batch plus database job, deduplicates known source identifiers, and responds within one second.
3. The worker retrieves immutable source data, parses it with a versioned parser, infers ownership/team version, and groups related best-of-three games.
4. The import screen reports progress and item-level success, duplicate, warning, or failure.
5. The user resolves ambiguous player side/team version and may correct result/context metadata.

Accepted when a retry does not double-count a game, raw source remains available for reprocessing, parser/user-authored fields are distinguishable, notes survive reprocessing, and set results are separate from game results.

### 4. Review performance

The team dashboard shows game record, set record, user Pokémon usage, opponent Pokémon usage, compositions, leads, and partners. Every percentage displays or reveals `numerator / denominator`. Filters are encoded in the URL and may be combined. Any unknown observation is excluded only from metrics requiring it and is reflected in the denominator.

Accepted when aggregates reproduce from fact records, switching versions never changes historical attribution, BO3 game win rate and BO3 set win rate are not conflated, and common filters over 10,000 games meet the latency target.

### 5. Prepare a matchup

The user creates a page against an opposing team, reusable opposing set collection, or archetype. They add structured lead pairs, structured back choices, alternative four-Pokémon compositions, prose strategy fields, replay links, and saved calculations.

Plans target the persistent team identity and record the team version last validated against. When a newer version changes referenced slots or traits, the page remains intact but shows dependency warnings and needs-review status.

### 6. Calculate and retain damage

The user selects attacker, defender, move, and battle state. Either combatant can follow the latest team version, pin a historical version, copy a static set, reference an opposing set, use a standard set, or be ad hoc. A saved calculation persists semantic inputs and a versioned result snapshot.

Accepted when the live result matches the chosen reference engine, saved inputs can be recomputed, dependencies mark or recompute affected calculations after team changes, results state assumptions, and offensive/defensive lookup are both supported.

### 7. Reuse knowledge

Users can attach formatted plain-text notes to defined subjects and reuse canonical opposing sets/archetypes in plans and calculations. Basic formatting means a sanitized Markdown subset: paragraphs, lists, emphasis, links, and inline code; raw HTML, scripts, embedded media, and executable content are rejected.

## Product-wide rules

1. Private by default; no resource becomes shared implicitly.
2. Source facts, parser-derived facts, user corrections, and aggregates are separate layers.
3. User corrections take precedence in views but never overwrite retained parser output.
4. Unknown is a first-class state; absence is not converted to `false`, zero, or an inferred value.
5. Persistent identities evolve; versions and imported replay sources do not.
6. Deletes are recoverable where practical; referenced historical records are archived/tombstoned rather than silently removed.
7. Display names are presentation. Relationships use canonical internal identifiers.
8. Game and set are different units, with metrics explicitly declaring their unit.
9. Every async or bulk workflow exposes status and item-level failure details.
10. Every derived result records the input/version provenance required to reproduce it.

## Information architecture

Primary navigation:

- **Home:** recent and active team workspaces plus reusable knowledge.
- **Teams:** team identities, versions, and entry into all team-scoped work.
- **Knowledge:** globally reusable opposing sets and archetypes.
- **Profile:** account, Showdown names, export/deletion (P1), and preferences.

Within a selected team, primary workspace tabs are Overview, Roster, Replays, Statistics, Matchups, Calculator, and Notes. Replay imports, games, sets, statistics, matchup plans, and calculations are always presented with a team context; they are not peer-level global destinations. Team metadata, source, version history, and revision controls live in Team settings outside the primary workspace tabs.

Desktop prioritizes dense tables and comparison panels. Mobile preserves all core workflows with stacked views; no hover-only behavior is allowed.

## P1 scope

Third-party auth; account deletion; organization folders/events/seasons/projects; Showdown export and paste-compatible sharing; incomplete exploratory teams; replay capture extension; PASRS/CSV and manual game import; richer replay facts and uncertainty; OTS detection; extended analytics filters/trends/comparisons/intervals/drill-down; archetype workflows; empirical matchup summaries and review states; calculation matrices/breakpoints/comparisons/invalidations/embeds; global search; structured data export; admin formats/provider settings; flags; retries and terminal-job operations.

## P2 scope

Sessions; customizable analytics; Limitless/LabMaus and further provider ingestion; replay-derived calculation estimates; asynchronous evidence-linked AI preparation; configurable privacy-safe advertising and possible ad-free offering.

## Explicitly out of scope for P0

- IVs.
- Verified ownership/reservation of Showdown usernames.
- Collaboration, rich restore, public sharing, and hosted paste creation unless separately approved.
- Browser extension dependency.
- Tournament/metagame providers, AI, and advertising.
- Automatically asserting hidden information from ambiguous mechanics.
