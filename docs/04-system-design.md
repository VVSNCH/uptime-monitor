# System Design — Uptime Monitor

Version 0.1 · Draft for review

## 1. Shape of the system

Three deployable services, one database, one Redis, one static frontend.

```
   browser ──► apps/web (static, :5000)
                   │  REST + SSE
                   ▼
            apps/gateway (:3000) ◄─── looks up ───┐
                   │  /api/*                      │
                   ▼                              │
              apps/api (:3001) ──────────┐        │
               (NestJS)                  │ enqueue / schedule
                   │                     ▼        │
                   │                Redis ── BullMQ, service registry
                   │                     │        │
                   │                     ▼        │
                   │                apps/worker (:3002) ──► the monitored URLs
                   │                  (NestJS)          ──► SMTP
                   │                     │              ──► customer webhooks
                   ▼                     ▼
                     PostgreSQL (Prisma)
```

`api` owns everything a user does. `worker` owns everything a clock does.
Neither calls the other directly; the queue is the only channel between them.
`gateway` owns the public edge: it is the only thing the browser talks to, and
it does no work of its own beyond routing.

That separation is the whole justification for the architecture: a hundred
monitors on a one-minute interval is a hundred outbound HTTP requests a minute,
each of which may hang for the length of its timeout. That work cannot live in
a request handler, and once it lives elsewhere it needs a durable way to be
handed over. This is what a queue is for.

### Gateway and service registry

The browser never learns where the api runs. It calls the gateway, and the
gateway forwards `/api/*` to a live api instance, stripping the prefix. The
edge concerns live here once rather than in every service: CORS, security
headers (helmet), response compression, and the request id that follows a
request into the api's logs. The services behind the gateway are not exposed.

The gateway never parses request bodies. It streams them to the api untouched,
which keeps it cheap and means the api's validation is the only validation.

Instances find each other through a registry kept in Redis. On startup, api and
worker each write an entry under `registry:<service>` holding their address and
a timestamp, then refresh it every 5 seconds. An entry older than 15 seconds is
treated as dead and removed by whoever reads it next. A clean shutdown deletes
its own entry, so a deploy does not leave a 15-second window of bad routes. A
crash does leave one, and requests in that window get a 502 rather than
hanging.

The gateway reads the registry on each request and rotates across the live
instances. If Redis cannot be reached, it keeps routing to the instances it saw
last. Losing Redis should stop new instances from joining, not take down
routing to ones that were healthy a moment ago.

The worker registers too, although nothing is routed to it. Its entry is how
the gateway's health endpoint can say whether a worker is running at all.

Proxied requests time out after 30 seconds. The SSE stream in section 9 is the
one route that must be exempt, since it is meant to stay open, and it must also
be flushed past compression so events are not held in a buffer.

Redis was chosen over Consul or etcd because it is already a dependency. A
second piece of infrastructure to answer "which instances are alive" is not
justified for a handful of instances.

## 2. Data model

The schema lives in `packages/database/prisma/schema.prisma`; this is its
model section. Models and fields are camelCase in code and map to lowercase
snake_case in Postgres (`Monitor.lastCheckedAt` is `monitors.last_checked_at`),
so the database reads naturally from `psql` and from TypeScript alike.

