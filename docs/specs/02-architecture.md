# Architecture specification

## Architectural style

Build one TypeScript application with clear feature modules, backed by one PostgreSQL database:

```text
Browser -> Next.js application -> PostgreSQL
                    |
                    +-> external providers (Showdown, Poképaste, email)

PostgreSQL jobs table <- worker process from the same codebase
```

Next.js serves pages and `/api/v1` route handlers. A small worker started from the same repository processes replay imports, reparses, and other work that should not hold open an HTTP request. Both use the same modules and database. This is a modular monolith, not a monorepo or a collection of services.

The important boundaries are ordinary source-code folders and functions. Introduce a formal interface only where the application genuinely has multiple implementations or needs to isolate an external provider. Do not create packages, services, event buses, repository abstractions, or deployment units in anticipation of possible future scale.

## Deliberately small stack

| Concern            | Choice                                                       | Notes                                                                                           |
| ------------------ | ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| Application        | Next.js App Router with TypeScript                           | Pages, server rendering, forms, and versioned HTTP endpoints in one application                 |
| UI                 | React, semantic HTML, and CSS Modules/global CSS             | Add a focused accessible component dependency only when native elements are insufficient        |
| Validation         | Zod at forms, route handlers, jobs, and provider boundaries  | One source for runtime validation and TypeScript inference                                      |
| Database           | PostgreSQL                                                   | Source records, raw replay text, jobs, sessions, and analytics queries                          |
| SQL                | Kysely with explicit reversible migrations                   | Typed SQL while keeping queries visible and controllable                                        |
| Authentication     | Application-owned email/password and database sessions       | Argon2id password hashing; P1 OAuth identities attach to the same user                          |
| Background work    | PostgreSQL `jobs` table and one worker loop                  | Transactional enqueue, retry, deduplication, and terminal failure state without another service |
| Raw replay storage | PostgreSQL text/binary column initially                      | Automatically covered by database backups; move to object storage only after measured need      |
| Email              | One small mail-sender module; AWS SES in production          | Local development writes to an ignored mailbox directory                                        |
| Tests              | Vitest and a small Playwright suite                          | Unit/integration coverage plus a few critical browser journeys                                  |
| Local dependencies | Docker Compose with PostgreSQL only                          | The application and worker run directly on the host                                             |
| Production logs    | Structured JSON to stdout and CloudWatch                     | Add tracing infrastructure only when logs/metrics cannot diagnose real failures                 |
| Deployment         | One application image plus an optional worker command on AWS | Same code and image; RDS PostgreSQL is the only required managed data service                   |

Versions are pinned in `package.json` and the lockfile. The initial dependency budget should stay small. A new framework, service, runtime process, or AWS product requires a short ADR explaining the concrete problem it solves now.

## Source modules

| Module       | Owns                                                                                                |
| ------------ | --------------------------------------------------------------------------------------------------- |
| `auth`       | Registration, login/logout, password reset, sessions, P1 external identities                        |
| `catalog`    | Canonical species/forms/items/abilities/moves/rulesets and versioned mechanics data                 |
| `teams`      | Team identities, immutable versions, slots, imports, status, and tags                               |
| `replays`    | Replay sources/import batches, parsing, games, corrections, and sets                                |
| `analytics`  | Reproducible queries over replay/team facts; disposable summaries only if measurement requires them |
| `knowledge`  | Opposing sets, opposing teams, archetypes, and reusable definitions                                 |
| `matchups`   | Plans, structured choices, dependencies, and evidence links                                         |
| `calculator` | Semantic inputs, engine wrapper, results, and dependency invalidation                               |
| `notes`      | Sanitized Markdown notes and subject links                                                          |
| `jobs`       | Database-backed enqueue, claim, retry, failure, and worker dispatch                                 |
| `admin`      | P1 rulesets, feature settings, operational job views, and provider controls                         |

Modules may call another module's exported service/query functions. They must not reach into another module's internal files or duplicate its business rules. Database transactions can span modules because there is one application and one database.

## Request and job paths

### Normal request

1. A Next.js page, Server Action, or `/api/v1` route validates input.
2. Authentication resolves the session to a user.
3. The feature service checks ownership and applies the domain rule.
4. Kysely executes the transaction.
5. The handler returns a page/view model or JSON response.

Business rules belong in feature services and pure functions, not React components or route handlers. This is a code-organization rule, not a reason to introduce a separate “domain layer” package.

