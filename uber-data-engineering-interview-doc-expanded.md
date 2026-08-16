# Uber Data Platform — Big Data Architecture Interview Doc
### Exhaustive, drill-ready reference (mirrors your Netflix section's 16-tab structure)

---

## TAB 1 — START HERE

**Interview framing (say this in the first 30 seconds):**
> "I'll scope this as Uber's *data platform* — the event pipeline, streaming layer, lakehouse, warehouse, feature store, and the marketplace-analytics workloads that sit on top of it — not the real-time dispatch/matching *service* itself. Dispatch is an OLTP/low-latency systems-design problem; this is the batch+stream data backbone that makes pricing, ETA, matching quality, fraud, and finance possible."

**Platform mission**
Uber's data platform exists to turn three real-time event streams — **trip lifecycle events**, **driver GPS pings**, and **rider app events** — into:
1. Real-time signals that feed *back into* the marketplace (surge pricing, ETA, fraud scoring) within seconds.
2. Trusted historical tables for finance, city ops, experimentation, and ML training.
3. A queryable warehouse for every analyst/BI/ops team in the company.

**Requirements snapshot**
- Functional: ingest trip/location/rider events → validate/dedupe → power real-time pricing & ETA → store trusted history → serve BI, ML, finance.
- Non-functional: seconds-level freshness for surge/ETA features, with sub-second model-serving reads where required; effectively-once business outcomes for financial/trip-completion events; petabyte-scale geospatial storage; strict PII/GDPR-style deletion guarantees (rider home/work addresses, payment info).

**Scope boundary (say this explicitly)**
"I'm drawing the line at: events in → Kafka → stream + batch processing → lakehouse (Bronze/Silver/Gold) → warehouse/feature store → consumers. I'm *not* designing the matching algorithm internals or the mobile client — those are separate systems that emit events into this pipeline."

**Freshness map**
| Signal | Target freshness | Why |
|---|---|---|
| Driver GPS ping → dispatch map | ~4 seconds | Matching needs near-live driver position |
| Surge price recompute | 30–60 seconds | Balances responsiveness vs. price flapping |
| ETA model features | seconds | Directly affects UX and driver routing |
| Trip fact (Gold, official) | T+1 day (SLA by 6 AM) | Finance, city ops reporting |
| Fraud/risk score | sub-second to minutes (tiered) | Blocking fraud needs speed; deep fraud review can be batch |

**Handoff line:** "Before I estimate scale, I want to nail the requirements story so the numbers I derive next actually justify my architecture choices."

---

## TAB 2 — REQUIREMENTS & CAPACITY ESTIMATION

**Estimation story (say the math out loud):**

