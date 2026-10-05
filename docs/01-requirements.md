# Requirements — Uptime Monitor

Version 0.1 · Draft for review

## 1. Purpose

A self-hostable uptime monitor. A user registers URLs, the system checks each
one on a schedule, records the result, and notifies the user when a monitor
changes state between up and down. A dashboard shows current status, uptime
history and response times.

This document is the testable checklist. Business rationale lives in the BRD,
user-facing behaviour in the PRD.

## 2. Scope

### In scope
- A demo target endpoint whose responses can be switched, for exercising failure paths
- A seed script producing plausible history for a demo account
- Email and password authentication
- Monitor management: create, edit, pause, delete
- Scheduled HTTP checks at a per-monitor interval
- Result storage with daily rollups for history
- Incident records opened and closed on state change
- Notifications by email and outgoing webhook
- Dashboard: status list, uptime bars, response-time chart, incident history
- Responsive layout, mobile through desktop

### Out of scope
- Status pages published to the public
- Team accounts, roles, or multi-tenancy beyond one user owning their monitors
- Routing a notification channel to a subset of monitors
- Check types other than HTTP and HTTPS — no TCP, ping, DNS or SSL expiry
- Geographic checks from multiple regions
- On-call rotation or escalation policies
- SMS or phone notifications

## 3. Locked technical constraints

Decided, and not open for revisit during implementation.

| Area | Decision |
|---|---|
| Repository | One monorepo, npm workspaces. No Nx or Turborepo |
| Applications | `apps/gateway`, `apps/api`, `apps/worker`, `apps/web`, `packages/shared`, `packages/service-registry` |
| Service discovery | API gateway as the single public entry; services register themselves in Redis |
| Backend | NestJS, TypeScript strict |
| Database | PostgreSQL via Prisma |
| Queue | BullMQ over Redis |
| Auth | JWT access token plus rotating refresh token, argon2 password hashing |
| Frontend | Vite, React, TypeScript, MUI, styled-components, React Router |
| Charts | Recharts |
| Email | SMTP through Nodemailer, provider-agnostic |
| Deployment | Docker Compose locally; gateway, api, worker, Postgres and Redis on Railway or Fly; web as a static build |
| Tests | Jest for backend, Vitest for frontend |

Frontend conventions — folder structure, constants module, theme tokens,
service layer, error boundaries — follow the patterns set out in the technical
specification.

## 4. Functional requirements

### FR-1 Accounts
- FR-1.1 A user can register with an email address and a password.
- FR-1.2 A user can sign in and receive an access token and a refresh token.
- FR-1.3 Access tokens are short-lived; refresh tokens rotate on use.
- FR-1.4 A reused refresh token invalidates the whole token family.
- FR-1.5 A user can sign out, revoking the current refresh token.
- FR-1.6 A user only ever sees their own monitors, incidents and channels.
- FR-1.7 A user can change their password, which requires the current one.
- FR-1.8 Changing a password revokes every refresh token the user holds.
- FR-1.9 A user can sign out of all sessions from one action, revoking every refresh-token family.
- FR-1.10 A user can choose whether timestamps display in UTC or their local timezone. This is a display preference held in the browser, not account state.

### FR-2 Monitor management
- FR-2.1 A user can create a monitor with a name, URL, HTTP method, check interval and request timeout.
- FR-2.2 Intervals are chosen from a fixed set: 1, 5, 15, 30 and 60 minutes.
- FR-2.3 A user can set the expected status code, defaulting to any 2xx.
- FR-2.4 A user can edit any field of a monitor.
- FR-2.5 A user can pause and resume a monitor without losing its history.
- FR-2.6 A user can delete a monitor, with confirmation; its results are deleted with it.
- FR-2.7 Only `http` and `https` URLs are accepted, validated on the server.
- FR-2.8 A monitor's schedule updates when its interval changes, with no duplicate scheduling.

### FR-3 Checking
- FR-3.1 Each active monitor is checked at its configured interval.
- FR-3.2 A check records the outcome, HTTP status code, response time and any error.
- FR-3.3 A request exceeding the monitor's timeout is recorded as a failure.
- FR-3.4 A monitor is marked down only after a configured number of consecutive failures, defaulting to two.
- FR-3.5 A monitor is marked up again on the first successful check.
- FR-3.6 A worker restart does not lose scheduled work.
- FR-3.7 A check that crashes the worker is retried a bounded number of times, then abandoned with the failure recorded.
- FR-3.8 A paused monitor is not checked.

