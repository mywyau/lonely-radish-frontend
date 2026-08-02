# Scalability roadmap

This document tracks the work needed to grow Lonely Radish from its current serverless monolith into an application that can support millions of registered accounts. It is a living delivery plan, not a claim that the application already supports a particular load.

Keep the monolith while it remains the simplest reliable option. Optimise measured bottlenecks before introducing independently deployed services.

## Capacity language

"Millions of users" can describe very different systems. Every capacity decision and test result must state all of the following:

- Registered accounts and retained rows
- Monthly and daily active users
- Peak concurrent sessions
- Requests and writes per second
- Data volume used during the test
- Expected traffic mix

Initial planning target:

| Measure | Target |
| --- | ---: |
| Registered accounts | 1,000,000 |
| Daily active users | 100,000 |
| Peak concurrent sessions | 10,000 |
| Peak API traffic | Establish from an authenticated staging test |
| Availability objective | 99.9% monthly |
| Interactive API latency | p95 below 500 ms, p99 below 1 s |
| Interactive API error rate | Below 1%, excluding expected 4xx responses |

These are engineering targets and must be revised when real usage data exists.

## Status key

- `Not started`: agreed work has not begun
- `In progress`: implementation or measurement is underway
- `Blocked`: an external dependency or decision is required
- `Complete`: implemented, tested, deployed, and verified under representative load

## Current foundations

The application already has several useful scaling foundations:

- Serverless-compatible PostgreSQL connection pooling
- Cursor pagination on discovery and list endpoints
- Bounded active matches and received-interest inboxes
- Batched signed-photo URL generation and stored thumbnails
- Redis-backed rate limiting and online presence
- Transactional outbox delivery with leases and dead-letter handling
- Batched notification email processing
- `FOR UPDATE SKIP LOCKED` worker coordination
- OpenTelemetry hooks for PostgreSQL queries and pool waits

These reduce risk, but they do not replace authenticated load tests against realistically sized data.

## Prioritised work

### P0 — establish and protect the current ceiling

| ID | Status | Change | Definition of done |
| --- | --- | --- | --- |
| SCALE-001 | Not started | Add authenticated k6 journeys for app bootstrap, discovery, profile viewing, interests, matches, planning, and notifications. | Tests use isolated staging accounts, report metrics per endpoint and journey, and can run smoke, load, stress, and soak profiles without touching production. |
| SCALE-002 | Not started | Create a repeatable large staging dataset generator. | Staging can be populated with at least 100k synthetic profiles and representative interests, matches, proposals, and notifications; generated accounts cannot send real email or incur Stripe charges. |
| SCALE-003 | Not started | Define dashboards and alerts for request latency/error rate, PostgreSQL query duration and pool wait, active connections, Redis latency/request volume, serverless duration, and worker backlog. | A staging load run can be correlated across API, database, Redis, and workers; alerts map to the stated service objectives. |
| SCALE-004 | Not started | Record a versioned baseline under representative authenticated load. | The repository records commit, dataset size, traffic model, achieved RPS, concurrency, p50/p95/p99, error rate, and first saturation signal. |

### P1 — remove known hot paths

| ID | Status | Change | Definition of done |
| --- | --- | --- | --- |
| SCALE-101 | Not started | Profile and optimise activity discovery. Replace calculated-age predicates with date-of-birth ranges, validate query plans, and add only evidence-backed indexes. | Discovery remains within the latency objective on the large staging dataset and query plans avoid broad profile scans. |
| SCALE-102 | Not started | Remove the per-candidate pending-interest `COUNT(*)` from discovery. Maintain inbox capacity atomically as derived state. | Discovery does not count a candidate's inbox rows; concurrency tests prove the five-interest limit cannot be exceeded. |
| SCALE-103 | Not started | Reduce navigation request amplification. Return session/user/role/counters in one bootstrap response and stop recounting on every route change. | A normal client-side navigation makes no unconditional database count request; counters update after relevant actions or a controlled refresh. |
| SCALE-104 | Not started | Optimise matches and notification counters. Consolidate related queries and add participant/status indexes supported by `EXPLAIN ANALYZE`. | Loading matches avoids unnecessary full counts and meets the latency target on representative history. |
| SCALE-105 | Not started | Bound date reminder work. Claim a small batch, commit promptly, then enqueue the next batch when work remains. | No invocation handles an unbounded result set or holds locks during an entire backlog; retries are idempotent. |
| SCALE-106 | Not started | Replace multi-request Redis rate limiting with one atomic operation or supported limiter. Pipeline presence operations where appropriate. | One logical rate-limit decision uses one atomic Redis operation and expiry cannot be lost after incrementing. |
| SCALE-107 | Not started | Cache or prerender public pages at the edge while keeping authenticated responses private. | Homepage, FAQ, and legal pages are served from cache; personalised pages and APIs retain `private, no-store` behaviour. |

### P2 — prepare data growth