Assumptions (state these, don't apologize for them):
- 130M monthly active users (riders); assume roughly **25M–40M DAU** for interview estimation. Note: 30% of 130M is 39M, so use 25M only if you explicitly assume ~19% monthly-to-daily conversion
- ~6M active drivers globally, ~1–2M online concurrently at peak
- ~30M trips/day globally
- Each trip generates a **location ping every 4 seconds** for average trip duration of ~15 min (900s) → ~225 pings/trip from the driver device, plus background pings even when not on a trip (idle drivers pinging every ~4–10s too)

**Derived numbers**
- Driver GPS events: 2M online drivers × 1 ping/4s ≈ **500,000 events/sec** at global peak (this is the single largest stream by volume)
- Trip lifecycle events (request → match → arrive → start → complete → payment): 30M trips/day × ~6 events ≈ 180M events/day ≈ **~2,100 events/sec average**, spiky to 10x at peak (rush hour, city events)
- Rider app events (search, screen views, fare estimate requests): dwarfs trip events, easily **50,000–100,000 events/sec** at peak
- Total ingest: **~600K–700K events/sec at peak**, dominated by geospatial pings

**Storage math**
- One GPS ping ≈ ~200 bytes (lat/lng, driver_id, trip_id, ts, heading, speed, accuracy)
- 500K pings/sec × 200B ≈ 100 MB/sec ≈ **~8.6 TB/day** raw location data alone
- Trip facts are tiny by comparison (~2 KB/trip × 30M/day = 60 GB/day) but need to be joined against enormous location history for ETA/routing ML

**Board formulas (write only these):**
```
peak_events/sec = online_drivers × (1 / ping_interval_sec)
kafka_partitions = peak_throughput_MBps / per_partition_throughput_MBps (~10MB/s per partition)
storage/day = events/sec × avg_event_size × 86400
retention_storage = storage/day × retention_days
```

**Punchline (the system-design implication):**
> "Because driver GPS pings dominate volume by 100x over trip events, my architecture has to treat *location streaming* as a first-class, separately-partitioned, separately-tiered pipeline — not bolt it onto the trip-events topic. That's the single decision that shapes everything downstream: partition-by-geohash instead of partition-by-driver_id, aggressive downsampling/compaction for historical storage, and a dedicated low-latency path straight to the dispatch service that bypasses the lakehouse entirely."

---

## TAB 3 — EVENT SOURCES

**Source map**
| Producer | Key events | Volume tier |
|---|---|---|
| Driver app (mobile) | `location_ping`, `driver_online`, `driver_offline`, `trip_status_change` | Highest |
| Rider app (mobile) | `fare_estimate_requested`, `trip_requested`, `app_screen_view`, `rating_submitted` | High |
| Dispatch/matching service | `trip_matched`, `trip_cancelled`, `eta_recalculated` | Medium |
| Payments service | `payment_authorized`, `payment_captured`, `refund_issued` | Medium (financially critical) |
| Maps/routing service | `route_computed`, `traffic_signal_update` | Medium |
| Support/safety systems | `sos_triggered`, `support_ticket_created` | Low volume, highest priority |

**Event contract (why this matters in interview):** every event carries a canonical envelope regardless of source: `event_id` (idempotency), `event_time` (when it happened), `ingestion_time` (platform delay measurement), `trip_id`/`driver_id`/`rider_id` (join keys), `event_version` (schema evolution), `geohash` (for location-bearing events — critical partition key).

**Population flow:** raw device events → Kafka (Bronze truth) → Flink real-time enrichment (join with static reference data: city, driver tier, vehicle type) → conformed Silver events → aggregated Gold facts (trip_fact, driver_shift_fact, city_day_fact).

**Say this:** "I list sources first because Uber's hardest data engineering problem isn't storage — it's that a *single trip* is stitched together from 5+ independent producers (rider app, driver app, dispatch, payments, maps) that can arrive out of order, and my pipeline has to reconcile them into one trustworthy trip record."

---

## TAB 4 — HIGH-LEVEL ARCHITECTURE

```
[Driver App] [Rider App] [Dispatch Svc] [Payments Svc] [Maps Svc]
        \        |            |              |            /
         \       |            |              |           /
          v       v           v              v          v
                  ┌─────────────────────────────┐
                  │   Kafka (event backbone)     │
                  │  geo.location_pings          │
                  │  trip.lifecycle              │
                  │  rider.app_events            │
                  │  payments.events             │
                  └───────┬───────────┬──────────┘
                          │           │
              ┌───────────┘           └───────────┐
              v                                    v
   ┌──────────────────────┐            ┌──────────────────────┐
   │ Flink Streaming Layer │            │  Batch (Spark/Airflow)│
   │ - live driver map     │            │  Bronze→Silver→Gold   │
   │ - surge computation   │            │  daily trip_fact       │
   │ - ETA features        │            │  driver_shift_fact     │
   │ - fraud/risk scoring  │            │  finance settlement    │
   │ - sessionize trips    │            └──────────┬────────────┘
   └──────────┬────────────┘                       │
              │                                     v
              v                          ┌───────────────────────┐
   ┌────────────────────┐                │  Lakehouse (S3/HDFS + │
   │ Low-latency store    │                │  Iceberg/Delta)       │
   │ (Redis/Cassandra)    │                └──────────┬────────────┘
   │ → feeds dispatch svc │                            v
   └────────────────────┘                ┌───────────────────────┐
                                          │ Warehouse (Snowflake/  │
                                          │ BigQuery) + Feature    │
                                          │ Store (online+offline) │
                                          └──────────┬────────────┘
                                                      v
                                     BI / City-Ops dashboards / ML training /
                                     Experimentation / Finance reporting
```

**Say this:** "The architecture forks right after Kafka into two paths with very different SLAs: a streaming path that feeds *decisions back into the live marketplace* within seconds (surge, ETA, fraud), and a batch/lakehouse path that produces the *trusted historical record* used for finance, reporting, and model training. Both read the same Kafka topics — that's how I avoid two sources of truth."

---

## TAB 5 — INGESTION & KAFKA

**Event envelope (canonical, non-negotiable fields):**
```json
{
  "event_id": "uuid-...",
  "event_time": "2026-08-05T09:14:02Z",
  "ingestion_time": "2026-08-05T09:14:03Z",
  "event_version": 2,
  "trip_id": "trip-88213",
  "driver_id": "drv-4471",
  "geohash": "tdr1v",
  "payload": { "lat": 12.9716, "lng": 77.5946, "speed_kmh": 34.2 }
}
```

**Topic + partition strategy — the key interview decision:**
- `geo.location_pings` — partitioned by a **salted spatial key**, such as `city_id + H3/geohash_cell + hash(driver_id)%N`. Pure geohash partitioning gives spatial locality but can create hot partitions at airports, stadiums, and dense downtown cells. Pure driver partitioning distributes load and preserves per-driver ordering but scatters spatial work. The composite key balances both; downstream jobs can re-key by `driver_id` for trajectory logic or by spatial cell for supply aggregation.
- `trip.lifecycle` — partitioned by **trip_id**. Why: strict ordering of a single trip's state transitions (requested → matched → started → completed) matters more than geographic locality here.
- `payments.events` — partitioned by trip_id too, but with **higher replication factor (4 vs 3)** and stricter `acks=all` since these are financial records.

**Ordering & partition math:**
```
partitions_needed = peak_throughput_per_topic / per_partition_capacity(~10 MB/s)
geo.location_pings: 100 MB/s payload peak / an assumed 5–10 MB/s safe sustained throughput per partition suggests roughly 10–20 throughput partitions as a theoretical floor. In practice use materially more partitions for consumer parallelism, skew, failover headroom, and future growth; size each regional cluster independently rather than presenting “40 clusters” as a known Uber fact.
```

**Controls:**
- Late data: driver phone loses signal, ping arrives 90s late — watermark of ~2 minutes on the streaming layer, events beyond that go to a late-events side output, not dropped (used for trip reconciliation, not live dispatch).
- Dedup: `event_id` idempotency key maintained in Flink keyed state with TTL, or enforced at an idempotent sink. Avoid a synchronous Redis lookup for every event at this volume because it adds network cost and becomes a bottleneck. Kafka + checkpointed processing can provide exactly-once processing within supported boundaries, while end-to-end correctness still depends on idempotent or transactional sinks.
- Cost control: location pings get **downsampled** from 4s → 30s resolution once they age past 24 hours in the lakehouse (nobody needs 4-second-resolution GPS history from 6 months ago).

**Say this:** "Kafka topic design here is dominated by one fact: location data is spatial, trip data is transactional. I partition each stream by the key that matches its *access pattern*, not uniformly by entity ID — that's the detail that separates a junior answer from a senior one."

---

## TAB 6 — REAL-TIME STREAMING (Flink)

**Streaming jobs and what each owns:**

1. **Live Driver Map Job** — consumes `geo.location_pings`, maintains keyed state per geohash cell (H3 or S2 index), emits current driver density per cell every ~2s to a low-latency store (Redis geo-index) that dispatch queries directly. This is the *fastest* path in the whole system — location ping to "visible to dispatch" in under 5 seconds.

2. **Surge Pricing Job** — windowed (1-min tumbling) aggregation of `(open trip requests) / (available nearby drivers)` per geohash cell, feeding a supply/demand ratio into the pricing model. Recomputes every 30–60s, with hysteresis/smoothing to prevent price flapping (a naive implementation without smoothing is a classic interview follow-up trap).

3. **ETA Feature Job** — joins live traffic signals + historical route speeds + current driver position to produce features consumed by the ETA model (often served via a feature store, not computed inline).

4. **Fraud/Risk Job** — CEP-style pattern matching over rider/driver event streams: GPS spoofing detection (teleporting driver position), fake-trip patterns, payment anomaly detection. Tiered: hard blocks run in-stream (sub-second), deeper scoring runs in near-real-time batch (minutes).

5. **Trip Sessionization Job** — stitches trip lifecycle events + location pings into one coherent "trip session" object using `trip_id` as session key, handling out-of-order arrival (a `trip_completed` event can theoretically race a late `location_ping`).

**Watch-time-equivalent metric logic (Uber's version):** "active trip duration" isn't just `completed_time - started_time` — it must account for driver-paused GPS, tunnel signal loss, and app backgrounding. The rule: use the **last location ping before a >90s gap** as the effective trip end if `trip_completed` never arrives (driver app crash edge case) — this is the kind of "state machine + timeout" reasoning interviewers want to hear.

**Late data handling:** watermark-based, with a dedicated "trip reconciliation" batch job at T+1 hour that re-processes any trip whose events arrived outside the streaming watermark window, correcting the record before it's written to Gold.

**Say this:** "My streaming layer isn't one big job — it's five narrowly-scoped jobs, each owning one signal, because location processing, pricing, ETA, and fraud have completely different latency SLAs and failure-blast-radius requirements. If I merge them into one job, a fraud-detection bug now risks taking down surge pricing."

---

## TAB 7 — BATCH PIPELINES / LAKEHOUSE

**Daily DAG (Airflow):** raw Kafka → Bronze (append-only, S3/HDFS, partitioned by `event_date` and `region`) → Silver (deduped, schema-conformed, PII-hashed) → Gold (business-level facts: `trip_fact`, `driver_shift_fact`, `city_day_fact`, `payment_settlement_fact`).

**Lakehouse layout (Bronze/Silver/Gold), Uber-specific nuances:**
- **Bronze**: raw location pings kept at full 4s resolution for 7 days only (cost), then downsampled to 30s resolution for long-term retention (regulatory/legal hold requirements can extend certain regions further).
- **Silver**: `location_pings_clean` — GPS-jump-filtered (removes physically impossible speed jumps, a classic data-quality rule: if implied speed between two consecutive pings > 300 km/h, flag/drop), deduplicated by `event_id`.
- **Gold**: `trip_fact` — one row per completed trip, joining rider event, driver event, dispatch match, payment, and a *derived* route-distance/duration computed from Silver location pings (not just what the app reported — this cross-check catches fraud and app bugs).

**Quality gates before Gold publish:** row-count reconciliation against Kafka topic offsets (did we lose data?), null-rate thresholds on critical fields (`fare_amount`, `trip_distance`), referential integrity (every `trip_fact` row must have a matching `driver_shift_fact` — orphans indicate a pipeline bug, not a business event).

**Say this:** "Batch and the lakehouse own *trusted, reconciled* history. The streaming layer optimizes for speed and accepts some correction lag; batch's job is to be the record finance and legal can rely on — which is why every Gold table publish is gated behind explicit reconciliation checks against the raw Kafka offsets, not just 'the job ran successfully.'"

---

## TAB 8 — DATA MODELING: COMPLETE DIMENSIONAL MODEL

### 8.1 Modeling approach

Use a **fact constellation** rather than forcing every business process into `fact_trip`. State the grain of each fact first, use surrogate dimension keys for historical correctness, retain durable business IDs as degenerate dimensions, and distinguish additive, semi-additive, and non-additive measures.

**Recommended layers:**
- Operational/source-aligned Silver tables preserve normalized events and current entity state.
- Gold atomic facts preserve the lowest useful business grain.
- Gold aggregate facts accelerate common city, marketplace, finance, and driver dashboards.
- Dimensions provide conformed definitions reused across trips, payments, incentives, safety, support, and experimentation.

### 8.2 Bus matrix

| Business process | Primary fact | Conformed dimensions |
|---|---|---|
| Trip funnel and completion | `fact_trip` | date, time, rider, driver, city, geo, vehicle/service, trip status, acquisition channel, experiment |
| Lifecycle transitions | `fact_trip_event` | date, time, trip, event type, producer, city |
| Driver movement | `fact_location_ping` | date, time, driver, trip, city, geo, device |
| Driver availability | `fact_driver_supply_snapshot` | date, time, driver, city, geo, vehicle/service, availability status |
| Rider demand | `fact_ride_request` | date, time, rider, city, pickup geo, destination geo, service, request status |
| Match attempts | `fact_match_attempt` | date, time, trip/request, driver, rider, city, geo, match outcome |
| Pricing quotation | `fact_fare_quote` | date, time, rider, city, pickup/drop geo, service, pricing version |
| Payment ledger | `fact_payment_transaction` | date, time, trip, rider, driver, city, payment method, currency, transaction status |
| Driver earnings | `fact_driver_earning` | date, driver, trip, city, earning type, currency |
| Promotions | `fact_promotion_redemption` | date, rider, trip, city, promotion, campaign |
| Incentive progress | `fact_driver_incentive` | date, driver, city, incentive program |
| Ratings | `fact_rating` | date, trip, reviewer role, rider, driver, city |
| Safety incidents | `fact_safety_incident` | date, time, trip, rider, driver, city, incident type, severity |
| Support interactions | `fact_support_case` | date, trip, rider, driver, city, issue type, channel, resolution |
| Experiment exposure | `fact_experiment_exposure` | date, time, experiment, variant, rider/driver/city/geo, trip |

### 8.3 Atomic fact tables

#### `fact_trip` — accumulating snapshot
**Grain:** one row per trip request, including completed, cancelled, expired, and no-driver-found outcomes. This is better than “one row per completed trip” because funnel and cancellation analysis require unsuccessful requests too.

| Column group | Example columns |
|---|---|
| Keys | `trip_key`, `trip_id`, `rider_key`, `driver_key`, `city_key`, `service_key`, `vehicle_key` |
| Role-playing dates/times | `request_date_key`, `match_date_key`, `pickup_date_key`, `dropoff_date_key`; matching time keys |
| Geography | `pickup_geo_key`, `dropoff_geo_key`, `requested_h3`, `dropoff_h3` |
| Milestone timestamps | `requested_at`, `quoted_at`, `matched_at`, `driver_arrived_at`, `started_at`, `completed_at`, `cancelled_at` |
| Status | `trip_status_key`, `cancellation_reason_key`, `is_completed`, `is_scheduled_trip` |
| Pricing | `quoted_fare`, `base_fare`, `time_fare`, `distance_fare`, `surge_amount`, `surge_multiplier`, `toll_amount`, `tax_amount`, `discount_amount`, `final_fare` |
| Marketplace measures | `request_to_match_sec`, `driver_arrival_sec`, `pickup_wait_sec`, `trip_duration_sec`, `estimated_duration_sec` |
| Distance | `estimated_distance_km`, `reported_distance_km`, `gps_derived_distance_km` |
| Quality/audit | `source_event_count`, `first_event_at`, `last_event_at`, `record_version`, `is_reconciled`, `data_quality_status` |

`fact_trip` is an **accumulating snapshot**: milestones are updated as the trip progresses. Keep `fact_trip_event` as an immutable transaction fact so history is never lost.

#### `fact_trip_event` — transaction fact
**Grain:** one row per lifecycle event per trip. Columns: `event_id`, `trip_id`, `event_type_key`, event/ingestion/processing timestamps, producer key, sequence number, previous/new state, reason code, schema version, trace ID. This table is the audit trail used to rebuild `fact_trip`.

#### `fact_location_ping` — high-volume transaction fact
**Grain:** one accepted device-location observation.

Important columns: `location_event_id`, `driver_key`, optional `trip_key`, `event_date_key`, `event_time_key`, `city_key`, `geo_key/H3`, latitude/longitude in restricted storage, heading, speed, accuracy, source, app/device version, ingestion delay, `is_on_trip`, `is_valid`, anomaly reason, and map-matched road segment.

**Physical design:** partition by event date/hour and region/city; cluster/sort by H3 cell and driver ID. Do not create a relational PK index at this scale. Maintain full-resolution and downsampled tables separately.

#### `fact_ride_request`
**Grain:** one rider request attempt. Includes requests that never become trips. Measures include quoted ETA, quoted price, search-to-request latency, number of available drivers, request outcome, cancellation/expiry reason, and eventual `trip_id` when created.

#### `fact_match_attempt`
**Grain:** one dispatch offer from one ride request to one candidate driver. Measures: rank in candidate list, estimated pickup ETA, offer latency, accepted/rejected/expired outcome, rejection reason, and model/version identifiers. This enables acceptance-rate and matching-quality analysis without exploding `fact_trip`.

#### `fact_driver_supply_snapshot` — periodic snapshot
**Grain:** one driver × geo cell × snapshot interval, or preferably an aggregated geo-cell × service × interval row for analytics. Measures: online seconds, available seconds, on-trip seconds, idle seconds, accepted offers, utilization, and supply count. State clearly that summing frequent per-driver snapshots is expensive; preserve atomic state transitions and publish 1/5/15-minute aggregates.

#### `fact_fare_quote`
**Grain:** one fare quote returned to a rider for one service option. Measures: estimated fare range, ETA, surge multiplier, supply-demand ratio, pricing-rule/model version, whether selected, and quote-to-request latency. A rider can receive several service-option quotes before one request.

#### `fact_payment_transaction`
**Grain:** one payment-ledger movement, not one row per trip. A trip can have authorization, capture, adjustment, refund, chargeback, tip, and payout events.

Columns include transaction ID, parent transaction ID, trip/rider/driver keys, transaction type/status, gross amount, fee, tax, net amount, currency key, FX rate, processor reference, idempotency key, processor event timestamp, settlement date, and reconciliation status. Monetary facts should preserve original currency and a reporting-currency amount.

#### `fact_driver_earning`
**Grain:** one earning component credited/debited to a driver. Examples: base fare share, time/distance earnings, surge, tip, toll reimbursement, incentive, adjustment, tax withholding, platform commission. This separates driver economics from rider payment flows.

#### Other facts
- `fact_rating`: one rating submission; keep reviewer/subject role keys and tags.
- `fact_promotion_redemption`: one applied promotion component per trip/order.
- `fact_driver_incentive`: one driver × incentive period/program, with target, progress, earned amount, and status; optionally pair with an event fact.
- `fact_safety_incident`: one reported incident, with restricted sensitive attributes in a secured extension table.
- `fact_support_case`: one support case; for multi-step interactions add `fact_support_interaction` at message/call grain.
- `fact_experiment_exposure`: one verified exposure, distinct from assignment; include assignment unit and interference cluster.

### 8.4 Conformed dimensions

| Dimension | Type and important attributes |
|---|---|
| `dim_date` | Calendar, ISO week, fiscal period, holiday/event flags, local city date |
| `dim_time` | Second/minute/hour, daypart, rush-hour flag |
| `dim_rider` | SCD2 for segment/risk/loyalty state; tokenized rider ID, signup cohort, acquisition channel. Do not expose direct PII in analytics marts |
| `dim_driver` | SCD2 for status, tier, home city, onboarding cohort, risk band, partner/fleet association |
| `dim_vehicle` | SCD2 for make/model/year, capacity, accessibility, EV flag, service eligibility |
| `dim_service_type` | UberX-like product, category, capacity, pooling/reservation flags; avoid hardcoding product names in facts |
| `dim_city` | Country, region, timezone, currency, regulatory market, operating status |
| `dim_geo` | H3/S2 cell, parent cells at multiple resolutions, city/zone/airport/geofence mappings; SCD2 where operational zones change |
| `dim_trip_status` | Canonical status and funnel grouping |
| `dim_cancellation_reason` | Actor, controllability, standardized reason hierarchy |
| `dim_payment_method` | Method class, processor, token type; never raw card data |
| `dim_currency` | ISO currency and decimal precision; FX belongs in a dated bridge/fact |
| `dim_promotion` | Promotion mechanics, campaign, eligibility, funding owner |
| `dim_incentive_program` | Driver incentive type, target definition, funding and validity |
| `dim_experiment` / `dim_variant` | Hypothesis, owner, assignment unit, start/end, treatment metadata |
| `dim_event_type` | Canonical event taxonomy, producer, business domain, criticality |
| `dim_device_app` | OS, app version, SDK version, device class; useful for release/data-quality incidents |
| `dim_channel` | App, web, call centre, API, support channel |
| `dim_safety_incident_type` | Controlled taxonomy, severity, regulatory category |
| `dim_data_quality_rule` | Rule ID, severity, owner, effective period for quality fact tables |

### 8.5 SCD guidance

Use SCD2 only when the historical attribute affects analysis. `dim_driver`, `dim_vehicle`, `dim_rider_segment`, `dim_geo_zone`, and product eligibility commonly need SCD2. Use `effective_from`, `effective_to`, `is_current`, and a surrogate key. Resolve the dimension version using **event time**, not ingestion time. Use Type 1 for corrections such as spelling fixes. Avoid making every descriptive field SCD2 because it creates unnecessary joins and dimension explosion.

### 8.6 Bridges and special modeling patterns

- `bridge_trip_experiment`: supports multiple experiment exposures per trip.
- `bridge_driver_vehicle`: supports drivers using multiple vehicles over time, with effective intervals.
- `bridge_geo_hierarchy`: maps fine H3 cells to dynamic zones, airports, cities, and regions.
- `bridge_trip_promotion`: supports stacking multiple promotions/funding sources.
- `bridge_trip_route_segment`: maps a trip to many map-matched road segments; use carefully because it is very large.
- Mini-dimensions can isolate rapidly changing rider/driver risk or behavioural bands instead of churning the main dimensions.
- Junk dimensions can group low-cardinality flags such as scheduled, shared, airport, accessibility, and corporate-trip indicators.

### 8.7 Aggregate and semantic marts

Publish purpose-built aggregates rather than making dashboards scan atomic pings:
- `agg_city_marketplace_5min`: requests, available drivers, completed trips, cancellation rate, median ETA, surge distribution.
- `agg_geo_supply_demand_1min`: H3 cell × service × minute supply and demand.
- `agg_driver_day`: online time, active time, utilization, earnings, acceptance/cancellation rates.
- `agg_rider_cohort_week`: acquisition, activation, retention, trips, spend.
- `agg_city_finance_day`: gross bookings, discounts, refunds, tax, driver payout, platform revenue.
- `agg_route_hour`: origin-destination zone × hour travel time, distance, and ETA error.

Build a governed semantic layer defining metrics such as completed trips, gross bookings, take rate, driver utilization, ETA error, cancellation rate, and active riders. Store numerator and denominator where possible; do not average precomputed averages.

### 8.8 Key modeling interview points

- Use surrogate keys for dimension history, while keeping `trip_id`, `event_id`, and transaction IDs as degenerate business identifiers.
- Define whether timestamps are UTC and retain city-local date/time keys for operational reporting and daylight-saving correctness.
- `fact_trip` alone cannot answer unsuccessful-demand, dispatch-offer, quote, payment-ledger, or driver-state questions; those require separate grains.
- Financial values are additive by transaction but balances and active-driver counts are semi-additive snapshots.
- Late-arriving dimensions use an inferred/unknown member and are restated once the dimension arrives.
- Corrections should use MERGE/upsert into versioned lakehouse tables, with audit columns and reproducible source-event lineage.

**Say this:** "I use `fact_trip` as the accumulating business snapshot, `fact_trip_event` as the immutable audit trail, and separate transaction facts for requests, match offers, quotes, payments, earnings, and location pings. That prevents mixed grains and lets the same conformed city, geo, driver, rider, service, and date dimensions support marketplace, finance, safety, and experimentation analysis."
---

## TAB 9 — WAREHOUSE & SERVING LAYER

**Workload matrix**
| Consumer | Engine | Why |
|---|---|---|
| BI dashboards (city ops, exec reporting) | Snowflake/BigQuery (Gold tables) | Structured SQL, high concurrency, cost-predictable |
| Ad hoc data science exploration | Presto/Trino over lakehouse (Silver/Gold) | Query raw/semi-structured without warehouse ETL lag |
| Real-time ops dashboards (live driver supply per city) | Druid/Pinot (OLAP, sub-second) | Streaming-native, needs live aggregation not batch refresh |
| ML training | Offline feature store (Parquet/Iceberg on lakehouse) | Bulk read, point-in-time correctness matters most |
| Live dispatch decision | Redis/Cassandra (not warehouse at all) | Millisecond reads, warehouse is far too slow |

**Freshness matrix:** BI = next-day; real-time ops OLAP = seconds; live dispatch store = sub-second; ML training features = point-in-time correct as of trip request time (critical for avoiding data leakage).

**Say this:** "I don't force one store to serve every workload. The line I draw is: anything the *live marketplace* needs (dispatch, surge) never touches the warehouse — that's a latency and blast-radius mistake. The warehouse and lakehouse serve analysis and training, not production decisions."

---

## TAB 10 — FEATURE STORE & EXPERIMENTATION

**Online vs offline split:** Offline store (lakehouse, point-in-time joins) generates training data for the ETA/pricing/matching ML models — must guarantee no future-data leakage (a feature computed for a trip must only use data available *before* that trip's request_time). Online store (low-latency KV, e.g., Cassandra/Redis) serves the *same* features at inference time to the live dispatch/pricing service, refreshed by the streaming jobs from Tab 6.

**Experimentation:** Uber runs constant marketplace experiments (pricing algorithm variants, matching algorithm variants) at the *city* or *geohash-cell* level, not just user level — because marketplace effects are network effects (giving one rider a discount changes driver availability for other nearby riders, a classic two-sided-marketplace interference problem). Assignment logged as an event (`experiment_assignment`), joined into `fact_trip` for analysis, with exposure logging separate from assignment logging to avoid biasing results.

**Say this:** "The hard part of Uber's feature store isn't the infra — it's that experiments here have marketplace spillover effects that a naive user-level A/B test misses, so assignment often happens at the geo-cell or city level, and that assignment has to be logged as a first-class event, joined downstream like any other fact."

---

## TAB 11 — GOVERNANCE & DATA QUALITY

**Trust flow:** schema contract (Kafka schema registry, `event_version` enforced) → streaming validation (drop/quarantine malformed events) → batch reconciliation (row counts, null rates, referential checks) → certified Gold publish → catalog registration.

**Privacy ops (this is a big Uber-specific interview topic):** rider home/work addresses, precise GPS trails, and payment info are highly sensitive PII. Controls: PII fields hashed/tokenized in Silver+ layers, raw precise-location Bronze data has short retention + strict access control, "right to be forgotten" deletion requests propagate through a dedicated deletion pipeline that must touch Kafka (tombstone), lakehouse (delete + compaction), warehouse, and any derived ML feature stores — a single deletion request can fan out to a dozen systems.

**Say this:** "Because this system stores everywhere-you've-been for hundreds of millions of people, governance isn't a checkbox tab — it's an architectural constraint from day one: location data gets tokenized/downsampled aggressively, and deletion has to be a traceable pipeline, not a manual SQL delete."

---

## TAB 12 — BACKFILL & REPLAY

**Late events:** watermark + side-output pattern (Tab 6). **DLQ/quarantine:** malformed events (bad schema version, missing required fields) route to a quarantine topic, alerting on volume spikes (a spike usually means a client app release broke the event contract).

**Audited backfill:** when a bug is found in the surge-pricing computation logic (e.g., wrong smoothing window for 3 days), the fix requires **replaying Kafka from the retained offset range** through a corrected version of the Flink job into a *new* output table, validating against known-good spot checks, then atomically swapping it in — never overwriting production Gold tables in place, since finance/legal need an audit trail of what changed and why.

**Say this:** "Replay is how I recover correctness without claiming exactly-once magic solves everything — Kafka retention plus idempotent, versioned reprocessing is my actual safety net for correctness bugs."

---

## TAB 13 — CAPACITY & COST

**Scale math:** (repeat from Tab 2) ~500K location events/sec at peak dominates; ~600-700K events/sec total peak ingest; ~8.6 TB/day raw location data.

**Cost levers:**
- Location data downsampling after 24h/7d (biggest single lever — 4s → 30s resolution cuts storage ~7x for aged data)
- Regional Kafka clusters instead of one global cluster (reduces cross-region network cost, keeps EU rider data in-region for compliance too)
- Tiered storage: hot (Bronze, last 7 days, SSD-backed) → warm (Silver/Gold, S3 standard) → cold (compliance-hold data, S3 Glacier-class)
- Compute: streaming jobs autoscale by city-cluster load (Bangalore rush hour ≠ São Paulo rush hour, staggered by timezone — capacity can be shared across regions with offset peak times)

**Say this:** "Cost control here is mostly a *retention and resolution* problem, not a compute problem — location pings are the volume driver, so downsampling policy is the single highest-leverage cost decision in the whole platform."

---

## TAB 14 — FAILURES

**Failure matrix**
| Failure | Detection | Mitigation | Recovery |
|---|---|---|---|
| Kafka broker/region outage | Consumer lag alerts, partition under-replication | Failover to regional standby cluster; dispatch degrades to last-known driver positions | Replay from retained offsets once restored |
| Flink job crash mid-window | Checkpointing failure alert | Restart from last checkpoint (exactly-once state restore) | Verify no gap via watermark continuity check |
| GPS spoofing / bad client data | Anomaly detector (impossible speed/teleport) | Drop/flag at streaming layer before it reaches dispatch | Fraud review pipeline, retroactive trip flagging |
| Downstream Gold table stale (batch DAG failure) | SLA miss alert on Airflow | Serve last-good partition to BI (staleness beats wrong data) | Root-cause + backfill (Tab 12) |
| Schema-breaking client release | DLQ volume spike | Auto-quarantine, page on-call, block bad topic writer if needed | Coordinate hotfix with mobile team, replay quarantined events |

**Say this:** "For failures I always give detection → blast radius → immediate mitigation → recovery → the design change that prevents recurrence. For Uber specifically, the failure I'd lead with is GPS/location data quality, because bad location data doesn't just corrupt a dashboard — it can directly mismatch a driver and rider or break surge pricing in real time."

---

## TAB 15 — INTERVIEW Q&A (follow-ups)

**Q: Why not use one Kafka cluster globally?**
A: Latency (cross-continent replication), data residency/compliance (EU location data), and blast radius — a regional cluster failure shouldn't take down dispatch in every other city.

**Q: How do you prevent surge price flapping?**
A: Windowed aggregation with hysteresis/smoothing (e.g., exponential moving average of supply/demand ratio) rather than raw instantaneous ratio; minimum time-between-price-changes.

**Q: How is this different from designing Uber's dispatch/matching service itself?**
A: Dispatch is a low-latency OLTP/geo-indexing systems problem (think: geo-sharded service + spatial index) that *consumes* the live-driver-map signal this pipeline produces. This platform is the data backbone feeding it, not the matching algorithm.

**Q: How do you guarantee exactly-once for payment events specifically?**
A: Idempotency keys end-to-end (client-generated `event_id` carried through Kafka → Flink → payment settlement writes), `acks=all` + higher replication on the payments topic, and a nightly reconciliation job matching Kafka payment events against the payment processor's own settlement records — belt and suspenders, because money can't be "eventually correct."

**Q: What's the hardest data quality problem specific to Uber vs. Netflix-style platforms?**
A: Multi-producer event stitching under network unreliability — a single trip is assembled from independently-failing mobile devices (rider app, driver app) over cellular networks, versus Netflix where most events originate from a smaller number of well-connected server-side or CDN-adjacent producers.

**Say this framing whenever pushed:** one clear position + one concrete trade-off + the right Uber-specific technology/reasoning in the right place.

---

## TAB 16 — CHEAT SHEET

**30-second answer:**
"Uber's data platform ingests three dominant event streams — driver GPS pings (highest volume, partitioned by geohash), trip lifecycle events, and rider app events — through regional Kafka clusters. A Flink streaming layer turns raw pings into live driver-supply signals feeding dispatch and surge pricing within seconds, while a parallel batch/lakehouse path (Bronze→Silver→Gold on Iceberg/S3) produces the trusted, reconciled trip_fact history for finance, BI, and ML training. I'd deep dive on geohash-based partitioning, surge-price smoothing, or the location-data privacy/deletion pipeline."

**2-minute answer:** combine Tabs 1, 2, 4, 5, 6 above in order: scope → estimation → architecture diagram → Kafka partition strategy → streaming jobs.

**5-minute answer:** add Tabs 7, 8, 11 (batch/lakehouse, data modeling, governance/privacy).

**Formulas to have cold:**
```
peak_events/sec = online_drivers × (1 / ping_interval_sec)
kafka_partitions = peak_throughput_MBps / ~10MB/s per partition
storage/day = events/sec × avg_event_size × 86400
```

**Red-flag mistakes to avoid saying out loud:**
- Partitioning location pings by driver_id instead of geohash (kills spatial locality)
- Treating surge pricing as instantaneous ratio with no smoothing
- Letting live dispatch read from the warehouse (latency mismatch)
- Forgetting that a single trip = multiple independent, unreliable mobile producers that must be stitched
- Overwriting Gold tables in place during backfill instead of versioned/audited replace

**Print/copy takeaway:** location data volume (~500K events/sec, ~8.6 TB/day) is the platform's defining constraint — nearly every architecture decision (partitioning, downsampling, regional clusters, cost levers) traces back to that one number.

---

## TAB 17 — MISSING SENIOR-LEVEL TOPICS ADDED

### 17.1 Source ingestion beyond Kafka

Not every source is an event stream. Add CDC from operational databases for driver onboarding, vehicle registration, pricing configuration, city/service configuration, support, and finance reference data. Use Debezium/Kafka Connect or database-native CDC, preserve transaction ordering and source LSN/SCN, snapshot safely, and prevent snapshot/live-stream duplicates. Small reference dimensions may be distributed through compacted Kafka topics or periodically refreshed broadcast state.

### 17.2 Event-time state machine and reconciliation

Define the canonical trip state machine and legal transitions. Detect duplicates, regressions, impossible transitions, missing milestones, and conflicting producers. Store the winning value plus provenance. Use precedence rules—for example, authoritative payment status comes from the ledger, not the mobile app—and record corrections rather than silently replacing history.

### 17.3 Delivery semantics by workload

| Workload | Required guarantee | Practical design |
|---|---|---|
| Location telemetry | At-least-once is acceptable with dedup/last-write-wins | event ID, sequence number, TTL state |
| Trip lifecycle | Effectively-once state transition | ordered key, checkpointing, idempotent state machine |
| Payments/ledger | No double financial effect | transactional outbox, idempotency key, append-only ledger, processor reconciliation |
| Lakehouse | Reproducible and idempotent | source offsets, deterministic transforms, MERGE, atomic snapshot commit |
| BI aggregates | Correctable | versioned partitions and restatement policy |

Avoid claiming universal end-to-end exactly-once. Explain the boundary at which the guarantee holds.

### 17.4 Kafka production hardening

Add producer batching/compression, `acks=all`, idempotent producers, min in-sync replicas, rack/AZ awareness, quotas, schema registry compatibility modes, topic retention/tiering, consumer-lag targets, partition-growth strategy, and rebalancing considerations. Partition counts are constrained by throughput **and** required consumer parallelism, skew, recovery time, and broker metadata overhead.

### 17.5 Stream-processing hardening

Cover checkpoint interval and storage, savepoints, state TTL, RocksDB/state backend sizing, backpressure, skewed keys, asynchronous I/O, broadcast-state updates, side outputs, poison events, deployment upgrades, and dual-running a new job version before cutover. Define p50/p95/p99 event-time latency and maximum tolerable consumer lag, not only average freshness.

### 17.6 Lakehouse physical design

- Partition by coarse, selective fields such as event date/hour and region; avoid partitioning directly by high-cardinality IDs.
- Cluster/sort by common filters such as city/H3/trip/driver depending on table.
- Compact small files, rewrite manifests, expire snapshots, and remove orphan files.
- Handle schema evolution and partition evolution through Iceberg/Delta metadata rather than rewriting all data.
- Prevent skew during trip-to-ping joins using time/geo pruning, salting, adaptive execution, and pre-aggregated route summaries.
- Maintain source Kafka topic/partition/offset ranges and transformation version in table metadata for lineage and replay.

### 17.7 Orchestration and dependency management

Show separate DAGs for hourly reconciliation, daily finance close, dimension loading, aggregate publishing, compaction/maintenance, deletion requests, and backfills. Use data-aware dependencies or dataset sensors rather than only clock schedules. Include retries with idempotency, catch-up policy, SLA callbacks, partition-level reruns, and atomic publish from staging to certified tables.

### 17.8 Observability and SRE

Track four categories:
- **Infrastructure:** broker health, CPU, network, disk, checkpoint duration, task failures.
- **Pipeline:** ingest rate, lag, watermark delay, throughput, backpressure, retries, DLQ rate.
- **Data quality:** freshness, volume, completeness, uniqueness, validity, referential integrity, distribution drift.
- **Business reconciliation:** requests→trips funnel, completed trips→captures, captures→settlements, driver earnings→payouts.

Attach `trace_id`, `event_id`, producer version, Kafka coordinates, job version, and target snapshot ID so an incident can be traced from dashboard row back to raw event. Define SLOs and error budgets—for example, 99.9% of location events visible to the regional live map within five seconds, and 99.5% of official city-day facts published by 06:00 local time.

### 17.9 Multi-region and disaster recovery

Use region-local ingestion and processing for latency and residency. Decide whether topics are asynchronously mirrored to a paired DR region, and state expected RPO/RTO. Avoid active-active writes to the same analytical partition without conflict rules. During region failure, production dispatch may degrade to last-known positions while analytical pipelines buffer/replay; finance data should use stronger replication and reconciliation.

### 17.10 Security and privacy engineering

Add TLS in transit, encryption at rest, KMS key rotation, service identities, least-privilege topic/table access, row/column policies, dynamic masking, break-glass access, audit logs, and separate restricted-location domains. Tokenize identifiers with controlled re-identification. Maintain purpose-based retention, consent/legal basis, cross-border restrictions, legal holds, and deletion lineage. For lakehouse deletes, explain equality/position deletes followed by compaction and snapshot expiry; immutable backups may require crypto-shredding or policy-based expiry.

### 17.11 Data contracts and schema evolution

Each event contract should specify owner, description, required fields, keys, units, timezone, PII classification, expected volume, ordering assumptions, compatibility policy, deprecation period, and quality SLO. Use backward-compatible additions by default, version semantic changes explicitly, and canary mobile/app releases while monitoring schema/DLQ metrics.

### 17.12 Testing strategy

- Unit tests for parsing, state transitions, fare components, and geospatial logic.
- Contract tests against schema registry and producer samples.
- Deterministic replay tests using captured Kafka ranges.
- Integration tests with embedded/test Kafka and an isolated lakehouse catalog.
- Data-quality tests on staging partitions before atomic publish.
- Shadow/canary streaming jobs comparing key metrics and event-level samples.
- Disaster-recovery and backfill game days.

### 17.13 Metadata, lineage, and ownership

Register datasets in a catalog with owner, tier, schema, freshness, retention, lineage, quality status, and approved use. Mark certified facts and metrics. Use column-level lineage for PII/deletion impact analysis and cost attribution by team, job, topic, and table.

### 17.14 Decision trade-offs the interviewer may challenge

| Decision | Benefit | Risk / mitigation |
|---|---|---|
| Salted spatial Kafka key | spatial locality with hotspot control | loses perfect cell ordering; re-key downstream where required |
| Flink for event-time state | low latency and rich state | operational complexity; checkpoints/savepoints and narrow jobs |
| Iceberg/Delta lakehouse | atomic snapshots, evolution, replay | maintenance overhead; compaction and metadata jobs |
| Redis for live position | very low latency | memory cost and durability limits; TTL + durable replay source |
| Cassandra for online features | scale and predictable key reads | denormalized models and eventual consistency |
| Separate payment ledger fact | correct financial grain and audit | more joins; semantic mart hides complexity |

---

## TAB 18 — INTERVIEW WALKTHROUGH AND WHITEBOARD ORDER

1. Clarify whether the interviewer wants the data platform, dispatch service, or both.
2. State functional requirements, consumers, and per-output SLA/correctness needs.
3. Estimate per-stream events/sec, bytes/sec, retention, and regional skew.
4. Draw producers → regional Kafka → streaming and lakehouse forks → serving systems.
5. Deep-dive on the location partition key and hotspot mitigation.
6. Explain event-time processing, trip state machine, late events, and reconciliation.
7. Explain Bronze/Silver/Gold, physical layout, compaction, and backfill.
8. Present the dimensional bus matrix and grains, especially trip/request/match/payment/location.
9. Cover SLOs, observability, security/privacy, DR, and cost.
10. Close with trade-offs and one failure scenario end-to-end.

**Strong closing statement:**
> “The design separates telemetry, transactional lifecycle, and financial ledger workloads because they have different grains, keys, SLAs, and correctness requirements. Regional Kafka and narrowly scoped stateful stream jobs serve the live marketplace; a versioned lakehouse plus reconciliation produces trusted history; and a conformed dimensional model makes requests, trips, matching, driver supply, payments, earnings, safety, and experiments analyzable without mixing grains.”

---

## REVIEW VERDICT

**What was already strong:** scope boundary, dual streaming/batch paths, event-time and late-data awareness, reconciliation, privacy, replay, serving-store separation, and interview-ready narration.

**Important corrections made:**
- Fixed the MAU-to-DAU arithmetic ambiguity.
- Replaced universal “sub-second surge/ETA” with realistic end-to-end versus serving latency distinctions.
- Replaced pure geohash Kafka partitioning with a salted spatial strategy to address hot cells.
- Replaced per-event Redis dedup as the default with keyed stream state/idempotent sinks.
- Removed unsupported certainty around a fixed number of regional clusters.
- Expanded `fact_trip` from completed trips only to all trip requests/outcomes.
- Added separate grains for requests, match attempts, quotes, payment ledger movements, driver earnings, supply snapshots, experiments, safety, support, and ratings.

**Overall assessment:** the original document was a strong 8/10 interview document. With the corrections and added sections, it is broad enough for a senior/lead data-engineering system-design round. The next improvement would be adding one worked example showing raw events for a single trip being transformed into Silver tables, `fact_trip_event`, `fact_trip`, and payment/earning facts.