```prisma
model User {
  id           Int      @id @default(autoincrement())
  email        String   @unique
  passwordHash String   @map("password_hash")
  isDemo       Boolean  @default(false) @map("is_demo")
  createdAt    DateTime @default(now()) @map("created_at")

  monitors      Monitor[]
  channels      NotificationChannel[]
  refreshTokens RefreshToken[]

  @@map("users")
}

model RefreshToken {
  id        Int       @id @default(autoincrement())
  userId    Int       @map("user_id")
  familyId  String    @map("family_id")
  tokenHash String    @unique @map("token_hash")
  expiresAt DateTime  @map("expires_at")
  usedAt    DateTime? @map("used_at")
  revokedAt DateTime? @map("revoked_at")
  createdAt DateTime  @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([familyId])
  @@index([userId])
  @@map("refresh_tokens")
}

enum MonitorStatus {
  PENDING
  UP
  DOWN
  PAUSED

  @@map("monitor_status")
}

model Monitor {
  id               Int     @id @default(autoincrement())
  userId           Int     @map("user_id")
  name             String
  url              String
  method           String  @default("GET")
  intervalSeconds  Int     @map("interval_seconds")
  timeoutMs        Int     @default(10000) @map("timeout_ms")
  expectedStatus   Int?    @map("expected_status")
  failureThreshold Int     @default(2) @map("failure_threshold")
  paused           Boolean @default(false)
  isSeeded         Boolean @default(false) @map("is_seeded")

  // Current state, written only by the worker so the list screen is one query.
  status              MonitorStatus @default(PENDING)
  consecutiveFailures Int           @default(0) @map("consecutive_failures")
  lastCheckedAt       DateTime?     @map("last_checked_at")
  lastResponseMs      Int?          @map("last_response_ms")

  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  user       User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  checks     Check[]
  incidents  Incident[]
  dailyStats DailyStat[]

  @@index([userId])
  @@map("monitors")
}

model Check {
  id           BigInt   @id @default(autoincrement())
  monitorId    Int      @map("monitor_id")
  scheduledFor DateTime @map("scheduled_for")
  checkedAt    DateTime @default(now()) @map("checked_at")
  ok           Boolean?
  statusCode   Int?     @map("status_code")
  responseMs   Int?     @map("response_ms")
  error        String?

  monitor Monitor @relation(fields: [monitorId], references: [id], onDelete: Cascade)

  @@unique([monitorId, scheduledFor])
  @@index([monitorId, checkedAt])
  @@map("checks")
}

model Incident {
  id        Int       @id @default(autoincrement())
  monitorId Int       @map("monitor_id")
  startedAt DateTime  @map("started_at")
  endedAt   DateTime? @map("ended_at")
  cause     String

  monitor Monitor @relation(fields: [monitorId], references: [id], onDelete: Cascade)

  @@unique([monitorId], map: "incidents_one_open_per_monitor", where: raw("ended_at IS NULL"))
  @@index([monitorId, startedAt])
  @@map("incidents")
}

model DailyStat {
  monitorId     Int      @map("monitor_id")
  day           DateTime @db.Date
  upCount       Int      @map("up_count")
  downCount     Int      @map("down_count")
  avgResponseMs Int?     @map("avg_response_ms")

  monitor Monitor @relation(fields: [monitorId], references: [id], onDelete: Cascade)

  @@id([monitorId, day])
  @@map("daily_stats")
}

enum ChannelType {
  EMAIL
  WEBHOOK

  @@map("channel_type")
}

// Belongs to a user, not to monitors: every enabled channel receives every
// alert that user's monitors produce.
model NotificationChannel {
  id            Int         @id @default(autoincrement())
  userId        Int         @map("user_id")
  type          ChannelType
  target        String
  secret        String?
  enabled       Boolean     @default(true)
  sendOnDown    Boolean     @default(true) @map("send_on_down")
  sendOnRecover Boolean     @default(true) @map("send_on_recover")
  createdAt     DateTime    @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("notification_channels")
}
```

Two decisions in that schema carry most of the weight.

**`Monitor.status` is denormalised.** It duplicates what could be derived from
the latest `Check`. Deriving it means a correlated subquery per monitor on the
busiest screen in the product. The duplication is deliberate and the worker is
its only writer.

Pausing does not break that rule. The api sets `paused`, a separate column it
owns, and reports a paused monitor as `PAUSED` whatever its stored status. On
resume the stored status is still the last thing the worker saw; the monitor
reads as stale until its next check confirms or replaces it, which is honest.

**`@@unique([monitorId, scheduledFor])`** is how at-most-once is enforced. See
section 4. It is also why `Check.ok` is nullable: the row is written to claim
the occurrence before the request runs, and `null` means claimed but not yet
finished. A row left `null` is a check whose worker died mid-request.

Smaller decisions:

- **One open incident per monitor** is a partial unique index on `monitorId`
  where `endedAt` is null. FR-4.4 holds even if two transitions race, because
  the database refuses the second open incident.
- **Refresh tokens** are stored as hashes, grouped by `familyId`. `usedAt` is
  the one extra column reuse detection needs (section 8).
- **Seeded data is flagged** with `User.isDemo` and `Monitor.isSeeded`, so demo
  history can never pass for real history.
- **Every relation cascades on delete.** Deleting a monitor removes its checks,
  incidents and rollups (FR-2.6); deleting a user removes everything they own.

## 3. Scheduling

