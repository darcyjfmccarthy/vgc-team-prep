# Local development specification

## Principle

Local development should feel like running a normal web application, not reproducing AWS on a laptop. The only required container is PostgreSQL. The Next.js application and its small worker run directly on the host with hot reload.

A contributor must not need AWS credentials, Docker-based cloud emulators, a local identity server, a message broker, an email server, or an observability stack.

## Prerequisites

- Git.
- The Node.js LTS version pinned in `.node-version` and `package.json#engines`.
- npm, included with the pinned Node.js version.
- Docker Desktop/Compose v2, used only for PostgreSQL.

On Windows, PowerShell 7 is recommended. Docker Desktop should use Linux containers. All required repository scripts are cross-platform Node/TypeScript; routine work does not require Bash, WSL, an AWS CLI, or globally installed framework/database tools.

## Local processes

| Component           | Default                             | Purpose                                                     |
| ------------------- | ----------------------------------- | ----------------------------------------------------------- |
| Next.js application | `http://localhost:3000`             | Pages, authentication, Server Actions, and `/api/v1` routes |
| Worker              | host process, no port               | Claims PostgreSQL jobs and runs replay/calculation work     |
| PostgreSQL          | `localhost:5432`                    | All application data, sessions, raw replays, and jobs       |
| Development mailbox | `http://localhost:3000/dev/mailbox` | Local-only view of captured application emails              |

`compose.yaml` contains one PostgreSQL service with a health check and named volume. It creates `vgc_dev`; tests create isolated temporary databases. No application source is bind-mounted into Docker.

## First run

```text
npm ci
npm run bootstrap
npm run db:migrate
npm run db:seed
npm run dev
```

`npm run bootstrap`:

1. Verifies Node, npm, Docker Compose, and ports 3000/5432.
2. Creates `.env.local` from `.env.example` only when absent.
3. Generates a development session secret under ignored `.local/` state or `.env.local`.
4. Starts PostgreSQL and waits for its health check.
5. Prints the next commands; the later seed command prints seeded login details.

`npm run dev` starts Next.js. Run `npm run worker:dev` in a second terminal when working on asynchronous flows. `npm run dev:all` is an optional convenience command that runs both with prefixed logs; it must not be the only supported workflow.

Within the target 15 minutes after prerequisites and dependency downloads, a new contributor should be able to sign in and import a fixture replay through the database-backed worker.

## Authentication and email

Local development uses the real application authentication code, not a separate mock identity system. Seeds create reserved example accounts such as:

- `player-one@example.test`
- `player-two@example.test`
- `admin@example.test` for P1 admin work

Their development password is printed by the seed command and documented as non-production. Switching accounts demonstrates tenant isolation.

The local `sendEmail` implementation stores rendered messages in a development-only database table or ignored `.local/mail/` files. `/dev/mailbox` displays them only when `APP_ENV=local`. This permits registration/reset testing without an SMTP service. Production startup refuses the development mail implementation and uses SES credentials/configuration from the environment.

## Configuration

`.env.example` should stay short:

```text
APP_ENV=local
APP_URL=http://localhost:3000
DATABASE_URL=postgresql://vgc:vgc@localhost:5432/vgc_dev
SESSION_SECRET=
EMAIL_DRIVER=file
REPLAY_PROVIDER_MODE=fixtures
LOG_LEVEL=debug
```

`.env.local` and `.local/` are ignored by Git. One typed configuration module validates startup values. `APP_ENV=production` rejects development email, fixture-provider mode, loopback origins, known local credentials, insecure cookies, and an absent managed production secret.

Do not add configuration for an AWS service until the application actually uses that service.

## Database commands

```text
npm run db:migrate               # Apply pending migrations
npm run db:rollback              # Roll back one migration after confirmation
npm run db:status                # Show target and applied/pending migrations
npm run db:seed                  # Idempotently create catalog and development scenarios
npm run db:new -- <name>         # Create paired up/down migration files
npm run db:reset                 # Guarded local-only drop, recreate, migrate, and seed
```

`db:reset` resolves and displays the exact database target, requires it to be loopback with the reserved `vgc_dev`/test naming convention, and asks for confirmation. It refuses non-local hosts and production-like names. CI may use an explicit non-interactive flag only with an ephemeral test database.

