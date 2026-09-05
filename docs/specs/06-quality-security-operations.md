# Quality, security, and operations specification

## Verification strategy

### Test layers

- **Domain unit tests:** team diffs/sealing, attribution, grouping, correction overlays, metric numerator/denominator, dependency invalidation, ruleset validation.
- **Table-driven/randomized unit tests:** team import round trips, idempotent normalization, event ordering, percentage bounds, combination canonicalization, and deterministic calculator normalization; use Vitest helpers before adding a property-testing framework.
- **Parser fixtures/golden tests:** representative supported replays, malformed/truncated sources, unknown lines, forms, Mega Evolution, ambiguous ownership, BO3 encodings, and P1 imperfect observability.
- **Calculator conformance:** versioned fixtures generated/verified against the approved reference engine, including boundary rolls and every supported modifier.
- **Database/integration tests:** PostgreSQL constraints, transactions, tenant isolation, migration up/down, job claim/retry/idempotency, and raw-replay retention.
- **Contract tests:** Showdown/Poképaste response fixtures and P2 providers; detect upstream shape changes without live calls in normal CI.
- **API tests:** validation, authorization, revision-conflict behavior, stable errors, rate limits, and pagination.
- **Browser tests:** onboarding, team versioning, bulk replay progress/correction, analytics filters, matchup editing, saving/recomputing calculations, keyboard flows.
- **Performance tests:** seeded 10,000-game account, 100 dependent calculations, batch ingestion, and specified p95 thresholds.
- **Accessibility tests:** automated axe rules plus manual keyboard, focus, screen-reader labels, zoom/reflow, contrast, chart/table equivalents.

No P0 release is accepted if parser/calculator golden suites, tenant isolation, team history, game/set separation, or migration checks fail.

## CI quality gates

For each pull request: lockfile integrity, formatting, lint, TypeScript strict build, unit/integration tests, migration apply/down/reapply against a disposable database, dependency/secret scan, and production build. Release CI adds the browser/conformance suites and scans the one production container. Performance scenarios run before releases that affect their paths and on demand, rather than making every change wait for a large suite.

## Security controls

- TLS 1.2+ at AWS ingress; HSTS in production.
- Passwords are hashed with configured Argon2id parameters and a unique salt; plaintext is discarded immediately and never logged or retained.
- Opaque session tokens have idle/absolute expiry and rotation/revocation; only token hashes are stored. Cookies are Secure, HttpOnly, and SameSite, with origin/CSRF checks on mutations.
- Server-side authorization on every resource and field; tenant isolation tests are mandatory.
- Secrets in Secrets Manager, KMS-encrypted; CI deploys through GitHub OIDC. No secrets in `.env` templates, images, logs, or client bundles.
- Application rate limits cover authentication, URL import, refresh, calculator abuse, and future AI, scoped by IP and authenticated account as appropriate. Add AWS WAF only if exposure/abuse evidence or launch risk assessment requires it.
- Strict CSP, output sanitization, no raw HTML Markdown, dependency integrity controls, and third-party scripts isolated to public/configured placement shells.
- Provider URL parsing and allowlists prevent SSRF; response byte/time limits and content validation prevent resource abuse.
- PostgreSQL, backups, and logs use managed AWS encryption. Future object/queue stores must meet the same requirement before adoption.
- Production operator roles are least privilege with MFA; sensitive config/deploy/admin actions go to immutable audit trails.
- Security headers, threat model, data-flow inventory, and incident response runbook are release artifacts.

## Privacy and retention

Maintain a data inventory with purpose, classification, processor, region, retention, and deletion behavior. Product analytics must use coarse events and never capture team exports, Pokémon sets, replay logs, notes, calculations, tokens, or full URLs containing private identifiers.

Private content is not sent to AI or advertising providers. Any future AI transfer requires an explicit job, a preflight summary of data leaving the service, provider retention disclosure, and recorded consent/inputs. Advertising scripts receive no private DOM/data context and non-essential tracking remains off until consent/legal configuration is complete.