Each active monitor owns one BullMQ **job scheduler** with the id
`monitor-<id>` and `every` set to its interval. BullMQ holds the schedule in
Redis and enqueues an occurrence when it is due. Schedulers are upserted by id,
so changing an interval replaces the schedule in one call; there is no window
where a monitor has two schedules or none.

Lifecycle, all handled in the api:
- Monitor created → upsert its scheduler. A new scheduler queues its first run
  straight away, so the user sees a result in seconds rather than after a full
  interval
- Interval changed → upsert again with the new interval
- Paused or deleted → remove the scheduler
- Resumed → upsert, which again runs a check straight away
- Startup, and every five minutes after → reconcile. Read active monitors from
  Postgres and schedulers from Redis; add what is missing, replace what has the
  wrong interval, remove what has no monitor. A scheduler that is already right
  is left alone, so reconciling never shifts a monitor's next check

That reconcile is what makes FR-3.6 true. Redis is treated as a cache of the
schedule, never as its source of truth; Postgres is, and the schedule can always
be rebuilt from it. It is also why a failed schedule update is logged rather
than returned as an error: the monitor change was saved, and the next reconcile
repairs the schedule within minutes. The one exception is "run a check now",
which reports a 503 when it cannot be queued, because someone is waiting on it.

The api's queue connection fails fast instead of queueing commands until Redis
returns. A request that touches the schedule while Redis is down finishes in
milliseconds with the change saved, rather than hanging.

### Why not a cron library in the api

A `@Cron` decorator running inside the api process would work until the api
runs two instances, at which point every check happens twice. Moving scheduling
into Redis makes the answer to "what happens when you scale?" a property of the
design rather than a caveat.

## 4. The check pipeline

One job, one monitor, one scheduled occurrence. The occurrence is the moment the
job was due: when it was created plus the delay it was given. A job delivered a
second time keeps both, so it maps to the same occurrence. Creation time alone
is not enough, because a scheduler creates each next job the instant the
previous one starts, and two jobs can share a creation millisecond while being
due a whole interval apart. A check run on demand has no delay, so its
occurrence is the moment it was requested.

```
job { monitorId }, stamped with scheduledFor
  │
  ├─ load monitor; if paused or deleted → discard
  ├─ INSERT Check(monitorId, scheduledFor) … ON CONFLICT DO NOTHING
  │     conflict means this occurrence already ran → stop here
  ├─ perform the HTTP request with AbortController(timeoutMs)
  ├─ UPDATE the Check row with the outcome
  ├─ evaluate the state machine (section 5)
  └─ if the state changed → enqueue a notification job
```

The insert-first ordering is the point. BullMQ guarantees at-least-once
delivery, so a job can genuinely run twice — a worker killed after performing
the request but before acknowledging will see the same job again. Claiming the
occurrence in Postgres before doing the work converts at-least-once delivery
into at-most-once effect, using a unique constraint as the lock. No distributed
lock, no Redis `SETNX`, no lease timeout.

Concurrency is bounded per worker, so one hanging target cannot occupy every
slot. Every request carries the monitor's own timeout; nothing waits forever.

### Outbound request safety

A user-supplied URL is an SSRF vector. Before any request: scheme must be
`http` or `https`, the resolved address must not be loopback, link-local or
private, and redirects are followed to a small limit with the same check
applied at each hop. Without the per-hop check, a public URL that redirects to
`169.254.169.254` walks straight past the validation.

The address check runs inside the DNS lookup the connection itself uses, not
as a separate step beforehand. Checking first and connecting second leaves a
gap: a hostname can resolve to a public address for the check and a private one
for the connection. Literal IP addresses never reach DNS, so those are checked
on the URL directly, after the URL parser has normalised forms such as
`0x7f000001` and `2130706433` to `127.0.0.1`.

`ALLOW_PRIVATE_TARGETS` turns the check off for local development, where the
thing being monitored is usually on `localhost`. It defaults to off.

## 5. The state machine

```
PENDING ── success ──► UP                           (no notification)
PENDING ── failure ──► PENDING (consecutiveFailures++)
PENDING ── failure, count reaches threshold ──► DOWN ⇒ open incident, notify

UP   ── failure ──► UP (consecutiveFailures++)
UP   ── failure, count reaches threshold ──► DOWN   ⇒ open incident, notify
DOWN ── success ──► UP                              ⇒ close incident, notify
DOWN ── failure ──► DOWN (no notification)
```

The threshold is why a single blip is silent. A monitor failing once and
recovering never reaches `DOWN`, so no incident is opened and nothing is sent.
This is FR-3.4 and SC-3, and it is the requirement that makes the product
tolerable to actually run.

