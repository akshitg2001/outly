# Outly consumer pilot blueprint

## 1. Pilot thesis

**Job to be done:** “Turn a vague desire to go out into a feasible, bookable plan without opening six apps or coordinating over chat.”

**Initial wedge:** date nights and small friend groups (2–6 people) in a tightly bounded Bengaluru zone. These use cases occur often enough to repeat, are constrained enough to rank, and usually involve two bookable stops.

**What the pilot must prove:** not that people enjoy AI recommendations, but that a meaningful share choose a generated plan, click through to inventory, and complete at least one booking.

**Deliberate exclusions:** corporate outings, multi-day travel, transport booking, live payments, autonomous purchasing, loyalty programmes, merchant dashboards, and broad national coverage.

## 2. Product surface

### Primary UX flow

1. **Brief:** occasion, city/locality, date, start time, group size, all-in budget.
2. **Tune:** preferences (food/activity/vibe), hard constraints (dietary, accessibility, maximum travel, end time) and optional free text.
3. **Generate:** show three plans—best fit, best value and a wildcard—with estimated totals, confidence, travel and availability freshness.
4. **Inspect:** expand a plan into its timeline, costs, reasons, trade-offs, cancellation terms and booking source for each stop.
5. **Commit:** user either opens each partner link or selects “Book for me.” The latter always shows a final review and requires explicit confirmation.
6. **Resolve:** track each item as booked, failed or awaiting user action. Never claim the outing is booked until every supplier confirmation is recorded.
7. **Learn:** after the outing, ask one tap (“Would you choose this again?”) plus optional issue tags.

### Sample screens

**Screen A — Planner:** a compact left-hand brief with usable defaults. Results remain visible on the right so users can adjust inputs without restarting.

**Screen B — Three-plan comparison:** cards share the same anatomy: concept, two-stop timeline, estimated total, walking/drive time, freshness, fit score and one explicit trade-off. Avoid opaque “AI magic.”

**Screen C — Plan detail:** chronological itinerary, venue evidence, cost range, alternatives for each stop, booking links and a sticky “Review booking” action.

**Screen D — Confirmation:** supplier, date/time, party size, price ceiling, cancellation rule, payment method and consent. Confirmation must be itemised, not a blanket permission.

**Screen E — Booking status:** one state per item (`ready`, `pending`, `confirmed`, `failed`, `refunded`) with recovery actions. A partial booking is prominently labelled.

### Critical states

- **No feasible plan:** explain which hard constraint caused the failure and offer one-click relaxations.
- **Stale inventory:** recheck before redirect/confirmation; show when availability was last verified.
- **Budget uncertainty:** display a range and a confidence label; never present restaurant spending as a guaranteed price.
- **Supplier failure:** preserve successful bookings, present substitutes for the failed stop, and require confirmation again.
- **Sponsored plan:** label at card and detail level; ranking eligibility still requires all hard constraints.

## 3. Product architecture

```text
Responsive web client
  ├─ brief + constraints
  ├─ plan comparison / plan detail
  └─ booking review / status
          │
          ▼
Application API
  ├─ input validation + consent
  ├─ orchestration and idempotency
  ├─ event instrumentation
  └─ user/session state
          │
          ├──────────────┬────────────────┬─────────────────┐
          ▼              ▼                ▼                 ▼
Candidate service   Plan ranker      Booking adapters   Notification service
  ├─ merchant feed    ├─ hard filter    ├─ deep links      ├─ email/WhatsApp
  ├─ places search    ├─ itinerary      ├─ partner APIs    └─ post-outing survey
  └─ editorial seed   └─ scoring        └─ payment gateway
          │              │                │
          └──────────────┴────────────────┘
                         ▼
              Postgres + job queue + analytics
```

### Component responsibilities

| Component | Pilot implementation | Scale-up boundary |
|---|---|---|
| Web client | Responsive React app; anonymous session | Native app only after repeat use is proven |
| Application API | Single service with typed endpoints | Split only when booking volume creates operational need |
| Catalogue | Seeded venue/activity table plus scheduled freshness checks | Direct merchant/aggregator feeds |
| Recommendation | Deterministic filter and score, with LLM used only for explanation and theme naming | Learning-to-rank after sufficient labelled outcomes |
| Booking | Outbound deep links with click tracking | Direct booking adapter per partner |
| Payment | Mock confirmation in demo; test-mode checkout only when merchant-of-record model is clear | Live gateway with reconciliation, refunds and support |
| Analytics | Event table + product dashboard | Warehouse when volume warrants it |

### External-data guardrails

