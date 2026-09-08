# Interface specification

## Interaction rule

The product is one web application, not a frontend plus a separate general-purpose API.

- Pages read data by calling feature query functions in Server Components.
- Ordinary forms use Server Actions that validate input, resolve the session, call one feature service, and return a typed success/error result.
- JSON route handlers exist only where polling, progressive interaction, a browser extension, or another genuine client needs them.
- Server Actions and route handlers call the same feature services; neither contains business rules.

Do not implement both a Server Action and a JSON endpoint for the same operation without an identified consumer.

## Shared form/mutation behavior

All mutations:

- Derive `userId` from the secure application session; callers never submit a tenant ID.
- Validate with the feature's Zod schema at the server boundary.
- Return field errors separately from a form-level error.
- Return the changed record identifier and numeric revision on success.
- Accept `expectedRevision` for concurrently editable teams, notes, matchup plans, and saved calculations; stale edits return a conflict without overwriting newer work.
- Use a stable idempotency key for replay/bulk submissions that a browser may retry.
- Include a request/correlation ID in safe error results.

Error codes are stable application values such as `VALIDATION_FAILED`, `NOT_FOUND`, `REVISION_CONFLICT`, `RATE_LIMITED`, `PROVIDER_UNAVAILABLE`, and `REPLAY_PARSE_FAILED`. Messages are actionable but never reveal whether another user's record or an account email exists.

## Authentication actions

Public Server Actions:

- `register(email, password, displayName?)`
- `login(email, password)`
- `requestPasswordReset(email)`
- `resetPassword(token, newPassword)`

Authenticated actions:

- `logout()`
- `logoutAllSessions()`
- `listSessions()` and `revokeSession(sessionId)`
- `updateProfile(input)`
- CRUD for the caller's unverified Showdown aliases
- P1 request/cancel account export and deletion jobs

Passwords are accepted only over TLS, hashed immediately with Argon2id, and never stored or logged in plaintext. Login and reset-request responses are deliberately non-enumerating. Successful authentication sets the opaque session cookie server-side.

## Team actions and queries

Queries support list, detail, version history, exact version, and semantic version diff.

Actions:

- Create/update/archive/restore a team identity.
- Validate Showdown text without saving.
- Fetch and validate a recognized Poképaste URL through the server-side provider client.
- Create a team version from validated Showdown text or Poképaste import.
- Update or discard only an unsealed/unreferenced draft version.
- Seal a version and map stable slot identities when it gains a historical reference.
- P1 export a version as Showdown-compatible text.

Version creation returns the semantic diff, slot-identity mapping warnings, and counts of calculations/matchups that will be affected. The UI may request a preview before committing, but preview and commit use the same diff function.

## Replay actions and JSON routes

Submitting and watching bulk replay work benefits from JSON because it is asynchronous:

- `POST /api/v1/replay-imports`
- `GET /api/v1/replay-imports/{batchId}`
- `POST /api/v1/replay-imports/{batchId}/items/{itemId}/retry`

Submission accepts `{ urls[], teamId, teamVersionId?, showdownAliasId?, userSide? }`, validates/normalizes the URLs, creates batch/item/job rows transactionally, and returns `202` with `batchId`, initial item states, and a recommended polling interval. The request must be acknowledged within one second.

Polling returns item status `queued | fetching | parsing | needs_input | succeeded | duplicate | failed`, progress counts, safe item-level errors, and resulting game IDs. The client backs off while the tab is in the background and stops polling once all items are terminal or need input; real-time sockets are unnecessary.

Normal replay/game/set screens use server queries and actions for:

- Game list/detail and parsed event inspection.
- Replay side, team/version, result, and context corrections.
- Reparse request.
- BO3 split/merge/reorder and set corrections.
- Game/set notes and original provider link.

Stable replay errors include invalid URL, unsupported provider/format, inaccessible/private/deleted source, incomplete source, parse failure, ambiguous user side, and ambiguous team version.

P1 replay-capture extensions receive a narrowly scoped authenticated JSON submission endpoint rather than exposing all application CRUD as REST.

## Analytics queries

Team analytics pages pass filters in URL search parameters so views are linkable and survive refresh. Server Components call metric query functions directly for:

- Game and set summary.
- User Pokémon usage/results.
- Opponent Pokémon usage/results.
- Leads, four-Pokémon selections, and common partners.

Common filters are team version, date range, ruleset, result, opposing species, and BO1/BO3 context. Each metric value contains `numerator`, `denominator`, nullable `rate`, `unit`, and relevant `unknownCount`/sample size. P1 drill-down passes a normalized metric key/filter set to the contributions query.

Add JSON analytics endpoints only when a real non-page client or interaction needs them.

## Matchup, knowledge, note, and calculator actions

Server Actions provide CRUD for opposing sets/teams/archetypes, matchup plans and structured choices, evidence links, notes, and saved calculations. Each action validates that every linked resource belongs to the same user.

Matchup validation returns explicit dependency findings: removed slot, changed species/form, missing move/item/ability, changed spread/level, or incompatible ruleset.

The interactive calculator uses one JSON route because it needs quick repeated evaluation without navigation:

- `POST /api/v1/damage/evaluate`

It accepts normalized semantic combatant/move/field input and returns the integer damage distribution/range, HP/percentage range, KO result, assumptions/warnings, confidence (`verified | approximate | unsupported`), and engine/catalog/mechanics versions. Approximate results identify their exact fallback. It does not save unless the user invokes the separate save action. Target p95 is below 150 ms.

Saved-calculation actions cover create/update/delete, recompute, tag/matchup links, and viewing immutable revisions. Search supports team, user slot/species, opponent set/species, matchup, tag, and dependency state.

## Health routes

- `GET /api/health/live` checks that the process can respond.
- `GET /api/health/ready` checks the database and required configuration without exposing private details.

The worker has no HTTP server; its process health is inferred from job heartbeats/leases and the hosting platform's process state.

## Database job contract

Asynchronous work is a `jobs` row created in the same PostgreSQL transaction as the requesting resource. It contains `kind`, owned subject ID, correlation/idempotency keys, status, priority, available/lease timestamps, and attempt limits. Private input remains in its owned feature table.

The worker validates the kind, claims it with a lease, reloads authoritative state, and calls the feature service. Failure either schedules bounded backoff or leaves a terminal `failed` row after the final attempt. An expired lease makes interrupted work claimable again. Handlers are idempotent because a job may run more than once.

Initial kinds:

- `replay.import`, `replay.reparse`
- `calculation.recompute`
- P1 `account.export`, `account.purge`
- Optional `analytics.refresh` only after introducing measured summary tables
- P2 `external.sync`, `ai.prepare`

## Authorization

Every Server Action, query, and route resolves ownership server-side. A user may access only roots with their `user_id`; child authorization joins to that root. A missing and a not-owned identifier normally produce the same result. P1 admin access grants configuration and job-diagnostic capabilities, not blanket private-content access.

## Provider client contracts

Showdown, Poképaste, email, and the calculation engine each have a small named module/function boundary returning normalized values and stable errors. Network clients enforce HTTPS, allowlisted hosts, response size/time limits, redirect revalidation, and simple rate limits. A replay/paste URL is parsed to a provider identifier before requesting a known origin; the server never fetches an arbitrary user-provided destination.

Version provider-facing assumptions with recorded fixtures. Introduce a shared provider interface only when a second real provider requires interchangeable behavior.
