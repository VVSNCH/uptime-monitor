# Technical Specification — Uptime Monitor

Version 0.1 · Draft for review

## 1. Stack

| Concern | Choice |
|---|---|
| Repository | npm workspaces |
| Language | TypeScript, strict, everywhere |
| Backend framework | NestJS |
| Database | PostgreSQL |
| ORM and migrations | Prisma |
| Queue | BullMQ over Redis |
| Validation | class-validator with a global ValidationPipe |
| Auth | @nestjs/jwt, @node-rs/argon2, a global guard (no Passport), @nestjs/throttler |
| HTTP client | undici `fetch` with an abort timeout and a guarded DNS lookup |
| Email | Nodemailer over SMTP |
| Frontend | Vite, React, React Router |
| Data fetching | Axios through one client, React Query for caching |
| Components | MUI |
| Custom styling | styled-components |
| Charts | Recharts |
| Tests | Jest (backend), Vitest and Testing Library (frontend) |
| Local infrastructure | Docker Compose |

No Nx, no Turborepo. Four apps do not need a build graph; npm workspaces plus
`npm run dev -w apps/api` covers it.

The Prisma schema and generated client live in `packages/database` rather than
in each app. The api and worker both talk to the same tables, so they import
one client instead of generating two. The generated client is not committed;
`npm run build` regenerates it.

## 2. Folder structure

```
uptime-monitor/
├── docs/
├── docker-compose.yml
├── package.json                      workspaces root
├── tsconfig.base.json
├── packages/
│   ├── database/
│   │   ├── prisma.config.ts
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   └── migrations/
│   │   └── src/
│   │       ├── index.ts              generated client, createPrismaClient
│   │       └── nest/                 PrismaModule and PrismaService
│   ├── nest-common/
│   │   └── src/                  exception filter, validation pipe, AppException
│   ├── shared/
│   │   ├── src/
│   │   │   ├── dto/                  request and response contracts
│   │   │   ├── constants/            shared enums, intervals, limits
│   │   │   └── index.ts
│   │   └── package.json
│   └── service-registry/
│       └── src/
│           ├── service-registry.ts   register, heartbeat, list live instances
│           ├── service-resolver.ts   pick an instance, fall back to last known
│           └── nest/                 Nest module wiring Redis and shutdown
└── apps/
    ├── gateway/
    │   └── src/
    │       ├── main.ts               CORS, mounts the proxy under /api
    │       ├── proxy/                registry-backed reverse proxy
    │       ├── health/               gateway status plus live instance counts
    │       └── constants/
    ├── api/
    │   └── src/
    │       ├── main.ts
    │       ├── app.module.ts
    │       ├── auth/
    │       │   ├── auth.controller.ts
    │       │   ├── auth.service.ts           register, login, password change
    │       │   ├── token.service.ts          access tokens, refresh rotation
    │       │   ├── refresh-token.repository.ts
    │       │   ├── refresh-cookie.service.ts
    │       │   ├── guards/                   global JWT guard
    │       │   └── decorators/               @Public(), @CurrentUser()
    │       ├── users/                        users repository
    │       ├── monitors/
    │       │   ├── monitors.controller.ts
    │       │   ├── monitors.service.ts
    │       │   ├── monitors.repository.ts
    │       │   └── monitor-schedule.service.ts
    │       ├── incidents/
    │       ├── channels/
    │       ├── stats/                uptime figures and check history
    │       ├── history/              reads over checks and daily stats
    │       ├── events/               SSE stream, Redis subscriber
    │       ├── health/
    │       ├── queue/                queue registration and producers
    │       ├── common/               app-specific decorators and guards
    │       ├── demo/                 switchable target endpoint
    │       └── constants/
    ├── worker/
    │   └── src/
    │       ├── main.ts
    │       ├── app.module.ts
    │       ├── check/
    │       │   ├── check.processor.ts        BullMQ consumer, bounded concurrency
    │       │   ├── check-runner.service.ts   load, claim, probe, record
    │       │   ├── check.repository.ts       the claim and the result write
    │       │   ├── http-probe.service.ts
    │       │   ├── url-guard.service.ts
    │       │   └── state-machine.service.ts
    │       ├── queue/                        BullMQ connection for consuming
    │       ├── notify/
    │       │   ├── notify.processor.ts
    │       │   ├── email.channel.ts
    │       │   ├── webhook.channel.ts
    │       │   └── templates/
    │       ├── rollup/
    │       │   ├── rollup.processor.ts       nightly rollup and pruning
    │       │   ├── rollup.repository.ts
    │       │   └── rollup.scheduler.ts       registers the two nightly jobs
    │       └── constants/
    └── web/
        └── src/
            ├── routes/
            ├── features/
            │   ├── auth/
            │   ├── monitors/
            │   ├── incidents/
            │   └── channels/
            ├── components/
            ├── context/
            ├── hooks/                useApiQuery, useApiMutation, per-resource hooks
            ├── services/             axios client, error normalisation, query client
            ├── constants/
            ├── theme/
            ├── types/
            └── utils/
```

