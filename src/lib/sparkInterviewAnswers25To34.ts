import type { InterviewAnswer, InterviewAnswerCodeBlock, InterviewAnswerDiagram } from "@/lib/interviewAnswers";

function detailedAnswer(
  summary: string,
  points: string[],
  example: string,
  takeaway: string,
  diagrams?: InterviewAnswerDiagram[],
): InterviewAnswer {
  return {
    summary,
    sections: [{ heading: "Detailed explanation", points }],
    example,
    takeaway,
    diagrams,
  };
}

export const SPARK_INTERVIEW_ANSWERS_25_TO_34: Record<string, InterviewAnswer> = {
  "What are broadcast variables, and when should you use them?": detailedAnswer(
    "A broadcast variable is Spark's read-only, cluster-wide reference to a value that is serialized by the driver and distributed efficiently to executors. Tasks use a locally cached copy instead of receiving the same large object inside every task closure. Use it for reusable lookup data or model/configuration state that comfortably fits executor memory; do not confuse it with a broadcast join, which is a Spark SQL physical join strategy.",
    [
      "The end-to-end lifecycle is: create the value on the driver, call `SparkContext.broadcast`, capture only the small broadcast handle in task closures, read `broadcast.value` inside executor code, and release old versions with `unpersist` or `destroy` after all consumers finish.",
      "A normal object captured by a closure may be serialized with every task. A broadcast is transferred as blocks and cached so many tasks on the same executor can reuse it, reducing task size and network traffic.",
      "The value must be treated as immutable after broadcasting. Worker-side mutation is not coordinated and can make different processes observe different state; publish a new broadcast for a new version.",
      "Good candidates include compact dimension lookups, rule maps, stop-word sets, and inference parameters that are reused across many partitions. The serialized and materialized size must fit alongside task working memory on every executor.",
      "Access the value inside the transformation, not on the driver before the closure is created. In PySpark, Python worker processes can materialize their own Python representation, so actual process memory may exceed the simple 'one per executor' mental model.",
      "A DataFrame broadcast join should normally be expressed with optimizer statistics or `broadcast(df)`. A raw broadcast variable is appropriate for application logic that cannot be represented as a relational join, but built-in SQL expressions are usually more optimizable than Python lookups.",
    ],
    "If 4,000 country codes map to regions, broadcast the map once and consult `bc.value` from each partition. Do not broadcast a 20 GB customer table just to avoid a shuffle; a distributed join is safer because every executor would otherwise need that large value.",
    "Broadcast small, immutable, repeatedly reused state; verify its serialized and in-memory size rather than deciding from row count alone.",
    [{
      title: "Broadcast variable lifecycle",
      steps: [
        { label: "Driver", detail: "Serialize one immutable value" },
        { label: "Distribute", detail: "Transfer it as reusable broadcast blocks" },
        { label: "Executors", detail: "Cache and materialize the value locally" },
        { label: "Tasks", detail: "Read the local value across many partitions" },
        { label: "Release", detail: "Unpersist or destroy when no longer needed" },
      ],
    }],
  ),
  "Are broadcast variables copied once per task or once per executor?": detailedAnswer(
    "Conceptually, Spark distributes a broadcast once to each executor that needs it and reuses the cached blocks across that executor's tasks, rather than embedding a fresh serialized copy in every task. That is the important performance distinction, although 'exactly one in-memory object per executor' is too literal for every runtime and language.",
    [
      "Spark stores broadcast blocks through the executor's block manager. Later tasks on that executor can reconstruct or reuse the value without retransmitting the entire payload from the driver.",
      "An executor can evict broadcast blocks under storage pressure and fetch them again later. Executor replacement and dynamic allocation also mean the value may be transmitted more than once during the application's lifetime.",
      "In JVM code, deserialization and serializer behavior determine the local representation. In PySpark, separate Python worker processes may each load a Python copy even though Spark's executor-side broadcast data was distributed efficiently.",
      "Capturing the original object in the closure as well as the broadcast reference defeats the purpose: the closure can still carry the large object per task. Only capture the small broadcast handle.",
      "The correct interview wording is 'cached per executor/machine for task reuse,' with the qualification that eviction, worker processes, and executor churn affect physical copies.",
    ],
    "With 500 tasks and 10 executors, a 50 MB closure value could be serialized repeatedly for hundreds of tasks. Broadcasting it aims for roughly executor-level distribution and reuse, although Python workers and replacement executors can create additional materializations.",
    "Broadcasting changes distribution from task-level shipping to executor-level reuse; it does not promise one permanent physical object for the whole process lifetime.",
  ),
  "Can you modify a broadcast variable after creating it?": detailedAnswer(
    "No. The application must treat a broadcast value as immutable after `broadcast(...)` is called. Spark does not provide a coherence protocol that propagates later driver or executor mutations, so modifying the original object or a worker-local copy can produce stale and inconsistent results.",
    [
      "Serialization captures a version of the value. A later change to the driver's original collection does not update blocks already distributed to executors.",
      "Mutating `bc.value` inside a task changes, at most, that process's local materialization. Other tasks may run in another executor or Python worker and will not observe the same mutation.",
      "If reference data changes, construct and broadcast a new immutable value, switch future work to the new handle, then release the old broadcast only after no running tasks require it.",
      "For continuously changing reference data, frequent rebroadcasts may be expensive or difficult to synchronize. A versioned table, temporal join, stream-table pattern, or external serving store may model the requirement better.",
      "Immutable use also makes task retries deterministic: a retried task reads the same logical input instead of whichever mutations happened before its new attempt.",
    ],
    "To publish exchange rates for a new hour, create `rates_v2 = sc.broadcast(new_rates)` and use that version in a new action. Do not update a dictionary inside `rates_v1.value` while tasks from the previous action are still running.",
    "A broadcast is a versioned read-only snapshot, not shared mutable cluster memory.",
  ),
  "What happens if a broadcast variable is very large?": detailedAnswer(
    "A very large broadcast can move the bottleneck rather than remove it. The driver must serialize and publish the value, the network must distribute it, and every participating executor must store and often deserialize it in addition to running task workloads. The result can be long startup, broadcast timeouts, eviction pressure, garbage collection, or executor/container out-of-memory failures.",
    [
      "Source-file size is a poor proxy for broadcast size: compression may expand substantially and JVM/Python objects can occupy several times their serialized representation.",
      "Broadcast cost is multiplied by executor count. A 2 GB value sent to 40 executors consumes cluster-wide network and storage even though each executor receives it efficiently only when needed.",
      "The driver can fail while collecting or serializing a DataFrame for a broadcast join. Executors can fail later while materializing the hashed relation or application object.",
      "A forced broadcast hint can bypass the automatic size threshold, but it cannot create memory. Increasing `spark.sql.broadcastTimeout` only helps a slow transfer; it does not make an oversized relation safe.",
      "Reduce columns and rows, pre-aggregate, encode the lookup compactly, or use a shuffle-based distributed join when the data does not have a comfortable, measured memory margin.",
    ],
    "A dimension table may be 300 MB as compressed Parquet but expand to multiple gigabytes as an in-memory hashed relation. Broadcasting it to every executor can fail even though its on-disk size looked modest.",
    "Evaluate serialized, deserialized, and hashed size per executor; if the margin is uncertain, keep the operation distributed.",
  ),
  "What happens when a new executor joins the application?": detailedAnswer(
    "A newly allocated executor does not inherit another executor's process memory. When one of its tasks first needs a broadcast, Spark obtains the broadcast blocks through its distribution mechanism, stores them in the new executor's block manager, and reconstructs the value locally. This happens lazily, so an executor that never uses the broadcast need not materialize it.",
    [
      "Spark's broadcast implementation distributes chunked blocks and can use the driver and available peers, avoiding a single unchunked object transfer for every task.",
      "Dynamic allocation therefore changes total broadcast traffic: executors added later fetch the value, while removed executors take their cached copy with them.",
      "If the broadcast was only `unpersist`ed, its executor copies can be fetched and rebuilt when referenced again. If it was `destroy`ed, the handle is permanently unusable and tasks that need it will fail.",
      "First-use latency on a new executor can make its initial tasks slower, particularly for a large broadcast, but subsequent tasks can reuse the cached data.",
      "Repeated executor churn can repeatedly pay transfer and materialization costs; investigate unstable executors or overly aggressive allocation rather than assuming broadcasting is free.",
    ],
    "A streaming application scales from 5 to 12 executors. The seven new executors fetch the lookup broadcast when their assigned tasks first access it; the original five continue using their existing cached blocks.",
    "Broadcast state follows demand: each new executor fetches and caches it when required, which makes executor churn a real performance consideration.",
  ),
  "How do you remove broadcast variables from memory?": detailedAnswer(
    "Call `unpersist()` when executor copies are no longer immediately useful, or `destroy()` when the broadcast must never be used again. These operations have different semantics: unpersist removes cached executor blocks but preserves the broadcast so a later access can fetch it again; destroy removes the broadcast's data and metadata permanently.",
    [
      "`unpersist(blocking=False)` initiates asynchronous removal by default; a blocking form waits for executor-side removal acknowledgements. The driver-side handle remains valid.",
      "`destroy()` is terminal. Do not call it while pending or retryable tasks still reference the broadcast, and never plan to reuse that broadcast afterward.",
      "Release old versions in long-running applications. Keeping every lookup/model version referenced can consume storage memory and cause evictions of other useful blocks.",
      "Dropping a Python/JVM variable reference or relying on garbage collection is not an explicit cluster-wide lifecycle decision. Use the broadcast API to communicate intent.",
      "Coordinate lifecycle with actions: create, use it in completed jobs, wait until no later stage/retry needs it, then unpersist or destroy.",
    ],
    "After a completed backfill, `country_lookup.unpersist()` frees executor cache while allowing accidental later reuse to refetch it. At final shutdown or after replacing the version with no outstanding jobs, `country_lookup.destroy()` makes the old broadcast unusable.",
    "Use unpersist for reversible cache release and destroy for irreversible retirement after all consumers have finished.",
  ),
  "What is the difference between a broadcast variable and an accumulator?": detailedAnswer(
    "They move information in opposite directions and serve different correctness models. A broadcast distributes a read-only value from the driver to tasks for efficient reuse. An accumulator lets tasks contribute associative additions that the driver can observe, commonly for diagnostics such as counters; workers should not use its value to control computation.",
    [
      "Broadcast flow is driver to executors: tasks read `broadcast.value`, but changes are not merged back. Accumulator flow is executors to driver: tasks add updates, and only the driver reads the authoritative result.",
      "Broadcasts carry reference data such as maps or models. Accumulators carry aggregated telemetry such as malformed-record counts, although Spark metrics or DataFrame aggregations are often easier to reason about.",
      "Task retries and speculative attempts make accumulator updates subtle. Updates from actions have defined handling, but using accumulators inside recomputed transformations can still make operational interpretation difficult.",
      "Neither is general shared mutable state. A broadcast cannot be updated cluster-wide, and an accumulator cannot reliably send a current global value back into task decisions.",
      "For business-critical counts, produce a normal aggregation/output whose lineage and retry semantics are explicit; treat accumulators primarily as observations and debugging aids.",
    ],
    "Broadcast a set of prohibited codes so every task can test membership. Increment an accumulator when a malformed input is observed so the driver can report a diagnostic count after the action.",
    "Broadcasts distribute immutable inputs; accumulators collect task-side additions for the driver.",
  ),
  "When should you force a broadcast join?": detailedAnswer(
    "Force a broadcast join only when reliable knowledge shows one filtered join side is safely small on every executor and Spark's statistics or threshold would otherwise miss that opportunity. A hint is most defensible when statistics are stale or unavailable, the join is performance-critical, and production-size tests confirm driver collection, transfer, hash-table construction, and executor memory all have margin.",
    [
      "Prefer correcting table statistics and allowing Catalyst/AQE to choose. A forced hint can remain in code after the supposedly small dimension grows, turning a performance optimization into a failure mode.",
      "Project and filter the build side before broadcasting. Estimate its materialized hashed size, not only compressed file bytes or an average row count.",
      "Join type and condition constrain the valid build side and physical strategy. Spark prioritizes join hints, but it can ignore a hint when that strategy does not support the requested join.",
      "Check the final executed plan for `BroadcastHashJoin` or another broadcast strategy and monitor broadcast duration/size. A source-level hint is a request, not proof of the chosen plan.",
      "Avoid forcing broadcast when executors have tight memory, the table size is volatile, or many concurrent queries would each hold their own relation. Sort-merge may be slower but more robust.",
    ],
    "A 15 MB filtered country dimension exceeds a conservative 10 MB automatic threshold because catalog statistics are missing. After measuring a 28 MB in-memory hashed relation with ample executor headroom, `broadcast(countries)` can avoid shuffling a multi-terabyte fact table.",
    "Force broadcast from measured, stable build-side size and validate the executed plan; never use the hint as a substitute for sizing.",
  ),
  "Can broadcasting improve performance when there is no join?": detailedAnswer(
    "Yes. A broadcast variable can improve any distributed operation that repeatedly needs the same small read-only object, even when there is no relational join. It avoids resending that object in each task closure and can support lookups, parsing rules, model inference, validation, or custom partition-level logic.",
    [
      "Examples include a compiled rule set, token vocabulary, geofence metadata, feature-scaling parameters, or a small mapping used inside `mapPartitions`.",
      "The benefit appears only when task closure shipping or repeated initialization is meaningful. Broadcasting a tiny constant adds lifecycle and indirection without measurable value.",
      "Prefer Spark SQL built-in expressions for DataFrame logic when possible because Catalyst can optimize them, generate code, and avoid Python serialization boundaries.",
      "For expensive non-serializable resources such as database clients, broadcasting is not appropriate. Broadcast configuration, then construct one client per partition with controlled concurrency.",
      "The same memory qualification applies as for joins: every consuming executor or Python worker may materialize the object, so reuse must justify its footprint.",
    ],
    "A text-classification job can broadcast a compact vocabulary and weights, then score many records per partition. This is not a DataFrame join, but it avoids packaging the model with every task.",
    "Broadcasting is a reusable-data distribution primitive, not only a join optimization.",
  ),

  "How does Spark handle joins?": detailedAnswer(
    "Spark separates the logical join requested by the application from the physical algorithm that executes it. Catalyst analyzes keys, join type, statistics, hints, and supported strategies; it may choose a broadcast, shuffle-and-sort, shuffled hash, or nested-loop plan. Adaptive Query Execution can revise parts of that decision using runtime shuffle statistics.",
    [
      "The planning sequence is: analyze the requested join semantics, apply logical optimizations such as filters and column pruning, estimate candidate physical strategies from statistics and hints, insert required Exchanges/sorts, and then let AQE revise eligible decisions from runtime stage statistics.",
      "Equi-joins expose hash and sort strategies. Non-equi conditions and cross joins often require broadcast nested-loop or Cartesian-style execution, which can be much more expensive.",
      "A broadcast hash join distributes a small build side and streams the large side without shuffling it. A sort-merge join shuffles both sides by compatible key partitioning and sorts each partition before merging.",
      "A shuffled hash join shuffles both sides but builds a per-partition hash table for the smaller side; it is attractive only when those local build partitions fit memory. Nested-loop approaches compare broader combinations and need tight size control.",
      "Join semantics—inner, outer, semi, anti, cross—and null behavior are separate from the physical strategy. The same logical inner join can be implemented by several algorithms.",
      "Production optimization begins with `explain` and the final AQE plan, then checks shuffle bytes, skew, broadcast size, spills, output cardinality, and key quality rather than assuming a strategy from source code.",
    ],
    "Joining a 3 TB events table to a 20 MB filtered dimension can become a broadcast hash join. Joining two 3 TB event tables will normally require distributed exchanges, often a sort-merge join, unless prior compatible distribution can be reused.",
    "Spark chooses a physical join from semantics, conditions, sizes, hints, and runtime evidence; always verify the executed plan.",
    [
      {
        title: "Physical join decision",
        steps: [
          { label: "Logical join", detail: "Keys, condition and join type" },
          { label: "Estimate", detail: "Statistics, filters and hints" },
          { label: "Choose", detail: "Broadcast, sort-merge, hash or nested loop" },
          { label: "Exchange", detail: "Distribute data required by that strategy" },
          { label: "Adapt", detail: "AQE may revise using runtime sizes" },
        ],
      },
      {
        title: "Large-to-small: broadcast hash join",
        steps: [
          { label: "Small relation", detail: "Collect and materialize the build side" },
          { label: "Broadcast", detail: "Distribute it to participating executors" },
          { label: "Local hash table", detail: "Build the lookup on every executor" },
          { label: "Large relation", detail: "Stream its existing partitions locally" },
          { label: "Result", detail: "Avoid a large-side shuffle" },
        ],
      },
      {
        title: "Large-to-large: sort-merge join",
        steps: [
          { label: "Exchange left", detail: "Hash-partition the left side by key" },
          { label: "Exchange right", detail: "Use compatible key partitions" },
          { label: "Sort", detail: "Order both inputs within each partition" },
          { label: "Merge", detail: "Scan matching ordered keys together" },
          { label: "Monitor", detail: "Check shuffle, spill, skew and output growth" },
        ],
      },
    ],
  ),
  "What join types and join strategies are available in Spark?": detailedAnswer(
    "Join types define which rows appear in the result; join strategies define how Spark computes that result. Spark SQL supports inner, left/right/full outer, cross, left semi, and left anti joins. Physical strategies include broadcast hash, sort-merge, shuffled hash, broadcast nested-loop, and Cartesian product where applicable.",
    [
      "Inner returns matching combinations. Outer joins preserve unmatched rows from the requested side or sides and fill missing columns with nulls. Cross produces the Cartesian product.",
      "Left semi returns only left columns for left rows that have at least one match. Left anti returns only left columns for left rows with no match; they are existence filters, not shortened outer joins.",
      "Broadcast hash is usually ideal for an equi-join with a genuinely small build side. Sort-merge is robust for large equi-joins because both sides can be shuffled and sorted with spill support.",
      "Shuffled hash builds local hash tables after an exchange and needs one side's partitions to fit. Broadcast nested-loop supports conditions/types that hash joins cannot, but its comparisons can be expensive.",
      "Hints include BROADCAST, MERGE, SHUFFLE_HASH, and SHUFFLE_REPLICATE_NL. Spark considers hint priority and strategy support; it does not guarantee that every requested hint can be honored.",
    ],
    "A customer existence check is naturally a left semi join even if Spark physically uses sort-merge. A range condition between a tiny rule table and a huge fact table may use broadcast nested-loop because the condition is not a simple equality key.",
    "State logical semantics first, then discuss the physical strategy Spark selects to implement them.",
  ),
  "What is the difference between a broadcast hash join and a sort-merge join?": detailedAnswer(
    "A broadcast hash join sends one small relation to every executor, builds an in-memory hash table, and streams partitions of the large relation through it; it avoids shuffling the large side. A sort-merge join exchanges both relations by join key, sorts each resulting partition, and merges ordered streams; it handles two large inputs more safely but pays network and sort costs.",
    [
      "Broadcast hash has an executor-level memory requirement for the entire build relation and a driver/distribution cost. Its speed comes from eliminating one or both large-side exchanges, not from making the join free.",
      "Sort-merge distributes both sides, so no executor must hold a complete relation. Sorting and shuffle spill make it more tolerant of large data, though hot keys can still create oversized partitions.",
      "Both are mainly equi-join strategies. Join type determines which side may legally be built/broadcast and how unmatched rows are preserved.",
      "Compressed source size is not comparable to an in-memory broadcast hash relation. Conversely, sort-merge cost depends on post-filter bytes, partition count, network, disk, and whether compatible ordering/distribution already exists.",
      "AQE may convert a planned sort-merge join to broadcast when runtime statistics reveal a small side, or optimize skewed shuffle partitions where supported.",
    ],
    "For 5 TB of transactions joined to a stable 30 MB dimension, broadcast hash can avoid moving the transactions. For 5 TB joined to 2 TB, sort-merge is usually safer because neither whole side fits on every executor.",
    "Broadcast hash trades per-executor memory for avoiding a large shuffle; sort-merge trades network/sort work for scalable distributed execution.",
  ),
  "What happens when both sides of a join are very large?": detailedAnswer(
    "When neither side can be safely broadcast, Spark normally performs a distributed join: both sides are exchanged into compatible key partitions, then joined within each partition—commonly by sort-merge. The job's cost is driven by bytes after filtering/projection, key distribution, sort/spill behavior, and output cardinality, not merely the input row counts.",
    [
      "Filter and project before the exchange so unused rows and columns do not cross the network. Pre-aggregate when the business logic permits, reducing repeated keys before the join.",
      "Choose enough shuffle partitions that a normal partition's sort/hash working set fits, while retaining several task waves. AQE can coalesce tiny partitions and split qualifying skewed partitions.",
      "Detect skew separately from average size. A single hot key can send a huge fraction of both inputs and an even larger many-to-many output to one reduce partition.",
      "Bucketing, clustering, or retained compatible partitioning can reduce exchanges in specific plans, but merely storing data in date directories does not co-partition it by an arbitrary join key.",
      "Provision shuffle network and local spill disk, then monitor remote bytes, fetch wait, spill, GC, and maximum-versus-median task duration. More heap alone cannot repair an explosive join.",
    ],
    "Two clickstream tables each contain trillions of rows. Pruning to one day and required columns, deduplicating by event ID, using a measured shuffle count, and handling a null/hot key can reduce terabytes of unnecessary exchange and prevent one straggler partition.",
    "Large-large joins are distributed data-layout problems: reduce the data, partition it evenly, and control output multiplicity.",
  ),
  "How does Spark decide which join strategy to use?": detailedAnswer(
    "Catalyst evaluates the logical join type and condition, legal build side, available size statistics, explicit hints, broadcast thresholds, and key orderability. Without hints, the simplified precedence among eligible strategies is broadcast hash join, conditional shuffled hash join, sort-merge join, Cartesian product for an inner-like non-equi join, and broadcast nested-loop join as the final fallback. AQE can revise supported decisions using runtime shuffle-stage sizes.",
    [
      "Equality keys enable hash and sort-merge strategies. A non-equi condition may leave broadcast nested-loop or Cartesian-like choices, especially if no small side or selective condition exists.",
      "Catalog statistics, file statistics, and propagated filter estimates influence whether a side appears broadcastable. Missing or stale statistics can cause a poor initial choice.",
      "No-hint precedence for an eligible equi-join starts with broadcast hash join when one legal build side is under `spark.sql.autoBroadcastJoinThreshold` (10 MiB by default). If both sides qualify, Spark generally builds the smaller side.",
      "Shuffled hash join is considered next only when `spark.sql.join.preferSortMergeJoin=false` (the default is `true`), one legal build side is much smaller, and each post-shuffle build partition is expected to fit in memory. Otherwise Spark prefers sort-merge when the equi-join keys are orderable.",
      "For an inner-like join without usable equi-keys, Spark can choose a Cartesian product. Broadcast nested-loop join is the fallback for remaining supported combinations, including non-equi outer joins; this fallback can be extremely expensive.",
      "Build-side legality depends on join type: inner can build either side; left outer, left semi, and left anti build the right; right outer builds the left. Full outer cannot use broadcast hash join. Shuffled hash join supports full outer joins in Spark 3.1+, otherwise sort-merge is the normal scalable choice.",
      "Join hints influence selection with documented priority—broadcast before merge, shuffled hash, and shuffle-replicate nested loop—but unsupported combinations may not use the requested strategy.",
      "Configuration includes the automatic broadcast threshold and preferences such as sort-merge behavior. AQE can observe smaller runtime relations, coalesce exchanges, and address supported skew cases.",
      "The only reliable proof is the executed plan after the action. Inspect initial and final AQE plans, actual broadcast/shuffle sizes, and warnings that a hint was not supported.",
    ],
    "A table estimated at 50 GB may shrink to 5 MB after a selective filter. Runtime stage statistics can let AQE convert a planned sort-merge join into a broadcast join even when compile-time estimates were poor.",
    "Join selection is cost- and capability-driven, then potentially adaptive; source-code order alone does not determine the algorithm.",
    [{
      title: "Hash-join build-side rules",
      steps: [
        { label: "Inner", detail: "Either side may be the build side; Spark generally chooses the smaller eligible side" },
        { label: "Left outer", detail: "Build the right side so every left row can be preserved" },
        { label: "Left semi / anti", detail: "Build the right side used for the existence test" },
        { label: "Right outer", detail: "Build the left side so every right row can be preserved" },
        { label: "Full outer", detail: "Broadcast hash is unsupported; shuffled hash is supported in Spark 3.1+, otherwise use sort-merge" },
      ],
      note: "A hint cannot make an illegal build side or unsupported join-strategy combination valid.",
    }],
  ),
  "What happens when the broadcast side is too large?": detailedAnswer(
    "The failure can occur at several phases. The driver may run out of memory while collecting/serializing the relation, distribution may exceed the broadcast timeout or saturate the network, and executors may fail while building or storing the hashed relation. Even if it completes, eviction and garbage collection can erase the expected speed benefit.",
    [
      "Automatic broadcast thresholds reduce risk but rely on estimates; a hint can force an unsafe broadcast despite the threshold. Data growth or a less-selective predicate can invalidate yesterday's safe assumption.",
      "`BroadcastExchange` collects and materializes the build side on the driver before distribution. Spark hard-rejects a broadcast relation at or above 8 GiB of serialized data and also rejects roughly 512 million or more rows, depending on the broadcast mode's internal capacity. Hints do not bypass these ceilings; driver and executor headroom normally require a far smaller relation.",
      "Driver errors, `TimeoutException`, executor OOM/container kills, repeated executor loss, and very high broadcast exchange time are distinct signals and need different confirmation.",
      "Raising the timeout is justified only when the relation fits and transfer is merely slow. Raising executor memory is not sufficient if the driver cannot materialize the broadcast or concurrent joins multiply usage.",
      "Remove unused columns, filter/pre-aggregate, refresh statistics, and let Spark select sort-merge or shuffled hash when the remaining build side lacks headroom.",
      "Test with production cardinality and worst-case values. Measure the physical broadcast metric or hashed relation, not the compressed source files.",
    ],
    "A forced hint broadcasts a dimension that grew from 40 MB to 4 GB. The driver completes collection, but every 4 GB executor also runs several tasks and is killed for exceeding its container limit; removing the hint allows a spill-capable sort-merge join.",
    "An oversized broadcast can fail the driver, network phase, or executors; choose a distributed strategy before tuning around an invalid memory assumption.",
  ),
  "What is the difference between a left anti join and a left semi join?": detailedAnswer(
    "Both are existence joins that output only columns from the left relation. A left semi join keeps a left row when at least one matching right row exists; a left anti join keeps it when no matching right row exists. They do not emit one row for every right-side match and do not append right-side columns.",
    [
      "Semi corresponds to an `EXISTS` test and is useful for filtering candidates to known keys. Anti corresponds to `NOT EXISTS` and is useful for finding missing, new, or orphaned keys.",
      "Duplicate matches on the right do not multiply a left row in the result because the question is existence, not pair construction. Duplicate rows already present on the left remain separate left rows.",
      "Ordinary equality does not match null to null. If null-safe matching is required, express a null-safe predicate and validate how it changes the existence rule.",
      "Unlike `left_outer(...).filter(right.key.isNull())`, an explicit anti join communicates intent and allows Spark to plan the existence operation without carrying all right columns.",
      "Physical execution may still be broadcast hash, sort-merge, or another supported strategy; semi/anti specifies semantics, not a particular algorithm.",
    ],
    "To keep orders whose customer exists, use left semi. To identify orders whose customer ID has no master record, use left anti. In either case the result schema contains only order columns.",
    "Semi means 'left rows with a match'; anti means 'left rows without a match,' and neither returns right-side fields.",
  ),
  "Can joining two tables increase the row count?": detailedAnswer(
    "Yes. A join produces matching row pairs, not necessarily one output per input row. If a key occurs `m` times on the left and `n` times on the right, an inner equi-join can produce `m × n` rows for that key. One-to-many and especially many-to-many keys can therefore expand output dramatically.",
    [
      "A supposedly unique dimension with duplicate business keys changes a fact-to-dimension join from many-to-one to many-to-many and silently duplicates measures.",
      "Outer joins add unmatched preserved rows as well as matched pairs. Cross joins multiply total row counts directly, and broad non-equi conditions can behave similarly.",
      "Null-safe equality can make duplicate nulls match each other; ordinary equality does not. Normalization errors such as trimming or type coercion can also unexpectedly collapse keys into duplicates.",
      "Measure key uniqueness and output cardinality before and after the join. If one record is required, establish a deterministic deduplication rule rather than applying an arbitrary `dropDuplicates` after damage is done.",
      "Expansion is both a correctness and performance issue: a hot many-to-many key can create huge shuffle output, spill, OOM, and a single long task.",
    ],
    "Three order rows and four promotion rows sharing the same non-unique campaign key produce twelve joined rows for that key. Summing order revenue afterward would quadruple the true value.",
    "State the expected relationship—one-to-one, one-to-many, or many-to-many—and validate it before trusting joined metrics.",
  ),
  "How does Spark handle null join keys?": {
    summary:
      "Ordinary equality does not match null join keys; outer joins can preserve them as unmatched rows, while inner and semi joins do not. Use null-safe equality only when two missing keys should deliberately match.",
    takeaway:
      "See “How does Spark handle null values in joins?” for the canonical join-type, skew, sentinel, and cardinality explanation.",
  },
  "What is salting in Spark joins?": detailedAnswer(
    "Salting is a skew-mitigation technique that splits a hot logical key into several physical shuffle keys. The large/skewed side receives a salt bucket, while matching rows on the small side are replicated across the same bucket range. Joining on `(key, salt)` spreads work for the hot key over multiple reduce partitions instead of sending it all to one task.",
    [
      "Salting changes distribution, not business identity. Remove or ignore the technical salt after the join and preserve the original key for results.",
      "For a join, randomly salting only one side breaks matches. The other side must be expanded or assigned compatible salt values; replication increases data volume, so it should be limited to identified hot keys.",
      "Choose bucket count from the hot key's bytes/output and desired task size. Too few buckets leave skew; too many replicate the other side, create tiny partitions, and add overhead.",
      "Hash salting from a stable row identifier is reproducible and often preferable to random values for testing and retries. Aggregations may require a two-stage combine: aggregate by `(key, salt)`, then combine by original key.",
      "Try simpler options first where suitable: broadcast a small side, pre-aggregate, filter bad/null keys, or enable AQE skew handling. Manual salting is powerful but adds data-model and correctness complexity.",
    ],
    "If customer `HOT` owns 30% of events, assign its event rows to 16 buckets and replicate the single `HOT` dimension row to those 16 salts. Other customer keys can remain in one bucket, avoiding unnecessary replication.",
    "Salting works only when both matching logic and shuffle key include a compatible salt; it trades controlled replication for parallelism on hot keys.",
    [{
      title: "How join salting spreads a hot key",
      steps: [
        { label: "Detect", detail: "Find the key dominating one partition" },
        { label: "Salt large side", detail: "Split its rows across N buckets" },
        { label: "Expand small side", detail: "Create one matching row per bucket" },
        { label: "Shuffle join", detail: "Partition by the composite key" },
        { label: "Clean up", detail: "Drop the technical salt after joining" },
      ],
    }],
  ),
  "Does repartitioning both DataFrames by the join key eliminate shuffle?": detailedAnswer(
    "Not automatically. A join can avoid a new exchange only when Spark's physical planner can prove that both inputs already satisfy the exact required distribution—compatible partitioning expressions, partition counts, and lineage at that point in the plan. Calling `repartition(key)` on both sides itself performs shuffles, and later operations or AQE decisions can change or invalidate that distribution.",
    [
      "Two independent `repartition` calls may place the same key consistently when their partitioning is compatible, allowing the join to reuse exchanges in that query, but the cost has merely moved to the explicit repartition stages.",
      "Different partition counts, casts, expressions, hash semantics, or renamed/derived keys can require another exchange. Some transformations preserve partitioning metadata; others do not.",
      "Writing ordinary files after repartitioning does not guarantee that a later read recovers Spark's in-memory partitioner. Catalog bucketing/clustering and storage metadata must be recognized by the planner.",
      "Broadcast joins deliberately require a different distribution, and AQE may coalesce or revise shuffle partitions. Inspect the final plan rather than assuming a source-level call dictates it.",
      "Prepartitioning helps most when the partitioned result is reused across multiple downstream operations or a supported bucketed layout repeatedly avoids exchange; for a single join, extra repartitions can add needless work.",
    ],
    "If each input is repartitioned to 400 partitions using the same normalized key immediately before one join, Spark may reuse those exchanges. But the two repartitions still shuffled both datasets; changing one side to 200 partitions or joining on a cast key can trigger a new exchange.",
    "Repartitioning can satisfy a join's distribution, but it does not make shuffle disappear—the plan must prove compatibility, and creating that distribution already costs a shuffle.",
  ),
  "What are broadcast join hints?": detailedAnswer(
    "Broadcast join hints explicitly tell Spark that a relation should be considered as the broadcast side, using SQL syntax such as `/*+ BROADCAST(dim) */` or the DataFrame `broadcast(dim)` function. They can override the automatic broadcast-size threshold, but remain subject to join-type and strategy support.",
    [
      "Hints are useful when trustworthy application knowledge is better than missing/stale optimizer statistics—for example, a strongly filtered dimension is tiny although its base table is large.",
      "If both sides are hinted and the join supports broadcast hash, Spark still chooses a build side according to join semantics and estimated size; two hints do not mean broadcast both full inputs.",
      "Spark defines a preference among conflicting strategy hints: BROADCAST, MERGE, SHUFFLE_HASH, then SHUFFLE_REPLICATE_NL. A warning or alternative plan may appear when a requested hint cannot be applied.",
      "A hint bypassing the threshold also bypasses part of the safety guard. It can cause driver collection pressure, timeout, and executor OOM when data grows.",
      "Treat hints as tested plan assertions: document the size assumption, monitor it, refresh statistics, and verify `BroadcastExchange` plus the expected join in the executed plan.",
    ],
    "A filtered `active_countries` DataFrame is 6 MB but lacks statistics, so `facts.join(broadcast(active_countries), 'country_id')` communicates the known safe build side. If it later grows to gigabytes, the same hint becomes dangerous.",
    "A broadcast hint influences planning; it neither proves the relation is small nor guarantees an unsupported strategy.",
  ),
  "What is dynamic partition pruning?": detailedAnswer(
    "Dynamic Partition Pruning (DPP) uses values discovered from one side of a join at runtime to skip irrelevant partitions on the other side, usually a large partitioned fact table. It complements static pruning: the needed partition values are not literal in the original fact-table filter but become known after filtering a dimension table.",
    [
      "A typical star query filters a dimension—for example, stores in one region—then joins it to a fact table partitioned by store or a related key. Spark derives the eligible keys and injects a dynamic pruning predicate into the fact scan.",
      "The benefit depends on selectivity, recognized partition columns, supported source/catalog behavior, and the cost of producing/reusing the pruning subquery. If nearly every partition qualifies, the extra machinery adds little.",
      "DPP reduces scan bytes and downstream shuffle; it does not replace data skipping within files, static date pruning, or a sound table partition design.",
      "Look for `dynamicpruningexpression` / dynamic pruning subquery in the physical plan and compare files/partitions read. Configuration being enabled does not prove a particular query benefited.",
      "AQE and broadcast reuse can make the pruning information available efficiently, but exact plan shape varies by Spark version, statistics, and join strategy.",
    ],
    "A sales fact table is partitioned by `store_id`. A query filters the store dimension to `region = 'West'` and joins on `store_id`; DPP can scan only partitions for West-region stores even though the fact query contained no literal store list.",
    "DPP converts selective join-side results into runtime partition filters for the large scan; confirm the actual pruned files in the executed plan and metrics.",
  ),
  "How do stream-stream joins work in Structured Streaming?": detailedAnswer(
    "A stream-stream join matches rows arriving on two unbounded inputs. Because a matching row may arrive later on either side, Spark maintains state for both inputs across micro-batches and checks new records against the opposite state. Event-time watermarks plus a bounded time condition are essential for limiting how long old state must be retained.",
    [
      "An equality key alone is unbounded: Spark cannot know when a future record for that key will arrive. Add event-time columns, watermarks on both streams, and a time-range condition such as clicks occurring within one hour of an impression.",
      "The watermark describes tolerated lateness based on observed event time, not wall-clock delivery guarantees. Records older than the effective threshold may be dropped from state or excluded according to operator semantics.",
      "An inner stream-stream join can run without watermarks, but its state can grow indefinitely. Watermarks and an event-time constraint make old state eligible for cleanup; they are therefore operational requirements for a bounded long-running query even where the API treats them as optional.",
      "Outer and left-semi stream-stream joins are conditionally supported and need the documented watermark/time constraints to determine when unmatched state can be removed or emitted. Validate the support matrix for the Spark version and which side carries the watermark.",
      "Stream-stream join queries use Append output mode; Update and Complete modes are not supported. This restriction matters when designing the downstream sink and deciding when results become final.",
      "State size depends on key cardinality, event rate, time window, lateness, and skew. Monitor state rows/bytes, memory/disk state-store metrics, watermark movement, dropped-late rows, and batch duration.",
      "Checkpointing preserves progress and state metadata across restart. The sink still needs compatible output-mode and idempotency/exactly-once behavior; a join by itself does not make external side effects safe.",
    ],
    "Join impressions and clicks by ad ID when the click event time is between the impression time and one hour later. With watermarks reflecting accepted lateness, Spark can eventually evict impressions that can no longer receive a valid click.",
    "Bound both the event-time relationship and lateness; otherwise stream-stream join state can grow without a defensible limit.",
  ),

  "What causes data skew in Spark?": detailedAnswer(
    "Data skew occurs when partitions receive substantially different amounts or costs of work. The most common cause is a non-uniform key distribution during joins or aggregations, but uneven file sizes, null/default keys, range boundaries, data expansion, and heterogeneous computation can also make one task dominate a stage.",
    [
      "Hot business keys—popular customers, countries, products, or a default `UNKNOWN`—send many rows to the same hash partition. A many-to-many join can amplify that key's output beyond either input size.",
      "Skew can originate before a shuffle: a few huge unsplittable files or poorly chosen range partitions create imbalanced scan tasks. After a shuffle, key frequency and partitioner choice dominate.",
      "A transformation can create skew by exploding arrays, mapping many bad values to one sentinel, or filtering most partitions while leaving one large survivor.",
      "Some tasks process equal bytes but take longer because records have different computational complexity, external-call latency, serialization cost, or Python behavior. That is work skew even without byte skew.",
      "Do not diagnose shuffle skew from `spark.sql.files.maxPartitionBytes`: that setting helps plan file-scan partitions and is not a maximum size for later shuffle partitions. Use the metrics for the actual skewed stage.",
      "Remedies include correcting keys/data quality, pre-aggregation, broadcast joins, AQE skew splitting, selective salting, improved partitioning, and controlling explosive output; the right fix follows the source.",
    ],
    "If 45% of transactions have a null customer ID that is replaced by `-1`, a join or groupBy on customer sends nearly half the data to one partition. The default-value cleanup created a synthetic hot key.",
    "Skew is unequal partition work; identify whether it comes from input layout, key frequency, output expansion, or per-record computation before choosing a remedy.",
  ),
  "How do you detect skew in the Spark UI and in key distributions?": detailedAnswer(
    "In the Spark UI, compare task distributions within the same stage rather than looking only at averages. Skew appears as a long tail: one or a few tasks have much higher input or shuffle-read records/bytes, duration, spill, peak memory, or GC than the median. Then profile the actual key distribution to connect the slow partition to hot keys.",
    [
      "Sort stage tasks by duration and shuffle read size. A maximum tens or hundreds of times the median, with one task continuing after all others finish, is a strong skew signal.",
      "Check records as well as bytes: variable-width rows can hide byte skew, while a many-to-many key may produce high output despite modest input. Fetch wait alone can instead indicate network/executor problems.",
      "Use SQL plan/operator metrics and the final AQE plan to see skewed partition splitting. The UI's median, percentiles, and executor timeline distinguish systematic skew from one unhealthy machine.",
      "Profile key counts with an aggregation, approximate heavy-hitter method, or a representative sample; include null/default keys and composite-key components. Avoid collecting an unbounded full frequency map to the driver.",
      "Quantify contribution: top key counts, top-N share, partition-size percentiles, and expected join multiplicity. A key that is merely frequent may be harmless if it is filtered before the expensive exchange.",
    ],
    "A join stage has median shuffle read of 300 MB and maximum of 47 GB; the final task spills heavily and lasts 28 minutes. A top-key query shows `UNKNOWN` accounts for 38% of both inputs, confirming a hot many-to-many group rather than a slow host.",
    "Use task max-versus-median metrics to locate skew, then key-frequency and cardinality analysis to explain it.",
  ),
  "How do salting, Adaptive Query Execution, broadcast joins, and custom partitioning help fix skew?": detailedAnswer(
    "Each technique removes skew at a different layer. Salting splits a hot logical key, AQE detects oversized shuffle partitions at runtime and can split supported skew joins, a broadcast join removes the large side's join-key shuffle when the other side is small, and custom partitioning explicitly maps keys to partitions—primarily in key-value RDD workflows.",
    [
      "Salting is flexible but invasive: both sides must use compatible salt logic and small-side replication increases data. It is appropriate for known hot keys that remain too large after simpler reductions.",
      "Choose a salt-bucket count from the hot key's measured work, not from a fixed rule such as cores × 2. A useful starting estimate is `ceil(hot_key_bytes ÷ target_bytes_per_task)`, capped by practical parallelism and the cost of replicating the other side; then validate the resulting partition distribution.",
      "AQE is low-touch and uses observed map-output sizes, but it only handles supported operators/patterns and thresholds. Current Spark documentation lists both `spark.sql.adaptive.enabled` and `spark.sql.adaptive.skewJoin.enabled` as enabled by default; verify effective values because versions and platforms can override them.",
      "AQE classifies a shuffled join partition as skewed only when it exceeds both `skewedPartitionFactor × median partition size` and `skewedPartitionThresholdInBytes`. Apache Spark 4.2 documents defaults of `5.0` and `256 MiB`; tune from observed distributions rather than lowering them blindly.",
      "For supported sort-merge and shuffled-hash joins, AQE can split an oversized partition and replicate the corresponding portion of the other side. It does not generally split a hot-key aggregation, repair an explosive many-to-many result, or guarantee that every skewed operator will be rewritten.",
      "Broadcasting a genuinely small dimension eliminates a shuffle for the streamed large side, so its hot keys no longer concentrate that exchange. It does not prevent output explosion from many duplicate matches and it introduces per-executor memory cost.",
      "A custom RDD `Partitioner` can isolate or spread known keys and preserve partitioning across compatible pair-RDD operations. DataFrame Catalyst usually controls distribution, so hints, repartitioning, AQE, and schema/table layout are the normal tools there.",
      "Pre-aggregation and data-quality correction often outperform all four: collapse repeated rows before the join, separate null/default keys, and remove accidental duplicates before distributing them.",
    ],
    "For one 100 GB hot key joined to a 2 MB lookup, broadcast the lookup. For a hot key on both large sides, AQE may split it automatically; if not, selectively salt that key. A custom partitioner is most suitable when an RDD pipeline owns its key distribution contract.",
    "Choose the mechanism that attacks the actual exchange: eliminate it, let AQE split it, or deliberately redistribute hot keys.",
  ),
  "If salting only adds a column, how does it fix skew without an explicit repartition call?": detailedAnswer(
    "Adding a salt column by itself does nothing to distribution. Salting fixes skew only when a subsequent wide operation—such as a join on `(key, salt)`, `groupBy(key, salt)`, or explicit repartition—uses the salted composite key. That operation inserts an Exchange whose hash includes the salt, sending formerly identical logical keys to different shuffle partitions.",
    [
      "A DataFrame column is metadata and values; Spark does not physically move rows when `withColumn` is evaluated. Narrow transformations retain the current partitions.",
      "When the salted columns become join keys, Catalyst enforces clustered distribution for those keys. The generated `Exchange hashpartitioning(key, salt, N)` is where the rows actually move.",
      "If the join still uses only the original key, all hot-key rows hash together and the unused salt is irrelevant. If only one side uses salt, correct matches may be lost.",
      "For aggregation, first aggregate by `(key, salt)` to parallelize partial work, then aggregate those partial results by the original key. The second phase is much smaller if the operation is associative.",
      "Use `explain(mode='formatted')` to prove where the Exchange occurs and inspect post-shuffle partition metrics to prove that it improved balance.",
    ],
    "`events.withColumn('salt', ...)` followed by `groupBy('customer_id')` remains skewed. Changing the first aggregation to `groupBy('customer_id', 'salt')` makes the shuffle hash the composite key; a second small aggregation removes the salt.",
    "Salt has no physical effect until an exchange-producing operation includes it in the distribution key.",
  ),
  "Where does Spark actually repartition salted data?": detailedAnswer(
    "Spark repartitions salted data at the physical `Exchange` introduced by the wide operation that requires rows clustered by the salted key. For a salted join, exchanges partition the non-broadcast inputs by `(original_key, salt)`; for a salted aggregation, the exchange before the partial/final aggregate groups by those columns. The preceding salt-column expression is a narrow projection and does not move data.",
    [
      "In the physical plan, look for `Exchange hashpartitioning(key, salt, ...)` beneath the join or aggregate. That boundary separates map-side partition production from reduce-side consumption.",
      "Spark may perform map-side partial aggregation before the exchange, reducing bytes, and AQE may coalesce or split resulting shuffle partitions. The essential distribution key still contains the salt.",
      "If one join side is expanded across salt buckets, it is also shuffled or broadcast according to the chosen strategy. Correctness requires each large-side salt to find the corresponding replicated small-side row.",
      "An explicit `repartition(N, key, salt)` can establish the distribution earlier, but is unnecessary if the immediate join/aggregation must insert the same exchange and no reuse justifies prepartitioning.",
      "The Spark UI's stage boundary, shuffle-write metrics on upstream tasks, and shuffle-read metrics on downstream tasks are the runtime manifestation of that Exchange.",
    ],
    "A formatted plan shows `Project [key, pmod(hash(row_id), 16) AS salt]`, then `Exchange hashpartitioning(key, salt, 400)`, then `SortMergeJoin [key, salt]`. The Exchange—not the Project—is the repartition point.",
    "Find the composite-key Exchange in the executed plan; that is where salted rows are physically redistributed.",
  ),

  "What is speculative execution in Spark?": detailedAnswer(
    "Speculative execution is Spark's straggler-mitigation mechanism. After enough tasks in a stage have completed, Spark identifies unusually slow running attempts and launches duplicate attempts for the same partition on other executors. The first successful attempt is accepted and redundant attempts are stopped; this reduces delays caused by a bad machine or transient slowdown, not inherently large partitions.",
    [
      "In Apache Spark 4.2, speculation is disabled by default (`spark.speculation=false`). The documented baseline settings are a multiplier of `3`, completion quantile of `0.9`, minimum task runtime of `100ms`, and a scheduler check interval of `100ms`; managed platforms or applications can override them.",
      "The basic duration test is: after at least `quantile × total stage tasks` have succeeded, compare a running attempt with `multiplier × median successful-task duration`, while also respecting the minimum runtime. With the 4.2 defaults, roughly 90% of the stage must finish and an attempt must exceed about three times the successful-task median before the traditional duration rule qualifies it.",
      "Spark 3.4+ also enables efficiency-aware speculation by default. It can compare a task's data-processing rate with successful tasks and uses additional long-run safeguards, so modern eligibility is more nuanced than only `runtime > multiplier × median`.",
      "It needs completed peer tasks to establish a baseline, so it does not immediately duplicate every slow-looking task and may offer little help in a stage with very few tasks.",
      "Both attempts compute the same logical partition and can read the same inputs. Spark's output commit protocols protect supported file outputs, but arbitrary external side effects inside task code may execute more than once.",
      "If a partition is slow because it contains 100 times more data, its duplicate is likely to be slow too. Fix skew, partition sizing, or explosive logic instead of relying on speculation.",
      "Speculation consumes spare cluster capacity, source bandwidth, and I/O. Monitor speculative attempts won, wasted work, and downstream pressure to decide whether it helps the real tail.",
    ],
    "In a stage of 2,000 similar partitions, one task runs slowly because its executor has a degraded disk. A duplicate on a healthy executor finishes first and prevents that host from extending the entire job's completion time.",
    "Speculation races duplicate attempts against infrastructure stragglers; it is not a cure for deterministic skew or unsafe side effects.",
    [{
      title: "Speculative task race",
      steps: [
        { label: "Stage runs", detail: "Most comparable tasks complete" },
        { label: "Detect straggler", detail: "One attempt exceeds the runtime baseline" },
        { label: "Duplicate", detail: "Launch the same partition elsewhere" },
        { label: "Race", detail: "Both attempts may run temporarily" },
        { label: "Commit winner", detail: "Accept first success and stop the loser" },
      ],
    }],
  ),
  "Why does Spark need speculative execution?": detailedAnswer(
    "A distributed stage finishes only when its slowest required task finishes. Even a well-balanced stage can be held up by one degraded disk, noisy neighbor, transient network path, JVM pause, or unhealthy executor. Speculation reduces this tail-latency risk by placing a redundant attempt on different resources instead of waiting indefinitely for the original environment to recover.",
    [
      "At large task counts, the probability that at least one machine experiences a transient problem increases. Median performance can be healthy while the maximum determines job latency.",
      "Retrying only after failure is too late when a task remains technically alive but progresses very slowly. Speculation acts before a formal executor/task timeout.",
      "The duplicate runs the same deterministic computation, so it can distinguish host-related slowness: if the new attempt finishes normally, the original placement was the likely problem.",
      "It is especially useful for batch jobs with many comparable tasks and spare capacity near the tail, where a few duplicates have low opportunity cost.",
      "It cannot provide more parallelism within one oversized partition, repair a throttled shared source, or eliminate nondeterminism. Those require data, algorithm, or infrastructure changes.",
    ],
    "A daily SLA job has 10,000 tasks; 9,999 finish within 40 seconds, while one executor's disk makes its task take 18 minutes. A speculative copy can finish on another host and recover almost all of that tail delay.",
    "Spark needs speculation because cluster-wide completion is vulnerable to rare slow resources even when the computation and data are balanced.",
  ),
  "When should you use speculative execution?": detailedAnswer(
    "Use speculation when metrics show rare, placement-dependent stragglers among otherwise comparable tasks and the cluster has enough spare capacity to run duplicates without delaying useful work. The workload should be deterministic and side-effect safe, and duplicate reads/writes must not overload external systems.",
    [
      "Good evidence is a repeated long tail where slow attempts move between hosts, task input/shuffle sizes are similar, and duplicated attempts on healthy executors complete much faster.",
      "Large batch stages with hundreds or thousands of tasks provide a reliable runtime baseline and make a small number of duplicates proportionally inexpensive.",
      "Supported transactional/file commit paths are safer than custom per-record API calls. Make any external writes idempotent even without speculation because ordinary task retries also occur.",
      "Tune thresholds from observed task-duration distributions and the Spark version's defaults. Overly aggressive settings duplicate normal variation; overly conservative settings begin too late to save the SLA.",
      "After enabling it, verify successful speculative winners, total duplicate CPU/I/O, executor placement, and end-to-end tail improvement. A configuration switch without measured benefit is just extra work.",
    ],
    "A CPU-heavy feature job has uniform 2 GB partitions, but occasional noisy hosts make one task five times slower. With idempotent output and idle capacity late in the stage, speculation is an appropriate guardrail.",
    "Use speculation for anomalous resource stragglers after proving partition sizes and work are comparable.",
  ),
  "When should you not use speculative execution?": detailedAnswer(
    "Do not rely on speculation when slow tasks are predictably caused by data skew, oversized partitions, shared source/sink throttling, or algorithms whose cost varies by record. A duplicate will repeat the same expensive work, consume capacity, and may intensify the bottleneck. Avoid it for non-idempotent side effects because more than one task attempt can execute user code.",
    [
      "If the straggler reads 80 GB while the median reads 500 MB, split or salt that partition; another attempt still has 80 GB to process.",
      "If every executor waits on the same saturated database/object store, speculative copies add connections and requests, making all attempts slower.",
      "Task code that sends emails, charges accounts, increments external counters, or performs unguarded inserts can duplicate effects. Spark accepting one output attempt does not roll back arbitrary external calls.",
      "Tiny stages and short tasks provide poor baselines and little time to recover launch overhead. Capacity-constrained clusters may delay normal pending tasks to run redundant ones.",
      "Repeated executor loss, GC storms, or a bad node pool should be repaired at the infrastructure/configuration layer; speculation can mask symptoms and waste resources.",
    ],
    "One reduce task is slow because the key `UNKNOWN` owns half the data and creates a huge join result. Speculating that task doubles the same shuffle fetch and spill; separating or salting the key is the correct solution.",
    "Do not duplicate deterministic bottlenecks or unsafe side effects; fix their cause instead.",
  ),

  "How would you debug a Spark job that is running very slowly in production?": detailedAnswer(
    "Start by preserving evidence and locating the critical stage or operator; do not begin with random configuration changes. Compare the slow run with a known-good run, inspect the final executed plan and Spark UI/history metrics, classify the bottleneck as scan, shuffle, skew, CPU/UDF, memory/GC, retries, external I/O, or output commit, then change one cause and verify both speed and correctness.",
    [
      "Establish context: input bytes/records/files and key distribution, code/config/Spark version, cluster shape, dynamic allocation, source/sink health, caching state, and whether the regression is repeatable.",
      "Preserve the event log before the application ends and record the application ID, effective Spark configuration, code version, input snapshot, cluster timeline, and final AQE plan. Without comparable evidence, two runs that look identical may not be comparable.",
      "Find the longest job and stage. Compare task maximum, median, and percentiles for duration, input, shuffle read/write, fetch wait, spill, GC, peak execution memory, locality, failures, and executor loss.",
      "Interpret combinations rather than isolated numbers: a high max-to-median byte ratio suggests skew; similar bytes with high GC suggests memory/object pressure; high remote fetch wait suggests shuffle/network trouble; high scheduler delay with tiny tasks suggests excessive task overhead or unavailable slots; high output commit time points to the sink rather than the join.",
      "Read the formatted and final AQE plan: scans and pruning, pushed filters, exchanges, join strategies and broadcast sizes, aggregate types, Python/UDF boundaries, reused exchanges, skew handling, and accidental Cartesian joins.",
      "Tune the correct partition domain. `spark.sql.files.maxPartitionBytes` affects file-scan split planning, while `spark.sql.shuffle.partitions` supplies an initial count for many SQL Exchanges. Changing the scan setting does not resize an already-created shuffle stage.",
      "Correlate Spark timestamps with cluster and service telemetry: CPU, memory/container kills, local disk, network, object-store requests, Kafka lag, database throttling, and output-commit latency.",
      "Apply the smallest targeted correction—fix a key or join, filter/project earlier, remove a UDF, compact files, tune partition size, bound sink concurrency, or size the correct memory domain—then compare plan, metrics, counts, and business invariants.",
    ],
    "A job doubled from 25 to 55 minutes. The UI shows scan time unchanged, but one join task reads 60 GB versus a 700 MB median after a new default key appeared. Fixing the upstream key rule and isolating that key restores balance; adding executors alone would not.",
    "Debug from stage and task evidence to the responsible operator, then validate one focused change against a baseline.",
    [{
      title: "Production diagnosis path",
      steps: [
        { label: "Compare", detail: "Confirm workload and regression" },
        { label: "Locate", detail: "Find the critical stage and operator" },
        { label: "Classify", detail: "Skew, I/O, CPU, memory, retries or sink" },
        { label: "Correct", detail: "Change the measured root cause" },
        { label: "Validate", detail: "Reconcile output and before/after metrics" },
      ],
    }],
  ),
  "Which Spark UI metrics and execution-plan details would you inspect first?": detailedAnswer(
    "First identify the stage consuming wall-clock time, then compare its task distribution and connect it to the executed physical operator. The most useful first pass is maximum versus median task duration, input and shuffle bytes/records, spill, GC, fetch wait, failed/retried attempts, and executor loss, alongside the final AQE plan's scans, exchanges, joins, aggregations, and Python boundaries.",
    [
      "Jobs/Stages: locate the critical path, not merely the stage with the most tasks. Sort tasks by duration and shuffle size; a large max/median ratio indicates skew or a resource straggler.",
      "I/O: inspect scan bytes/records/files, shuffle read/write, remote blocks, fetch wait, and output/commit time. Many tiny files, missing pruning, or a throttled sink have distinct signatures.",
      "Memory: examine spill to memory/disk, peak execution memory, GC time, executor removals, and container diagnostics. Low JVM GC with container kills can point to native/Python overhead rather than heap.",
      "Plan: verify partition and column pruning, pushed filters, `Exchange` boundaries, join algorithm/build side, broadcast metrics, aggregate strategy, sort, Cartesian products, and `BatchEvalPython`/UDF nodes.",
      "AQE: compare initial and final plans for broadcast conversion, partition coalescing, and skew splitting. Operator SQL metrics should agree with task-level evidence and observed output cardinality.",
    ],
    "If duration is high but CPU and shuffle are low while output commit dominates, join tuning is irrelevant. If one task has 100 times the shuffle read and spill of peers, investigate skew at the associated Exchange and join/aggregate key.",
    "Begin with the critical stage's task distribution and final physical plan; together they say both where time went and which operator caused it.",
  ),

  "What could cause one executor to run much longer than the others?": detailedAnswer(
    "One executor can appear slow because it received disproportionately expensive partitions or because the host/runtime is unhealthy. Separate data placement from executor health by comparing its task input/shuffle sizes and operators with identical tasks on other executors, then examine CPU, GC, disk, network, Python workers, locality, retries, and external calls.",
    [
      "First determine whether one task is slow or every task placed on that executor is slow. Executor-level totals can look large simply because the executor ran more tasks, so compare per-task rates and comparable partitions before blaming the host.",
      "Data skew may schedule several hot partitions there by chance, or one long task may make the whole executor look busy. If the same partition is slow wherever it runs, the data/algorithm is responsible.",
      "Host issues include degraded local disk, network errors, noisy neighbors, CPU throttling, memory pressure, container limits, hardware faults, or lost locality that forces remote reads.",
      "Runtime issues include a long JVM GC pause, excessive spill, leaked cached/broadcast state, a stuck Python worker, oversized deserialization, or repeated task failures and retries.",
      "External work inside tasks—database/API calls, DNS, authentication, rate limits—can block one executor's task set, particularly if a connection pool or endpoint differs by host.",
      "A useful isolation test is: same partition slow on another executor means data or operator cost; different normal-sized partitions slow only on the same executor means host/runtime trouble; all executors slow together means a shared service, network, or cluster-wide bottleneck.",
      "Compare executor logs and telemetry, move/retry the same partition, and correlate task bytes. Speculation can protect the job from a transient bad host, but recurring infrastructure should be quarantined or repaired.",
    ],
    "Executor 7's tasks have the same 400 MB inputs as peers but show high disk wait and long shuffle fetches; a speculative attempt elsewhere finishes normally. That points to the node, unlike a 40 GB hot partition that remains slow on every executor.",
    "Use same-partition and same-size comparisons to distinguish a bad executor from intrinsically expensive work.",
  ),

  "Why can a Spark job become extremely slow after a groupBy?": detailedAnswer(
    "`groupBy` is lazy, so the call itself does not immediately run work. When an action executes the plan, rows with the same grouping key must reach compatible downstream partitions. That wide dependency creates an Exchange and reduce-side aggregation, often with sorting, hash state, spill, and a new stage. It becomes extremely slow when the exchange is large, keys are skewed, grouping materializes unbounded values, partial aggregation is ineffective, or per-task state exceeds memory.",
    [
      "For mergeable DataFrame aggregates such as `sum`, Spark can perform partial aggregation before the Exchange, shuffle the smaller partial states by key, and perform the final merge afterward. This reduces traffic but does not eliminate the shuffle or a hot final key.",
      "Network and disk cost scale with post-filter, post-projection bytes. Carrying wide unused columns or grouping before filtering sends unnecessary data through the most expensive boundary.",
      "A hot key creates one oversized reduce partition. Increasing the total partition count does not split one hash key; use two-stage salting, pre-aggregation, or business-specific handling.",
      "RDD `groupByKey` collects every value for a key and cannot reduce values map-side like `reduceByKey`/`aggregateByKey`. DataFrame aggregate functions usually support partial aggregation and compact state.",
      "Operations such as `collect_list` or arbitrary grouped Pandas UDFs can create unbounded per-key objects even when the shuffle is balanced. Spill may help sort data but cannot make a single enormous result object safe.",
      "Too few shuffle partitions create large tasks; too many create scheduler and tiny-block overhead. Size from shuffle bytes and memory, use AQE, and inspect max versus median partition metrics.",
    ],
    "Grouping 2 TB of click rows with all payload columns by country sends wide records across the network, and one country owns 55% of rows. Projecting to needed fields, pre-aggregating locally, and splitting the hot key attacks three separate costs.",
    "A slow groupBy is usually shuffle volume, key skew, or unbounded per-key state; identify which one before tuning partitions or memory.",
  ),

  "Why might the same Spark job have different performance on different runs?": detailedAnswer(
    "Identical code does not guarantee an identical execution environment or data path. Run time can change with input volume and key distribution, file/object-store state, cache warmth, optimizer/runtime statistics, AQE decisions, dynamic allocation, cluster contention, JVM warm-up, executor placement, retries, and source/sink throttling.",
    [
      "New partitions or changed key frequencies can create skew or a different join cardinality even when total bytes are similar. Record input snapshots and top-key distributions when comparing runs.",
      "Input layout can change independently of logical content: compaction, new small files, compression ratios, object-store listing latency, and partition pruning alter scan tasks and downstream partition sizes.",
      "Cold object-store metadata, uncached table data, DNS/TLS setup, and JVM/code-generation warm-up can make the first run slower than a later run. Conversely, evicted cache or expired credentials can reverse it.",
      "AQE uses runtime statistics; small differences can cross thresholds and select broadcast versus sort-merge, coalesce a different number of partitions, or split skew differently.",
      "Shared clusters vary in available executors, noisy neighbors, preemption, network/disk bandwidth, and dynamic-allocation ramp-up. External databases and APIs can throttle differently by time of day.",
      "Speculation and ordinary retries can also change resource consumption and completion time. One run may launch a successful duplicate for a bad host, while another may have no spare slot or may repeat an expensive attempt after executor loss.",
      "Compare event logs and final plans using normalized metrics—bytes per task, max/median duration, spill, retries, executor timeline—not only total duration. Repeat controlled runs before attributing causality.",
    ],
    "A dimension is 9 MB after filtering on Monday and 14 MB on Tuesday. One run broadcasts under a 10 MB threshold while the other uses sort-merge; the physical plans and shuffle bytes explain the performance difference even with unchanged code.",
    "Performance is a function of code, data, plan, resources, cache, and dependencies; capture all six when comparing runs.",
  ),

  "Why might a Spark job work on small data but fail on large data?": detailedAnswer(
    "Small tests often avoid the nonlinear behaviors of distributed processing. Larger data increases shuffle and state, exposes rare hot keys and oversized records, crosses broadcast/driver limits, fills local disk, magnifies output cardinality, and causes external systems to throttle. An algorithm that is logically correct can still have an unbounded per-key or per-partition memory requirement.",
    [
      "The full dataset does not need to fit in cluster memory. What must remain bounded is each simultaneously active unit: driver result/metadata, scan or shuffle partition, hot key, state-store partition, broadcast, cached block set, local spill, and sink transaction.",
      "A sample may omit the production tail: one customer with billions of events, a huge nested record, many nulls, corrupt input, or a many-to-many duplicate key.",
      "Operations such as `collect`, `toPandas`, large `collect_list`, groupByKey, global sort, exact distinct, and forced broadcast have memory or network costs that grow far faster than a simple scan.",
      "Join output can grow nonlinearly: if one key occurs `m` times on the left and `n` times on the right, that key can create `m × n` output rows. A small sample may miss duplicate-key combinations that explode only at production scale.",
      "Default partition counts that are fine for gigabytes can create enormous tasks at terabytes; local shuffle disk and executor overhead become binding before aggregate cluster memory.",
      "Production file counts, schemas, codecs, permissions, and object-store behavior can differ from test fixtures. Millions of files can overwhelm planning despite modest total bytes.",
      "Test scale and distribution, not only row count. Add assertions for key uniqueness/cardinality, estimate output growth, remove driver collection, use spill-safe operators, and run representative load tests with failure/retry behavior.",
    ],
    "A join passes with 1% samples because each key is unique there, but full data contains duplicate historical versions on both sides. One key generates billions of pairs, spills local disks, and kills the executor; deterministic deduplication before joining fixes correctness and scale.",
    "Production failures often reveal an unbounded unit of work—driver, partition, key, state, file count, or output—not simply 'too much total data.'",
  ),

  "What causes out-of-memory errors in Spark executors?": detailedAnswer(
    "Executor out-of-memory failures occur when one container/process exceeds the memory available to the relevant domain: JVM heap, Spark execution/storage memory, off-heap/direct/native memory, Python worker memory, or total container overhead. Common triggers are oversized/skewed partitions, large hash/aggregation state, broadcasts, caching, wide object representations, excessive concurrent tasks, UDF/native libraries, and insufficient spill space.",
    [
      "Read the exact symptom: Java heap space or GC overhead points toward JVM allocation; container memory-limit kills with modest heap can indicate memory overhead, direct buffers, native code, or Python workers; driver OOM is a separate failure.",
      "For YARN/Kubernetes-style executor containers, the resource request is approximately `executor container memory = spark.executor.memory + spark.executor.memoryOverhead + spark.memory.offHeap.size + spark.executor.pyspark.memory` when the optional components are configured. Increasing only JVM heap cannot fix a limit exceeded by Python, native, direct-buffer, or other non-heap memory.",
      "In Apache Spark 4.2, automatic executor overhead is `max(executor memory × memoryOverheadFactor, minMemoryOverhead)` when an explicit overhead is absent. The documented general factor is `0.10` and minimum is `384 MiB`, with platform/job-type exceptions such as a higher default factor for Kubernetes non-JVM jobs; always inspect the effective deployment values.",
      "One hot join/group key or enormous input split can exceed memory in a single task regardless of total cluster memory. More executors do not divide one partition after it has been assigned.",
      "Several tasks run concurrently per executor. Nominal one-CPU task concurrency is approximately `executor cores ÷ spark.task.cpus`. A partition that fits alone may fail when every concurrent task builds a hash table, decodes wide rows, or hosts a Python worker simultaneously.",
      "Broadcast relations and cached blocks occupy executor memory beyond the active record stream. Multiple concurrent queries/broadcasts and overly broad persistence can remove headroom or cause eviction/recomputation loops.",
      "Spill-capable operators still require working buffers and local disk. Unbounded objects such as `collect_list` for one key, a giant row, or a non-spillable UDF allocation can fail despite spill settings.",
    ],
    "An executor with 16 GB heap and 4 cores runs four tasks; each builds a 3 GB per-partition hash structure while a 5 GB broadcast is resident. The combined working set cannot fit even though every individual input file looks small.",
    "Diagnose which process and allocation domain exceeded its limit, then bound the largest concurrent unit of work before adding memory.",
    [{
      title: "Executor memory pressure sources",
      steps: [
        { label: "Container limit", detail: "Heap plus overhead must remain within it" },
        { label: "JVM heap", detail: "Execution, storage and user objects" },
        { label: "Concurrent tasks", detail: "Per-task working sets multiply by cores" },
        { label: "Non-heap", detail: "Direct, native, Python and library memory" },
        { label: "Failure", detail: "OOM, GC limit or container kill reveals domain" },
      ],
    }],
  ),
  "How do you fix executor out-of-memory errors?": detailedAnswer(
    "Fix the measured cause, not just the headline error. Identify whether the JVM heap, container overhead, Python/native memory, or a single operator/partition failed; locate the stage and task; then reduce or redistribute its working set, remove unnecessary resident data, lower concurrency, and only afterward increase the appropriate memory allocation if the bounded workload legitimately needs it.",
    [
      "Inspect executor/container logs, failed task metrics, final plan, peak execution memory, GC, spill, partition bytes/records, and max-versus-median duration. Confirm whether the driver or executor actually failed.",
      "Reduce data early with pruning, filters, projection, and pre-aggregation. Increase input/shuffle partition counts when ordinary tasks are too large; fix hot keys with AQE, salting, or special handling because partition count alone does not split one key.",
      "Remove unsafe broadcasts and unbounded group collections, replace `groupByKey` with combiners, avoid `collect`-style task structures, unpersist unused datasets, and use compact SQL/internal representations instead of large language objects.",
      "Do not treat `MEMORY_AND_DISK` or Kryo as automatic repairs. Persistence helps only when the dataset is reused and the stored representation is affordable; Kryo helps JVM object serialization paths but does not shrink SQL operator state, Python objects, a hot key, or an explosive join result.",
      "Reduce executor cores when concurrent per-task working sets multiply beyond the container. For PySpark/native/direct-memory pressure, size `memoryOverhead` or explicit Python limits rather than adding only JVM heap.",
      "Ensure adequate local spill disk and use spill-capable operators. Increase executor/container memory only with evidence and cluster capacity, then retest production distributions and failure recovery instead of declaring success from a small sample.",
    ],
    "If one task reads 70 GB due to a hot key, moving from 8 GB to 16 GB heap merely delays failure. Salt or isolate the key and verify balanced partitions. If all balanced Python tasks are killed at the container limit while JVM GC is low, reduce cores or increase the measured overhead domain.",
    "Bound partition and concurrent working sets first; add memory to the correct domain only after the computation has a scalable shape.",
  ),
};