### Background job

1. The request writes the owned record and a `jobs` row in the same PostgreSQL transaction.
2. The worker claims available rows with `FOR UPDATE SKIP LOCKED` and a lease.
3. It calls the same feature service functions used by synchronous requests.
4. It records success, retry time, or terminal failure in PostgreSQL.
5. The UI polls the import/job record or refreshes normally; real-time infrastructure is not required.

This preserves reliable asynchronous work without SQS, an outbox, LocalStack, or queue-specific message contracts. If database job contention becomes measurable, the `jobs` module is the seam for moving to a managed queue later.

## Authentication

P0 authentication is owned by the application:

- `users` stores normalized email and an Argon2id password hash.
- Opaque random session tokens are sent in `Secure`, `HttpOnly`, `SameSite=Lax` cookies; only a hash of each token is stored.
- Sessions have idle and absolute expiry, rotate on login/password change, and can be revoked.
- Password resets use short-lived, single-use random tokens stored only as hashes.
- Login/reset responses do not reveal whether an email exists.
- P1 Google authentication adds an `external_identities` row rather than creating a parallel account model.

This satisfies the requirements without making routine development dependent on Cognito. Production email uses SES, but identity logic remains application code and can be tested locally.

## External integrations

Keep each provider in a small client file or folder that accepts application values and returns normalized application values. Initial seams are:

- `fetchShowdownReplay(replayId)`
- `fetchPokepaste(pasteId)`
- `sendEmail(message)`
- `calculateDamage(input)` around the selected calculation engine

The initial calculator engine is `@smogon/calc` pinned at `0.11.0`, used only through the server-side application adapter recorded in [`../decisions/0001-damage-calculation-engine.md`](../decisions/0001-damage-calculation-engine.md). Its classes and data shapes do not cross into route or UI contracts.

Tests replace these functions with fakes at the module boundary. Provider response shapes must not be stored as core entities or leak into UI code. Future tournament, advertising, and AI integrations get their own modules only when that priority is being built.

Avoid creating a generic plugin framework. Similar providers may share a small interface once a second real implementation exists.

## Data storage decisions

- PostgreSQL is the source of truth for all P0 data, including raw replay source.
- Raw replay content may be compressed before storage if transparent to reparsing.
- Normal queries use typed columns; JSONB is reserved for versioned mechanics/provider details that are genuinely variable.
- Analytics start as indexed SQL queries. Add summary tables or materialized views only after profiling the 10,000-game target.
- Cache in process only for immutable catalog data. Do not add Redis initially.
- Attachments and arbitrary file uploads remain out of scope.

Move raw replay bodies to S3 only if database size, backup time, or cost measurements justify it. The database then retains checksum, location, and provenance; this is an implementation migration, not a domain redesign.

## Production deployment

The initial AWS deployment needs:

- One container image running the Next.js application.
- The same image with a worker command; it may run as a second small task or scheduled/always-on process according to traffic.
- RDS PostgreSQL with encryption and automated backups.
- An HTTPS ingress/load balancer and DNS/certificate.
- SES for email.
- Secrets Manager for database credentials, session secrets, and provider secrets.
- CloudWatch for container logs, basic latency/error/job/database alarms, and AWS budget alerts.

The exact AWS provisioning tool is selected before the first shared environment and kept in a small `infra/` directory. It is not needed to build product features locally. CloudFront, WAF, S3, SQS, Redis, distributed tracing, and multiple application services are additions triggered by concrete security, scale, cost, or diagnostic evidence—not baseline components.

Application and worker processes are stateless apart from PostgreSQL, so they can be replicated later. External-provider failure never prevents access to already stored teams, replays, plans, or calculations.

## Architecture guardrails

- Prefer a direct function call over a message, interface, or internal HTTP request.
- Prefer a transaction over eventual consistency inside the application.
- Prefer a PostgreSQL query over a new cache or analytics store until measurement disproves it.
- Prefer a feature folder over a publishable package.
- Keep React components focused on rendering and interaction; put parser, calculator, versioning, and metric logic in plain TypeScript.
- Keep provider calls in named integration modules with timeouts and normalized errors.
- Do not scaffold P1/P2 implementation folders until work on that feature begins.
- Record an ADR before adding a new database, queue, cache, service, monorepo tool, state-management framework, or CSS/component framework.
