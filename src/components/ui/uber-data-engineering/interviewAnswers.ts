export type InterviewAnswer = {
  answer: string;
  tradeoff: string;
  validation: string;
};

export const UBER_INTERVIEW_ANSWERS: Record<string, InterviewAnswer> = {
  "design-trip-pipeline": {
    answer:
      "I would define immutable trip lifecycle events first, key them by trip_id in regional Kafka, and use an event-time stream processor to build the current trip state. The same events land unchanged in Bronze; Silver validates and deduplicates them, and Gold publishes reconciled trip facts.",
    tradeoff:
      "The real-time projection is intentionally provisional. It must not become the financial source of truth because mobile events can be late, duplicated, or contradicted by payment and settlement systems.",
    validation:
      "I would replay one request through match, arrival, pickup, completion, payment, and cancellation paths. I would verify legal state transitions, duplicate handling, p95 event-time latency, source-offset lineage, and agreement between the online projection and the reconciled trip fact.",
  },
  "gps-ingestion": {
    answer:
      "I would terminate authenticated mobile traffic at regional gateways, encode pings compactly, batch small sends where latency allows, and write to region-local Kafka. A salted city + H3 key supports spatial aggregation while spreading dense cells; downstream jobs can re-key by driver when per-driver ordering is required.",
    tradeoff:
      "Spatial locality and even partition load conflict. Pure H3 creates hot partitions, while pure driver_id forces expensive shuffles for supply calculations, so the key needs bounded salting and monitored skew.",
    validation:
      "I would state the capacity assumption rather than present it as an Uber fact: 2M concurrently online drivers at 1 ping per 4 seconds implies about 500K driver pings/sec. Then I would load-test peak city skew, retry amplification, payload bytes, broker bandwidth, and consumer lag.",
  },
  "self-service-platform": {
    answer:
      "I would separate a control plane from workload execution. The control plane owns dataset registration, schemas, policy, lineage, quality rules, and templates; teams own domain contracts and run on approved Kafka, Flink, Spark, orchestration, catalog, and serving patterns.",
    tradeoff:
      "Unrestricted self-service creates duplicate and ungoverned data, while centralized ticket-based delivery cannot serve hundreds of teams. The platform should automate guardrails and require ownership without centralizing every transformation.",
    validation:
      "A new dataset should be provisioned from one declaration containing owner, grain, schema, keys, compatibility, PII class, retention, SLO, and cost budget. CI should reject an unsafe contract and automatically create observability, lineage, access policy, and deprecation metadata for a valid one.",
  },
  "regional-global-boundary": {
    answer:
      "I would keep latency-sensitive ingestion, streaming state, and operational serving regional. A global control plane would distribute schemas, deployment policy, and metadata, while only approved aggregates or replicated datasets cross regional boundaries.",
    tradeoff:
      "Regional ownership reduces latency, residency risk, and blast radius, but it introduces duplicated infrastructure and makes global reporting dependent on explicit replication and reconciliation rules.",
    validation:
      "I would document ownership for every topic and table, the allowed cross-region data classes, and RPO/RTO per workload. A regional failure test should show that another region continues independently and that replicated analytical data converges without double publication.",
  },
  "global-kafka": {
    answer:
      "I would not put all operational traffic in one worldwide Kafka cluster. I would use region-local clusters and asynchronously mirror only the topics required for disaster recovery or approved global analytics.",
    tradeoff:
      "A single cluster appears simpler, but cross-continent producer latency, unstable links, residency constraints, and one large failure domain outweigh that simplicity. Regional clusters require more automation and a deliberate replication topology.",
    validation:
      "I would compare producer latency, inter-region bandwidth, replication lag, failover behavior, and data-residency policy. Payments may require a lower RPO than GPS telemetry, so replication policy should be workload-specific rather than universal.",
  },
  "scale-driver": {
    answer:
      "The dominant design input is high-frequency location telemetry because it drives event rate, spatial skew, state size, network bandwidth, and retention cost. I would calculate it before choosing partitions, workers, or storage.",
    tradeoff:
      "Retaining every point preserves maximum forensic and modeling value, but creates privacy exposure and large storage and scan costs. Resolution should decrease as data ages unless a defined use case requires otherwise.",
    validation:
      "Using the document's assumptions, 2M online drivers / 4 seconds = 500K events/sec. At an assumed 200 bytes per encoded event, that is about 100 MB/sec or 8.64 TB/day before replication, file overhead, rider pings, and retry traffic; I would size from measured payload distributions and peak regional skew.",
  },
  "source-beyond-kafka": {
    answer:
      "No. Kafka is transport, not the origin of every fact. Mobile and service events can be published directly, while driver onboarding, vehicles, city configuration, support, and finance reference data may arrive through database CDC or governed batch extracts.",
    tradeoff:
      "CDC preserves source changes and ordering but brings snapshot/live-stream overlap, deletes, transaction boundaries, and source-specific offsets that event producers do not have.",
    validation:
      "For each source I would record system of record, extraction mode, primary key, ordering guarantee, snapshot procedure, delete semantics, and replay position such as LSN or SCN. A snapshot-to-stream test must produce neither a gap nor a duplicate current row.",
  },
  "surge-metrics": {
    answer:
      "I would define supply and demand precisely, assign events to a city and H3 resolution, and aggregate them in event-time windows. The stream job would publish a versioned metric containing counts, window boundaries, freshness, and configuration; pricing policy would consume that metric rather than raw pings.",
    tradeoff:
      "Small cells and short windows react quickly but are noisy and sparse. Larger cells and smoothing are stable but can hide neighborhood-level changes, so resolution, minimum sample size, hysteresis, and fallback behavior must be configurable by market.",
    validation:
      "I would replay normal commute, airport spike, missing-GPS, and low-supply scenarios. Checks include watermark delay, cell skew, oscillation rate, stale-metric fallback, and whether a late event corrects analytics without rewriting a price already shown to a rider.",
  },
  "fraud-stream": {
    answer:
      "I would create separate trip-risk and payment-risk decisions. A keyed stream job would combine bounded recent features with versioned rules or models, emit a score and reason codes, and write both the decision and its inputs to an append-only audit stream.",
    tradeoff:
      "Synchronous blocking can prevent loss but adds latency and false-positive harm. Only high-confidence, low-latency payment controls should block; ambiguous trip signals should step up verification or enter review.",
    validation:
      "I would evaluate precision and recall by decision threshold, feature freshness, model version, decision latency, and delayed-label performance. Replay must reproduce the original decision using point-in-time features, and unavailable features must follow an explicit fail-open or fail-closed policy.",
  },
  "driver-earnings": {
    answer:
      "I would model earnings as an append-only ledger, not a mutable total. Each fare component, tip, toll, incentive, adjustment, and reversal gets a stable transaction ID, effective time, currency, rule version, and link to the relevant trip or promotion.",
    tradeoff:
      "Drivers need a fast provisional balance, while payout requires reconciled trip and payment evidence. I would expose both states explicitly rather than silently changing one number after daily close.",
    validation:
      "The ledger must sum to the displayed balance and payout file, retries must not create a second effect, and corrections must be compensating entries. I would reconcile by driver, currency, region, and settlement period and preserve the rule version used for every incentive.",
  },
  "disordered-events": {
    answer:
      "I would use event time, a stable event_id, producer sequence where available, and an explicit trip state machine. Events inside the lateness bound update live state; events beyond it enter a correction path that rebuilds the affected entity and republishes versioned analytical results.",
    tradeoff:
      "A longer watermark reduces corrections but increases state and delays finality. GPS, trip lifecycle, and payment events need different lateness and deduplication horizons because their business consequences differ.",
    validation:
      "I would test duplicate delivery, completion before pickup, an older driver status arriving last, and an event after watermark expiry. The expected winner, quarantine reason, correction record, and downstream restatement must be deterministic for every case.",
  },
  "idempotent-retries": {
    answer:
      "I would make idempotency a sink contract. Producers assign a stable business or event key; consumers checkpoint offsets with state; databases use a uniqueness constraint or conditional upsert; ledgers reject duplicate transaction IDs; lakehouse jobs commit deterministic source ranges atomically.",
    tradeoff:
      "A TTL-based dedupe cache is sufficient only when duplicates cannot arrive after the TTL. Financial effects require durable uniqueness, while high-volume telemetry can accept bounded deduplication and last-sequence-wins semantics.",
    validation:
      "I would inject a failure after the sink write but before offset acknowledgement and retry the same batch repeatedly. Row counts, balances, current state, and snapshot IDs must remain unchanged after the first successful effect.",
  },
  "framework-choice": {
    answer:
      "Kafka provides durable ordered transport, not computation. I would choose Flink for continuous low-latency event-time state, Spark Structured Streaming for micro-batch pipelines closely coupled to lake tables, and batch Spark for bounded large recomputation and backfills.",
    tradeoff:
      "Standardizing on one engine lowers operational burden, but the wrong engine can make latency, state recovery, or bulk replay unnecessarily difficult. The decision should follow SLA, state shape, sink semantics, and team operating maturity.",
    validation:
      "I would compare p95 latency, state size and recovery time, checkpoint or batch commit behavior, throughput, connector maturity, replay duration, and cost using representative GPS, trip-state, and multi-day backfill workloads.",
  },
  "kafka-partition-strategy": {
    answer:
      "I would partition by the ordering and computation boundary of each topic: trip lifecycle by trip_id, payment ledger by payment transaction or account boundary, and location by region + spatial cell + salt. Re-keying belongs in a named downstream stage when the access pattern changes.",
    tradeoff:
      "One key cannot simultaneously preserve per-entity order, spatial locality, and perfect balance. Separate topics and explicit repartitioning cost network I/O but make each ordering guarantee understandable.",
    validation:
      "I would measure key-frequency percentiles, largest-partition share, broker bytes, consumer lag, and task skew under airport and stadium traffic. The design must also explain what ordering is lost across salts and where it is reconstructed.",
  },
  "hot-partitions": {
    answer:
      "A hot partition serializes a disproportionate share of traffic onto one broker and one consumer task, causing lag, backpressure, long checkpoints, and stale outputs even when the cluster has spare aggregate capacity. I would detect skew first, then salt or split only the hot key space.",
    tradeoff:
      "Salting distributes load but creates a second aggregation stage and removes total order for the unsalted key. Over-partitioning everything increases metadata and recovery overhead without fixing a pathological key.",
    validation:
      "I would alert on per-partition rather than topic-average bytes and lag. A skew test should prove bounded maximum load, successful downstream merge, and acceptable recovery when the busiest partition's broker or consumer fails.",
  },
  "surge-flapping": {
    answer:
      "I would separate signal computation from pricing policy. The signal uses event-time supply and demand windows; the policy applies smoothing, entry and exit thresholds, minimum dwell time, and a stale-data fallback before changing a multiplier.",
    tradeoff:
      "Stability deliberately sacrifices some reaction speed. The thresholds should be tuned with market simulations so they suppress noise without masking a real supply shortage.",
    validation:
      "I would measure multiplier changes per cell per hour, time to respond to a sustained imbalance, rollback behavior when data becomes stale, and outcomes under low sample counts. A single request or GPS retry must not flip the published state.",
  },
  "exactly-once": {
    answer:
      "I would promise exactly one financial effect, not universal exactly-once delivery. The payment command carries an idempotency key; the ledger enforces a durable unique transaction ID; processor requests reuse the same key; Kafka processing remains replayable; settlement reconciliation finds missing or conflicting effects.",
    tradeoff:
      "Kafka transactions or stream checkpoints cannot atomically include an external payment processor. Durable idempotency and reconciliation add storage and operational work but define a correctness boundary that survives retries and partial failures.",
    validation:
      "I would test timeouts before and after processor acceptance, duplicate webhooks, consumer restarts, reversals, and settlement mismatch. The ledger must show one charge effect, every retry must resolve to the same result, and unresolved cases must enter an auditable exception queue.",
  },
  "canonical-envelope": {
    answer:
      "I would keep the envelope small and infrastructure-focused: event_id, event_type, schema_version, event_time, ingest_time, producer, entity key, region, trace_id, optional sequence, privacy classification, and a typed payload. Domain fields remain in schemas owned by the producing team.",
    tradeoff:
      "A common envelope enables routing, deduplication, lineage, and policy, but a universal payload schema couples unrelated domains. Required envelope fields also add bytes to very high-volume telemetry, so field value must justify cost.",
    validation:
      "I would demonstrate two distinct payloads, such as location_ping and payment_captured, passing the same ingestion and observability controls. Contract tests should reject a missing identity or schema version while allowing backward-compatible payload evolution.",
  },
  "schema-evolution": {
    answer:
      "I would make schemas owned contracts in a registry. Additive optional fields follow backward compatibility; removals or semantic changes require a new version, a migration window, consumer readiness evidence, and canary rollout by producer version.",
    tradeoff:
      "Strict compatibility slows releases, but silently changing units, meaning, or nullability can corrupt every downstream result while still parsing successfully. Semantic compatibility matters more than syntax alone.",
    validation:
      "CI should run producer samples against old and new consumers, block incompatible registrations, and track usage before deprecation. In production I would monitor schema IDs, parser failures, unknown enum values, DLQ rate, and metric shifts by app version.",
  },
  "lakehouse-design": {
    answer:
      "I would use object storage with an open table format. Bronze preserves source records and offsets; Silver contains validated domain evidence at stable grains; Gold contains reconciled facts and conformed dimensions. A catalog records ownership, lineage, quality status, retention, and approved use.",
    tradeoff:
      "A lakehouse supports replay and atomic table versions, but it is not maintenance-free. Compaction, snapshot expiry, schema evolution, access policy, and workload isolation are part of the design.",
    validation:
      "I would show separate grains for trip requests, trip events, payment ledger movements, driver earnings, and location pings. A trace from a Gold metric to Silver rows, Bronze source offsets, transformation version, and snapshot ID must be possible.",
  },
  "lake-physical-design": {
    answer:
      "I would start from query predicates and write rate: partition trip tables coarsely by event date and region, use hour only for the highest-volume tables, and sort or cluster by city, trip_id, or H3 where it improves pruning. Parquet supplies columnar storage; Iceberg supplies snapshots and partition evolution.",
    tradeoff:
      "Fine partitions improve pruning until they create small files and metadata overhead. High-cardinality identifiers such as trip_id and driver_id should generally be sort or clustering keys, not directory partitions.",
    validation:
      "I would compare files scanned, bytes scanned, manifest planning time, file-size distribution, and write amplification for region-day reporting, a single-trip investigation, and city/H3 route analysis before fixing the physical layout.",
  },
  "small-files": {
    answer:
      "I would prevent tiny files by buffering writes and controlling task parallelism, then compact recent active partitions asynchronously toward a measured target size. Table maintenance also rewrites manifests and removes orphan files after snapshot safety windows.",
    tradeoff:
      "Compaction lowers planning and scan overhead but consumes compute and rewrites data. Running it too often wastes resources and can contend with writers; running it too late degrades every reader.",
    validation:
      "I would trigger maintenance from file count, median size, delete-file ratio, and query scan cost rather than a blind schedule. Atomic commits and snapshot isolation must keep readers consistent while compaction runs.",
  },
  "data-lifecycle": {
    answer:
      "I would define retention and deletion by dataset and data class, preserve source ranges plus code versions for replay, and run backfills into isolated candidate snapshots. Deletion follows catalog lineage through raw tables, derivatives, features, caches, and serving copies.",
    tradeoff:
      "Long retention increases replay options but also privacy exposure and cost, especially for precise location. Immutable snapshots and backups mean deletion requires explicit expiry or cryptographic-erasure policy rather than an instant-delete claim.",
    validation:
      "A backfill must declare scope, source offsets, code version, expected deltas, validation results, new snapshot, and approver. A deletion test must prove the subject is inaccessible from current tables and derived products after the documented completion window.",
  },
  "bronze-silver-gold": {
    answer:
      "I would define the layers by contract, not by tool. Bronze is append-only source evidence with ingest lineage; Silver is deduplicated, validated, privacy-treated domain data at declared grains; Gold is reconciled business data with stable metric definitions and publish gates.",
    tradeoff:
      "Three layers add latency and ownership work. They are justified only if each has a distinct consumer contract and correction boundary; copying unchanged data between layers adds ceremony without value.",
    validation:
      "For a location ping and a completed trip, I would show exactly what changes at each boundary, which rejects are quarantined, which source fields remain traceable, and which checks must pass before a Gold snapshot is visible.",
  },
  "trip-grain": {
    answer:
      "I would set fact_trip to one row per trip request, not only successful rides, with the final known outcome and lifecycle timestamps. Immutable fact_trip_event retains every transition; match attempts, payment movements, earnings, and location observations remain separate facts.",
    tradeoff:
      "An accumulating trip snapshot is convenient for funnel analysis but is mutable as late events arrive. Keeping event history alongside it preserves auditability and avoids forcing one row to represent several incompatible grains.",
    validation:
      "I would test cancelled-before-match, multiple match attempts, rematch, completed-with-payment-failure, and late completion. Counts must reconcile from requests through outcomes without multiplying trips when joined to payments or pings.",
  },
  "location-retention": {
    answer:
      "I would tier location data by age and purpose: keep full-resolution restricted pings for a short operational and investigation window, retain derived route summaries or downsampled points longer, and delete data when no approved use remains.",
    tradeoff:
      "Downsampling reduces cost and privacy risk but removes path detail that future investigations or models might want. The sampling rule and retention period need legal, safety, and analytical sign-off rather than a purely technical choice.",
    validation:
      "Under the document's example, moving from 1 point per 4 seconds to 1 per 30 seconds reduces aged point count by 7.5x. I would verify route-distance error, ETA-model impact, investigation sufficiency, storage savings, and deletion completion before adopting that policy.",
  },
  scd2: {
    answer:
      "I would use SCD2 only when the attribute valid at event time changes historical interpretation, such as service-area membership, vehicle category, driver eligibility, or city definition. Volatile profile attributes that do not affect historical facts can remain current-state dimensions.",
    tradeoff:
      "SCD2 preserves historical meaning but increases row count and makes joins sensitive to effective-time boundaries. Applying it to every changing attribute creates complexity with little analytical value.",
    validation:
      "I would test overlapping versions, gaps, late dimension arrival, and a trip exactly on a boundary. The event-time join must resolve one surrogate key, and inferred members must be replaced without changing unrelated historical facts.",
  },
  "join-skew": {
    answer:
      "I would reduce the join before scaling it: prune GPS by region and a bounded trip time range, use spatial bounds where available, cluster compatible datasets, and derive a route summary per trip before joining to broad trip facts. Salt only measured hot keys.",
    tradeoff:
      "Pre-aggregation makes the common join cheaper but cannot answer every point-level question. Raw restricted evidence remains available for targeted replay rather than participating in every analytical query.",
    validation:
      "I would inspect per-task input rows, spill, shuffle bytes, skewed-key frequency, and output cardinality. A row-count invariant must prove that adding pings cannot multiply one trip into several fact_trip rows.",
  },
  "realtime-and-daily": {
    answer:
      "I would derive both products from the same versioned event contracts. Streaming publishes provisional metrics with window and freshness metadata; the lakehouse reprocesses complete source ranges and publishes a versioned daily snapshot after quality and reconciliation gates.",
    tradeoff:
      "Low latency and final correctness have different finality boundaries. The UI and consumers must know whether a metric is provisional or certified rather than assuming the two paths always match immediately.",
    validation:
      "I would define the allowed delta and convergence time per metric, compare source-offset coverage, and expose snapshot/version metadata. A day-close test must show when the certified number replaces the provisional one and how a later correction is communicated.",
  },
  "stream-batch-reconcile": {
    answer:
      "I would recompute the metric from bounded immutable source ranges using the canonical definition, compare results by region and time bucket, classify the difference, and publish a correction only to affected versioned partitions.",
    tradeoff:
      "Automatically replacing every mismatch can hide logic defects or change financial reports without review. Correction policy should vary by metric tier, with tighter approval for money and regulatory outputs.",
    validation:
      "The reconciliation report should include source-offset coverage, distinct business keys, duplicate and late counts, definition version, absolute and percentage delta, and representative mismatched IDs so an operator can explain the discrepancy before promotion.",
  },
  "quality-enforcement": {
    answer:
      "I would enforce quality at four levels: contract compatibility at ingestion, record validity in Silver, cross-table integrity before publication, and business reconciliation for certified outputs. Each rule has an owner, threshold, action, and evidence link.",
    tradeoff:
      "Failing every pipeline on every anomaly harms availability. Invalid records can be quarantined, telemetry drift can warn, but duplicate payment effects or unreconciled financial totals should block certified publication.",
    validation:
      "I would test legal trip transitions, GPS bounds and impossible speed, required keys, uniqueness, request-to-outcome coverage, completed-trip-to-payment consistency, and earning-to-payout balance. Dashboards must show both failure count and affected business scope.",
  },
  observability: {
    answer:
      "I would define output SLOs first, then instrument the path that explains them: producer rate, ingest delay, per-partition lag, watermark delay, processing latency, sink commit age, row completeness, quality failures, and business reconciliation.",
    tradeoff:
      "Collecting every metric creates noise and cost. Paging should follow user-impacting SLO burn, while high-cardinality diagnostics remain available for investigation and route automatically to the dataset owner.",
    validation:
      "A metric should be traceable from dashboard version to Gold snapshot, job version, input table snapshots or Kafka offsets, producer version, and sample event IDs. I would run synthetic canaries and failure drills to prove alerts fire before the consumer SLO is missed.",
  },
  "trip-drop-investigation": {
    answer:
      "I would first determine whether the drop is real or a data artifact by slicing it by region, time, app version, and trip state. Then I would walk backward from dashboard query and snapshot through Gold, Silver, processor lag, Kafka input, and producer health.",
    tradeoff:
      "Immediate replay or backfill can overwrite useful evidence and worsen an active incident. Freeze the suspect publication, keep the last known good view when appropriate, and identify the failing boundary before remediation.",
    validation:
      "I would compare request volume, match rate, completion transitions, payment captures, source-offset coverage, watermark delay, schema rejects, DLQ volume, and the last good snapshot. The investigation should end with affected scope, root cause, correction plan, and prevention test.",
  },
  backpressure: {
    answer:
      "I would treat Kafka as a bounded shock absorber, then remove the bottleneck: scale consumers where partitions allow, isolate critical workloads, replace blocking lookups with asynchronous or broadcast state, and reduce optional enrichment before dropping source events.",
    tradeoff:
      "Buffering preserves data but increases freshness delay and the time needed to recover. Load shedding is acceptable only for explicitly sampled telemetry; trip lifecycle and financial events require durable admission and replay.",
    validation:
      "I would monitor lag growth rate, oldest-event age, task busy time, checkpoint duration, sink latency, and recovery throughput. A burst test must show the maximum sustainable rate, time to drain backlog, and which degradation activates before an SLO breach.",
  },
  "fault-tolerance": {
    answer:
      "I would combine replicated durable input, checkpointed processing state, idempotent sink contracts, and replayable analytical commits. Recovery resumes from a known checkpoint and source position; it does not assume a partial external write was rolled back.",
    tradeoff:
      "Short checkpoint intervals and stronger replication reduce potential loss but increase write overhead and cost. RPO/RTO should be stricter for payment and trip lifecycle events than for replaceable location samples.",
    validation:
      "I would inject broker, task-manager, network, and sink failures before and after writes. After restart, source coverage must have no gap, duplicate delivery must produce no duplicate business effect, and a candidate analytical snapshot must reconcile before readers switch to it.",
  },
  "data-protection": {
    answer:
      "I would classify data at field level, tokenize stable identities, isolate precise location and payment domains, encrypt in transit and at rest, and expose purpose-limited views with row, column, and regional policies. Re-identification requires a separately audited path.",
    tradeoff:
      "Broad raw access accelerates exploration but violates least privilege and increases breach impact. Strong minimization can limit analysis, so approved aggregates and controlled clean-room-style access should cover legitimate use cases.",
    validation:
      "I would verify access using positive and negative policy tests, audit every privileged read, rotate keys, scan for unclassified sensitive fields, and trace deletion through tables, features, caches, exports, and snapshots within the stated policy window.",
  },
  "hardest-quality": {
    answer:
      "The hardest class of problem is constructing one trip from independently produced mobile, service, map, and payment evidence under unreliable networks. The challenge is deciding which source is authoritative for each field and how corrections change provisional state.",
    tradeoff:
      "Waiting for all evidence improves completeness but misses real-time SLAs; accepting the first event is fast but can preserve a wrong state. The design needs bounded provisional decisions plus deterministic later reconciliation.",
    validation:
      "I would build a precedence matrix and state-transition tests for missing, duplicate, conflicting, and late events. Every corrected field should retain the previous value, winning source, rule version, and reason rather than being silently overwritten.",
  },
  "regional-failure": {
    answer:
      "I would define recovery by workload instead of claiming seamless regional failover. Producers buffer or route to an approved paired region, operational consumers use last-known safe state where possible, and durable events replay after regional services recover.",
    tradeoff:
      "Asynchronous replication has non-zero data loss exposure, while active-active writes require conflict ownership and can violate residency. Payments may justify stronger replication than high-volume GPS telemetry.",
    validation:
      "For each workload I would publish RPO, RTO, failover trigger, source of truth, and reconciliation step. A regional drill must verify offset continuity, duplicate suppression, stale-state behavior, cross-region policy, and convergence after failback.",
  },
  cost: {
    answer:
      "I would optimize the largest multiplicative drivers first: location sampling rate, payload size, retention duration, replication factor, and bytes scanned. Compute tuning matters, but it rarely offsets an unnecessary order of magnitude in retained telemetry.",
    tradeoff:
      "Reducing resolution or retention can remove future model and investigation value. Cost changes should be tied to explicit use cases and measured quality impact, not applied uniformly to all location data.",
    validation:
      "Using the stated example, downsampling aged points from every 4 seconds to every 30 seconds reduces point count by 7.5x. I would validate route error, model performance, investigation needs, storage, scan bytes, and cross-region transfer before setting the final policy.",
  },
};