Recovery is asymmetric on purpose: down needs confirming, up does not. A
service that answers is answering.

A new monitor gets the same threshold as any other. Its first failure leaves it
pending rather than declaring it down. If it is already broken when added, the
second failure opens an incident and alerts, which is what someone adding a
broken URL wants to hear.

Transitions are applied in the same transaction as the incident write, so an
open incident and a `DOWN` status cannot disagree. That transaction locks the
monitor row first: two checks of one monitor finishing together, such as a
scheduled one and a "check now", would otherwise both read the old failure
count and one failure would be lost.

An incident starts at the first failure of the run, not at the check that
confirmed it, so its duration is the real length of the outage. Its cause is
what that check reported, in plain words: `HTTP 502`, `HTTP 200, expected 401`,
`Timed out after 10000 ms`, `DNS lookup failed`.

## 6. Notifications

A second queue, consumed by the same worker process. Jobs carry ids and the
transition, never a rendered message: rendering belongs to the consumer, and a
queued job should carry facts rather than presentation.

- A status change queues one **notify** job with the id
  `incident-<id>-<transition>`. A replayed check, or anything else asking twice
  for the same change, finds that id already taken and sends nothing more
- The notify job fans out into one **deliver** job per enabled channel of the
  owner that wants this kind of event. Each delivery retries on its own,
  exponential backoff from 10 seconds, five attempts, then it is abandoned and
  logged. A dead mail server therefore never causes a working Slack channel to
  receive the same alert twice
- Finished notification jobs are kept for a week, so their ids keep blocking
  duplicates for that long

Webhooks are signed. Each delivery carries `x-uptime-timestamp` and
`x-uptime-signature: sha256=<hex>`, an HMAC-SHA256 of `<timestamp>.<raw body>`
keyed with the channel's signing secret. Signing the timestamp with the body
means a captured delivery cannot be replayed later under a new timestamp. The
secret is generated by the server, never chosen by the user. The body includes
a plain `text` line, which is what Slack shows for an incoming webhook.

A webhook URL is typed by a user exactly like a monitor URL, so deliveries go
through the same outbound guard. Redirects are not followed.

Testing a channel is a real delivery. The api queues a test job and waits up to
15 seconds for the worker's answer, so the user sees what the receiver actually
said, and delivery code still lives only in the worker.

Email is best-effort. A dead SMTP provider never blocks or fails a check. With
no `SMTP_URL` configured, an email delivery fails once with a clear reason
instead of retrying, since retrying cannot help.

Known gap: the notify job is queued just after the status change is saved. If
Redis is unreachable at that moment the alert is logged as lost rather than
retried. Closing that needs an outbox table written in the same transaction,
which is more than this phase needed.

## 7. History and retention

Raw `Check` rows are the expensive table: 100 monitors on a one-minute interval
is 144,000 rows a day. Two mechanisms keep it bounded.

- At 00:05 UTC a job folds the last three full days of checks into `DailyStat`,
  one row per monitor per day
- At 00:20 UTC raw checks from before the retention window — 30 days by
  default — are deleted, a batch at a time

The rollup recomputes each day and overwrites its row rather than adding to
it, so running a day twice changes nothing. Looking back three days instead of
one means a night the worker was down is caught up by the next. Retention can
not be set below a week, so no day is ever pruned before it has been counted.
Days are UTC calendar days throughout.

The 90-day uptime bar reads `DailyStat`, which is 90 rows per monitor. The
7, 30 and 90-day figures add up those rows; today, and any day the nightly job
has not reached yet, come from raw checks with the same query the rollup uses.
The 24-hour figure, and `uptime24h` on the monitor list, read raw checks
directly, since 24 hours does not line up with calendar days. The
response-time chart lists raw checks too, a week at most per request.

Every database session runs in UTC. The Postgres driver sends timestamps
without an offset, so a server in another time zone would store every one of
them shifted. Prisma reads them back shifted the same way and hides it, but any
SQL that groups by day would not.

This is the ordinary answer to time-series growth: roll up, then discard. It is
specified from the start rather than added once the table is already large,
because a retention policy retro-fitted to a full table is a migration.

## 8. Authentication

Two tokens, with different jobs:

- **Access token**: a JWT valid for 15 minutes, sent as `Authorization: Bearer`.
  The web app keeps it in memory only, so a page reload asks for a new one.
