# Delivery plan

Build vertical slices in order. Each slice includes its page/forms, necessary JSON route, feature logic, database change, authorization, logs, tests, and documentation; server code without the usable workflow is not done.

## Phase 0 — foundations and decisions

Deliver:

- Resolve the seven launch decisions in the specification index.
- ADRs for the small stack, canonical catalog/license, calculator engine, raw replay retention, and deployment region; authentication is application-owned unless this decision is explicitly revisited.
- Single Next.js repository and the PostgreSQL-only workflow in [`09-local-development.md`](09-local-development.md), typed config, focused CI gates, and bootstrap procedure.
- Application email/password authentication and sessions; PostgreSQL migrations and job runner; health, structured-log, and correlation foundations.
- Threat model, data inventory, retention draft, restore and incident runbook skeletons.

Exit gate: the local-development definition of done passes on a clean supported machine; a user can authenticate to the application; database jobs work locally/test; CI and tenant-isolation tests pass.

## Phase 1 — catalog and versioned team library

Delivers FR-1 P0, FR-2 P0, and team notes from FR-11.

- Versioned canonical catalog and launch ruleset.
- Showdown text parser/validator with raw source retention.
- Team CRUD, manual editor, small Poképaste client, immutable versions/slot continuity, diffs/sealing.
- Team/team-version/slot notes and basic tags/status.

Exit gate: import, edit, version, revisit exact history across devices; invalid/incomplete/inaccessible inputs have actionable results; security/accessibility tests pass.

## Phase 2 — replay import and battle records

Delivers FR-3 P0, FR-4 P0, FR-5 P0, and battle notes.

- Bulk import batches, URL normalization, raw source retention in PostgreSQL, and transactionally inserted idempotent jobs.
- Pure versioned parser and fixture corpus for approved formats/mechanics.
- Ownership and team-version attribution, `needs_input`, corrections, source/parsed inspection.
- Deterministic BO3 grouping plus manual corrections, separate game/set records and notes.
- Reparse workflow preserving user-authored records.

Exit gate: approved replay fixture suite parses deterministically; duplicate/retry/reparse and parser failure drills pass; normal completion meets p95 target.

## Phase 3 — personal analytics

Delivers FR-6 P0.

- Effective-fact indexed SQL queries; add rebuildable summaries only if profiling requires them.
- Team/version summary, user/opponent Pokémon, leads, selections, partners.
- URL-backed common filters; explicit numerator/denominator/unknown/sample size.
- Seed/performance suite at 10,000 games.

Exit gate: golden aggregate dataset is reproducible; game/set semantics and unknown denominators are correct; common filters meet p95 target.

## Phase 4 — knowledge and matchup preparation

Delivers FR-7 P0 plus reusable sets/archetypes in FR-11.6.

- Opposing sets/teams and basic archetype definitions.
- Matchup target, structured leads/backs/compositions, strategy sections, notes.
- Replay evidence links and team-version dependency validation.

Exit gate: a plan survives a new team version with precise non-destructive warnings, and all cross-resource links enforce ownership.

## Phase 5 — certified persistent calculator

Delivers FR-8 P0 and completes calculation links in FR-7.5.

- Approved engine wrapper and conformance corpus.
- Interactive calculator page and evaluation route with supported battle state and both perspectives.
- Saved semantic inputs, reference modes, revisions, tags/search, matchup links.
- Team dependency diff/invalidation/recompute workflow.

Exit gate: conformance suite passes every supported mechanic; single calculation and 100-dependency visibility targets pass; invalid references preserve history and warn clearly.

## Phase 6 — P0 hardening and launch

- End-to-end accessibility/manual browser verification.
- Targeted load/soak checks, dependency/container/secret scans, backup/restore exercise, provider outage and failed-job retry drills.
- Production application rate limits, CloudWatch logs/alarms, AWS budgets, and support/incident procedures; add WAF only if the launch risk assessment requires it.
- Legal review for names/assets/catalog/replay/paste access and product disclaimers.
- Requirement traceability sign-off and launch checklist.

Exit gate: all P0 acceptance criteria and NFR release gates pass; unresolved launch blockers are explicitly accepted by the product owner.

## P1 increments

Implement after P0 based on observed use, roughly in this order:

1. Account deletion/export, Google auth, collections, team export, incomplete exploration.
2. Richer parsing/uncertainty/OTS, manual and structured imports, capture extension.
3. Analytics drill-down, extended filters, trends, uncertainty, version comparison.
4. Archetype cloning/results/review workflow; calculator matrices/breakpoints/compare/embed.
5. Search, admin rulesets/provider settings/feature flags, and terminal-job retry operations.

Each increment retains provider isolation and does not expand private-data telemetry.

## P2 increments

Sessions/custom dashboards; individual tournament/metagame provider modules as they are added; replay-estimated calculations; evidence-linked AI jobs/evaluation; advertising placement and provider only after legal/privacy/product approval.

Advertising stays disabled by configuration and page design reserves only non-interruptive optional placements. AI and external sources are independently disableable and never become dependencies of core private workflows.

## Work-item slicing rule

Each feature issue must state:

- Requirement IDs and user-visible acceptance scenario.
- Domain invariants and authorization rule.
- Form/route/job/schema change and migration/rollback.
- Unknown/error/empty/loading behavior.
- Telemetry that excludes private content.
- Unit/integration/browser/accessibility coverage.
- Performance/security/privacy impact.
- Feature-flag and rollback plan where risk warrants it.

## Release definition of done

- Acceptance criteria mapped to automated or recorded manual evidence.
- Formatting, strict types, lint, tests, migrations, schemas, builds, and scans green.
- No open critical/high security issues; lower issues are risk-owned.
- Dashboard/alert/runbook exists for new operational failure modes.
- User-facing errors and recovery paths tested.
- Documentation/ADR/data inventory updated.
- Rollback or disable path exercised for high-risk changes.