If Google Places is used, store durable `place_id` references and your own licensed/merchant-supplied attributes; Google restricts storage of Places content beyond stated exceptions and requires attribution. See [Google Places policies](https://developers.google.com/maps/documentation/places/web-service/policies).

For payments, create the order server-side, verify the returned signature, confirm captured/paid status, and use webhooks for recovery. Razorpay documents these as core requirements for Standard Checkout. See [Razorpay integration steps](https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/integration-steps/) and [best practices](https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/best-practices/).

## 4. Data model

### Core entities

| Entity | Key fields | Notes |
|---|---|---|
| `users` | `id`, `phone_hash`, `created_at`, `consent_version` | Anonymous sessions first; minimise PII |
| `planning_sessions` | `id`, `user_id?`, `occasion`, `location`, `starts_at`, `party_size`, `budget_paise`, `status` | One generation attempt |
| `preferences` | `session_id`, `category`, `value`, `weight`, `is_hard_constraint` | Allows hard/soft distinction |
| `venues` | `id`, `name`, `category`, `lat`, `lng`, `source`, `external_place_id`, `quality_status` | First-party canonical record |
| `offers` | `id`, `venue_id`, `supplier`, `price_min_paise`, `price_max_paise`, `booking_url`, `available_from/to`, `checked_at` | Inventory snapshot, not venue truth |
| `plans` | `id`, `session_id`, `archetype`, `score`, `estimated_min/max_paise`, `rank`, `sponsored` | Generated option |
| `plan_items` | `id`, `plan_id`, `venue_id`, `offer_id?`, `sequence`, `starts_at`, `duration_min`, `travel_min`, `estimated_cost_paise` | Timeline stop |
| `booking_intents` | `id`, `plan_id`, `status`, `price_ceiling_paise`, `confirmed_at`, `idempotency_key` | User-authorised scope |
| `bookings` | `id`, `intent_id`, `plan_item_id`, `supplier_ref`, `status`, `amount_paise`, `failure_code` | Item-level state |
| `events` | `id`, `session_id`, `user_id?`, `name`, `properties_json`, `occurred_at` | Funnel analytics |
| `feedback` | `plan_id`, `selected`, `booked`, `attended`, `rating`, `issue_tags` | Ranking labels |

### Invariants

- Monetary values use integer paise; time is stored in UTC with venue timezone retained.
- `booking_intents` are immutable after confirmation; any supplier/price change creates a new intent.
- All booking writes require an idempotency key.
- `plans.sponsored = true` cannot bypass hard constraints or availability checks.
- Supplier content carries `source`, `checked_at` and any required attribution.

## 5. Recommendation logic

### Stage 1 — candidate retrieval

Retrieve 30–80 venue/activity candidates within the locality radius and time window. Expand only if the feasible set is too small. Candidate sources in pilot order: merchant-confirmed seed list, bookable supplier offers, then compliant places metadata.

### Stage 2 — hard filters

Reject candidates that violate opening hours, capacity, date/time, party size, dietary/accessibility requirements, maximum travel, age restrictions or absolute budget ceiling. A sponsored candidate faces the same filter.

### Stage 3 — itinerary construction

Build two- or three-stop combinations using compatible categories and realistic transition time. Reserve 10–15% of budget as uncertainty buffer. Penalise backtracking and plans that require an unbookable “anchor” activity.

### Stage 4 — scoring

For each feasible plan, normalise sub-scores to 0–1:

```text
score = 0.26 preference_fit
      + 0.18 occasion_fit
      + 0.16 availability_confidence
      + 0.14 budget_fit
      + 0.10 distance_efficiency
      + 0.08 quality_confidence
      + 0.05 novelty
      + 0.03 bookability
      - risk_penalties
```

`risk_penalties` cover stale availability, uncertain prices, excessive transfers, correlated supplier failure and incomplete accessibility data. Sponsorship is never a positive relevance feature; it is applied only after organic eligibility and must be disclosed.

### Stage 5 — diversity and explanation

Apply maximal marginal relevance so the top three are meaningfully different, not small variations of the same plan. Return:

- **Best fit** — highest score.
- **Best value** — lowest cost among plans within 90% of the top score.
- **Wildcard** — high fit with a distinct activity/vibe.

Generate the title and explanation from structured evidence only. The language model does not invent venue facts, prices or availability.

### Cold-start learning loop

Start with explicit weights and qualitative founder review of failed sessions. Once there are at least a few hundred completed planning sessions, fit simple coefficients against `plan_selected` and `booking_completed`; do not jump to a complex model before the funnel produces reliable labels.

## 6. API contract for the pilot

```text
POST /v1/planning-sessions
POST /v1/planning-sessions/{id}/generate
GET  /v1/planning-sessions/{id}/plans
GET  /v1/plans/{id}
POST /v1/plans/{id}/booking-intents
POST /v1/booking-intents/{id}/confirm
GET  /v1/booking-intents/{id}
POST /v1/events
POST /v1/plans/{id}/feedback
```

Generation returns structured plan data first; polished explanatory copy is a secondary field. Booking confirmation requires the exact plan-item IDs, total ceiling, cancellation acknowledgement and a short-lived confirmation token.

## 7. Prototype-to-pilot implementation plan

### Week 0 — decisions (2–3 days)

- Choose one 5–8 km Bengaluru zone and two use cases.
- Define 60–100 seed venues/activities and a minimum evidence standard.
- Select one outbound booking source per category; do not promise API booking until commercial access is confirmed.
- Create event taxonomy and success thresholds before recruiting users.

### Week 1 — clickable transaction prototype

- Finish planner, three-plan comparison, plan detail and booking-review states.
- Use realistic seeded offers and labelled demo availability.
- Add outbound links with `supplier`, `plan_id`, `item_id` and campaign parameters.
- Conduct 8–10 moderated tests; fix comprehension and trust failures.

### Weeks 2–3 — functional concierge-free MVP

- Implement session API, catalogue, deterministic ranker and event stream.
- Add admin-only catalogue import and freshness checks; this is back-office QA, not live planning.
- Connect compliant place lookup and one tracked booking-link adapter.
- Add empty, stale, partial-booking and failure states.

### Weeks 4–5 — closed beta

- Recruit 75–150 users through one community/channel.
- Run two weekends; review funnel and failed-plan samples daily.
- Keep payments mocked or in gateway test mode until supplier fulfilment, cancellations and liability are settled.
- Interview both converters and non-converters within 24 hours.

### Week 6 — investor evidence pack

- Cohort funnel, repeat behaviour, customer interviews, supplier coverage map and unit-economics scenarios.
- Screen recording of generation → supplier click → confirmed booking.
- Product roadmap tied to observed bottlenecks, not a generic feature list.
- Commercial evidence: written partner interest or at least a verifiable route to tracked attribution.

## 8. VC-validation scorecard

### North-star metric

**Booked outings per 100 qualified planning sessions.** A qualified session has feasible inputs and views generated results.

### Funnel events

`session_started` → `brief_completed` → `plans_generated` → `plan_opened` → `plan_selected` → `booking_link_clicked` → `booking_reported/verified` → `outing_attended` → `repeat_session_started`

### Pilot thresholds (decision rules, not market benchmarks)

| Metric | Weak | Continue testing | Strong enough for a seed conversation |
|---|---:|---:|---:|
| Brief completion | <45% | 45–65% | >65% |
| Generated-plan selection | <20% | 20–35% | >35% |
| Any booking-link click / qualified session | <12% | 12–25% | >25% |
| Verified booking / qualified session | <5% | 5–12% | >12% |
| 30-day repeat among eligible users | <8% | 8–18% | >18% |
| “Would be disappointed” without product | <20% | 20–35% | >35% |

Do not pitch a large market from usage alone. Investors will ask whether the product changes transaction behaviour and whether the resulting revenue can exceed acquisition and support costs.

### Unit-economics worksheet

```text
expected revenue / session
  = booking conversion
  × average transacted value
  × realised take rate

contribution / session
  = expected revenue
  - catalogue/API cost
  - model cost
  - payment cost (if applicable)
  - refunds/support loss
  - attributable acquisition cost
```

Run low/base/high scenarios. Affiliate revenue should be treated as unproven until actual tracked payouts or a signed partner term sheet exist.

## 9. Go/no-go gates

**Go:** users repeatedly select and transact; the catalogue can stay fresh without live human planning; at least one scalable attribution/booking relationship is credible.

**Iterate:** users like plans but do not click/book. Diagnose trust, availability, price uncertainty and supplier handoff before adding categories.

**No-go/pivot:** high engagement with low repeat and low booking after two or three focused iterations. That indicates entertainment value, not a transaction product.

## 10. Current demo status

Implemented locally: branded responsive planner, six core inputs, preference and constraint tuning, loading state, three distinct sequenced plans, fit and budget signals, transparent rationale and trade-offs, tracked partner-link handoffs, plan detail, itemised booking review, explicit consent, simulated payment processing and item-level confirmation states.

The prototype uses labelled demo inventory and mock payment details. No supplier availability is claimed and no money is charged.