Seeds are deterministic and include:

- Versioned catalog and launch ruleset data.
- Empty user, versioned team, mixed replay outcomes, ambiguous replay, BO3 set, stale matchup, and saved-calculation scenarios.
- An opt-in 10,000-game performance seed.

No seed contains real accounts, private replay content, credentials, or unlicensed assets.

## Background jobs

Jobs use PostgreSQL in development exactly as they do initially in production.

```text
npm run worker:dev              # Poll continuously with reload
npm run worker:once             # Claim one available job and exit
npm run jobs:list               # Show safe status/attempt/error summaries
npm run jobs:retry -- <jobId>   # Retry one terminal failed job after validation
```

The UI polls the related import record for progress. Local development exercises real transactional enqueue, lease expiry, retries, deduplication, and terminal failure behavior; there is no queue emulator or separate dead-letter service.

## Replay and provider fixtures

`REPLAY_PROVIDER_MODE=fixtures` makes the Showdown and Poképaste clients resolve known synthetic identifiers to checked-in fixtures. Network clients are still tested directly using mocked `fetch` responses for redirect, timeout, size, rate-limit, and malformed-response behavior. Routine local development and CI do not depend on provider availability.

Required fixtures cover valid import, BO3 grouping, duplicate IDs/content, inaccessible/private/deleted replay, malformed/truncated replay, unsupported format, unknown event lines, and ambiguous side/team attribution.

Connected provider checks are explicit, opt-in commands using approved public/synthetic identifiers. Captured fixtures pass through the redaction script and manual privacy/license review before commit. Ordinary personal replay data stays in the local database and is never promoted automatically.

## Logging and debugging

Development logs are readable console output created from the same redacted structured fields used in production. Each request and job has a correlation ID. Raw team text, replay bodies, notes, calculation inputs, passwords, cookies, reset tokens, and secrets are never logged.

Use the normal Node debugger for the application or worker. Source maps are enabled. SQL logging is off by default and, when enabled, redacts bind values. No local tracing backend is required; add one only if correlation IDs and structured logs prove inadequate for a real diagnostic problem.

## Test commands

```text
npm run check               # Format, lint, strict types, and unit tests
npm test                    # Vitest unit tests
npm run test:integration    # PostgreSQL-backed service and route tests
npm run test:e2e            # Small Playwright critical-journey suite
npm run test:performance    # Explicit opt-in target scenarios
npm run test:migrations     # Up/down/reapply on a disposable database
```

Integration tests create unique temporary databases, migrate them, and delete them after the run. Provider behavior uses fakes/mocked fetch. Tests never target `vgc_dev`, a non-loopback database, or a live provider unless the explicit connected-test command is used.

## Daily workflow

```text
npm run db:start             # Start PostgreSQL if needed
npm run db:migrate
npm run dev                  # Terminal one
npm run worker:dev           # Terminal two, only when needed
npm run check
npm run db:stop              # Stop PostgreSQL and preserve its volume
```

Most UI, team, matchup, note, and calculator work needs only `npm run dev`; the worker is needed for replay import/reparse and larger recomputation flows.

## Windows requirements

- Scripts use Node path/process APIs and avoid shell-specific pipelines.
- `.gitattributes` enforces LF for repository text while scripts tolerate Windows paths and spaces.
- Next.js and worker file watching run on the host, avoiding slow Docker bind mounts.
- Bootstrap detects Docker running in Windows-container mode and explains the Linux-container requirement.
- Commands shown in project documentation work in PowerShell.

## Local-development definition of done

Phase 0 is accepted when a clean supported machine can:

1. Bootstrap with no cloud credentials and only PostgreSQL in Docker.
2. Register, log in/out, and complete password reset through the local mailbox.
3. Sign in as two seeded users and demonstrate record isolation.
4. Apply, roll back, and reapply a migration.
5. Start the worker, submit a fixture replay, and inspect the parsed result.
6. Exercise one retry and one terminal job failure.
7. Run unit, integration, migration, and one critical browser test.
8. Restart without data loss and perform a guarded reset without any non-local target.
