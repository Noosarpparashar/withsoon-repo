export const AMAZON_INTERVIEW_CATEGORIES = [
  "Sources + scale",
  "Kafka + ingestion",
  "CDC + correctness",
  "Stream processing",
  "Lakehouse + batch",
  "Modeling + finance",
  "Serving + ML",
  "Governance + recovery",
] as const;

export type AmazonInterviewCategory = (typeof AMAZON_INTERVIEW_CATEGORIES)[number];

export type AmazonInterviewQuestion = {
  id: string;
  category: AmazonInterviewCategory;
  question: string;
  answer: string;
  tradeoff: string;
  proof: string;
};

export const AMAZON_INTERVIEW_QUESTIONS = [
  {
    id: "q01", category: "Sources + scale", question: "What are the dominant event producers in an Amazon-like commerce platform?",
    answer: "Orders, payments, inventory, fulfillment, catalog, pricing, promotions, sellers, customer identity, search, recommendations, advertising, web/mobile behavior, support, fraud, and external carriers or processors all produce independent evidence. I separate authoritative business events and CDC from high-volume behavioral telemetry and partner feeds because their guarantees, privacy, ordering, and failure modes differ.",
    tradeoff: "A single universal event bus looks simple but couples unrelated traffic and ownership; domain topics add operational overhead but preserve failure isolation and meaning.",
    proof: "For every producer, record its owner, transaction boundary, event grain, key, capture mode, volume, privacy class, and recovery source.",
  },
  {
    id: "q02", category: "Sources + scale", question: "What is the largest event family, and why is order volume not the whole capacity story?",
    answer: "Behavioral events—impressions, searches, clicks, recommendations, ads, and telemetry—usually dominate raw count, while orders amplify into payment, inventory, fulfillment, shipment, return, seller, and finance lifecycles. I size behavior and commerce independently, then isolate critical order/payment evidence from optional or sampled telemetry.",
    tradeoff: "Treating every event equally simplifies arithmetic but lets a campaign or bot spike starve facts needed for customer and financial correctness.",
    proof: "Publish per-family events/day, average and peak events/second, bytes/event, key skew, retention, and criticality rather than one platform-wide total.",
  },
  {
    id: "q03", category: "Sources + scale", question: "How do you estimate peak event rate for orders and behavior?",
    answer: "Start with explicit assumptions. For 10M orders/day and 30 lifecycle events/order: 10M × 30 ÷ 86,400 = 3,472.22 average order events/s; ×20 campaign peak = 69,444.44/s. For 3B behavior events/day: 3B ÷ 86,400 = 34,722.22/s; ×10 = 347,222.22/s. Combined modeled peak is 416,666.67 events/s before other domains.",
    tradeoff: "Multipliers are planning assumptions, not Amazon production claims; averages miss synchronized launches, hot keys, retries, replay, and regional failover.",
    proof: "Replace planning multipliers with observed per-second histograms, campaign drills, key distributions, and AZ-loss tests before production sizing.",
  },

  {
    id: "q04", category: "Kafka + ingestion", question: "How do you choose Kafka partition count?",
    answer: "Calculate the maximum of byte throughput and consumer parallelism, then add headroom for AZ loss, leader imbalance, hot keys, growth, and replay. At 416.67 MB/s modeled logical ingress and a conservative 8 MB/s per partition lane, bytes imply about 53 lanes; rounded baseline is 55, but each domain and region receives its own count.",
    tradeoff: "Too few partitions cap throughput and recovery; too many increase metadata, open files, rebalances, and operational cost.",
    proof: "Load-test production-size records, compression, replication, consumer work, broker loss, and catch-up—not only synthetic small messages.",
  },
  {
    id: "q05", category: "Kafka + ingestion", question: "Which partition key preserves an order lifecycle?",
    answer: "Use order_id for order lifecycle topics so events for one order remain in one partition. Use payment_id for immutable payment transitions, sku-location for inventory movements, shipment_id for package lifecycle, and seller_id only where seller-local order is actually required. Kafka ordering is partition-local, never global.",
    tradeoff: "A domain key preserves local order but can become hot; random keys balance load but move sequencing and reassembly into consumers.",
    proof: "Test retries, split shipments, multiple captures/refunds, region failover, and the largest sellers or flash-sale orders against the declared ordering scope.",
  },
  {
    id: "q06", category: "Kafka + ingestion", question: "What creates a hot Kafka partition, and how do you mitigate it?",
    answer: "Flash-sale SKUs, mega-sellers, popular products, promotion IDs, fulfillment centers, or a null/default key can concentrate traffic. Detect key share and partition lag, isolate hot workloads, use a better domain key, or shard only commutative workloads with a deterministic suffix and downstream merge. Never salt a lifecycle that requires strict order without redesigning its state model.",
    tradeoff: "Sharding improves throughput but sacrifices simple per-key ordering and increases merge state.",
    proof: "Report top-key percentage, partition p99 bytes/s, consumer lag, state size, and behavior during a campaign replay plus one-broker loss.",
  },
  {
    id: "q07", category: "Kafka + ingestion", question: "Why keep immutable Bronze if Kafka already supports replay?",
    answer: "Kafka is a bounded transport log; Bronze is long-lived, cheap, schema-preserving evidence for backfills, audits, incident reconstruction, and new consumers. Bronze retains topic, partition, offset, schema ID, producer, event ID, and original payload so curated tables can be rebuilt after Kafka retention expires.",
    tradeoff: "Dual retention costs storage and archive operations, but relying only on Kafka makes long-horizon correction and finance audit depend on an expensive broker window.",
    proof: "Delete a derived Silver slice and rebuild it from a pinned Bronze manifest with matching counts, checksums, and output snapshot.",
  },
  {
    id: "q08", category: "Kafka + ingestion", question: "How long should Kafka retention be?",
    answer: "Retention must cover the longest credible detection plus recovery window for each topic class. A seven-day planning baseline may fit critical commerce topics, while optional telemetry can be shorter and restricted domains may have tighter access. Bronze provides long-term replay; Kafka protects short operational recovery.",
    tradeoff: "Longer retention improves replay flexibility but increases broker disk, recovery time, access exposure, and cost.",
    proof: "Derive retention from incident detection p99, restore/backfill time, release rollback window, legal policy, and disk/AZ-loss capacity.",
  },

  {
    id: "q09", category: "CDC + correctness", question: "What happens when CDC falls behind?",
    answer: "Expose source-position lag and wall-clock age, protect database logs from premature truncation, throttle noncritical consumers, and keep downstream products visibly stale. Restart from the durable source offset rather than taking a blind new snapshot. If the log gap is lost, perform a controlled snapshot plus change-buffer reconciliation.",
    tradeoff: "Retaining logs longer protects recovery but consumes source storage; aggressive catch-up can harm the operational database.",
    proof: "Drill a stalled connector, show no source-log loss, resume the exact LSN/binlog position, and reconcile source counts to Bronze and Silver.",
  },
  {
    id: "q10", category: "CDC + correctness", question: "How do you prevent dual-write loss between an operational database and Kafka?",
    answer: "Commit business state and an outbox row in the same database transaction. CDC publishes the outbox asynchronously with a stable event_id and source sequence; consumers deduplicate. Kafka is therefore not on checkout’s critical path and a process crash cannot leave database state committed without recoverable event evidence.",
    tradeoff: "The outbox adds storage, cleanup, and CDC latency, but direct DB-plus-Kafka writes create an unsolved partial-failure window.",
    proof: "Crash after commit and before publish, then verify CDC emits the outbox exactly as recoverable at-least-once evidence and Silver contains one fact.",
  },
  {
    id: "q11", category: "CDC + correctness", question: "How do you bootstrap CDC without missing changes?",
    answer: "Capture a consistent snapshot tied to a known log position, start buffering changes after that position, load the snapshot with source keys and versions, then apply buffered changes in order. Mark the bootstrap generation and reconcile counts and checksums before allowing downstream certification.",
    tradeoff: "A consistent snapshot may pressure the source; an inconsistent bulk copy is faster but creates gaps and duplicates that are hard to prove away.",
    proof: "Record snapshot ID, source high-water mark, table counts, checksums, change range, and the first continuously applied source position.",
  },
  {
    id: "q12", category: "CDC + correctness", question: "How do you handle source deletes?",
    answer: "Preserve tombstones with source key, deletion time, sequence, and reason. Silver applies the correct semantic action: hard delete, Type-2 close, anonymization, or retained legal record. Privacy deletion is a separate governed workflow that resolves identity across tables, snapshots, caches, indexes, and exports.",
    tradeoff: "Physical deletion improves privacy and storage but may conflict with audit or legal retention; soft deletion preserves history but can expose data if consumers ignore filters.",
    proof: "Trace one deleted entity through CDC, Silver, Gold, serving, Iceberg snapshot expiry, and a signed deletion or exception manifest.",
  },
  {
    id: "q13", category: "CDC + correctness", question: "Why preserve the source sequence number?",
    answer: "event_time can be duplicated, skewed, or late. The database LSN/binlog position, aggregate version, or producer sequence establishes authoritative mutation order, supports idempotent MERGE, identifies gaps, and resolves retry or failover candidates. Preserve it alongside event and ingest time.",
    tradeoff: "Source sequences are system-specific and complicate cross-source joins, but discarding them makes exact reconstruction impossible.",
    proof: "Replay out-of-order updates and show that the newest authoritative version wins without relying on arrival time.",
  },
  {
    id: "q14", category: "CDC + correctness", question: "How do you deduplicate retries?",
    answer: "Use a stable producer event_id when available; otherwise use the documented business fact key plus source sequence and event type. Deduplicate within a bounded streaming horizon for fast results and again against complete Bronze history in Silver. Keep duplicate evidence and reason rather than silently dropping unexplained records.",
    tradeoff: "Longer dedupe state catches more delayed retries but consumes memory; aggressive TTL can let very late duplicates through.",
    proof: "Inject same-ID, same-business-key, cross-region, and post-TTL duplicates and verify both provisional and certified outputs.",
  },
  {
    id: "q15", category: "CDC + correctness", question: "What does exactly-once mean at the business level?",
    answer: "It means one accepted business fact produces one committed effect at the target grain despite retries and recovery. Kafka transactions or Flink checkpoints help, but the end-to-end design still requires stable IDs, deterministic transformations, idempotent sinks or atomic Iceberg commits, and reconciliation with the authoritative source.",
    tradeoff: "Strong coordination everywhere is expensive and often unnecessary; at-least-once transport plus idempotent business writes is usually more practical.",
    proof: "Crash before and after checkpoints and sink commits, replay the same offsets, and show one fact_order_item or one ledger movement remains.",
  },

  {
    id: "q16", category: "Stream processing", question: "How do you handle late mobile and client events?",
    answer: "Retain event_time and ingest_time, classify clock source, reject impossible skew, use watermarks for bounded updates, and route beyond-window corrections to a late stream or batch reconciliation. Client behavior can correct funnels later; authoritative order and payment state comes from server events, not phone clocks.",
    tradeoff: "Wider lateness improves completeness but delays finality and increases state; narrow windows give faster answers with more corrections.",
    proof: "Publish late-event rate and correction delta by app version and network, then verify daily truth incorporates allowed late evidence.",
  },
  {
    id: "q17", category: "Stream processing", question: "How do watermarks work in the commerce stream?",
    answer: "A watermark estimates that most events earlier than a timestamp have arrived, allowing windows to close while admitting bounded lateness. Define it per event family: orders and payments use trusted server times and short bounds; mobile clicks may need larger bounds. Watermarks are completeness policies, not clocks or guarantees.",
    tradeoff: "Aggressive watermarks reduce latency and state but create more late corrections; conservative watermarks delay outputs and consume resources.",
    proof: "Plot event-time delay distributions and measure window corrections at candidate watermark thresholds before choosing one.",
  },
  {
    id: "q18", category: "Stream processing", question: "What streaming state needs TTL?",
    answer: "Deduplication IDs, sessions, carts, incomplete order/payment lifecycles, attribution windows, inventory reconciliation buffers, and dimension join caches need explicit TTLs tied to business horizons. Expiry must emit a reason or incomplete outcome when absence itself matters; unbounded state is an incident.",
    tradeoff: "Short TTL limits memory but loses delayed relationships; long TTL improves completeness but enlarges checkpoints and recovery time.",
    proof: "Track state entries, bytes, checkpoint duration, expired incomplete entities, and correction rate by TTL cohort.",
  },
  {
    id: "q19", category: "Stream processing", question: "When would you choose Flink versus Spark Structured Streaming?",
    answer: "Choose Flink for low-latency event-time processing, large keyed state, timers, complex lifecycle patterns, and continuous operational products. Choose Spark Structured Streaming when teams want micro-batch integration with Spark SQL and lakehouse workloads and seconds-to-minutes latency is acceptable. Both can be correct if state, checkpoints, sinks, and replay are designed explicitly.",
    tradeoff: "Flink provides stronger streaming primitives with higher operational specialization; Spark unifies batch and stream skills but may be less natural for fine-grained timers and very low latency.",
    proof: "Benchmark representative state, skew, checkpoint recovery, sink behavior, operational staffing, and end-to-end SLO rather than comparing feature lists.",
  },
  {
    id: "q20", category: "Stream processing", question: "How do you recover streaming state?",
    answer: "Restore from the last valid checkpoint/savepoint, resume pinned source offsets, and use idempotent or transactional sinks. If state logic changed incompatibly, rebuild a shadow job from Bronze or Kafka, compare control totals and windows, then cut over at a declared boundary.",
    tradeoff: "Frequent checkpoints reduce replay but add I/O and backpressure; infrequent checkpoints lengthen recovery.",
    proof: "Run crash, corrupted-checkpoint, version-upgrade, and sink-timeout drills; measure RPO, RTO, duplicates, missing keys, and post-recovery reconciliation.",
  },

  {
    id: "q21", category: "Lakehouse + batch", question: "Why use Iceberg instead of raw Parquet folders?",
    answer: "Parquet is the file format; Iceberg adds atomic table commits, snapshots, schema and partition evolution, hidden partitioning, time travel, row-level changes, and multi-engine metadata. Those capabilities make long-lived order, payment, inventory, and behavior tables safer for concurrent Spark, Flink, Trino, and maintenance jobs.",
    tradeoff: "Iceberg introduces catalogs, metadata, maintenance, and commit coordination; raw files are simpler only for append-only, disposable data.",
    proof: "Demonstrate atomic reader visibility, rollback, schema evolution, partition evolution, and a bounded MERGE across two engines.",
  },
  {
    id: "q22", category: "Lakehouse + batch", question: "How do Iceberg snapshots help correctness and recovery?",
    answer: "A snapshot identifies one atomic table version and its files. Readers never see half a publish; jobs can pin inputs, compare versions, roll back bad Gold logic, audit which data was visible, and reproduce features or reports. Snapshots are not backups by themselves because file expiry and catalog loss still matter.",
    tradeoff: "Long snapshot history improves audit and rollback but retains files and metadata, increasing cost and deletion complexity.",
    proof: "Record input/output snapshot IDs for every job and successfully restore both table data and catalog metadata in a drill.",
  },
  {
    id: "q23", category: "Lakehouse + batch", question: "What causes small files?",
    answer: "High partition cardinality, too many writers, short micro-batches, low-volume partitions, retries, uncoordinated backfills, and frequent MERGEs create small files. They increase manifests, planning time, object requests, and read amplification even when storage bytes are modest.",
    tradeoff: "Larger batches and fewer writers improve file size but increase latency; aggressive compaction consumes compute and rewrites data.",
    proof: "Monitor files per partition, median and p10 file size, manifests, planning latency, object requests, and compaction amplification.",
  },
  {
    id: "q24", category: "Lakehouse + batch", question: "How do you compact Iceberg tables safely?",
    answer: "Select measured hot partitions, rewrite small files toward a target such as 256–512 MB, preserve partition/spec semantics, avoid conflicting writers, and commit atomically. Separate data-file rewrite, manifest rewrite, orphan cleanup, and snapshot expiry with explicit retention and rollback guards.",
    tradeoff: "Compaction improves reads but spends compute, creates write amplification, and can conflict with ingestion or backfill.",
    proof: "Compare files, bytes scanned, planning p95, query p95, commit conflicts, and total rewrite cost before and after each policy.",
  },
  {
    id: "q25", category: "Lakehouse + batch", question: "How do you partition clickstream and impression tables?",
    answer: "Use hidden time partitioning—typically event day or hour based on scale—and optionally coarse marketplace or region when it materially prunes queries. Bucket a high-cardinality stable key when join patterns justify it. Do not create physical partitions for every event type, product, session, or customer.",
    tradeoff: "Fine partitions prune better but create tiny files and metadata; coarse partitions write efficiently but scan more.",
    proof: "Use query logs to compare partition pruning, files touched, bytes scanned, skew, and write sizes before evolving the spec.",
  },
  {
    id: "q26", category: "Lakehouse + batch", question: "Why should you not partition by customer?",
    answer: "Customer is extremely high cardinality and uneven. It creates huge numbers of tiny partitions, metadata pressure, privacy-operational complexity, and poor writes. Use time plus coarse region/marketplace, and bucket or sort by a tokenized customer key when point or join access requires it.",
    tradeoff: "Bucketing cannot prune every single-customer query as directly as partitioning, but it keeps the table operationally manageable.",
    proof: "Estimate partitions/day, expected rows and bytes per customer, metadata count, and query pruning for both designs.",
  },
  {
    id: "q27", category: "Lakehouse + batch", question: "How do you evolve partitions without rewriting the whole table?",
    answer: "Use Iceberg partition evolution: add or replace transforms for new files while old files retain their original spec. Engines plan across specs transparently. Backfill or rewrite old data only when measured query savings justify the cost.",
    tradeoff: "Multiple active specs complicate planning and operations, but a full historical rewrite is expensive and risky.",
    proof: "Run representative queries across old and new specs, verify pruning and correctness, and retain the previous snapshot as rollback.",
  },
  {
    id: "q28", category: "Lakehouse + batch", question: "How do you execute a 2 PB historical backfill?",
    answer: "Define exact input snapshots and partitions, estimate scan/shuffle/output, split into idempotent bounded slices, use isolated compute and shadow tables, checkpoint progress in a control table, compact deliberately, and validate each slice before atomic publication. Never mix a massive backfill blindly with live writers.",
    tradeoff: "More slices and validation slow completion but bound retries, cost, and blast radius.",
    proof: "Track bytes read/written, rows, checksums, skew, retries, cost, snapshot IDs, quality results, and reconciliation per slice.",
  },
  {
    id: "q29", category: "Lakehouse + batch", question: "How do you avoid conflict between backfills and live writes?",
    answer: "Write the backfill to shadow tables or isolated branches/prefixes, pin source snapshots, and declare ownership of bounded partitions. Compare against live output, then publish through one atomic metadata change or controlled partition replacement. Use optimistic concurrency with retry only when semantic overlap is safe.",
    tradeoff: "Isolation doubles temporary storage and compute, but in-place mutation risks partial results and lost live updates.",
    proof: "Simulate overlapping live commits, verify no lost rows, and show consumers remain on the prior certified snapshot until cutover.",
  },
  {
    id: "q30", category: "Lakehouse + batch", question: "How do you handle Spark skew?",
    answer: "Measure key and partition distributions first. Filter early, pre-aggregate, use adaptive execution, split or salt only skewed keys, process exceptional keys separately, tune shuffle partitions, and avoid joining wide unused columns. Flash-sale products and mega-sellers deserve explicit skew paths.",
    tradeoff: "Salting balances work but adds a merge stage and can break ordering or uniqueness if used carelessly.",
    proof: "Compare task duration percentiles, spill, shuffle bytes, stragglers, and output reconciliation before and after the skew strategy.",
  },
  {
    id: "q31", category: "Lakehouse + batch", question: "When should Spark broadcast a dimension?",
    answer: "Broadcast a genuinely small, stable, filtered dimension that fits safely in each executor after serialization and leaves memory for execution. Good candidates include currency or reason-code mappings; large product, seller, or customer history usually needs a shuffle or bucketed strategy.",
    tradeoff: "Broadcast removes shuffle but duplicates memory on every executor and can cause widespread OOM when estimates are stale.",
    proof: "Use actual post-filter bytes, executor memory, concurrent tasks, AQE plans, and failure tests—not only catalog row count.",
  },

  {
    id: "q32", category: "Modeling + finance", question: "What is the grain of fact_order_item?",
    answer: "One row represents one accepted order item, not an order header, shipment, payment, or status event. It carries committed customer, product, SKU, seller, offer, promotion, price, discount, tax, shipping allocation, quantity, currency, and acceptance time; later lifecycle movements remain separate facts or a rebuildable accumulating view.",
    tradeoff: "Order-item grain needs allocation rules for header amounts, but order grain cannot represent multi-seller, multi-package, partial cancel, or return behavior safely.",
    proof: "State its primary key and show a three-item, two-seller order produces exactly three rows without multiplying payment totals.",
  },
  {
    id: "q33", category: "Modeling + finance", question: "Why preserve both an immutable event fact and a current-state table?",
    answer: "Events explain every transition and support audit/replay; current state answers operational questions quickly. Build the state projection deterministically from ordered events and checkpoints, but never let it replace history. For orders, keep lifecycle events plus a current order-item state; for inventory, movements plus snapshots.",
    tradeoff: "Maintaining both costs storage and reconciliation, but an overwritten state cannot explain why or when a value changed.",
    proof: "Rebuild current state from immutable evidence and compare keys, versions, status, quantities, and timestamps with the served projection.",
  },
  {
    id: "q34", category: "Modeling + finance", question: "How do you model product, SKU, seller, and offer?",
    answer: "Product is the catalog concept; SKU is a purchasable physical variant; seller identifies the merchant; offer is one seller’s commercial terms for one SKU over an effective interval. fact_order_item stores the selected surrogate keys so historical sales retain the exact product classification, variant, seller, price, condition, and fulfillment terms.",
    tradeoff: "Collapsing them simplifies joins but loses marketplace and inventory semantics; separation requires point-in-time dimensions and clear keys.",
    proof: "Show one product with two SKUs and three seller offers, then identify exactly which offer version an accepted item references.",
  },
  {
    id: "q35", category: "Modeling + finance", question: "How do you model price history?",
    answer: "Treat offers and price rules as effective-dated versions with amount_minor, currency, condition, eligibility, and valid_from/to. The order item freezes the committed version and monetary components. Do not reconstruct historical paid price from the latest catalog or price table.",
    tradeoff: "Type-2 history increases rows and point-in-time join cost, but latest-state pricing rewrites history and breaks audit.",
    proof: "Change an offer price during checkout and verify orders before and after the effective boundary retain the correct version.",
  },
  {
    id: "q36", category: "Modeling + finance", question: "How do you model inventory movements and snapshots?",
    answer: "fact_inventory_movement has one signed mutation per SKU, location, and source event—receive, reserve, release, ship, return, damage, transfer. fact_inventory_snapshot has one SKU-location-hour/day with quantity buckets for fast trends. Movements explain change; snapshots answer point-in-time state and are semi-additive across time.",
    tradeoff: "Movements are auditable but expensive for current totals; snapshots are fast but cannot explain discrepancies alone.",
    proof: "Reconcile prior checkpoint plus movements to the next checkpoint and detect missing, duplicate, or out-of-sequence movements.",
  },
  {
    id: "q37", category: "Modeling + finance", question: "How do you reconcile payments?",
    answer: "Model immutable authorizations, captures, refunds, fees, chargebacks, and settlements in minor currency units. Reconcile captured minus refunded and chargebacks to processor settlement within explicit timing, fee, currency, and rounding buckets. Every unexplained delta enters finance.reconciliation_exception with source references, owner, and status.",
    tradeoff: "Exact reconciliation delays finality and requires external evidence; a fast product metric can remain provisional but must not masquerade as finance truth.",
    proof: "Close an accounting date only when each delta is matched, explained as timing, or approved as a versioned adjustment.",
  },
  {
    id: "q38", category: "Modeling + finance", question: "How do you define GMV without creating a semantic argument later?",
    answer: "Define the grain, inclusion event, monetary components, currency conversion policy, cancellations, returns, taxes, shipping, gift cards, and marketplace scope in a versioned metric contract. A common product GMV starts from accepted order-item merchandise before later returns, while net sales and finance revenue use different definitions.",
    tradeoff: "One universal revenue metric is convenient but usually wrong for product, seller, and accounting consumers.",
    proof: "Publish formula, exclusions, examples, owner, metric version, and reconciliations from order-item components to the order total.",
  },
  {
    id: "q39", category: "Modeling + finance", question: "Why can finance revenue and product revenue differ?",
    answer: "They use different recognition times and adjustments. Product may report accepted or shipped demand quickly; Finance recognizes settled or earned amounts and applies refunds, chargebacks, taxes, fees, reserves, foreign exchange, and accounting-period rules. Both can be valid if clearly named and linked through immutable movements.",
    tradeoff: "Forcing identical numbers hides timing and policy differences; allowing ungoverned definitions destroys trust.",
    proof: "Build a bridge table from product GMV to net sales to recognized revenue, with every delta assigned to a named rule and version.",
  },

  {
    id: "q40", category: "Serving + ML", question: "How do you support live seller dashboards?",
    answer: "Stream provisional seller-scoped aggregates to a low-latency store or serving API, keyed by seller and time window, with idempotent updates and visible data_as_of. Reconcile them later to certified Iceberg Gold products. Enforce seller identity at the API, row policy, cache key, and export layer.",
    tradeoff: "Fast aggregates can be corrected later; certified lakehouse queries are exact but too slow and costly for interactive operational use.",
    proof: "Cross-tenant tests, cache-key tests, source-to-served drift samples, freshness SLOs, and reconciliation to the certified seller product must pass.",
  },
  {
    id: "q41", category: "Serving + ML", question: "Why should checkout never query Iceberg synchronously?",
    answer: "Iceberg is optimized for analytical scans and durable history, not millisecond availability decisions or transactional concurrency. Checkout must call operational inventory, pricing, promotion, fraud, and payment services. The lakehouse explains, forecasts, trains, and reconciles but never grants stock or authorizes payment.",
    tradeoff: "Duplicating analytical and operational representations adds reconciliation, but coupling checkout to a PB-scale lake creates unacceptable latency and availability risk.",
    proof: "Take Trino and the lakehouse offline in a game day and verify checkout remains correct while analytics shows staleness.",
  },
  {
    id: "q42", category: "Serving + ML", question: "How do you create recommendation online features?",
    answer: "Build versioned features from impressions, clicks, carts, purchases, availability, price, seller quality, and product embeddings. Compute historical features point-in-time in the lakehouse and stream freshness-sensitive counters to an online store. Use the same feature definitions, keys, and transformations for training and serving.",
    tradeoff: "An online store adds cost and consistency work; querying the lake online cannot meet latency or availability needs.",
    proof: "Measure offline/online feature parity, data age, missing rate, skew, training snapshot, feature version, and serving fallback behavior.",
  },
  {
    id: "q43", category: "Serving + ML", question: "How do you prevent ML label leakage?",
    answer: "Construct training examples with point-in-time joins so every feature was available before the prediction timestamp. Pin input snapshots and feature versions, delay labels until their outcome window closes, exclude future returns or settlements, and preserve event availability time separately from business event time.",
    tradeoff: "Strict point-in-time data reduces apparent offline performance and increases pipeline complexity, but leaked models fail in production.",
    proof: "Run temporal leakage tests, backtest with production-like availability delays, and reproduce every training row from pinned snapshots and code.",
  },

  {
    id: "q44", category: "Governance + recovery", question: "How do you monitor end-to-end data freshness?",
    answer: "Record T0 source commit, T1 Kafka append, T2 Bronze archive, T3 Silver trust, T4 Gold publish, and T5 serving refresh. Total age is T5−T0; stage delay is Tn−T(n−1). Publish p50/p95/p99 by product, marketplace, region, schema, and cohort with explicit stale behavior.",
    tradeoff: "Instrumentation adds fields and metrics, but query latency alone cannot reveal old data.",
    proof: "A freshness dashboard must identify the exact losing stage, owner, affected partitions, consumer impact, and last certified version.",
  },
  {
    id: "q45", category: "Governance + recovery", question: "How do you detect semantic and data drift?",
    answer: "Monitor schema changes, nulls, enum growth, distributions, key cardinality, money ranges, currency mix, category proportions, conversion rates, seller/region coverage, and model features against seasonal baselines. Pair automated detection with domain-owned business rules so a valid schema cannot silently change meaning.",
    tradeoff: "Tight thresholds create false alarms during campaigns; loose thresholds miss real regressions.",
    proof: "Backtest alerts on past launches and incidents, segment by expected cohorts, and require owner acknowledgment or a documented release annotation.",
  },
  {
    id: "q46", category: "Governance + recovery", question: "How do you implement privacy deletion in an Iceberg lakehouse?",
    answer: "Resolve all approved identity tokens, discover affected datasets through lineage, delete or anonymize eligible rows, rewrite files, propagate to warehouses, indexes, features, caches, and exports, then expire snapshots only after retention and legal checks. Legally required finance records keep only necessary attributes under documented exception.",
    tradeoff: "Deletion is compute-intensive and conflicts with long time travel; privacy policy determines which snapshots and backups may remain.",
    proof: "Close the request only when every system returns a manifest, discovery finds no eligible copy, exceptions are approved, and audit evidence is immutable.",
  },
  {
    id: "q47", category: "Governance + recovery", question: "How do you enforce seller row isolation?",
    answer: "Propagate a trusted seller_key, enforce it through governed views or an API using authenticated seller identity, include tenant in cache and export keys, deny raw-table access, and test cross-tenant queries continuously. Restricted payout or bank references receive separate column controls and audit.",
    tradeoff: "Centralized APIs and secured views reduce ad hoc flexibility but prevent every consumer from reimplementing tenant logic.",
    proof: "Run positive and negative tenant tests across SQL, API, cache, exports, support tools, and incident access; alert on any mismatched seller key.",
  },
  {
    id: "q48", category: "Governance + recovery", question: "How do you recover from a bad Gold deployment?",
    answer: "Stop candidate publication, pin consumers to the previous certified snapshot, identify affected code, inputs, partitions, and metric versions, then rebuild shadow Gold from trusted Silver or Bronze. Run quality gates and reconciliation, compare deltas, approve, and atomically publish a corrected version with rollback retained.",
    tradeoff: "Shadow rebuild costs extra compute and storage, but in-place repair exposes partial results and weakens auditability.",
    proof: "Retain commit, input/output snapshots, row and money deltas, gate results, approver, incident ID, consumer notification, and rollback proof.",
  },
  {
    id: "q49", category: "Governance + recovery", question: "What is your multi-region data strategy?",
    answer: "Keep checkout ownership and failover in operational services. Ingest regional streams locally, preserve region and ownership epoch, replicate critical metadata and Bronze evidence according to residency policy, and deduplicate global facts using event ID plus authoritative epoch/sequence. Serve regional operational views and build global certified products only after bounded reconciliation.",
    tradeoff: "Global active-active analytics improves availability but increases duplication, ordering ambiguity, cross-region cost, and governance complexity.",
    proof: "Drill region loss, stale owner events, duplicate failover records, catalog restore, and replay; measure RPO/RTO and verify one certified fact per declared key.",
  },
  {
    id: "q50", category: "Governance + recovery", question: "What do you optimize first when platform cost doubles?",
    answer: "First attribute cost by domain, product, pipeline, table, query, and consumer. Then remove waste before weakening correctness: reduce duplicate copies, tune retention, compact small files, prune scans, right-size stream state and checkpoints, use incremental processing, schedule batch capacity, cache stable results, and tier cold data. Protect replay, security, and finance gates.",
    tradeoff: "The cheapest design may violate recovery or freshness; the goal is cost per trusted product outcome, not the smallest infrastructure bill.",
    proof: "Publish unit economics—cost per billion events, TB stored, backfill, query, feature, and certified product—plus SLO and quality impact for each optimization.",
  },
] as const satisfies readonly AmazonInterviewQuestion[];