const CODE_EXAMPLES_25_TO_34: Record<string, InterviewAnswerCodeBlock[]> = {
  "What are broadcast variables, and when should you use them?": [{
    title: "Broadcast a small immutable lookup",
    language: "PySpark",
    code: `country_to_region = {"IN": "APAC", "DE": "EMEA", "US": "AMER"}
region_lookup = spark.sparkContext.broadcast(country_to_region)

def add_region(rows):
    lookup = region_lookup.value
    for row in rows:
        yield (row.country_code, lookup.get(row.country_code, "UNKNOWN"))

enriched = events.rdd.mapPartitions(add_region)

# Release cached executor copies after all consuming actions complete.
region_lookup.unpersist(blocking=False)`,
  }],
  "How do you remove broadcast variables from memory?": [{
    title: "Unpersist versus destroy",
    language: "PySpark",
    code: `lookup = spark.sparkContext.broadcast(reference_data)
result = source.rdd.map(lambda row: lookup.value.get(row.key)).count()

# Reversible: executor copies are removed and can be fetched again.
lookup.unpersist(blocking=True)

# Terminal: call only when no future task can reference this handle.
lookup.destroy(blocking=True)`,
  }],
  "What is the difference between a broadcast variable and an accumulator?": [{
    title: "Opposite data-flow directions",
    language: "PySpark",
    code: `valid_codes = spark.sparkContext.broadcast({"A", "B", "C"})
invalid_count = spark.sparkContext.accumulator(0)

def validate(code):
    if code not in valid_codes.value:  # driver -> executors
        invalid_count.add(1)            # executors -> driver
        return False
    return True

accepted = codes.filter(validate)
accepted.count()  # action completes task updates
print(invalid_count.value)  # authoritative value is read on the driver`,
  }],
  "When should you force a broadcast join?": [{
    title: "Hint only a measured small side",
    language: "PySpark",
    code: `from pyspark.sql.functions import broadcast

small_dim = (
    spark.table("dim_country")
         .filter("active = true")
         .select("country_id", "region")
)

joined = facts.join(broadcast(small_dim), "country_id", "left")
joined.explain(mode="formatted")

# Verify BroadcastExchange/BroadcastHashJoin and runtime size metrics.
# The hint bypasses the automatic threshold; it does not guarantee safety.`,
  }],
  "How does Spark handle joins?": [{
    title: "Inspect logical estimates and the final physical strategy",
    language: "PySpark",
    code: `query = (
    spark.table("fact_orders")
         .join(spark.table("dim_customer"), "customer_id", "left")
)

query.explain(mode="cost")
query.explain(mode="formatted")
query.count()

# With AQE, inspect the SQL tab after the action to compare
# the initial and final plans, join strategy, exchanges and metrics.`,
  }],
  "What join types and join strategies are available in Spark?": [{
    title: "Express each logical join type explicitly",
    language: "PySpark",
    code: `# Join type controls result semantics; the physical plan separately
# chooses broadcast hash, sort-merge, shuffled hash, nested loop, or Cartesian.
inner = orders.join(customers, "customer_id", "inner")
left = orders.join(customers, "customer_id", "left")
right = orders.join(customers, "customer_id", "right")
full = orders.join(customers, "customer_id", "full")

# Existence joins return only columns from the left side.
valid_orders = orders.join(customers, "customer_id", "left_semi")
orphan_orders = orders.join(customers, "customer_id", "left_anti")

# Every left row is paired with every right row; use only intentionally.
all_combinations = orders.crossJoin(customers)

inner.explain(mode="formatted")
# The same logical inner join can use different physical strategies as
# statistics, hints, join conditions, and runtime sizes change.`,
  }],
  "What is the difference between a left anti join and a left semi join?": [{
    title: "Existence joins return only left-side columns",
    language: "PySpark",
    code: `known_orders = orders.join(customers.select("customer_id"),
                           "customer_id", "left_semi")

orphan_orders = orders.join(customers.select("customer_id"),
                            "customer_id", "left_anti")

assert known_orders.columns == orders.columns
assert orphan_orders.columns == orders.columns`,
  }],
  "How does Spark handle null join keys?": [{
    title: "Ordinary equality versus null-safe equality",
    language: "PySpark",
    code: `from pyspark.sql import functions as F

# Ordinary equality: NULL does not match NULL.
normal = left.join(right, left.customer_id == right.customer_id, "inner")

# Explicit null-safe equality: NULL matches NULL.
null_safe = left.join(
    right,
    left.customer_id.eqNullSafe(right.customer_id),
    "inner",
)

# Profile duplicate/null counts before using null-safe equality;
# many NULL rows on both sides can create m × n matches.`,
  }],
  "What is salting in Spark joins?": [{
    title: "Selectively salt a hot join key",
    language: "PySpark",
    code: `from pyspark.sql import functions as F

buckets = 16
hot_key = "HOT"

# Stable salt for hot rows on the large side; ordinary keys use bucket 0.
large_salted = large.withColumn(
    "salt",
    F.when(F.col("key") == hot_key,
           F.pmod(F.hash("event_id"), F.lit(buckets))).otherwise(F.lit(0)),
)

# Replicate only the hot small-side row across matching salt buckets.
small_salted = small.withColumn(
    "salt_values",
    F.when(F.col("key") == hot_key, F.sequence(F.lit(0), F.lit(buckets - 1)))
     .otherwise(F.array(F.lit(0))),
).withColumn("salt", F.explode("salt_values")).drop("salt_values")

joined = large_salted.join(small_salted, ["key", "salt"]).drop("salt")
joined.explain(mode="formatted")`,
  }],
  "If salting only adds a column, how does it fix skew without an explicit repartition call?": [{
    title: "The wide operation uses salt in its Exchange key",
    language: "PySpark",
    code: `from pyspark.sql import functions as F

salted = events.withColumn("salt", F.pmod(F.hash("event_id"), F.lit(16)))

# withColumn is narrow: no rows move here.
# groupBy(key, salt) introduces Exchange hashpartitioning(key, salt, ...).
partial = salted.groupBy("customer_id", "salt").agg(F.sum("amount").alias("subtotal"))
final = partial.groupBy("customer_id").agg(F.sum("subtotal").alias("total"))

final.explain(mode="formatted")`,
  }],
  "What are broadcast join hints?": [{
    title: "DataFrame and SQL broadcast hints",
    language: "PySpark / SQL",
    code: `from pyspark.sql.functions import broadcast

df_result = fact.join(broadcast(dimension), "dimension_id")

sql_result = spark.sql("""
  SELECT /*+ BROADCAST(d) */ f.*, d.category
  FROM fact_events f
  JOIN dim_category d ON f.category_id = d.category_id
""")

df_result.explain(mode="formatted")
sql_result.explain(mode="formatted")`,
  }],
  "What is dynamic partition pruning?": [{
    title: "Verify a runtime pruning predicate",
    language: "SQL",
    code: `EXPLAIN FORMATTED
SELECT f.store_id, SUM(f.amount)
FROM fact_sales f
JOIN dim_store d ON f.store_id = d.store_id
WHERE d.region = 'West'
GROUP BY f.store_id;

-- If fact_sales is partitioned compatibly, inspect the scan for a
-- dynamic pruning expression and compare files/partitions actually read.`,
  }],
  "How do stream-stream joins work in Structured Streaming?": [{
    title: "Bound state with watermarks and an event-time range",
    language: "PySpark",
    code: `from pyspark.sql import functions as F

i = impressions.withWatermark("impression_time", "2 hours").alias("i")
c = clicks.withWatermark("click_time", "3 hours").alias("c")

matched = i.join(
    c,
    (F.col("i.ad_id") == F.col("c.ad_id")) &
    (F.col("c.click_time") >= F.col("i.impression_time")) &
    (F.col("c.click_time") <= F.col("i.impression_time") + F.expr("INTERVAL 1 HOUR")),
    "inner",
)

# Stream-stream joins are written in Append mode; Update and Complete modes
# are not supported for this query class.
query = (
    matched.writeStream
           .outputMode("append")
           .option("checkpointLocation", checkpoint_path)
           .format("delta")
           .start(output_path)
)

# Monitor watermark movement plus stateOperators.numRowsTotal/memoryUsedBytes
# in StreamingQueryProgress.`,
  }],
  "How do you detect skew in the Spark UI and in key distributions?": [{
    title: "Profile heavy keys without collecting every key",
    language: "PySpark",
    code: `from pyspark.sql import functions as F

heavy_keys = (
    events.groupBy("join_key")
          .count()
          .orderBy(F.desc("count"))
          .limit(50)
)
heavy_keys.show(truncate=False)

# Correlate these counts with the target stage's max/median
# shuffle-read bytes, records, duration, spill and GC in the Spark UI.`,
  }],
  "How do salting, Adaptive Query Execution, broadcast joins, and custom partitioning help fix skew?": [{
    title: "Verify AQE skew-join settings and thresholds",
    language: "PySpark",
    code: `# These are enabled by default in current Apache Spark releases, but
# inspect effective values because platforms and applications can override them.
for key in [
    "spark.sql.adaptive.enabled",
    "spark.sql.adaptive.skewJoin.enabled",
    "spark.sql.adaptive.skewJoin.skewedPartitionFactor",
    "spark.sql.adaptive.skewJoin.skewedPartitionThresholdInBytes",
]:
    print(key, spark.conf.get(key))

# Explicit application configuration when required:
spark.conf.set("spark.sql.adaptive.enabled", "true")
spark.conf.set("spark.sql.adaptive.skewJoin.enabled", "true")

# Current documented defaults:
# factor = 5.0 and absolute threshold = 256 MB.
# A partition must exceed BOTH factor * median and the absolute threshold.

result = large_left.join(large_right, "customer_id")
result.explain(mode="formatted")

# Run an action, then inspect the final adaptive plan and SQL metrics.
# AQE skew handling applies only to supported shuffled joins; use selective
# salting, pre-aggregation, or different semantics for other skew patterns.`,
  }],
  "What is speculative execution in Spark?": [{
    title: "Enable speculation with explicit Spark 4.2 thresholds",
    language: "spark-submit",
    code: `spark-submit \\
  --conf spark.speculation=true \\
  --conf spark.speculation.quantile=0.90 \\
  --conf spark.speculation.multiplier=3 \\
  --conf spark.speculation.minTaskRuntime=100ms \\
  job.py

# Spark 4.2 defaults shown explicitly above. It also defaults
# spark.speculation.efficiency.enabled=true and uses process-rate information.
# Tune from the real task-duration distribution; do not copy these values into
# an older Spark release or managed runtime without checking effective settings.
# Verify that speculative winners reduce the tail without overloading sources.`,
  }],
  "How would you debug a Spark job that is running very slowly in production?": [{
    title: "Retain evidence and expose optimizer decisions",
    language: "PySpark / spark-submit",
    code: `query.explain(mode="cost")
query.explain(mode="formatted")

spark-submit \\
  --conf spark.eventLog.enabled=true \\
  --conf spark.eventLog.dir=s3://company-spark-history/ \\
  --conf spark.eventLog.logStageExecutorMetrics=true \\
  job.py

# Compare final AQE plans and task distributions in the history server;
# reconcile output counts and invariants after every tuning change.`,
  }],
  "Why can a Spark job become extremely slow after a groupBy?": [{
    title: "Prefer map-side combination over materializing all values",
    language: "PySpark",
    code: `# RDD anti-pattern: every value for a key crosses the shuffle and is grouped.
slow = pairs.groupByKey().mapValues(sum)

# Associative reduction combines values before and after the shuffle.
better = pairs.reduceByKey(lambda left, right: left + right)

# DataFrames likewise use built-in aggregates with partial aggregation.
totals = events.groupBy("customer_id").sum("amount")`,
  }],
  "What causes out-of-memory errors in Spark executors?": [{
    title: "Inspect task size and concurrency before adding memory",
    language: "PySpark",
    code: `query.explain(mode="formatted")

# Deployment memory model for YARN/Kubernetes-style executor containers:
# container memory ~= executor heap + memory overhead + configured off-heap
#                     + configured PySpark memory
# Nominal task concurrency ~= executor cores / spark.task.cpus.
# Four memory-heavy tasks can fail together even when one task fits alone.

# Starting points only; choose from measured shuffle bytes and peak memory.
spark.conf.set("spark.sql.adaptive.enabled", "true")
spark.conf.set("spark.sql.adaptive.skewJoin.enabled", "true")
spark.conf.set("spark.sql.shuffle.partitions", "800")

# Executor heap, memoryOverhead and cores are submission-time settings.
# Determine whether heap, native/direct/Python memory, or one hot task failed.`,
  }],
};

for (const [question, codeBlocks] of Object.entries(CODE_EXAMPLES_25_TO_34)) {
  const answer = SPARK_INTERVIEW_ANSWERS_25_TO_34[question];
  if (answer) SPARK_INTERVIEW_ANSWERS_25_TO_34[question] = { ...answer, codeBlocks };
}