### FR-4 Incidents
- FR-4.1 An incident opens when a monitor transitions from up to down.
- FR-4.2 An incident closes when the monitor transitions back to up.
- FR-4.3 An incident records its start, end, duration and the failure that caused it.
- FR-4.4 A monitor has at most one open incident at a time.
- FR-4.5 Incidents are listed per monitor and across all monitors.

### FR-5 Notifications
- FR-5.1 A notification is sent on state change only, never on every failed check.
- FR-5.2 A user can add email and webhook channels.
- FR-5.3 A channel can be tested with a sample payload before it is relied upon.
- FR-5.4 Webhook deliveries are signed so the receiver can verify origin.
- FR-5.5 A failed notification is retried with exponential backoff and then abandoned.
- FR-5.6 A notification is sent at most once per state change, even if the worker retries.
- FR-5.7 A user can disable a channel without deleting it.
- FR-5.8 A channel can be set to send on down events, recovery events, or both.
- FR-5.9 Every enabled channel receives alerts for every one of the user's monitors. Routing a channel to specific monitors is out of scope.

### FR-6 History and reporting
- FR-6.1 Check results are aggregated into daily per-monitor rollups.
- FR-6.2 The dashboard shows 90 days of uptime per monitor from those rollups.
- FR-6.3 Response time over a selectable window is charted from raw results.
- FR-6.4 Uptime percentage is shown for 24 hours, 7 days and 30 days.
- FR-6.5 Raw check results older than the retention window are deleted; rollups are kept.

### FR-7 Service health and staleness
- FR-7.1 Both services expose a health endpoint reporting database and Redis reachability.
- FR-7.2 A monitor whose last check is older than three of its own intervals is treated as stale.
- FR-7.3 Stale monitors render as unknown rather than keeping their last known status.
- FR-7.4 The dashboard shows how long ago checks last ran when any monitor is stale.
- FR-7.5 The worker sends a heartbeat to an external endpoint after each successful cycle, so that total failure of this system is detectable from outside it.

### FR-8 Dashboard
- FR-8.1 All monitors are listed with current status, last checked time and latest response time.
- FR-8.2 The list refreshes without a manual reload.
- FR-8.3 A monitor detail view shows its uptime bar, response chart, incidents and settings.
- FR-8.4 Status is never conveyed by colour alone.

## 5. Non-functional requirements

### NFR-1 Correctness under failure
- NFR-1.1 A check is recorded exactly once per scheduled occurrence.
- NFR-1.2 Duplicate job delivery does not produce duplicate incidents or duplicate notifications.
- NFR-1.3 Losing Redis loses scheduling, not history.
- NFR-1.4 The api remains usable when the worker is down; checks simply stop.

### NFR-2 Performance
- NFR-2.1 The system supports 100 monitors on a 1-minute interval on one worker.
- NFR-2.2 Outbound checks run with bounded concurrency; a slow target cannot starve the queue.
- NFR-2.3 Dashboard list responds in under 300ms with 100 monitors and 90 days of rollups.
- NFR-2.4 Every outbound request has a timeout. No unbounded waits anywhere.

### NFR-3 Security
- NFR-3.1 Passwords are hashed with argon2id. Plaintext is never logged or stored.
- NFR-3.2 Every monitor query is scoped by the authenticated user at the database layer.
- NFR-3.3 Request bodies are validated and stripped of unknown fields.
- NFR-3.4 Rate limits apply to authentication endpoints.
- NFR-3.5 Secrets come from the environment and are never stored in the repository.
- NFR-3.6 A user-supplied URL cannot be used to reach internal network addresses.

### NFR-4 Code quality
- NFR-4.1 TypeScript strict across all workspaces. No `any`.
- NFR-4.2 Shared request and response types live in `packages/shared` and are imported by both api and web.
- NFR-4.3 No magic values in application code; constants come from a constants module.
- NFR-4.4 Typecheck, lint and build pass in every workspace.

### NFR-5 Operability
- NFR-5.1 A seeded demo account exists, and seeded data is identifiable as such.
- NFR-5.2 Logs are structured and carry a request or job correlation id.
- NFR-5.3 The whole system starts with one `docker compose up`.

## 6. Assumptions

- A single user's own monitors; no organisation model is required.
- Check intervals of one minute or longer, so sub-minute precision is not needed.
- The demo runs at a scale where one worker is sufficient.

## 7. Open questions

- Is a public status page wanted later? It affects whether monitors need a
  visibility flag now.
- Should response-time degradation alert, or only up and down transitions?
- Retention window for raw check results: 30 days is assumed.