### Rules for where code goes

- A controller validates and delegates. No business logic in a controller.
- A service holds business logic and never writes raw SQL.
- A repository is the only place a Prisma query appears, and every monitor
  query it exposes takes a `userId`. Scoping lives here so no endpoint can
  forget it.
- `packages/shared` holds only types and constants used by more than one app.
  Nothing in it imports Nest, React, or Prisma.
- Request plumbing is written once. Every Nest app imports `CommonModule`
  from `packages/nest-common` for the error shape and validation; services
  throw `AppException` with a code from `ERROR_CODES`. There are no generic
  CRUD base controllers, because they hide the user scoping each resource
  needs.
- In the web app, components never call Axios directly. They use
  `useApiQuery` and `useApiMutation`, which go through the one client in
  `services/http.ts`, so every request gets the same base URL, timeout, error
  type and cache behaviour.
- A processor coordinates; it does not implement. `check.processor.ts` calls
  the probe, the state machine and the producer, and does none of their work.

## 3. Shared contracts

`packages/shared` is the reason the monorepo exists. The web app imports the
same response types the api returns:

```ts
// packages/shared/src/dto/monitor.ts
export interface MonitorSummary {
  id: number
  name: string
  url: string
  status: MonitorStatus
  lastCheckedAt: string | null      // ISO
  lastResponseMs: number | null
  uptime24h: number | null          // 0..1, null before the first check
}
```

Dates cross the boundary as ISO strings, never `Date`. A `Date` does not
survive JSON, and pretending otherwise produces a type that lies.

## 4. API surface

Paths below are relative to the current version. The api serves them under
`/v1`, and clients reach that through the gateway's `/api` prefix, so
`GET /monitors` is `GET /api/v1/monitors` from the browser. A breaking change
ships as `/v2` alongside `/v1` rather than replacing it.

Health endpoints are infrastructure, not API, so they are not versioned. Every
service exposes both:

- `GET /health`: readiness. Checks the database and Redis and returns 503 when
  either is down. The api also answers it at `/v1/health` for the web app.
- `GET /health/live`: liveness. Says only that the process is up. Platforms
  restart on liveness, so it never depends on the database: an outage should
  pull instances out of rotation, not restart them.

OpenAPI docs are generated from the controllers and DTOs by the Nest Swagger
plugin and served at `/api/docs`, with the raw document at `/api/docs-json`.
`API_DOCS_ENABLED` turns them off where the API should not be browsable.

