# Proposed full-build file structure

Use one package and one Next.js application. Organize by product feature, with colocated server logic and tests. The tree represents the P0 build; P1/P2 folders are added when those features are actually scheduled.

```text
vgc-team-prep/
├─ src/
│  ├─ app/                         # Next.js routes and layouts
│  │  ├─ (auth)/
│  │  │  ├─ login/
│  │  │  ├─ register/
│  │  │  └─ reset-password/
│  │  ├─ (app)/
│  │  │  ├─ teams/
│  │  │  ├─ replays/
│  │  │  ├─ matchups/
│  │  │  ├─ calculations/
│  │  │  ├─ knowledge/
│  │  │  └─ settings/
│  │  ├─ api/                     # Only JSON interactions that need a route
│  │  │  ├─ v1/replay-imports/
│  │  │  ├─ v1/damage/evaluate/
│  │  │  └─ health/
│  │  ├─ dev/mailbox/             # Compiled but runtime-gated to local only
│  │  ├─ layout.tsx
│  │  └─ page.tsx
│  ├─ modules/                     # Business logic grouped by feature
│  │  ├─ auth/
│  │  │  ├─ service.ts
│  │  │  ├─ sessions.ts
│  │  │  ├─ passwords.ts
│  │  │  ├─ validation.ts
│  │  │  └─ service.test.ts
│  │  ├─ catalog/
│  │  │  ├─ service.ts
│  │  │  ├─ identifiers.ts
│  │  │  ├─ data/
│  │  │  └─ service.test.ts
│  │  ├─ teams/
│  │  │  ├─ service.ts
│  │  │  ├─ versioning.ts
│  │  │  ├─ showdown-text.ts
│  │  │  ├─ validation.ts
│  │  │  ├─ queries.ts
│  │  │  └─ *.test.ts
│  │  ├─ replays/
│  │  │  ├─ service.ts
│  │  │  ├─ showdown-client.ts
│  │  │  ├─ parser.ts
│  │  │  ├─ attribution.ts
│  │  │  ├─ best-of-three.ts
│  │  │  ├─ queries.ts
│  │  │  ├─ fixtures/
│  │  │  └─ *.test.ts
│  │  ├─ analytics/
│  │  │  ├─ metrics.ts
│  │  │  ├─ filters.ts
│  │  │  ├─ queries.ts
│  │  │  └─ *.test.ts
│  │  ├─ knowledge/
│  │  ├─ matchups/
│  │  ├─ calculator/
│  │  │  ├─ service.ts
│  │  │  ├─ engine.ts
│  │  │  ├─ normalize.ts
│  │  │  ├─ dependencies.ts
│  │  │  ├─ fixtures/
│  │  │  └─ *.test.ts
│  │  └─ notes/
│  ├─ components/                  # Shared application components only
│  │  ├─ forms/
│  │  ├─ layout/
│  │  └─ data-display/
│  ├─ db/
│  │  ├─ client.ts
│  │  ├─ schema.ts
│  │  ├─ migrations/               # Paired timestamped up/down migrations
│  │  ├─ seeds/
│  │  └─ test-database.ts
│  ├─ jobs/
│  │  ├─ queue.ts                  # PostgreSQL enqueue/claim/retry logic
│  │  ├─ handlers.ts
│  │  ├─ worker.ts                 # Separate command, same codebase
│  │  └─ queue.test.ts
│  ├─ integrations/
│  │  ├─ pokepaste.ts
│  │  └─ email.ts
│  ├─ lib/                         # Config, errors, logging, HTTP helpers
│  └─ styles/                      # Global CSS and shared variables
├─ tests/
│  ├─ integration/                 # PostgreSQL-backed module and route tests
│  ├─ e2e/                         # Small Playwright suite for critical journeys
│  ├─ performance/                 # 10,000-game and calculator targets
│  └─ fixtures/                    # Synthetic/reviewed cross-feature fixtures
├─ scripts/
│  ├─ bootstrap.mjs               # Runs before project dependencies exist
│  ├─ seed.ts
│  ├─ capture-replay-fixture.ts
│  ├─ redact-replay-fixture.ts
│  └─ check-migrations.ts
├─ infra/                          # Added before shared AWS deployment
│  ├─ README.md
│  └─ ...                          # Small chosen IaC stack; decision recorded in ADR
├─ docs/
│  ├─ specs/
│  ├─ adr/
│  ├─ data/
│  ├─ security/
│  └─ runbooks/
├─ public/                         # Reviewed licensed/static assets only
├─ .github/workflows/
├─ .env.example
├─ .gitattributes
├─ .gitignore
├─ .node-version
├─ compose.yaml                    # PostgreSQL only
├─ Dockerfile
├─ next.config.ts
├─ package.json
├─ package-lock.json
├─ tsconfig.json
├─ tsconfig.worker.json           # Compiles the worker with TypeScript
├─ vitest.config.ts
├─ playwright.config.ts
├─ README.md
└─ REQUIREMENTS.md
```

## Organization rules

- A route or page validates transport input, resolves authentication, calls a feature service/query, and renders/maps the result.
- Business rules live in plain TypeScript under `src/modules`, not in React components, SQL migrations, or route handlers.
- Feature-private files stay inside their module. Cross-feature use goes through the module's `service.ts`, `queries.ts`, or a deliberately exported type/function.
- SQL lives in the feature query/service that needs it. Do not add a repository class for every table.
- The database, job worker, and pages all import the same feature code directly; there is no internal API call between them.
- Provider-specific network code lives in `src/integrations` or the owning feature client file and returns normalized values.
- Tests are colocated when they exercise one module. Cross-feature, browser, and performance tests live in `tests/`.
- Do not create empty folders for deferred P1/P2 capabilities.

## Frontend restraint

The frontend starts with React, semantic HTML, and CSS Modules/global CSS. It does not initially add a component framework, CSS utility framework, client state library, form framework, chart framework, or client-side API cache.

Use:

- Server Components for data-heavy pages where practical.
- Small Client Components only for interaction that needs browser state.
- Standard HTML forms and Server Actions/route handlers for mutations.
- URL search parameters for analytics filters.
- Native tables with responsive wrappers and accessible text summaries before adopting a chart library.

Add a focused dependency only after a real screen demonstrates that the browser/platform and current code cannot meet the need cleanly.

## Configuration

`.env.example` lists configuration names and safe local defaults. `.env.local` is ignored. A single configuration module validates values at startup. Production secrets are loaded from AWS Secrets Manager into process environment variables; they are never exposed to client components or browser bundles.

The executable workflow is defined in [`specs/09-local-development.md`](specs/09-local-development.md).