type AmazonInterviewQuestionId = (typeof AMAZON_INTERVIEW_QUESTIONS)[number]["id"];

export const AMAZON_INTERVIEW_SCENARIOS = {
  q01: {
    question: "Prime Day is approaching. Which Amazon commerce systems produce the evidence your data platform must capture?",
    setup: "A two-day global campaign spans Storefront, Search, Ads, Cart, Orders, Payments, Inventory, Fulfillment, Seller Central, Customer Service, fraud systems, carriers, and payment processors. Identify the authority and capture mode for each rather than calling everything clickstream.",
  },
  q02: {
    question: "During Prime Day, which event family dominates volume, and how do you protect checkout evidence from it?",
    setup: "Billions of product impressions, searches, recommendation renders, clicks, and ad events surge before purchases do. Order and payment facts are lower-volume but higher-criticality, so the design must isolate their topics, quotas, consumers, and recovery paths.",
  },
  q03: {
    question: "How would you calculate Prime Day peak throughput from 10M orders/day and 3B behavior events/day?",
    setup: "Use the chapter assumptions: 30 lifecycle events per order, a 20× order peak, a 10× behavior peak, 1 KB/event, RF3, and 30% broker headroom. Show every unit conversion before recommending capacity.",
  },
  q04: {
    question: "How many Kafka partition lanes would you provision for the modeled Prime Day peak?",
    setup: "The combined modeled peak is 416,666.67 events/s or about 416.67 MB/s at 1 KB/event. Size independent order, payment, inventory, fulfillment, and behavior topics by byte throughput, consumer parallelism, AZ loss, skew, replay, and growth.",
  },
  q05: {
    question: "A customer order has three sellers, two payments, and four packages. Which Kafka keys preserve the ordering that matters?",
    setup: "Order Service emits item lifecycle events, Payments emits attempts and captures, Fulfillment splits packages, and Inventory reserves several SKU-location pairs. Define ordering per domain instead of promising one impossible global order.",
  },
  q06: {
    question: "A Lightning Deal makes one SKU consume 18% of inventory traffic. How do you remove the hot partition safely?",
    setup: "The same product, offer, seller, or null key can overload one broker and one Flink task during a flash sale. Preserve the required SKU-location ordering while isolating or deterministically sharding only commutative work.",
  },
  q07: {
    question: "Why archive every Amazon domain topic to S3 Bronze when MSK already retains messages?",
    setup: "A finance rule bug is found ninety days after the campaign, long after the seven-day Kafka window. Rebuild the exact order and payment facts from original payloads, schema IDs, and source coordinates without treating Kafka as a decade-long archive.",
  },
  q08: {
    question: "What Kafka retention would you choose for orders, payments, behavior, and partner feeds?",
    setup: "Payments need a safe rollback window, behavior can often use shorter retention, and slow carrier or settlement files use a different replay mechanism. Derive each duration from detection and recovery rather than selecting one policy for every topic.",
  },
  q09: {
    question: "Order-table CDC is six hours behind during a campaign. What happens to the platform and to checkout?",
    setup: "The source database continues serving customers while the connector’s source position ages and logs accumulate. Explain stale-product behavior, log protection, safe catch-up, and why analytics never applies backpressure to the order transaction path.",
  },
  q10: {
    question: "Order Service commits an order and crashes before publishing order_placed. How do you prevent losing the event?",
    setup: "The customer has a confirmed order in the operational database, but a direct Kafka write never happened. Use a transactional outbox, stable event ID, CDC, and idempotent downstream facts to close this dual-write failure window.",
  },
  q11: {
    question: "How do you bootstrap CDC for a multi-terabyte Orders database while new orders keep arriving?",
    setup: "The initial snapshot may take hours, but writes, cancellations, and amendments continue. Tie a consistent snapshot to an exact source-log position, buffer later changes, and prove the handoff has neither a gap nor a double application.",
  },
  q12: {
    question: "A seller deletes a listing while old orders and legal finance records must remain. How should CDC deletes propagate?",
    setup: "Catalog search should stop serving the offer, historical order items must keep purchased context, and customer or seller identity may need minimization. Choose tombstone, Type-2 closure, hard delete, or anonymization per product and policy.",
  },
  q13: {
    question: "Two order updates share the same timestamp but different database sequences. Which one wins?",
    setup: "A cancellation and fulfillment amendment arrive out of order after connector recovery. Use the authoritative LSN, aggregate version, or source sequence—not arrival time or a duplicated millisecond timestamp—to reconstruct state.",
  },
  q14: {
    question: "Regional retry emits order_placed twice. How do realtime and batch paths deduplicate it?",
    setup: "Both records carry the same event_id but may arrive through different brokers and after different delays. Bound realtime state for speed, preserve raw duplicates, and make Silver certification complete across the full replay range.",
  },
  q15: {
    question: "A payment capture is replayed after a Flink restart. What does exactly-once mean to Amazon Finance?",
    setup: "The transport can redeliver and the stream job can retry, but finance must retain one immutable capture movement and one downstream accounting effect. Explain IDs, checkpoints, sink commits, and reconciliation at the business grain.",
  },
  q16: {
    question: "A mobile add-to-cart event arrives twelve hours late after the order was already placed. How do you handle it?",
    setup: "The phone was offline and its clock may be skewed. Preserve event and ingest time, keep server order events authoritative, correct the funnel within policy, and avoid reopening finalized money or inventory state from client telemetry.",
  },
  q17: {
    question: "What watermark would you use for server orders versus mobile behavior during Prime Day?",
    setup: "Order events use trusted server time and normally arrive quickly; app clicks have longer network and offline tails. Select separate completeness policies and show how each changes window finality, state size, and correction volume.",
  },
  q18: {
    question: "Which Amazon streaming states need TTL, and what happens when an incomplete lifecycle expires?",
    setup: "The jobs hold dedupe IDs, carts, sessions, payment attempts, order milestones, attribution windows, and inventory buffers. Define a business horizon and an explicit expired/incomplete outcome instead of keeping unbounded keyed state forever.",
  },
  q19: {
    question: "Would you use Flink or Spark Structured Streaming for live order health and recommendation features?",
    setup: "Order health needs event-time timers and stateful lifecycles in seconds, while some feature and lakehouse updates tolerate micro-batches. Compare the two against these exact workloads, team skills, checkpoints, and sink guarantees.",
  },
  q20: {
    question: "A stateful inventory stream loses its latest checkpoint during a campaign. How do you recover safely?",
    setup: "Inventory movements continued landing in Kafka and Bronze while the job failed. Restore an older valid state, replay pinned offsets into idempotent sinks, reconcile SKU-location totals, and keep checkout on the operational inventory service.",
  },
  q21: {
    question: "Why store Amazon order, payment, and inventory tables in Iceberg instead of unmanaged Parquet folders?",
    setup: "Spark backfills, Flink writes, Trino queries, schema changes, row corrections, and compaction operate concurrently over years of history. Explain which table-format guarantees prevent readers from observing partial or ambiguous data.",
  },
  q22: {
    question: "A new daily-sales job publishes the wrong number. How do Iceberg snapshots contain the incident?",
    setup: "Files for the bad result exist, but consumers should stay on yesterday’s certified table version. Use atomic snapshots, pinned inputs, version comparison, rollback, and a corrected republish with full lineage.",
  },
  q23: {
    question: "Why did the Prime Day clickstream table create millions of tiny S3 files?",
    setup: "Thousands of writers emit short micro-batches into hour, region, event-type, and app-version partitions. Diagnose over-partitioning, writer count, retries, low-volume keys, and uncoordinated jobs before scheduling blind compaction.",
  },
  q24: {
    question: "How would you compact the hottest Amazon Iceberg partitions without blocking ingestion?",
    setup: "Yesterday’s marketplace-hour partitions contain 20 MB files while live writers and analysts remain active. Select bounded partitions, coordinate commits, target useful file sizes, and separate data rewrite from snapshot expiry and orphan cleanup.",
  },
  q25: {
    question: "How would you partition a multi-petabyte product-impression table for search and recommendation analysis?",
    setup: "Analysts query recent hours by marketplace and join impressions to product, offer, experiment, and later purchases. Choose time transforms, coarse dimensions, bucketing or sorting, and avoid turning every session or product into a physical partition.",
  },
  q26: {
    question: "Why is customer_id a dangerous Iceberg partition for Amazon behavior data?",
    setup: "Hundreds of millions of customers have uneven activity and privacy workflows. Explain the tiny-partition explosion and choose time partitioning plus tokenized-key bucketing or sorting for customer-local joins.",
  },
  q27: {
    question: "Queries shift from daily marketplace scans to hourly regional incident analysis. How do you evolve the table layout?",
    setup: "Years of old files use a day transform while new operational queries need finer pruning. Use Iceberg partition evolution for future files, measure mixed-spec planning, and rewrite old history only when the savings justify it.",
  },
  q28: {
    question: "A promotion-allocation bug requires a 2 PB order-item backfill. How do you execute it safely?",
    setup: "Live orders continue publishing and Finance cannot see partial corrections. Pin inputs, split by bounded marketplace/date slices, isolate compute, write shadow outputs, validate money and counts, and atomically cut over.",
  },
  q29: {
    question: "How do you prevent the 2 PB backfill from overwriting live order corrections?",
    setup: "The historical rebuild and daily production job touch overlapping partitions and metric versions. Define ownership boundaries, use shadow tables or branches, compare deltas, and publish through one controlled metadata operation.",
  },
  q30: {
    question: "One mega-seller and one Lightning Deal make a Spark stage run ten times longer. How do you fix the skew?",
    setup: "Most seller-product keys are small, but a few tasks spill terabytes. Measure the distribution, isolate exceptional keys, pre-aggregate, use AQE, and salt only where a later merge preserves the fact grain.",
  },
  q31: {
    question: "Would you broadcast the product, seller, currency, or reason-code dimension in a Spark order build?",
    setup: "Currency and controlled reason codes are tiny; full product and seller Type-2 history may be large after filtering. Decide from serialized post-filter bytes, executor memory, concurrency, and plan stability—not a stale row count.",
  },
  q32: {
    question: "One Amazon order contains three items from two sellers and ships in four packages. What is the sales fact grain?",
    setup: "Order-level payment and shipping totals must not multiply when joined to items, sellers, packages, cancellations, and returns. Define one accepted order-item row and name the bridges or allocation rules for other grains.",
  },
  q33: {
    question: "Why keep immutable order events when Seller Central already has a current order-item status table?",
    setup: "A seller sees SHIPPED now, but an incident review needs the accepted, allocated, cancelled, shipped, delivered, and returned transitions. Preserve event evidence and rebuild the convenient state projection deterministically.",
  },
  q34: {
    question: "How do you model an Amazon product, its red 128 GB SKU, a third-party seller, and that seller’s offer?",
    setup: "Several sellers can list the same variant with different price, condition, fulfillment program, and promise. Separate product, SKU, seller, and effective-dated offer so the purchased item retains the exact commercial context.",
  },
  q35: {
    question: "A Lightning Deal changes a seller offer from ₹1,499 to ₹1,299 during checkout. Which price should history retain?",
    setup: "Catalog and offer prices continue evolving after purchase. Store the accepted order-item monetary components and selected offer version instead of reconstructing revenue from the latest price table.",
  },
  q36: {
    question: "An FC reports 120 units, but movement-derived inventory says 117. How do you model and reconcile the difference?",
    setup: "Receipts, reservations, releases, ships, damage, transfers, and inspected returns all affect one SKU-location. Use immutable signed movements for explanation and periodic snapshots for fast state analysis.",
  },
  q37: {
    question: "Captured payments exceed processor settlement after a high-volume sale. How do you reconcile the gap?",
    setup: "The difference may be refunds, chargebacks, fees, currency, duplicates, missing files, or timing. Reconcile immutable payment movements in minor units and keep every unexplained delta in an owned finance exception table.",
  },
  q38: {
    question: "Should Amazon GMV include cancelled items, tax, shipping, gift cards, and later returns?",
    setup: "Product, Seller, and Finance teams request one GMV number but need different decisions and recognition points. Define a versioned order-item formula, inclusion event, components, exclusions, currency policy, and bridge to related metrics.",
  },
  q39: {
    question: "Why can the Prime Day product dashboard and the Finance close report different revenue?",
    setup: "The dashboard shows rapid accepted or shipped demand, while Finance applies settlement, refunds, chargebacks, fees, tax, reserves, FX, and accounting periods. Explain both without letting two unnamed ‘revenue’ columns coexist.",
  },
  q40: {
    question: "How would you serve a live Seller Central dashboard without exposing another seller’s orders?",
    setup: "Millions of sellers expect low-latency orders, inventory, returns, and payout indicators. Stream provisional seller aggregates to a serving API, reconcile later to Gold, and enforce tenant identity in SQL, API, cache, and export paths.",
  },
  q41: {
    question: "Why can’t Amazon checkout query Iceberg to decide whether a SKU is available?",
    setup: "The lake may contain a recent inventory snapshot, but checkout needs millisecond authority, reservation concurrency, and high availability. Keep operational inventory authoritative and use the lake only for explanation, forecasting, reconciliation, and ML.",
  },
  q42: {
    question: "How do you build online recommendation features for an Amazon product page?",
    setup: "The ranker needs recent impressions, clicks, carts, purchases, price, availability, seller quality, and product embeddings. Combine point-in-time historical features with streamed counters and enforce the same versioned definitions offline and online.",
  },
  q43: {
    question: "How could future returns or settlement outcomes leak into an Amazon purchase model?",
    setup: "A training row predicts conversion at impression time, but a careless join sees features computed days later or a return label before its window closed. Pin snapshots and join by information availability time, not merely business date.",
  },
  q44: {
    question: "Seller Central queries in 80 ms but shows inventory from an hour ago. Is the data product healthy?",
    setup: "Query latency is fast while producer, Kafka, Silver, Gold, or cache freshness is broken. Track source commit through serving refresh and expose data_as_of, stage delay, and stale behavior to the consumer.",
  },
  q45: {
    question: "Payment failures jump from 3% to 40% after a release, but the schema still validates. How do you detect semantic drift?",
    setup: "A new producer maps an enum or monetary unit incorrectly for one marketplace. Combine schema contracts with cohort distributions, business invariants, release annotations, and domain-owned thresholds.",
  },
  q46: {
    question: "A customer requests deletion. How do you remove eligible identity from Iceberg history and derived systems?",
    setup: "The customer appears in identity tables, behavior facts, order history, features, indexes, caches, exports, and old snapshots, while some accounting records have legal retention. Resolve tokens, apply policy-specific deletion or anonymization, and prove every eligible copy is handled.",
  },
  q47: {
    question: "How do you prove Seller A can never read Seller B’s orders, payouts, or performance metrics?",
    setup: "A cache-key or row-policy bug could cross tenant boundaries even when the underlying Gold table is correct. Enforce seller identity in every serving path and continuously test both allowed and denied access.",
  },
  q48: {
    question: "A bad Gold release understates daily sales by 18%. How do you recover without showing partial repairs?",
    setup: "Finance and executives are using the prior certified snapshot while the affected marketplace-date slices are rebuilt. Pin inputs, publish to shadow output, reconcile counts and money, approve, and swap one atomic table version.",
  },
  q49: {
    question: "An AWS-region failover produces duplicate order and payment events. What is the Amazon data strategy?",
    setup: "Operational services change ownership epochs while both regional streams temporarily contain evidence for the same entities. Preserve both raw records, select the authoritative epoch and sequence in Silver, and reconcile global products after regional recovery.",
  },
  q50: {
    question: "Amazon’s data-platform bill doubles after Prime Day. What do you optimize first without weakening trust?",
    setup: "Costs span streaming, S3, Spark, Trino/warehouse, online stores, ML, and cross-region transfer. Attribute spend to products and consumers, remove file/query/retention waste, and preserve replay, finance gates, privacy, and recovery SLOs.",
  },
} as const satisfies Record<AmazonInterviewQuestionId, { question: string; setup: string }>;
