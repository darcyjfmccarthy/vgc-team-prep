# VGC Team Prep

Private Pokémon Champions team preparation, beginning with an authenticated Poképaste-to-team-library workflow.

## Isolated local development

- PostgreSQL runs only through `compose.yaml` in Docker.
- Node 24.20.0 can be kept under ignored `.local/tooling/`; `node_modules/` is project-local.
- `.env.local` and development mail are ignored and never committed.

```powershell
$env:Path = "$(Resolve-Path .local/tooling/node-v24.20.0-win-x64);$env:Path"
npm run bootstrap
npm run db:migrate
npm run db:seed
npm run dev
```

Sign in with `player-one@example.test` and password `correct-horse-battery-staple`. The seeded Teams page displays the Poképaste listed in `teams.txt` without requiring a network request.

Use `npm run worker:once` for one queue poll, `npm run check` for format/lint/type/unit tests, and `npm run test:integration` after seeding the local database.