```
POST   /auth/register
POST   /auth/login
POST   /auth/refresh
POST   /auth/logout
POST   /auth/logout-all                 revoke every refresh-token family
PATCH  /auth/password                   requires the current password
GET    /auth/me                         the signed-in user

GET    /monitors
POST   /monitors
GET    /monitors/:id
PATCH  /monitors/:id
DELETE /monitors/:id
POST   /monitors/:id/pause
POST   /monitors/:id/resume
POST   /monitors/:id/check          run one check now: 202, 409 if paused, 503 if it cannot be queued

GET    /monitors/:id/checks?from=&to=   oldest first; last 24 hours by default, a week at most
GET    /monitors/:id/stats?window=24h|7d|30d|90d   uptime and average; one entry per day except 24h
GET    /incidents?open=true&limit=50     newest first, limit at most 100
GET    /monitors/:id/incidents          same filters, one monitor

GET    /channels
POST   /channels
PATCH  /channels/:id
DELETE /channels/:id
POST   /channels/:id/test               sends a real sample, returns what the receiver said

GET    /events                      SSE stream
```

Conventions: plural nouns, verbs only where the action is not a resource
mutation (`pause`, `test`). Errors follow one shape — `{ statusCode, code,
message }` — with `code` a stable machine-readable string the frontend maps to
copy. HTTP status carries the category; `code` carries the specifics. The
gateway uses the same shape for its own failures: `SERVICE_UNAVAILABLE` (503)
when no instance is registered, `UPSTREAM_UNREACHABLE` (502) when the chosen
one does not answer.

## 5. Queues

| Queue | Producer | Job data | Notes |
|---|---|---|---|
| `checks` | BullMQ job schedulers, one per monitor; the api for on-demand checks | `{ monitorId, requestedAt? }` | Attempts 1 — retrying a check is meaningless, the next occurrence is the retry. `requestedAt` is set only on on-demand checks; a scheduled check takes its occurrence from the job |
| `notifications` | worker state machine; api for channel tests | `notify { incidentId, transition }`, `deliver { …, channelId }`, `test-delivery { channelId }` | notify fans out to one deliver per channel; deliver attempts 5, exponential backoff from 10 s |
| `rollup` | Two job schedulers the worker registers on startup | `rollup { day? }`, `prune-checks {}` | rollup at 00:05 UTC overwrites DailyStat for the last three full days, or just `day` if given; prune-checks at 00:20 UTC deletes raw checks past the retention window |

`checks` deliberately does not retry. A failed check is data, not an error. The
only thing worth retrying is delivery of an alert.

## 6. Configuration

Every variable validated at startup with a schema; the process refuses to boot
on a missing or malformed value. A service that starts with a bad config and
fails later is harder to diagnose than one that refuses to start.

```
DATABASE_URL                           add ?sslmode=require for hosted Postgres
DATABASE_POOL_SIZE=10                  connections per api or worker process
REDIS_URL
GATEWAY_PORT=3000                      the only public port
WEB_ORIGIN=http://localhost:5000       allowed CORS origin, enforced at the gateway
API_PORT=3001
API_HOST=localhost                     address the api registers under
WORKER_PORT=3002
WORKER_HOST=localhost
VITE_API_URL=http://localhost:3000/api baked into the web build
JWT_ACCESS_SECRET                      at least 32 characters
JWT_ACCESS_TTL_SECONDS=900
REFRESH_TOKEN_TTL_DAYS=30
COOKIE_SECURE=true                     false only for local http
COOKIE_SAME_SITE=lax
REFRESH_COOKIE_PATH=/api/v1/auth
SMTP_URL                               optional; smtp:// or smtps://user:pass@host:port
ALERT_FROM_EMAIL=alerts@uptime.local
APP_PUBLIC_URL=http://localhost:5000   linked from every alert
CHECK_CONCURRENCY=20                    checks one worker runs at once
RAW_CHECK_RETENTION_DAYS=30            at least 7
HEARTBEAT_URL                        optional; worker pings after each cycle
LOG_LEVEL=info
LOG_FORMAT=json                        pretty for local development
API_DOCS_ENABLED=true                  serve Swagger UI at /api/docs
TEST_DATABASE_URL                      integration tests only; must end in _test
ALLOW_PRIVATE_TARGETS=false              worker may check localhost and private networks
DEMO_SEED_ENABLED=false
```

`.env.example` holds placeholder values and lives in the repository; `.env`
never does. These are real secrets, kept server-side and never exposed to the
browser.