- **Refresh token**: 32 random bytes, valid for 30 days, stored in the database
  only as a SHA-256 hash. It travels in an `httpOnly` cookie scoped to
  `/api/v1/auth`, so scripts on the page cannot read it and the browser sends it
  nowhere else.

Each refresh token works once. Using it returns a new one in the same family,
one family per login. Presenting a token that has already been used means it
was copied, so the whole family is revoked and that login is signed out. This
is the standard detection for stolen refresh tokens and costs one extra column.

Revocation is checked across the family, not only on the presented row. Two
requests racing with the same token could otherwise both get through: one is
rejected and revokes the family while the other is still issuing its
replacement, which would survive. Checking the family closes that gap, and a
conditional update makes sure only one of two simultaneous uses can claim a
token in the first place.

Every route requires a valid access token unless it is explicitly marked
public, so an endpoint added without thinking about auth fails closed. Login and
registration are rate limited per client address, which the gateway forwards
since every request otherwise appears to come from the gateway itself.

In production the cookie needs the web app and the api on the same site, such
as `app.example.com` and `api.example.com`. Browsers increasingly refuse
cookies across sites, so a web app on one domain and an api on an unrelated one
would lose the session on reload.

Passwords are hashed with argon2id. A login for an unknown email still runs a
hash check against a decoy, so the response time does not reveal which emails
have accounts. Every monitor query is scoped by
`userId` in the repository layer, not in the controller, so a forgotten check
in one endpoint cannot expose another user's data.

## 9. Live dashboard updates

Server-sent events from api to browser, one stream per authenticated user,
carrying status changes only. SSE rather than WebSockets because the traffic is
one-directional and SSE reconnects by itself.

The worker does not hold the stream. It publishes to a Redis channel; api
instances subscribe and forward to their connected clients. Falls back to
polling on a 30-second interval if the stream cannot be established.

## 10. Knowing this system is broken

Everything above detects failures in the monitored targets. None of it detects
failure of the monitor. If the worker dies, checks stop, every monitor keeps
displaying its last known status, and the dashboard looks calm. Silence and
health are indistinguishable, which is the worst property a monitoring system
can have.

Two mechanisms, inside and outside.

**Staleness, from the inside.** The api knows each monitor's interval and its
`lastCheckedAt`. A monitor not checked within three intervals is stale: it
renders as unknown rather than as its last value, and the dashboard shows when
checks last ran. One query, and it catches the likely failure — a dead or
wedged worker — without any new infrastructure.

Three intervals rather than one, because a single missed occurrence is normal
under load and alerting on it would reintroduce exactly the noise the failure
threshold exists to prevent.

**A heartbeat, from the outside.** The worker pings an external endpoint after
each successful cycle. If the pings stop, that external service raises the
alarm. This is the only mechanism that survives total failure of this system,
including the api, and the reason is structural: nothing inside a system can
report that the system is down. Something outside has to notice an absence.

A dead-man's switch is the general name for this — the alarm fires when the
signal stops, not when a signal arrives.

## 11. Failure modes

| Failure | Effect | Behaviour |
|---|---|---|
| Worker down | No checks run | api and dashboard usable; monitors go stale and render as unknown; external heartbeat stops and raises the alarm |
| Redis down | No scheduling, no queue, no registry writes | Gateway keeps routing to the last known instances; api serves history and still saves monitor changes; "run a check now" returns 503; reconcile rebuilds the schedule and services re-register on recovery |
| Gateway down | Browser cannot reach anything | api and worker unaffected; checks and alerts continue |
| api instance crashes | Its registry entry lingers for up to 15 seconds | Requests routed to it get a 502; after expiry the gateway stops sending them there |
| Postgres down | api returns errors | Dashboard shows a service-unavailable state, not an empty list |
| SMTP down | Email alerts fail | Retried, then abandoned; webhook alerts unaffected; checks unaffected |
| Monitored target hangs | One slot occupied for its timeout | Bounded concurrency contains it; the check records a timeout failure |
| Job delivered twice | Nothing | Unique constraint on the occurrence rejects the second |

## 12. What this design deliberately does not have

No Kubernetes, no service mesh, no dedicated service registry such as Consul,
no gRPC, no event sourcing, no CQRS, no multi-region probing, no separate
notification service, no read replica, no caching layer in front of Postgres.

None of these earns its cost at this scale.