| ID | Status | Change | Definition of done |
| --- | --- | --- | --- |
| SCALE-201 | Not started | Define retention and archival rules for notifications, resolved interests, idempotency records, outbox events, audit history, and completed worker jobs. | Every append-heavy table has a documented retention policy, cleanup process, supporting index, and restoration/audit position. |
| SCALE-202 | Not started | Add production-safe database performance checks. Track slow queries, index usage, table/index growth, vacuum health, and pool saturation. | Scheduled reports expose regressions before user-facing latency increases. |
| SCALE-203 | Not started | Introduce cached or stored counters for unread notifications and other frequently displayed aggregates. | Counter changes are transactional or event-driven, repairable from source data, and tested for drift. |
| SCALE-204 | Not started | Evaluate read replicas for read-heavy workloads after primary-query optimisation. | A measured workload demonstrates the need; replica consistency requirements and read routing are documented and tested. |
| SCALE-205 | Not started | Partition only append-heavy tables whose measured size or maintenance cost warrants it. | Partitioning is supported by measured evidence, automated creation/retention, and tested migrations—not account count alone. |

### P3 — scale discovery and asynchronous processing independently

| ID | Status | Change | Definition of done |
| --- | --- | --- | --- |
| SCALE-301 | Not started | Build asynchronously refreshed discovery candidate sets using compatibility and geographic buckets. | Interactive discovery reads a bounded candidate set while source-of-truth eligibility is rechecked before an interest is accepted. |
| SCALE-302 | Not started | Remove popular-recipient lock contention from the full interest transaction. Reserve inbox capacity atomically and keep pair creation idempotent. | A hot-profile stress test remains responsive and never overfills the inbox or creates duplicate interests/matches. |
| SCALE-303 | Not started | Give email, reminders, outbox delivery, image processing, and account deletion explicit queue concurrency and backpressure controls. | Each worker has a bounded batch, retry policy, dead-letter path, backlog metric, and independent concurrency limit. |
| SCALE-304 | Not started | Split a workload into a separate deployment only when measurements show independent scaling or failure isolation is needed. | The decision record identifies the bottleneck, ownership boundary, consistency model, migration plan, and rollback strategy. |

## Immediate implementation sequence

Work through the next milestones in this order:

1. `SCALE-001` and `SCALE-002`: obtain a trustworthy authenticated baseline with realistic data.
2. `SCALE-101` and `SCALE-102`: improve discovery, currently the most complex read path.
3. `SCALE-103` and `SCALE-104`: reduce database work generated by ordinary navigation.
4. `SCALE-105` and `SCALE-106`: make background work and Redis usage safely bounded.
5. `SCALE-107`: move public traffic away from application compute.
6. Run the same load profiles again and record the comparison before beginning P2.

## Load-test profiles

All profiles must use staging, synthetic accounts, test-mode Stripe configuration, and email suppression or an allowlist.

### Smoke

- One to three virtual users
- Verifies scripts, authentication, checks, and test-data isolation
- Run on every material performance-test change

### Load

- Expected near-term peak traffic
- Runs long enough to include warm and steady-state behaviour
- Must satisfy the service objectives without a growing worker backlog

### Stress

- Increases traffic gradually until an objective fails
- Records the first exhausted resource rather than only the maximum virtual-user count
- Must not be run against production without explicit approval and safeguards

### Soak

- Sustained expected traffic for several hours
- Looks for connection leaks, memory growth, table growth, retry accumulation, and latency drift

Use weighted journeys rather than hitting every endpoint equally. Until production telemetry provides a better model, begin with discovery and profile reads as the majority of traffic, with smaller proportions of interests, matches, planning, and notification actions.

## Verification checklist for each scaling change

- Correctness tests cover concurrency and idempotency where relevant.
- Database changes include a forward-only migration and rollback/mitigation notes.
- Query changes are compared using `EXPLAIN (ANALYZE, BUFFERS)` on staging-like data.
- Before/after load results use the same dataset and traffic profile.
- No production data, real payments, or unrestricted email delivery is involved.
- Observability can identify the endpoint, query, dependency, or worker responsible for a failure.
- Operational cost is recorded alongside latency and throughput.
- This roadmap is updated with status, evidence, and any follow-up work.

## Baseline record template

Create one record per meaningful performance run:

```text
Date:
Commit:
Environment:
Dataset: accounts / profiles / interests / matches / notifications
Test profile and journey weights:
Duration:
Peak virtual users:
Achieved requests per second:
Latency p50 / p95 / p99:
Error rate:
PostgreSQL pool wait and active connections:
Redis latency and request count:
Worker backlog before / after:
First saturation signal:
Grafana run URL:
Notes and next action:
```

## Updating this roadmap

When work begins, change its status to `In progress`. Mark it `Complete` only after deployment to staging and verification under the relevant load profile. Link the pull request, migration, dashboard, and baseline record beside the item or in a short note immediately below its table.
