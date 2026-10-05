# Business Requirements Document — Uptime Monitor

Version 0.2 · Draft for review

## 1. Background

The business runs a set of customer-facing web properties and internal
services. When one fails, it is currently discovered the way everyone
discovers it: a customer reports it, or someone happens to open the page. By
then the outage has been running for an unknown length of time, and afterwards
nobody can state how long it lasted.

Two costs follow from that. The first is response time — an outage found by a
customer has already done its damage. The second is that we cannot answer
questions about our own availability, either internally or when a customer
asks.

Commercial monitoring is available and capable. It is priced per monitor, which
is difficult to justify at our number of endpoints, and it places the record of
our availability inside a third-party account we do not control.

## 2. Business objective

Deliver an internal monitoring service that detects outages before customers
report them, notifies the responsible people through the channels they already
watch, and retains an accurate history of availability.

The service must be cheap enough to run that adding a monitor is never a
budgeting conversation.

## 3. Business drivers

| Driver | Why it matters |
|---|---|
| Time to detection | Detection is the first term in outage duration. Every minute before someone knows is a minute nobody is fixing it |
| Accurate incident record | Post-incident questions — internal and customer-facing — currently get estimates. They should get timestamps |
| Availability reporting | Uptime figures over 30 and 90 days are needed for internal review and for answering customer questions credibly |
| Cost that does not scale per endpoint | Per-monitor pricing discourages monitoring the thing nobody thought was important, which is usually the thing that breaks |
| Data ownership | Availability history stays on our own infrastructure |

## 4. Alerting must be trustworthy before it is fast

An alert that fires on every transient failure trains people to ignore alerts.
Once ignored, the system has negative value: it consumes attention and provides
no detection.

The service must therefore confirm a failure before declaring an outage, and
must alert only when state changes rather than on every failed check. A brief
network blip must produce silence. This is a business requirement, not a
technical preference, and it is captured as SC-3.

## 5. Success criteria

- SC-1 An outage is detected and an alert delivered within two check intervals
  of the service becoming unavailable.
- SC-2 A recovery alert states the exact duration of the outage.
- SC-3 A single failed check followed by a success produces no alert at all.
- SC-4 Incident history for any monitored endpoint can be produced for the last
  90 days, with start, end and duration.
- SC-5 Adding a new monitor takes under two minutes and requires no
  configuration outside the interface.
- SC-6 The dashboard is usable on a phone, since outages are frequently handled
  away from a desk.
- SC-7 The whole system runs on infrastructure costing under a fixed monthly
  ceiling regardless of the number of monitors.
- SC-8 Delivered within seven weeks of approval.

## 6. Stakeholders

| Stakeholder | Interest |
|---|---|
| Engineering lead | Detection time and alert trustworthiness. Approval authority on scope |
| On-call engineers | Alerts that are accurate, actionable, and arrive where they already look |
| Support | Ability to answer "was it down, and for how long?" without asking engineering |
| Engineering | Delivery within a fixed, part-time schedule |

## 7. Constraints

- C-1 One developer, part-time, across roughly seven weeks.
- C-2 Infrastructure cost at or near zero, and flat with respect to the number
  of monitors.
- C-3 Single-owner model. Team accounts and roles are not in this phase.
- C-4 Alerts must reach an existing channel — email and Slack — rather than
  requiring anyone to watch a new interface.

## 8. Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Alert noise from flapping endpoints | Alerts are ignored, and the service becomes worse than nothing | Consecutive-failure threshold before an outage is declared; notification only on state change |
| Scheduling proves unreliable — drift, duplicates, restarts | Gaps in monitoring, which is a silent failure of the product's core promise | Durable queue with reconciliation against the database on startup; occurrence-level idempotency |
| Check history grows without bound | Query performance and storage cost degrade over time | Daily rollups and a raw-data retention window, both specified from the start |
| Email deliverability | Alerts silently do not arrive | Webhook to Slack as the primary channel; email treated as secondary |
| The monitor itself goes down | Outages missed with no indication, which is the worst failure this system has | Staleness detection renders unchecked monitors as unknown rather than as their last value; an external heartbeat raises the alarm if the system stops entirely |
| Scope expands toward status pages or on-call rotation | Delivery slips well past seven weeks | Both named out of scope; additions go to a v2 list |

## 9. Out of scope

Public status pages, team accounts and roles, non-HTTP checks, multi-region
probing, escalation policies, SMS, maintenance windows, routing alerts to a
subset of monitors. Each is a separate
decision and none is required to meet the objective in section 2.

## 10. Approval

Approval of this document confirms the objective, the alerting principle in
section 4, the success criteria and the constraints. Detailed behaviour is
specified in the PRD and requires separate sign-off.