Document retention before production for live soft deletes, raw replay sources, failed imports/jobs, logs, audit events, exports, provider caches, database snapshots, and deletion markers.

## Service objectives

| Indicator                               | Initial objective                               |
| --------------------------------------- | ----------------------------------------------- |
| Monthly availability                    | >= 99.5% for authenticated core service         |
| Interactive page load                   | p95 < 2.5 s on defined broadband/device profile |
| Common API read                         | p95 < 500 ms excluding uncached providers       |
| Team/note save                          | p95 < 750 ms                                    |
| Replay acknowledgement                  | < 1 s                                           |
| Normal replay completion                | p95 < 10 s                                      |
| Single damage result                    | p95 < 150 ms                                    |
| <=100 calculation invalidations visible | < 2 s                                           |
| Common analytics at 10,000 games        | p95 < 2 s                                       |

Define the exact synthetic/browser profile and “normal replay” fixture in the performance test repository. Alerting should use sustained multi-window burn or consecutive threshold breaches rather than single spikes.

## Observability

Structured logs include timestamp, severity, service/version/environment, request/job/correlation IDs, route or job kind, duration, outcome/error code, and safe resource IDs. They exclude authorization headers, tokens, cookies, emails where avoidable, raw URLs, team text, replay content, notes, calculation inputs, and provider credentials.

Initial metrics/dashboards cover request rate/error/latency, pending/running/failed job counts and oldest available job, parser outcomes by parser/format version, job attempts, database health/storage/slow queries, provider errors, calculation latency/conformance version, analytics latency, and external freshness/last success. Add per-user cost instrumentation only when usage makes it actionable.

Alert on sustained core availability/latency failure, stale or rising PostgreSQL jobs, new terminal job failures, unexpected parser-error increases, backup failure, database health/storage, certificate/secret expiry, and cost-budget thresholds. Runbooks link from alerts.

## Resilience

- External clients use timeouts, bounded retries with backoff/jitter, and simple concurrency/rate caps. Add circuit-breaking infrastructure only after a measured need.
- Core pages never synchronously require Showdown, Poképaste, tournament, email, ad, or AI providers.
- PostgreSQL jobs are at-least-once and handlers are idempotent. After maximum attempts, retain a safe terminal failure for P1 admin review/retry.
- Deployments are backward-compatible across the rolling window. Expand/migrate/contract schema changes span releases.
- Feature flags (P1) disable new provider integrations and workflows without deployment; defaults are safe/off.

## Backup and disaster recovery

- Automated encrypted RDS backups and snapshots; enable point-in-time recovery in production.
- Raw replay sources live in PostgreSQL initially and are included in the same encrypted backup and restore verification as other user data.
- Initial RPO <=24 hours and RTO <=8 hours. Before broader release, target RPO <=1 hour and RTO <=4 hours.
- Quarterly restore rehearsal to an isolated database verifies raw replay content, migrations, users/sessions, deletion markers, jobs, and smoke tests. Record achieved RPO/RTO and remediation.
- Infrastructure, bootstrap, restore, rollback, provider outage, failed-job retry, compromised secret, account deletion, and incident communication runbooks live under `docs/runbooks`.

## Accessibility and compatibility definition of done

Core flows target WCAG 2.2 AA. Controls are keyboard operable with visible focus; dialogs restore focus; errors are programmatically associated; status changes have live-region handling; color is never the sole cue; data tables have headers/captions; charts have text/table alternatives; sprites are decorative unless identity-bearing.

CI/browser coverage uses current stable Chrome, Firefox, Safari/WebKit, and Edge/Chromium at release time, with responsive checks at representative phone, tablet, laptop, and wide desktop widths. Core functionality does not depend on an extension.

## Cost controls

Tag the small set of AWS resources by application/environment/owner/cost center. Configure monthly budget/forecast alerts, log retention, database storage alarms, and conservative application/worker scaling limits. Review measured database size, backup time, job load, and provider usage before adding object storage, a managed queue, cache, tracing system, high-cardinality telemetry, or any always-on cluster.