### Database setup and migrations

The code does not care where Postgres runs. Everything comes from
`DATABASE_URL`, so the only difference between environments is who creates
the database and who applies migrations.

| | Local | Deployed |
|---|---|---|
| Postgres | Docker Compose, or a native install | The host's managed Postgres |
| Role and database | Compose creates them from `POSTGRES_*`; a native install needs them created once by a superuser | Created by the platform |
| `DATABASE_URL` | `.env` | Platform secret, with `?sslmode=require` |
| Schema changes | `npm run db:migrate:dev` writes a migration, which is committed | `npm run db:migrate` applies committed migrations only |

Migrations run as a release step, once per deploy, before the new api and
worker start. Neither service migrates itself on boot: two services racing to
migrate is a problem, and a failed migration should stop the deploy rather than
leave a half-started process. `migrate dev` never runs against a deployed
database; it needs a shadow database and may reset data. That is also why the
local role needs `CREATEDB` and the deployed one does not.

The release step needs the Prisma CLI, which is a development dependency, so
it runs from the build image rather than the slimmed runtime image.

Every api and worker process holds its own pool of `DATABASE_POOL_SIZE`
connections. Total connections are that number times the running instances,
and it has to stay under the plan's limit with room for the release step and
an admin session.

## 7. Demo tooling

Two pieces of scaffolding, both shipped in the repository and both clearly
marked as such.

**Switchable target** — `GET /demo/target` returns 200 by default and 503, a
timeout, or a chosen status once switched by `POST /demo/target`. Public
services such as `httpstat.us` cover the same failure modes without any code,
but they cannot be switched on cue during a walkthrough. Roughly twenty lines.

**Seed script** — `npm run seed` creates a demo account with several monitors,
ninety days of `DailyStat` rows, a set of closed incidents with believable
durations and one still open. Without it the 90-day uptime bar renders ninety
empty cells on launch day and the most useful screen looks broken.

Seeded records carry a flag, the demo account is identified in the interface,
and the README states which monitors are live and which are seeded. Seeded data
should never pass for real history.

## 8. Testing

Targeted at logic that fails silently:

- **State machine** — every transition, including failure-below-threshold and
  repeated failures while already down. Pure function, trivial to test, and the
  place a bug costs most
- **Idempotency** — the same `{monitorId, scheduledFor}` processed twice
  produces one check row and one notification
- **URL guard** — loopback, private ranges, and a public URL redirecting to a
  private one
- **Rollup** — running the same day twice does not double the counts
- **Auth** — refresh rotation, and reuse revoking the family
- **Ownership** against a real Postgres: one user can never read, change,
  pause or delete another user's monitor. These run against
  `TEST_DATABASE_URL`, which must name a database ending in `_test` because the
  tests truncate it; without one they are skipped. CI starts its own Postgres
  for them, so they always run there

Controllers are not unit-tested. Frontend appearance is not tested.

## 9. TypeScript conventions

- `strict` plus `noUncheckedIndexedAccess` in `tsconfig.base.json`, extended by
  every workspace.
- `any` is not used. `unknown` at boundaries, narrowed by a guard.
- Prisma's generated types are internal. The api maps entities to DTOs from
  `packages/shared` at the service boundary; Prisma models never reach a
  controller's return type.
- Enums shared between apps live in `packages/shared` as const objects with a
  derived union type, not TypeScript `enum`.
- Job payload types are declared once in `packages/shared` and imported by both
  producer and consumer, so a producer cannot enqueue a shape the consumer
  cannot read.

## 10. Conventions

Naming, file layout, imports, error handling and the rest are set out in
`06-coding-standards.md`, and most of it is enforced by lint rather than
review.

Logs are JSON lines written by pino, one per request plus whatever the code
logs, each carrying the request's `x-request-id`. `LOG_FORMAT=pretty` makes
them readable locally; production keeps JSON so a log platform can index them.
Authorisation headers and cookies are redacted before anything is written.
