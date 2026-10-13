# Uptime Monitor

A self-hostable uptime monitor. Register a URL, choose how often it should be
checked, and get told when it goes down and when it comes back. The dashboard
shows current status, 90 days of uptime history and response times.

Work in progress.

## Stack

- **gateway**, **api** and **worker**: NestJS, PostgreSQL via Prisma, BullMQ over Redis
- **web**: Vite, React, MUI and MUI X Charts, styled-components, React Query
- **shared**: request and response types used by both sides

One npm workspaces monorepo:

```
apps/gateway              public entry point, routes /api to the api
apps/api                  REST api, auth, scheduling
apps/worker               runs the checks and sends alerts
apps/web                  dashboard
packages/shared           types and constants shared across apps
packages/service-registry how services find each other, backed by Redis
docs/                     requirements, design, technical spec and coding standards
```

## Running locally

Requires Node 24, plus Docker for Postgres and Redis.

```sh
cp .env.example .env
docker compose up -d
npm install
npm run db:migrate
npm run dev
```

To use a Postgres you already have instead of the container, create the role
and database once as a superuser, then point `DATABASE_URL` at it:

```sql
CREATE ROLE uptime WITH LOGIN PASSWORD 'uptime' CREATEDB;
CREATE DATABASE uptime_monitor OWNER uptime;
```

`CREATEDB` is only needed locally, where `prisma migrate dev` creates a
temporary shadow database.

Integration tests use a separate database, so they can empty it freely. Create
it once and point `TEST_DATABASE_URL` at it:

```sh
createdb -U uptime uptime_monitor_test
npm run db:migrate:test
```

- web: http://localhost:5000
- gateway: http://localhost:3000/health (lists registered instances)
- api, through the gateway: http://localhost:3000/api/v1/health
- API docs (Swagger): http://localhost:3000/api/docs

The api (3001) and worker (3002) are internal. The browser only ever talks to
the gateway.

## Demo account

`npm run seed` (with `DEMO_SEED_ENABLED=true`) creates `demo@example.com`,
password `try-the-demo`, and replaces it if it already exists.

| Monitor         | History                                                     |
| --------------- | ----------------------------------------------------------- |
| Marketing site  | Seeded: 90 days generated, then checked for real            |
| Customer portal | Seeded: 90 days generated, then checked for real            |
| Public API      | Seeded: 90 days generated, then checked for real            |
| Legacy reports  | Seeded, with an incident left open; its host never resolves |
| Demo target     | Live: no history until it is checked                        |

Everything before the seed ran is generated, not measured, and the api marks
those monitors with `isSeeded`. "Demo target" checks the api's own
`/demo/target`, which can be switched to fail on cue:

```sh
curl -X POST http://localhost:3000/api/v1/demo/target \
  -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  -d '{"mode":"down"}'
```

Modes are `up`, `down` (503), `timeout`, and `status` with a `statusCode`.
Locally the worker needs `ALLOW_PRIVATE_TARGETS=true` to check it, since it is
on localhost.

## Scripts

| Command                   | What it does                            |
| ------------------------- | --------------------------------------- |
| `npm run dev`             | Runs every app in watch mode            |
| `npm run build`           | Builds every workspace                  |
| `npm run typecheck`       | Typechecks every workspace              |
| `npm test`                | Runs the test suites                    |
| `npm run db:migrate`      | Applies committed migrations            |
| `npm run db:migrate:dev`  | Creates a migration from schema changes |
| `npm run db:migrate:test` | Applies migrations to the test database |
| `npm run db:studio`       | Opens Prisma Studio                     |
| `npm run seed`            | Recreates the demo account              |
| `npm run lint`            | ESLint across the repo                  |
| `npm run format`          | Prettier across the repo                |
