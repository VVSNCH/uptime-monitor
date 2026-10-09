# Product Requirements Document — Uptime Monitor

Version 0.1 · Draft for review

## 1. Product summary

A web application that watches your websites and APIs and tells you when they
break. Add a URL, pick how often to check it, and choose where alerts go. The
dashboard shows what is up right now, how reliable each thing has been, and how
long past outages lasted.

## 2. Target user

A developer or small technical team running a handful of services. They are
comfortable with URLs, status codes and webhooks. They do not want to configure
a monitoring platform; they want to add five URLs and stop thinking about it.

## 3. User stories

### Getting started
- As a developer, I want to register and add my first monitor in under two minutes.
- As a developer, I want the first check to run immediately so I know it works.

### Monitors
- As a developer, I want to set how often each URL is checked, because a marketing site and a payments API do not need the same attention.
- As a developer, I want to set a timeout, because slow is a kind of down.
- As a developer, I want to pause a monitor during planned maintenance rather than delete it.
- As a developer, I want to say which status code counts as healthy, because some endpoints legitimately return 401 or 302.

### Knowing
- As a developer, I want to see everything's status on one screen.
- As a developer, I want to be told when something goes down, and told again when it recovers.
- As a developer, I want a brief blip to not wake me up.
- As a developer, I want alerts in Slack, not only email.

### Afterwards
- As a developer, I want to know exactly how long an outage lasted.
- As a developer, I want to see whether a service is getting slower over weeks.
- As a developer, I want an uptime percentage I can quote.

## 4. Screens

### S-1 Sign in and register
Two minimal screens. Email and password, one clear error treatment, a link
between them. No social login, no email verification in v1.

### S-2 Monitors dashboard
The home screen. A list of monitors, one row each:
- Status indicator — up, down, or paused — carrying a shape or label, never colour alone
- Name and URL
- Last checked, as relative time
- Latest response time
- A compact 24-hour sparkline

A summary bar across the top: how many are up, how many down, and whether any
incident is currently open. When checks have stopped running, the bar is
replaced by a staleness notice — "checks last ran 14 minutes ago" — and every
status indicator becomes unknown. Showing a stale UP is worse than showing
nothing, because it is a confident claim that happens to be false.

With no monitors yet, an empty state explains the product in one line and
offers the create action.

### S-3 Create and edit monitor
A dialog. Name, URL, method, interval as a select, timeout, expected status.
Validation is immediate and specific — a bad URL says what is wrong with it,
not "invalid".

The interval defaults to 5 minutes. One minute stays available, but as a
deliberate choice for the endpoints that matter most rather than the default
for everything.

### S-4 Monitor detail
The screen a user opens during an outage, so the current state comes first:
- Header: current status, uptime for 24 hours, 7 days and 30 days
- 90-day uptime bar, one cell per day, hoverable for that day's figures
- Response-time chart over a selectable window
- Incident list for this monitor, newest first, each with duration and cause
- Settings, reachable but not competing for attention

### S-5 Incidents
All incidents across all monitors, newest first. Filterable to open only. This
is the screen someone opens on Monday to ask what happened over the weekend.

### S-6 Notification channels
List of channels with type, target and enabled state. Add, test, disable,
delete. The test action sends a real sample payload and reports what came back
— a channel you have not tested is a channel you do not have.

### S-7 Settings
Four things, each already present in the system rather than invented for the
screen:

- **Account** — the signed-in email, shown but not editable in v1
- **Password** — current password, new password, with the same strength rule
  as registration. On success, a notice that other sessions have been signed out
- **Sessions** — "Sign out of all devices", with a confirmation. Useful on its
  own and the visible face of refresh-token revocation
- **Timezone** — a toggle between UTC and local time for every timestamp in the
  interface. Stored in the browser, because it changes nothing on the server

No theme switch in v1. The interface follows the operating system.

## 5. Notification content

An alert answers three questions in its first line: what, since when, and why.

```
DOWN  api.example.com
Started 14:32 UTC · HTTP 502 after 2 consecutive failures
```

Recovery alerts state the duration, because that is the number people want:

```
UP  api.example.com
Recovered 14:51 UTC · Down for 19 minutes
```

Webhook payloads carry the same information as JSON, with a signature header.

## 6. Empty, loading and error states

Every list has a designed empty state with an action. Every data view has a
skeleton matching its final layout. A monitor with no checks yet says "waiting
for first check" rather than showing zero percent uptime, which would be a lie.

An api that cannot reach the database returns a clear failure; the dashboard
says the service is unavailable rather than rendering an empty list, which
would read as "everything is fine".

## 7. Responsive behaviour

| Breakpoint | Layout |
|---|---|
| Below 600px | Monitor rows become cards. Uptime bar scrolls horizontally. Charts drop to a reduced height |
| 600px to 900px | Single column, full-width cards, summary bar wraps |
| Above 900px | Table-style rows, summary bar inline, detail view two columns |

## 8. Out of scope for v1

Public status pages, team accounts, maintenance windows, SSL expiry checks,
multi-region probes, escalation, SMS, response-body assertions. Each was
considered and left out on purpose.

The first candidate for later is the heartbeat monitor: instead of us visiting
a URL, a scheduled job or background service pings us when it runs, and an
alert fires when the pings stop. It covers things that have no URL to visit,
such as nightly backups.

## 9. Acceptance

The product is accepted when a new user can register, add a monitor, receive a
down alert when that URL is taken offline and a recovery alert when it returns,
and afterwards read the exact duration of the outage — on both a laptop and a
phone.
