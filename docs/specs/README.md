# VGC Team Prep — build specification

This directory translates [`REQUIREMENTS.md`](../../REQUIREMENTS.md) into an implementation-ready specification for the complete product. The requirements remain authoritative; these documents define a proposed implementation and make assumptions explicit.

## Documents

| Document                                                                 | Purpose                                                                                                            |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| [`01-product.md`](01-product.md)                                         | Product scope, actors, workflows, acceptance criteria, and product rules                                           |
| [`02-architecture.md`](02-architecture.md)                               | System boundaries, technology choices, deployment, and cross-cutting design                                        |
| [`03-domain-and-data.md`](03-domain-and-data.md)                         | Domain model, persistence schema, invariants, lifecycle, and provenance                                            |
| [`04-interfaces.md`](04-interfaces.md)                                   | HTTP API, asynchronous jobs, errors, idempotency, and authorization                                                |
| [`05-processing-and-analytics.md`](05-processing-and-analytics.md)       | Replay pipeline, best-of-three grouping, damage calculations, and metric definitions                               |
| [`06-quality-security-operations.md`](06-quality-security-operations.md) | Testing, security, privacy, accessibility, observability, backup, and SLOs                                         |
| [`07-delivery-plan.md`](07-delivery-plan.md)                             | Vertical slices, release gates, dependencies, and deferred scope                                                   |
| [`08-requirement-traceability.md`](08-requirement-traceability.md)       | Mapping from every source requirement group to its owning specification                                            |
| [`09-local-development.md`](09-local-development.md)                     | PostgreSQL-only setup, commands, seeds, jobs, provider fixtures, debugging, and safety                             |
| [`10-p1-data-models.md`](10-p1-data-models.md)                           | Complete logical data model through P1, including relationships, lifecycle rules, indexes, and derived read models |
| [`11-ux-prototype.md`](11-ux-prototype.md)                               | Authenticated P0 UX prototype, navigation, responsive behavior, and fixture boundary                               |
| [`../FILE_STRUCTURE.md`](../FILE_STRUCTURE.md)                           | Proposed single-application tree and organization rules                                                            |

## Status vocabulary

- **Specified:** sufficiently defined to implement.
- **Decision required:** implementation is blocked on a product or technical choice listed below.
- **Deferred:** intentionally outside the P0 release.

## Proposed baseline

The build is one TypeScript/Next.js application backed by PostgreSQL. Pages, server endpoints, authentication, raw replay storage, sessions, and background-job state live in the same codebase and database. A small worker command from that codebase handles replay imports and other asynchronous work. Local development requires only PostgreSQL in Docker.

Feature folders and a few external-provider seams preserve maintainability without a monorepo, separate API server, cloud emulators, message broker, object store, identity service, or observability stack. Those are future options justified only by measured need. This baseline is a proposal, not a requirement inferred from the source document.

## Decisions required before implementation

1. **Supported launch ruleset:** identify the exact Pokémon Champions format identifiers, mechanics, legal species/forms, and data update process.
2. **Reference damage engine:** `@smogon/calc@0.11.0` is selected under MIT for the live slice; freeze authoritative Champions fixtures before full certification.
3. **Replay formats:** approve the exact Showdown formats that are P0 and provide replay fixtures, including best-of-three URL examples.
4. **Poképaste integration:** confirm permitted retrieval/export behavior, rate limits, and whether “Poképaste-compatible” means text only or hosted paste creation.
5. **Canonical game data:** choose the source and license for species, forms, items, moves, abilities, sprites, and localized display names.
6. **Launch region:** assume a single AWS region in Australia unless latency, residency, or cost requirements dictate otherwise.
7. **Account deletion retention:** define the legal/operational delay before final purge from live data and expiry from backups.

Implementation can begin around these decisions, but calculator certification, parser completeness, and production launch cannot be accepted without them.
