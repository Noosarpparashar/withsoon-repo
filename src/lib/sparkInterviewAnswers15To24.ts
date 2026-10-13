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

export const SPARK_INTERVIEW_ANSWERS_15_TO_24: Record<string, InterviewAnswer> = {
  "How does Spark handle fault tolerance?": detailedAnswer(
    "Spark primarily provides fault tolerance by remembering how distributed data was produced, retrying failed task attempts, and recomputing only the partitions or shuffle outputs that were lost. RDD lineage and DataFrame physical dependencies tell the scheduler which upstream work can recreate a result. Checkpoints, replicated source data, reliable shuffle support, and retry-safe outputs cover cases where lineage alone would be too expensive or insufficient.",
    [
      "A failed task is normally rerun on an available executor. `spark.task.maxFailures` controls how many continuous failures of one particular task are allowed before Spark aborts the job; its standard default is `4`. Increasing it can tolerate additional transient failures, but it cannot repair deterministic code errors or consistently bad input.",
      "If an executor disappears, its cached partitions and local shuffle files may disappear too. Cached data can be rebuilt from lineage; missing map outputs can force upstream map tasks or an entire stage attempt to run again.",
      "The DAG Scheduler tracks stage dependencies and available shuffle outputs. It submits missing stages before downstream result stages and resubmits work after fetch failures or executor loss.",
      "Reliable checkpointing materializes data or streaming progress on durable storage and creates a recovery boundary. It is useful for very long lineage, stateful streaming, and applications where replaying from the original source would be operationally expensive.",
      "Spark cannot make arbitrary external side effects exactly once. Database inserts, API calls, emails, and custom sink writes must be idempotent or transactional because a task or micro-batch may execute again.",
      "Driver failure is different from executor failure: ordinary task lineage lives under the driver/application. Recovering a batch driver generally requires application resubmission and durable input/output, while Structured Streaming restores compatible query progress and state from its checkpoint.",
    ],
    "If executor 4 dies after producing 30 cached partitions and several shuffle blocks, Spark schedules its running tasks elsewhere. Missing cached partitions are recomputed, and any downstream fetches that cannot find its shuffle blocks cause the required upstream shuffle-map tasks to regenerate them.",
    "Spark tolerates worker failure through retry and recomputation, but durable recovery and exactly-once effects still require correct checkpoint, source, and sink design.",
    [{
      title: "Recovery after distributed work is lost",
      steps: [
        { label: "Detect failure", detail: "Driver loses a task attempt or executor" },
        { label: "Identify loss", detail: "Running tasks, cache blocks or shuffle output" },
        { label: "Trace dependencies", detail: "DAG and lineage identify required parents" },
        { label: "Reschedule", detail: "Healthy executors recompute missing partitions" },
        { label: "Commit safely", detail: "Retry-safe sink accepts one logical result" },
      ],
    }],
  ),

  "What happens when a Spark executor dies?": detailedAnswer(
    "The driver detects that the executor is no longer available through the cluster manager, scheduler heartbeats, or failed communication. Running task attempts on that executor are marked failed and normally rescheduled on healthy executors. Data that existed only in the executor's memory or local disk is considered lost and is fetched from another replica or recomputed from lineage and surviving shuffle dependencies.",
    [
      "Tasks are retryable units. Spark launches new attempts subject to the configured failure limits; the complete job does not necessarily restart because one worker disappeared.",
      "Memory-only cached blocks on the dead executor are gone. Replicated persisted blocks can be read elsewhere; otherwise Spark recomputes their partitions from the original plan.",
      "Lost shuffle-map output is more consequential because downstream reduce tasks need it. With shuffle tracking, an external shuffle service, or graceful decommissioning, usable files may survive; otherwise Spark reruns the relevant upstream map tasks or stage.",
      "Broadcast blocks can be fetched again by replacement executors. Dynamic allocation or the cluster manager may launch a new executor, but task recovery does not require the replacement to have the same executor ID.",
      "A deterministic code or data error will fail again after rescheduling. Repeated task failure eventually aborts the stage/job, so retry is protection from transient failure rather than a way to hide broken logic.",
      "Output side effects may already have occurred before the executor died. Use Spark-supported commit protocols and idempotent/transactional external writes so a retried attempt does not create duplicate business effects.",
    ],
    "An executor is killed for exceeding its container limit while running partition 73. Spark reruns partition 73 elsewhere. If that executor also held a required shuffle block for partition 12, the corresponding upstream map output is regenerated before the reduce stage can finish.",
    "Executor loss triggers targeted rescheduling and data reconstruction; the recoverable unit depends on whether tasks, cached blocks, or shuffle outputs were lost.",
  ),

  "If a read operation is lazy, how does Spark detect an incorrect file path?": detailedAnswer(
    "Spark is lazy about executing transformations over data rows, but constructing a file-backed DataFrame can still require eager metadata work. The reader or analyzer may resolve the path, list files, discover partitions, read Parquet/ORC footers, infer a CSV/JSON schema, or inspect a table log before an action. Therefore an invalid path can fail during `load()` or analysis; in a more deferred API/source, it may fail only when an action asks Spark to plan input partitions.",
    [
      "Lazy evaluation means Spark postpones the distributed scan and downstream computation until an action. It does not promise that every filesystem or catalog operation is postponed.",
      "A DataFrame source must return a schema and relation to Spark. Without an explicit schema, Parquet footer reading or CSV/JSON inference can access storage immediately; partition discovery also needs path listings.",
      "Even with an explicit schema, a source may validate existence, resolve glob paths, build an in-memory file index, inspect a transaction log, or enforce options during relation creation.",
      "RDD sources can have different timing. For example, a path-backed RDD may defer determining its input splits until a job is submitted, so the invalid path appears at the first action.",
      "`printSchema()` does not scan every record, but it can expose an error if schema resolution was deferred. Conversely, a DataFrame created successfully can still fail at an action when a file is deleted, permissions change, or an actual data block is corrupt.",
      "If early validation is a requirement, check the path with the storage API and permissions appropriate to that source; `limit(1).count()` validates a small executable read but does not prove every file is readable.",
    ],
    "`spark.read.schema(schema).csv(path)` may avoid a full inference pass, while `spark.read.option('inferSchema', True).csv(path)` must inspect files to determine types. Both remain lazy for the later filter/aggregation, yet either can fail early if its source resolves the path during relation creation.",
    "Spark defers row computation, not necessarily metadata discovery; path-error timing is API-, source-, schema-, and catalog-dependent.",
  ),
  "When does Spark validate an input path?": detailedAnswer(
    "There is no single universal validation moment. A DataFrame file source commonly validates or resolves paths while `load()` creates the relation and file index, particularly when it must discover files, partitions, schema, or table metadata. Other sources or lower-level RDD APIs can defer path access until the first action causes Spark to enumerate input splits and schedule a job.",
    [
      "At reader construction, Spark only stores format/options; validation normally begins when `load(path)` asks the provider to create a relation or scan representation.",
      "During analysis, catalog table resolution, schema lookup, or a transactional table's metadata-log read can fail before distributed execution starts.",
      "During physical planning/job submission, Spark may refresh a file index, enumerate splits, and discover that the path is missing or inaccessible.",
      "During task execution, an individual file open can fail even after earlier validation because files changed, credentials expired, permissions differ on executors, or object-store listings were stale.",
      "A glob that resolves to no files, an empty directory, and a nonexistent path can be treated differently by formats and versions; production code should not infer business emptiness from one generic exception.",
    ],
    "A catalog table can resolve successfully from metastore metadata, but the action later fails because its storage location was removed. In another query, reading raw Parquet without a supplied schema can fail immediately because footer discovery finds no valid path.",
    "Path validation can occur during relation creation, analysis, planning, or task file-open; explain the specific API and source instead of saying all reads fail only at actions.",
  ),
  "Why can schema inference or file listing raise an error before an action runs?": detailedAnswer(
    "Spark needs enough metadata to build an analyzed logical relation before it can optimize later transformations. Schema inference must inspect representative or all relevant input records/footers, while file listing must discover candidate files and directory partition values. Those are real storage operations even though the distributed business computation remains lazy.",
    [
      "Parquet and ORC store schema and statistics in file metadata; Spark may read footers or table metadata to construct the DataFrame schema without scanning all column data.",
      "CSV and JSON do not carry a single authoritative columnar schema, so inference can launch work to sample or scan input. Supplying an explicit schema avoids inference cost but not every path/listing check.",
      "Partition discovery parses directory structures such as `event_date=2026-10-09`; Spark must list paths to know which partition columns and files exist.",
      "Delta, Iceberg, Hudi, and catalog-backed tables consult logs, manifests, or catalogs. A missing log/version/credential can fail before any result-row action.",
      "Metadata access can appear as a small Spark job for some sources. That does not contradict lazy execution: Spark is acquiring information needed to create the plan, not running the user's complete transformations.",
    ],
    "Calling `spark.read.option('inferSchema', 'true').json(path)` can read input to decide whether a field is a number or string before `count()` is called. With an explicit schema, Spark skips that inference but may still list the directory to create its file index.",
    "Planning requires metadata; Spark can access that metadata eagerly while still delaying the actual query scan and computation.",
  ),

  "What is a shuffle in Spark?": detailedAnswer(
    "A shuffle is Spark's redistribution of records across partitions so rows with the same key, required range, or target distribution arrive at the correct downstream tasks. It is the physical boundary behind many wide transformations. Upstream map tasks partition and write shuffle output; downstream tasks fetch the blocks they need, merge or sort them, deserialize records, and continue the join, aggregation, distinct, or ordering operation.",
    [
      "Before a shuffle, a child partition may need records from many parent partitions. Spark therefore cannot pipeline the entire dependency inside one task and creates a stage boundary.",
      "Map-side code hashes or range-partitions records into downstream buckets, buffers them, optionally combines partial aggregates, sorts where required, spills when memory is insufficient, and writes shuffle files plus metadata.",
      "The driver tracks map-output locations. Reduce-side tasks fetch their bucket from every relevant map output, often over the network, then merge spill files and feed the downstream operator.",
      "Shuffle partition count controls the number of downstream task buckets, while upstream partition count controls the number of map tasks. A shuffle with `M` maps and `R` reducers can create many logical block relationships even with consolidated physical files.",
      "If an executor loses required shuffle files, downstream fetches fail and Spark may rerun the producing map tasks/stage. This recovery cost makes unstable disks/executors particularly visible in shuffle-heavy jobs.",
      "Spark SQL plans shuffles as `Exchange` operators. AQE can use runtime map-output statistics to coalesce small partitions, split supported skewed joins, or revise some downstream choices.",
    ],
    "For `orders.groupBy('customer_id').sum('amount')`, each input task can compute partial totals, but the same customer can occur in every input partition. The shuffle sends each customer's partials to one compatible downstream partition for the final total.",
    "A shuffle is a distributed repartitioning protocol—map output, storage/network transfer, and reduce-side reconstruction—not merely 'data moving.'",
    [{
      title: "Shuffle data path",
      steps: [
        { label: "Map tasks", detail: "Read current partitions and create records" },
        { label: "Partition", detail: "Hash/range records into downstream buckets" },
        { label: "Spill and write", detail: "Buffer, combine, sort and persist shuffle blocks" },
        { label: "Fetch", detail: "Reduce tasks retrieve their blocks from all maps" },
        { label: "Reduce stage", detail: "Merge, aggregate, join or sort each partition" },
      ],
    }],
  ),
  "Which Spark operations cause a shuffle?": detailedAnswer(
    "Operations cause a shuffle when their required output distribution cannot be satisfied by the input partitioning. Common examples are grouping and keyed aggregation, non-broadcast joins, global distinct/deduplication, repartition, global sort/orderBy, many window operations, set operations, and some writes that require clustering. The API name alone is not absolute—the executed plan and existing distribution determine whether an Exchange is needed.",
    [
      "`groupBy`, `groupByKey`, `reduceByKey`, and aggregate operations redistribute by grouping key unless compatible partitioning can be reused. Map-side combination can reduce bytes but does not remove the required key distribution.",
      "Large equi-joins usually shuffle one or both sides to compatible key partitions. A broadcast join avoids shuffling the streamed large side; a plan may also reuse an already compatible exchange.",
      "`distinct`, `dropDuplicates`, `intersect`, `except`, and duplicate-preserving/duplicate-removing set semantics may require records with equal values to meet or may require global coordination.",
      "`repartition` deliberately creates an exchange. `coalesce` without shuffle normally narrows existing partitions; a global `orderBy` uses range partitioning and sorting, whereas `sortWithinPartitions` does not establish global order.",
      "Window functions often shuffle by `partitionBy` and sort by `orderBy`. An unpartitioned global window may collapse work toward a single partition and become especially expensive.",
      "Use `explain('formatted')` and look for `Exchange`, `BroadcastExchange`, and sort operators. Catalyst can remove, reuse, or add exchanges, so source code alone is not final evidence.",
    ],
    "Two DataFrames already produced by a common `repartition(400, 'id')` exchange may let a later join reuse that distribution in the same plan. The same textual join over independently read files will normally need new exchanges or a broadcast.",
    "A shuffle is caused by an unmet distribution requirement; confirm it in the physical plan rather than memorizing only method names.",
  ),
  "What happens internally during a shuffle?": detailedAnswer(
    "During a shuffle, each upstream task assigns its output records to downstream partition IDs using the planned partitioner. It buffers and serializes records, performs map-side combine or sort where the operator permits, spills to local disk under memory pressure, and writes indexed shuffle output. After all required map outputs are available, downstream tasks fetch their partition's blocks, merge and deserialize them, and execute the reduce-side operator.",
    [
      "Partition selection is commonly hash-based for key grouping, range-based for global ordering, or round-robin for count-only repartitioning. The expression and partition count are part of the physical `Exchange`.",
      "Spark's shuffle writer may consolidate logical reducer buckets into indexed data files rather than opening one physical file for every map-reducer pair; implementation varies with manager and bypass/sort conditions.",
      "Map-side aggregation for associative operations reduces records before they cross the network. `groupByKey` cannot collapse arbitrary values in the same way because the downstream result requires the complete iterable.",
      "Reduce tasks can fetch blocks locally or remotely and perform multiple concurrent fetches. Fetch wait, network throughput, remote block size, and unavailable outputs affect their runtime.",
      "Large buffers or sorts spill to disk and are merged later. Spill prevents some memory failures but adds serialization and local I/O, and a single unbounded key/result can still exceed memory.",
      "Map-output status is coordinated by the driver. A fetch failure can invalidate output locations and trigger recomputation before the reduce stage retries.",
    ],
    "With 1,000 upstream and 800 downstream partitions, each map task writes data for many reducer buckets. Reducer 17 then fetches bucket 17 from the relevant map outputs, merges them, and calculates the join or aggregate for its key range.",
    "Shuffle is a two-sided protocol with durable intermediate blocks and a stage barrier, which is why its cost and failure behavior differ from a narrow transformation.",
  ),
  "Why is a shuffle expensive?": detailedAnswer(
    "Shuffle combines nearly every expensive resource in a distributed engine: serialization CPU, memory buffers, local disk spill/write/read, network transfer, metadata coordination, sorting or hash-table construction, task scheduling, and a synchronization boundary between stages. Its cost grows with post-filter bytes, record width, partition count, skew, spill, and output cardinality—not simply with source size.",
    [
      "Every shuffled record must be encoded and assigned to a bucket; object-heavy encodings increase CPU, bytes, allocations, and garbage collection.",
      "Remote blocks cross the network and may wait on congested executors. Large numbers of tiny blocks add request and bookkeeping overhead, while very large blocks create fetch and memory pressure.",
      "Sort-based operators compare and merge records; hash operators allocate per-partition tables. When execution memory is insufficient, spill adds extra disk passes and serialization.",
      "Downstream work cannot fully complete until the required upstream map outputs exist. One skewed or repeatedly failing map task can therefore delay many reducers and extend the job tail.",
      "Shuffle data lives on executor/node storage. Disk exhaustion, decommissioning, executor loss, or fetch failures can force recomputation and multiply the original cost.",
      "A shuffle can also multiply rows—especially a many-to-many join—so the output can be much larger than either input even when the exchange itself is balanced.",
    ],
    "A 2 TB wide join may serialize and write both sides, transfer most blocks remotely, sort hundreds of partitions, and spill them several times. A hot duplicate key can then produce a much larger joined result in one reducer.",
    "Shuffle is expensive because it turns local pipelined computation into coordinated storage, network, and repartitioned execution across the cluster.",
  ),
  "How can you minimize shuffle in Spark?": detailedAnswer(
    "Minimize unnecessary shuffle bytes and exchanges, not every shuffle regardless of purpose. Filter rows and project columns early, use partial aggregation, broadcast only a genuinely small input, preserve or reuse useful partitioning, avoid redundant repartition/distinct/sort operations, and let Catalyst/AQE optimize structured plans. A required correct grouping or large-large join still needs distribution and should be sized rather than removed.",
    [
      "Reduce the payload before wide operators: apply partition pruning, predicate pushdown, column pruning, and business filters before joins or aggregations.",
      "Use `reduceByKey`/`aggregateByKey` instead of `groupByKey` for associative RDD aggregation so map-side combiners send partial results rather than every value.",
      "For DataFrames, use built-in aggregates and pre-aggregate a many-side dataset when semantics permit. Remove duplicate dimension keys before a fact join to avoid both shuffle and result explosion.",
      "Broadcast a measured small side to avoid exchanging the large side. Do not force it from compressed file size alone because the driver and every executor must materialize the relation.",
      "Avoid chains such as repartition followed by another incompatible repartition/order, unnecessary global `distinct`, or repartitioning both inputs when the immediate join would perform the same exchange.",
      "Inspect the final plan for exchanges and runtime metrics for actual bytes. AQE can coalesce small shuffle partitions, convert eligible joins, and mitigate supported skew, but it cannot correct unnecessary logic hidden in the query.",
    ],
    "Instead of joining a 4 TB event table with all 200 dimension columns and filtering afterward, select the two needed dimension columns, filter active rows, validate key uniqueness, and broadcast it if the materialized size is safe.",
    "Remove avoidable data movement and shrink necessary movement; never trade away correctness merely to reduce the number of Exchange nodes.",
  ),

  "Why is reduceByKey generally better than groupByKey?": detailedAnswer(
    "For associative per-key aggregation, `reduceByKey` combines values locally within each map partition before the shuffle and then combines those partial results downstream. `groupByKey` must transfer and retain every value so it can return the full iterable for each key. Consequently, `reduceByKey` usually sends fewer records, uses less reduce-side memory, spills less, and avoids creating huge per-key collections.",
    [
      "If a key has one million integer values spread across 100 map partitions, local reduction can send roughly one partial value per map partition rather than all one million values.",
      "The reducer function must be associative and commutative enough for distributed combination; Spark may combine values in different orders. Floating-point addition can therefore differ slightly due to rounding order.",
      "Use `aggregateByKey` or `combineByKey` when the accumulator type differs from the input or needs explicit create/merge logic. These retain map-side combination while expressing richer aggregations.",
      "`groupByKey` is justified only when the application truly needs all individual values for a key. Even then, one hot key can create an unbounded iterable and OOM; redesign with bounded/top-N/streaming logic where possible.",
      "In DataFrame/Spark SQL code, built-in `groupBy(...).agg(...)` normally plans partial and final aggregates; it should not be equated mechanically with RDD `groupByKey`.",
      "Neither method automatically fixes a hot key. Map-side combine reduces records, but a single key's final accumulator or expensive result can still create skew.",
    ],
    "Summing 500 million `(customer_id, amount)` pairs with `reduceByKey` lets each mapper emit partial customer totals. `groupByKey().mapValues(sum)` ships every amount and constructs the complete value collection only to immediately collapse it.",
    "When the result is an associative aggregate, combine before the network; group every raw value only when the result genuinely requires those values.",
  ),

  "What is partitioning in Spark?": detailedAnswer(
    "Partitioning divides a distributed dataset into logical chunks that Spark can process independently. A stage normally creates one task per partition, and executor cores run a subset of those tasks concurrently. Partition boundaries therefore determine available parallelism, per-task working-set size, data locality, skew exposure, shuffle layout, and output file count.",
    [
      "Input partitions come from source splits: file blocks/ranges, Kafka offset ranges, JDBC predicates, or source-specific planning. A partition is not necessarily one file and a file may be split into several partitions.",
      "Narrow transformations such as many maps and filters preserve or derive partitions without moving records across the cluster. Wide transformations create new partitions through an Exchange/shuffle.",
      "Hash partitioning assigns a key to one of N buckets using the conceptual rule `partitionId = nonNegativeHash(key) % N`. Scala/Java pair RDDs use `HashPartitioner` with the key's JVM `hashCode`; PySpark `RDD.partitionBy` defaults to PySpark's `portable_hash`, whose hashing of strings depends on a consistent `PYTHONHASHSEED`; Spark SQL uses its own deterministic hash expression (commonly Murmur3). The implementations differ, but each must send equal keys to the same bucket within that partitioning operation.",
      "For example, with four partitions and non-negative hash values 13, 26, 7, and 20, the partition IDs are `13 % 4 = 1`, `26 % 4 = 2`, `7 % 4 = 3`, and `20 % 4 = 0`. A repeated key has the same hash and reaches the same partition. A very frequent key therefore remains concentrated in one bucket; simply increasing N does not divide that hot key.",
      "Hash partitioning is the normal choice for equality joins, `groupBy`, `reduceByKey`, and `distinct` because equal keys must meet. It does not preserve key order and can be badly imbalanced when key frequency or the hash distribution is uneven.",
      "Range partitioning samples or otherwise derives ordered boundaries and sends each key range to a bucket. Spark uses it for global ordering and `repartitionByRange`; it supports ordered partitions but sampling and skewed ranges can still produce imbalance.",
      "Round-robin partitioning distributes rows across a requested count without using a business key. It is useful when the objective is a broadly even repartition, but a later key-based join or aggregation will still need a hash/range Exchange.",
      "A compatible partitioner can prevent repeated redistribution in pair-RDD pipelines, and Spark SQL can sometimes reuse an existing distribution or Exchange. File layout alone does not guarantee that Spark will recognize the required runtime partitioning, so confirm `hashpartitioning`, `rangepartitioning`, or `RoundRobinPartitioning` in the physical plan.",
      "A task processes its partition as an iterator rather than loading the entire dataset. Nevertheless, sorts, joins, aggregation state, decompression, UDFs, and one huge row/key can require substantial per-task memory.",
      "Partitioning is not the same as table directory partitioning. Storage partition columns prune files; Spark execution partitions are runtime work units and can change at every shuffle.",
      "Good partitioning supplies several waves of balanced tasks with manageable work. More partitions increase scheduling/block overhead; fewer create large tasks and underuse cores.",
    ],
    "A 1 TB Parquet scan may be planned into thousands of input partitions. If `groupBy('account_id')` then uses 4,800 shuffle partitions, Spark hashes every account ID into one of those buckets so all rows for the same account can be aggregated together. A subsequent global sort replaces that hash layout with range-partitioned output.",
    "A Spark partition is the unit of task work and distribution; its count and balance matter more than a simplistic one-file/one-partition model.",
    [
      {
        title: "How a keyed hash exchange places records",
        steps: [
          { label: "Read the key", detail: "Extract the join or aggregation key" },
          { label: "Hash the key", detail: "Calculate a deterministic non-negative hash" },
          { label: "Choose bucket", detail: "partitionId = hash % numberOfPartitions" },
          { label: "Shuffle", detail: "Move the record to that downstream bucket" },
          { label: "Process together", detail: "All equal keys meet in one task" },
        ],
      },
      {
        title: "Choose a partitioning strategy",
        steps: [
          { label: "Hash", detail: "Equality joins and keyed aggregations" },
          { label: "Range", detail: "Global ordering and ordered key ranges" },
          { label: "Round-robin", detail: "Even redistribution without key grouping" },
          { label: "Source splits", detail: "Parallel reads from files, Kafka or JDBC" },
          { label: "Verify plan", detail: "Inspect Exchange and runtime balance" },
        ],
      },
    ],
  ),
  "Why does partitioning matter?": detailedAnswer(
    "Partitioning controls both how much parallel work Spark can expose and how much work one task must perform. It affects CPU utilization, memory pressure, shuffle block sizes, spill, skew, recovery granularity, scheduler load, source locality, and writer concurrency. A large cluster cannot compensate for a stage with a few partitions, and a small cluster can still safely process thousands of bounded partitions in waves.",
    [
      "Too few partitions leave cores idle and make each task's decoded rows, sort buffers, hash tables, or aggregation state larger, increasing spill, stragglers, and OOM risk.",
      "Too many partitions create short tasks whose launch, serialization, shuffle fetch, event-log, and output-commit overhead dominates computation; they can also generate many tiny output files.",
      "Uneven partitions are often worse than a suboptimal average. One hot key or unsplittable file can keep a stage running after every other task completes.",
      "Partitioning by a useful key can reduce later redistribution only when Spark retains and recognizes compatible partitioning. It can also cluster related records for local operations.",
      "Smaller partitions improve failure recovery granularity: only a bounded unit must be recomputed. Extremely small partitions, however, increase the number of failure and scheduling events.",
      "Sink capacity matters. Thousands of Spark partitions can create thousands of simultaneous or sequential files/connections even when compute is healthy.",
    ],
    "With 400 task slots but only 20 partitions, at most 20 tasks do useful work. With 200,000 tiny partitions lasting 50 ms, the scheduler and file commits dominate. Several waves of seconds-to-minutes, balanced tasks are healthier.",
    "Partitioning is the bridge between data layout and cluster resources: it determines task parallelism, task size, and balance.",
  ),
  "How does Spark use partitions internally?": detailedAnswer(
    "For each stage, Spark turns every output partition into a task definition and schedules attempts on executors with available slots, preferring locality where applicable. A task iterates its partition, pipelines compatible narrow operators, and writes either final output or partitioned shuffle blocks. After an Exchange, a new downstream partition set and new stage are created.",
    [
      "Input tasks read source ranges described by partitions. Locality preferences may place tasks near HDFS blocks or cached partitions; object storage typically provides less meaningful compute locality.",
      "Narrow operators can be fused/pipelined: one task can read, filter, project, and map rows from the same partition without materializing a new distributed dataset after each call.",
      "A shuffle-map task produces buckets for many downstream partitions. A result/reduce task fetches the bucket corresponding to its own partition from the upstream maps.",
      "Scheduler retries create multiple attempts for the same logical partition. Only an accepted successful attempt contributes committed Spark output, though external side effects still require idempotency.",
      "Executors normally run one task per assigned core at a time. Task CPUs can be configured above one for specialized workloads, so efficient concurrency is available task CPUs divided by CPUs required per task, not always exactly raw core count.",
      "The partition iterator does not guarantee bounded operator state: a sort, hash join, grouped UDF, or hot key can materialize much more than one row at a time and spill or fail.",
    ],
    "A stage with 800 partitions on an 80-slot cluster runs in roughly ten task waves. Each task pipelines scan and filter, then writes hash buckets; the following stage creates one task for each planned shuffle partition.",
    "Partitions are converted into independently schedulable task attempts, while wide dependencies replace the partition layout at stage boundaries.",
  ),
  "How does Spark determine the default number of partitions?": detailedAnswer(
    "Spark has several defaults because input, RDD, SQL shuffle, and streaming partitions are planned differently. File-input partition counts come from discovered files/splits and scan settings; RDD parallelism comes from its input, parent partitioner, or `spark.default.parallelism`; Spark SQL Exchanges begin with `spark.sql.shuffle.partitions`; AQE may change the effective downstream count at runtime.",
    [
      "For `parallelize`, Spark uses the supplied slice count or the context's default parallelism, which is influenced by available cluster resources and scheduler backend.",
      "Hadoop-style RDD input partitions derive from input splits. File DataFrames use file length, splitability, `maxPartitionBytes`, open-cost estimates, minimum/maximum partition guidance, and source implementation.",
      "A pair RDD can preserve an existing `Partitioner`; keyed transformations choose a partition count from parents or defaults when no compatible partitioner exists.",
      "Spark SQL shuffles use `spark.sql.shuffle.partitions` as the initial target—traditionally 200 unless changed. AQE can coalesce small post-shuffle partitions and optimize supported skew after seeing real map-output sizes.",
      "Kafka topic partitions define baseline source ranges, but modern connectors can subdivide large ranges with options such as desired minimum partitions or maximum records per partition.",
      "Defaults are starting behavior, not recommended production sizing. Inspect planned partitions and actual input/shuffle bytes per task for each expensive stage.",
    ],
    "Reading 10 large splittable Parquet files can produce hundreds of scan partitions, while the following groupBy initially produces 200 shuffle partitions. These numbers come from different planners and should not be expected to match.",
    "Always identify which partition domain is being discussed—source, RDD, shuffle, state, or output—before tuning its count.",
  ),

  "How do you decide the number of Spark partitions?": detailedAnswer(
    "Choose a count that provides multiple waves of balanced tasks while keeping each task's measured bytes, records, working state, and duration within safe bounds. Use available task slots as a parallelism floor and estimated post-filter or post-shuffle bytes divided by a tested target size as a task-size estimate. Then adjust for compression, operator complexity, skew, source/sink behavior, and AQE rather than applying one universal formula.",
    [
      "Estimate concurrency from executors × usable cores divided by CPUs per task. Aim for several waves so a slow task or locality delay does not leave most slots idle; `2–4 × slots` is a common initial floor, not a maximum.",
      "Estimate data-driven count from bytes entering the specific stage, not total lake size. A join may shuffle 600 GiB after filtering even though its sources contain 10 TiB.",
      "A 100–200 MB compressed/input-byte target is a practical starting heuristic for many I/O/shuffle stages, but decoded rows and hash/sort state can multiply memory. CPU-heavy or wide-record tasks may need less; fast scans may tolerate more.",
      "Profile maximum as well as median task size and duration. Hash partitioning cannot divide one hot key merely by increasing the global count; use skew handling, salting, pre-aggregation, or different semantics.",
      "Account for overhead at the other extreme: scheduler events, shuffle blocks, object-store requests, and output files. Prefer tasks that perform seconds of useful work, not huge populations of millisecond tasks.",
      "With AQE, set a safely high initial shuffle count and a measured advisory partition size so Spark can merge small partitions. Confirm the final adaptive plan and output behavior rather than assuming AQE fixes every stage.",
    ],
    "For a stage expected to shuffle 600 GiB on 40 task slots, a 128 MiB estimate suggests about 4,800 partitions, far above the 80–160 parallelism floor. Forty run simultaneously in waves; production metrics then determine whether 128 MiB produces appropriate memory and duration.",
    "Partition count is a workload-sizing decision: enough tasks for parallelism, small enough tasks for safety, and large enough tasks to amortize overhead.",
    [{
      title: "Partition-sizing workflow",
      steps: [
        { label: "Measure stage bytes", detail: "Use post-filter or shuffle output, not raw estate size" },
        { label: "Estimate task count", detail: "Bytes divided by a tested target size" },
        { label: "Check slot floor", detail: "Ensure several waves of available parallelism" },
        { label: "Adjust", detail: "Operator memory, skew, source and sink constraints" },
        { label: "Validate", detail: "Task duration, spill, GC, max/median and overhead" },
      ],
    }],
  ),
  "How do you reconcile the CPU-core rule with the target-partition-size rule?": detailedAnswer(
    "Treat the CPU rule as the minimum parallelism needed to occupy the cluster and the size rule as the minimum number of tasks needed to bound work per task. A practical initial count is the larger of those estimates, then refined with measured task duration, memory, skew, and overhead. The rules answer different questions and are not competing fixed recommendations.",
    [
      "`2–4 × task slots` asks whether enough runnable tasks exist for several waves and straggler tolerance. It says nothing about whether each task would contain 50 MB or 50 GB.",
      "`stage bytes / target bytes per task` asks whether a normal task is a manageable unit. It can legitimately yield thousands of tasks on a cluster with only tens of concurrent slots.",
      "Use bytes for the relevant stage: input split sizing for a scan, map-output bytes for a shuffle, and state/cardinality metrics for stateful work. Source file size alone may be compressed and misleading.",
      "The maximum of two estimates is still only a starting point. One task can require several times its input size for decoding or hashing, while an I/O-only task may safely process more.",
      "AQE can start with many shuffle partitions and coalesce small adjacent partitions after observing map output, reducing the penalty when estimates were conservatively high.",
    ],
    "Forty slots suggest perhaps 80–160 initial tasks for parallelism, but 1 TB divided into 128 MB units suggests roughly 8,000. Choosing 160 would create multi-gigabyte tasks; 8,000 bounded tasks running in waves is the safer starting shape.",
    "Use the larger requirement for initial safety, then optimize from observed per-task work rather than treating either heuristic as law.",
  ),
  "How many tasks can a cluster execute efficiently at once?": detailedAnswer(
    "The baseline concurrent task capacity is the sum of executor cores available to the application divided by `spark.task.cpus`, subject to scheduler pools, resource profiles, GPUs/other resources, dynamic allocation, and executor availability. Efficient concurrency may be lower than the mathematical maximum when each task is memory-, disk-, network-, Python-, or sink-intensive.",
    [
      "With ten executors × four cores and the default one CPU per task, about forty tasks can run simultaneously. Thousands of remaining tasks wait and run in later waves.",
      "If `spark.task.cpus=2`, those forty cores provide about twenty task slots. GPU tasks or custom resource profiles can impose another limiting resource.",
      "Each concurrent task has a working set. Four large hash-join tasks per executor can OOM where two would fit, so fewer executor cores or smaller partitions can improve actual throughput.",
      "External systems can set a lower concurrency ceiling. Forty JDBC writers may overwhelm a database even though Spark has forty slots, requiring per-partition batching and controlled writer count.",
      "Dynamic allocation changes the slot count over time. Measure executor timeline and active slots during the stage instead of deriving capacity only from requested maximum executors.",
    ],
    "A cluster has 160 cores, but each Python UDF task needs 3 GB and executors can safely run only two such workers each. Scheduling all nominal core slots can trigger container kills; reducing cores/concurrency yields higher completed throughput.",
    "Core count gives nominal task slots; memory, I/O, external capacity, and per-task resource requirements determine efficient concurrency.",
  ),
  "How large should each task be to avoid out-of-memory errors and slow execution?": detailedAnswer(
    "There is no safe size expressed only in input bytes. Start with a bounded range such as roughly 100–200 MB for many scan or shuffle workloads, then measure decoded size, operator state, spill, GC, task duration, and maximum partition size. A task must fit its input representation plus sort/hash/aggregation/UDF/broadcast working memory alongside every other concurrent task on the executor.",
    [
      "Compressed Parquet bytes can expand several times when decoded; selecting a few primitive columns differs radically from materializing hundreds of strings and nested objects.",
      "A hash join or aggregate can hold a large fraction of its partition in memory. A streaming projection can iterate records with a much smaller working set for the same input bytes.",
      "Concurrency multiplies memory. Divide practical executor headroom among simultaneously running tasks, resident broadcast/cache blocks, JVM overhead, Python/native memory, and shuffle buffers.",
      "Task duration is a useful outcome metric: sub-second tasks often waste scheduler overhead, while tasks lasting many minutes increase straggler and retry cost. Desired duration varies with workload and platform.",
      "The largest partition matters more than the mean. Skew, unsplittable files, and hot keys require specific correction rather than a lower average target alone.",
    ],
    "A 128 MB compressed Parquet split selecting nested text may decode to over 1 GB before an aggregation builds state. Reducing scan size, projecting fewer fields, and lowering concurrent cores may be required even though the nominal partition matches the usual heuristic.",
    "Size tasks from peak working memory and runtime metrics, not compressed bytes or a universal MB number.",
  ),
  "Why are roughly 100–200 MB partitions commonly targeted?": detailedAnswer(
    "Roughly 100–200 MB is a widely used starting range because it is often large enough to amortize scheduler, file-open, serialization, and network setup while remaining small enough for useful parallelism, bounded retry cost, and manageable per-task memory on typical clusters. It also aligns historically with common distributed-filesystem block and Spark scan defaults. It is a heuristic, not a correctness boundary.",
    [
      "Much smaller partitions can finish so quickly that task launch, event logging, shuffle block requests, and output commits dominate useful processing.",
      "Much larger partitions reduce task waves, increase working memory and spill, make skew more painful, and require more recomputation after a failed attempt.",
      "The byte metric must be named: compressed file bytes, decoded input, serialized shuffle bytes, and in-memory object size are not equivalent.",
      "Fast columnar scans over a few fields may use larger splits efficiently; CPU-heavy parsing, Python transformations, nested rows, or per-record external work may need smaller partitions.",
      "Validate with task duration, peak execution memory, spill, GC, scheduler delay, and storage throughput. Change the target when evidence shows overhead or memory pressure, not because a rulebook says 128 MB.",
    ],
    "On one pipeline, 128 MB partitions scan in 10 seconds with low spill and several waves, making the target reasonable. On a wide JSON/UDF pipeline they OOM after expansion, so 32–64 MB may be safer.",
    "The common range balances fixed task overhead against per-task risk; production measurements choose the real value.",
  ),
  "If a cluster has only 40 cores, is using 8,000 partitions wasteful?": detailedAnswer(
    "Not necessarily. Forty cores mean roughly forty one-CPU tasks can run at once; they can process 8,000 bounded partitions in about 200 waves. This is normal when the data volume requires small enough tasks. It becomes wasteful only when individual tasks are so small that scheduling, shuffle-block, listing, or commit overhead dominates, or when 8,000 output tasks create an unhealthy file/sink pattern.",
    [
      "Partitions define total work units; cores define concurrent attempts. Having many more partitions than cores is how a fixed-size cluster processes data larger than one wave.",
      "For 1 TB, 8,000 partitions are about 128 MB each before considering compression and skew; 160 partitions would average more than 6 GB and may spill or OOM.",
      "Eight thousand tasks lasting 10–60 seconds can be reasonable. Eight thousand tasks lasting 50 milliseconds indicate overhead and should be coalesced or planned differently.",
      "More waves extend baseline stage duration, so scale-out may be required for an SLA, but reducing partitions without enough memory merely converts queueing into failures and stragglers.",
      "AQE can begin conservatively with many shuffle partitions and merge small runtime partitions. Output partitioning should be chosen separately to avoid thousands of tiny files.",
    ],
    "A 40-slot cluster processing a 600 GiB shuffle with 4,800 partitions runs about 120 waves. If tasks average 15 seconds and remain stable, this is safer than 120 multi-GiB partitions that spill for minutes or fail.",
    "Many partitions are not wasteful by themselves; waste is determined by task granularity, total overhead, SLA, and downstream effects.",
  ),
  "What happens when there are too few partitions?": detailedAnswer(
    "Too few partitions limit stage parallelism and make each task responsible for more rows, bytes, and operator state. Cores sit idle, tasks run longer, shuffle blocks and spills grow, garbage collection increases, retry cost becomes large, and an executor may fail because one task's working set no longer fits.",
    [
      "A stage cannot run more task attempts concurrently than it has partitions, regardless of cluster size. Ten partitions use at most ten normal one-CPU task slots.",
      "Large partitions intensify hash joins, sort buffers, grouped operations, decompression, and Python-worker memory. Spill can protect heap but adds local I/O and merge passes.",
      "Recovery granularity worsens: a failed 20-minute task repeats far more work than a failed one-minute task, extending the job tail.",
      "Few partitions do not cure skew. A hot key may still dominate one of them, while every ordinary key is packed into the remaining oversized tasks.",
      "Increase the appropriate domain: file scan partitions, RDD partitions, or shuffle partitions. Blind `repartition` can add a full exchange, so place it only where the benefit exceeds its cost.",
    ],
    "A 2 TB aggregation using the default 200 shuffle partitions averages about 10 GB per reducer before skew. On a large cluster, most cores wait while reducers spill heavily and several fail; raising the shuffle count creates safer units.",
    "Too few partitions cause underutilization and oversized tasks—the cluster has resources, but the stage cannot expose or safely package enough work.",
  ),
  "What happens when there are too many partitions?": detailedAnswer(
    "Too many partitions produce excessive task and block overhead relative to useful work. The driver schedules more tasks, executors repeatedly deserialize closures and initialize operators, the UI/event log grows, shuffle stages manage many small blocks/fetches, and writes can create many tiny files or connections. Performance falls when task setup and coordination exceed computation.",
    [
      "Very short tasks increase scheduler delay and reduce CPU efficiency. The driver can become the bottleneck even while executors are not saturated with useful processing.",
      "A large map/reducer grid creates many logical shuffle-block relationships, status records, fetch requests, and tiny disk segments even when physical file consolidation is used.",
      "Small output partitions often become small files, increasing object-store metadata cost and slowing every downstream scan and table snapshot.",
      "Per-task source or sink setup—opening JDBC connections, loading libraries, initializing Python workers—can dominate and overload external systems.",
      "AQE can coalesce small SQL shuffle partitions, while scan planning and final output may still require explicit layout tuning. Do not simply decrease every global count because one stage has tiny tasks.",
    ],
    "A 20 GB shuffle split into 100,000 partitions averages about 200 KB per reducer. Tasks may spend more time starting and fetching metadata than aggregating, and the following write can create tens of thousands of tiny files.",
    "Too many partitions exchange memory risk for control-plane and small-file overhead; combine them when measured useful work per task is too low.",
  ),

  "What are shuffle partitions?": detailedAnswer(
    "Shuffle partitions are the output buckets created by a Spark SQL `Exchange` or keyed RDD partitioner. They determine the number of downstream tasks and the distribution of shuffled records for joins, aggregations, distinct, global sort, repartition, and similar wide operations. They are different from input scan partitions, even though both ultimately become task work units.",
    [
      "For a hash exchange, Spark calculates a target bucket from the key and partition count so equal keys reach the same downstream partition. Range and round-robin exchanges serve different distribution requirements.",
      "In Spark SQL, `spark.sql.shuffle.partitions` supplies the initial count for many exchanges. A `repartition(n, ...)` call or operator-specific requirement can set a different count.",
      "Every upstream map task writes data for the relevant shuffle buckets; each downstream task fetches one bucket across all maps. Thus the count controls reduce-side task size and block topology.",
      "AQE can coalesce adjacent small post-shuffle partitions, use an advisory size, and split supported skewed join partitions after runtime map statistics become available.",
      "The setting does not control file-scan splits or guarantee final file size. Later exchanges and writer distribution can change the number again.",
    ],
    "A groupBy reads 3,000 scan partitions but uses an initial 1,200 shuffle partitions. The upstream 3,000 tasks write partial aggregates into 1,200 buckets; the next stage launches about 1,200 tasks before AQE adjustments.",
    "Shuffle partitions are reduce-side distribution buckets, not a global application-wide partition count.",
  ),
  "How do you decide spark.sql.shuffle.partitions?": detailedAnswer(
    "Use `shuffle partitions ~= max(2-4 x total task slots, ceil(total shuffle bytes / target bytes per task))` as an initial estimate. It combines a parallelism floor with a task-size requirement; it is not a universal constant. Start conservatively high when AQE coalescing is enabled, examine final partition sizes and skew, and tune per workload or stage rather than copying the traditional default of 200.",
    [
      "Use SQL operator metrics or previous event logs for shuffle write bytes after filters and partial aggregation. Raw input size can overestimate or underestimate the actual exchange dramatically.",
      "The worked example assumes `10 executors × 4 cores per executor = 40 total executor cores` as a capacity input; 10 is neither derived from the 600 GiB data size nor a recommended cluster size. With one CPU per task (`spark.task.cpus = 1`), the cluster provides about 40 concurrent task slots.",
      "In general, estimate concurrency as `task slots = executors × usable cores per executor / spark.task.cpus`. Use executor cores—not the driver core count—and account for dynamic allocation, autoscaling, cores reserved by the platform, and other simultaneously running workloads.",
      "Calculate `parallelism_floor = 2-4 x task_slots`, `size_based = ceil(shuffle_bytes / target_bytes_per_task)`, and then `initial_partitions = max(parallelism_floor, size_based)`. The target depends on decoded/state memory and desired task duration, not only serialized shuffle bytes.",
      "Applying the CPU rule to the assumed cluster gives `2-4 × 40 = 80-160`; the worked calculation uses the conservative upper end, `4 × 40 = 160`, as its parallelism floor. This answers how many tasks should be available to keep the 40 slots busy for several waves—it does not yet account for task size.",
      "For the separate 600 GiB shuffle example and a 128 MiB target, the size estimate is `ceil(600 × 1024 MiB / 128 MiB) = 4,800`. The final starting value is therefore `max(160, 4,800) = 4,800` shuffle partitions. Only about 40 tasks run concurrently; the remaining partitions wait and execute in later waves.",
      "Consider the largest normal and maximum partitions. More partitions do not split a single hot key; enable/verify AQE skew handling, pre-aggregate, salt, or isolate the key.",
      "With AQE, configure an initial count that avoids large pre-adaptive buckets and use advisory partition sizing/coalescing. Some stages or APIs may not benefit identically, so inspect the executed plan.",
      "Check scheduler overhead and downstream file count when raising it. A good shuffle count can still be a bad final write count, so deliberately coalesce/rebalance output when appropriate.",
    ],
    "Using the worked example's 40 one-CPU task slots gives an upper parallelism floor of `4 × 40 = 160`. A 600 GiB shuffle with a 128 MiB target gives `600 GiB × 1,024 MiB/GiB ÷ 128 MiB = 4,800` size-based partitions. Choose `max(160, 4,800) = 4,800`; Spark runs them in waves of roughly 40 before AQE adjustments.",
    "Size the setting from real post-shuffle bytes, safe per-task work, available slots, and skew—then confirm the final adaptive plan.",
  ),
  "What benefits do correctly sized shuffle partitions provide?": detailedAnswer(
    "Correctly sized shuffle partitions keep the cluster busy while bounding each reduce task's memory, spill, network fetch, and retry cost. They reduce both extremes: oversized reducers that OOM or run for minutes, and tiny reducers whose scheduling and fetch overhead dominates. The result is steadier throughput, shorter tails, and more predictable recovery.",
    [
      "Enough partitions expose parallelism for all task slots and keep slots supplied across several waves when individual attempts are slow or retried.",
      "Bounded fetch and operator state reduce spill, garbage collection, large-block fetch failures, and container pressure.",
      "Useful task duration amortizes scheduler, closure, Python-worker, connection, and output-commit setup without making recovery units enormous.",
      "Smaller normal partitions make AQE and skew metrics more actionable, although a deterministic hot key still requires a dedicated skew solution.",
      "Predictable task sizes allow executor memory, cores, local disk, and network to be capacity-planned instead of tuned around rare multi-gigabyte reducers.",
    ],
    "After increasing a 1 TB aggregation from 200 to a few thousand partitions, median reducers stop spilling multiple gigabytes and executor losses disappear. AQE merges unexpectedly small buckets so the scheduler does not pay the full conservative count.",
    "The goal is not the highest partition count; it is balanced, bounded, long-enough-to-be-useful reduce tasks.",
  ),
  "What happens when you increase the number of shuffle partitions?": detailedAnswer(
    "Increasing shuffle partitions creates more downstream buckets and tasks, so average bytes and records per normal task usually decrease. This improves parallelism and lowers per-task memory, spill, and retry cost, but increases scheduler work, map-output bookkeeping, shuffle fetch/block overhead, and potentially output file count. It does not divide all forms of skew.",
    [
      "The same key still hashes to one bucket, so a single hot key can remain huge even with thousands more partitions. AQE skew splitting or application-level key treatment is needed.",
      "More tasks allow more waves and can use a larger cluster, but concurrent execution remains limited by available slots and per-task resource requirements.",
      "Each map output contains logical data for more reduce buckets, increasing metadata and tiny-block overhead. At extreme counts, control-plane work dominates.",
      "Smaller reduce inputs can keep hash tables/sorts within memory and reduce spill; they can also make tasks too short to amortize startup.",
      "If the shuffled DataFrame is written immediately, more partitions can mean more files. Separate computation-safe shuffle sizing from target storage layout.",
    ],
    "Changing a 400 GB exchange from 200 to 4,000 partitions reduces average serialized input from roughly 2 GB to 100 MB. Memory stability improves, but 40 cores still execute only about 40 tasks at once and the stage now has many more waves.",
    "Increasing the count trades smaller, safer tasks for more coordination; use it until memory and parallelism improve without making overhead dominant.",
  ),
  "What happens when you decrease the number of shuffle partitions?": detailedAnswer(
    "Decreasing shuffle partitions produces fewer downstream tasks with more bytes, records, and keys per task. It can reduce scheduling, block-fetch, and tiny-output overhead and may be appropriate after a highly selective operation, but it reduces available parallelism and increases hash/sort memory, spill, task duration, straggler impact, and failure-retry cost.",
    [
      "If the count falls below available slots, some cores cannot participate in that stage. Even above slot count, fewer waves give less tolerance for uneven task durations.",
      "Larger reducers fetch more remote data and maintain larger operator state. Spill adds disk passes; non-spillable per-key/UDF objects can OOM.",
      "A smaller count does not merge a hot key with safety—it often makes ordinary keys share even larger partitions while the hot key remains concentrated.",
      "Fewer partitions can create larger output files and reduce commit/listing overhead, but output layout should not be optimized by making a critical join/aggregation unsafe.",
      "AQE is preferable when runtime size is uncertain: retain a safe initial count and let Spark coalesce observed small partitions instead of globally hard-coding too few.",
    ],
    "Reducing a 20 GB post-filter aggregation from 2,000 to 200 partitions can change tiny 10 MB tasks into useful 100 MB tasks. Applying the same count to a 2 TB run creates 10 GB reducers and severe spill.",
    "Decrease partitions when measured tasks are too small and overhead-bound, while preserving memory safety and enough parallel work.",
  ),

  "What is the difference between repartition and coalesce?": detailedAnswer(
    "`repartition` performs an Exchange to create a requested count and, optionally, distribution by expressions; it can increase or decrease partitions and usually produces better balance at the cost of a full shuffle. `coalesce` normally reduces the count by grouping existing partitions without redistributing every row, making it cheaper but capable of producing uneven, oversized partitions and reduced upstream parallelism.",
    [
      "Both APIs are lazy: calling them changes the logical plan, while an action triggers the physical work. In the executed plan, `repartition` normally appears as an `Exchange`; `coalesce` appears as a narrow `Coalesce` operator when it avoids a shuffle.",
      "DataFrame `repartition(n)` commonly uses round-robin distribution; `repartition(n, columns...)` uses hash partitioning; `repartitionByRange` creates range distribution. All move records across the cluster.",
      "`coalesce(n)` creates a narrow dependency by assigning several parent partitions to fewer children. It cannot normally increase beyond the current count meaningfully and does not rebalance rows across all targets.",
      "A drastic coalesce before expensive work can collapse parallelism: Spark may execute upstream narrow operators with the smaller number of tasks. Repartition introduces a stage boundary but balances the next stage.",
      "For RDDs, `coalesce(num, shuffle=true)` can redistribute and increase; `repartition` is essentially the shuffled, balanced convenience form. DataFrame APIs expose the common no-shuffle coalesce behavior.",
      "Do not confuse `DataFrame.coalesce(n)`, which changes the partition count, with `functions.coalesce(col1, col2, ...)`, which returns the first non-null column value and does not control partitions.",
      "Neither guarantees exact output file size. One writer task usually creates one file per written table partition it touches, and skew/compression/record size affect actual files.",
      "For tiny outputs, `coalesce(1)` can be acceptable; on large data, forcing one partition serializes the final work and creates a fragile bottleneck.",
    ],
    "After filtering 2 TB to 5 GB across 2,000 reasonably even partitions, `coalesce(50)` can cheaply reduce tiny output tasks. If only a few original partitions contain most rows, `repartition(50)` pays a shuffle but distributes the 5 GB much more evenly.",
    "Use repartition to redistribute and balance; use coalesce to cheaply merge already balanced partitions when reduced parallelism is safe.",
  ),
  "When should you use each one?": detailedAnswer(
    "Use `repartition` when you need more partitions, balanced data, distribution by a key, or adequate parallelism before expensive downstream work. Use `coalesce` when you only need a moderate reduction after filtering or near output and the current partitions are already reasonably balanced. Decide from the following stage's work, not merely from a desired file count.",
    [
      "Repartition before a large join/group only when establishing a reusable or necessary distribution justifies the shuffle; the operator itself may already add the required Exchange.",
      "Use key repartitioning to colocate related records for repeated operations or controlled writers, while checking hot-key skew and compatible partition counts.",
      "Coalesce after a strongly selective filter when many partitions are nearly empty and the remaining rows are even enough that simple parent grouping will not create stragglers.",
      "For output, calculate a target writer count from measured bytes and desired file size. Use coalesce for cheap reduction, repartition/rebalance for uneven data, and transactional compaction for recurring small files.",
      "For example, if the measured result is 2 GiB and the desired file size is about 128 MiB, the starting writer count is `ceil(2 × 1,024 ÷ 128) = 16`. Use `coalesce(16)` only when the current partitions are balanced; otherwise pay for `repartition(16)` or use a supported rebalance strategy.",
      "Inspect the plan and task metrics. An unexpected Exchange shows shuffle; a coalesced stage with one multi-minute task and idle executors shows over-consolidation.",
    ],
    "A 400-partition DataFrame must join repeatedly by `account_id`; a measured `repartition(800, 'account_id')` can establish reusable distribution. A final 800-partition result containing only 2 GB can then coalesce to a sensible writer count if it is balanced.",
    "Repartition changes distribution; coalesce changes task grouping cheaply. Choose based on balance and downstream execution requirements.",
  ),

  "What is a broadcast join?": detailedAnswer(
    "A broadcast join is a Spark SQL physical strategy that distributes a sufficiently small relation to the executors and builds a local lookup structure so each task can join its partition of the large relation without shuffling that large side. For equality joins this is commonly a `BroadcastHashJoin`; supported non-equality or join-type cases may use a broadcast nested-loop strategy with very different comparison cost.",
    [
      "Execution is easiest to explain in four steps: Spark materializes the selected build side, a `BroadcastExchange` distributes it, each executor constructs or accesses a local relation, and tasks stream their large-side partitions through that local lookup.",
      "A `BroadcastExchange` materializes and distributes the build side; executor tasks deserialize/build or reuse the relation and stream rows from the other side through it.",
      "The performance win comes from avoiding a large-side Exchange, sort, and remote fetch. The small side still has collection/serialization, network, and per-executor memory cost.",
      "`BroadcastExchange` first collects and materializes the build side on the driver before distributing it. Spark refuses to broadcast a relation at or above the hard 8 GiB serialized limit and also rejects roughly 512 million or more rows, depending on the broadcast mode's internal row-capacity limit. A BROADCAST hint cannot bypass these ceilings, and practical driver/executor limits are usually much lower.",
      "Catalyst can choose broadcast automatically from statistics and `spark.sql.autoBroadcastJoinThreshold`; AQE can convert eligible planned joins when runtime size reveals a small side. Apache Spark 4.2 documents a 10 MiB default threshold, while managed platforms, applications, and other versions may override it. Inspect the effective session value instead of treating 10 MiB—or any folklore limit such as 100 MiB—as a universal safe size.",
      "`spark.sql.broadcastTimeout` controls how long Spark waits for broadcast completion; its currently documented default is 300 seconds. Raising it can help a relation that safely fits but transfers slowly—it cannot make an oversized build side memory-safe.",
      "Broadcast memory is replicated. A 50 MB serialized relation used by 20 executors represents roughly `50 MB × 20 = 1 GB` of cluster-wide serialized copies before hash-table, deserialization, Python-worker, concurrency, or allocator overhead. Capacity-plan from the measured materialized representation, not compressed file size.",
      "A `broadcast(df)`/SQL BROADCAST hint can override the automatic threshold but cannot make an oversized relation fit. Join semantics also constrain which side can be built and whether a strategy is supported.",
      "A broadcast join is different from a SparkContext broadcast variable. The former is optimizer-managed relational execution; the latter is an explicit read-only application object used by task code.",
      "Verify the final plan and SQL metrics for `BroadcastExchange` and `BroadcastHashJoin`; never infer success merely from adding a hint.",
    ],
    "A 3 TB transactions table joined to a 12 MB filtered country dimension can stream each transaction partition against a local country hash table. Spark moves the dimension to executors instead of redistributing the 3 TB fact table by country key.",
    "A broadcast join trades replicated small-side memory for eliminating a much larger distributed shuffle.",
    [
      {
        title: "Broadcast join data movement",
        steps: [
          { label: "Small side", detail: "Filter and project the build relation" },
          { label: "BroadcastExchange", detail: "Materialize and distribute it" },
          { label: "Executor lookup", detail: "Build a local hash relation where supported" },
          { label: "Large partitions", detail: "Stream in place without a large-side shuffle" },
          { label: "Local match", detail: "Emit joined rows from each task" },
        ],
      },
      {
        title: "Shuffle join versus broadcast join",
        steps: [
          { label: "Shuffle join", detail: "Redistribute large inputs by the join key" },
          { label: "Network and sort", detail: "Pay Exchange, fetch, sort and spill costs" },
          { label: "Broadcast join", detail: "Replicate only the measured small build side" },
          { label: "Keep facts in place", detail: "No large-side Exchange is required" },
          { label: "Trade-off", detail: "Save shuffle by spending memory on every executor" },
        ],
      },
    ],
  ),
  "When should you use a broadcast join?": detailedAnswer(
    "Use a broadcast join when one filtered and projected side is stably small enough to serialize, distribute, and materialize with comfortable memory headroom on every participating executor, and the join type/condition supports an efficient broadcast strategy. Prefer trustworthy statistics and automatic/AQE choice; force a hint only when measured domain knowledge is better than the optimizer's estimate.",
    [
      "Measure the relation after filters and projection and account for its in-memory hashed representation, not only compressed Parquet size or row count.",
      "It is ideal for a very large fact table joined to a small dimension because it prevents the fact table from being shuffled and sorted.",
      "Check executor concurrency and other resident broadcasts/caches. Several safe broadcasts used concurrently can collectively exhaust memory.",
      "Do not broadcast when both sides are large, size is volatile, the driver struggles to materialize it, distribution times out, or a nested-loop comparison would produce excessive work.",
      "Broadcasting does not solve duplicate-key output explosion: multiple matches on the small side still multiply large-side rows. Validate key uniqueness and business totals.",
      "Monitor broadcast bytes/time and final plan over time. Remove or guard a hint when the dimension can grow beyond its documented assumption.",
    ],
    "A product dimension is 2 GB at rest but only 18 MB after selecting active products and four needed columns. Broadcasting the reduced DataFrame is sensible after confirming its hash relation fits; broadcasting the unfiltered base table is not.",
    "Broadcast based on measured post-filter materialized size, supported semantics, and executor headroom—not a fixed folklore threshold.",
  ),
  "How would you optimize a join between a huge table and a small table?": detailedAnswer(
    "First reduce and validate both inputs, then aim for a broadcast hash join if the small side is genuinely safe. Filter and project before joining, ensure key types and semantics match, verify small-side uniqueness, refresh statistics or use a carefully justified broadcast hint, inspect the final physical plan, and measure broadcast memory and output cardinality. If the small side is no longer safe, fall back to a well-sized distributed join rather than forcing it.",
    [
      "Prune large-table partitions and columns before the join so the streamed scan reads only necessary data. Push selective filters into both sources.",
      "Deduplicate or choose a deterministic current record on the dimension when the relationship should be many-to-one. This protects correctness and reduces broadcast size.",
      "Let Catalyst/AQE broadcast automatically with good statistics; use `broadcast(small)` when statistics are missing but production measurement proves the assumption.",
      "Check `explain('formatted')` for the build side, `BroadcastExchange`, and `BroadcastHashJoin`. A broadcast nested-loop join for a non-equi condition can still perform many comparisons.",
      "Watch driver materialization, broadcast duration, executor memory/GC, and join output rows. Compressed disk size can dramatically understate the in-memory relation.",
      "If unsafe, use sort-merge or shuffled hash with enough shuffle partitions, pre-aggregation, compatible table layout, and skew handling. Correct distributed execution is better than a fast-looking hint that fails.",
    ],
    "For 5 TB of orders and a 25 MB customer-status dimension, select only `customer_id` and `status`, resolve duplicate customer versions, broadcast that result, and confirm the large orders scan has no Exchange. Reconcile order count and revenue afterward.",
    "Optimize huge-to-small joins by shrinking and validating the build side, broadcasting it safely, and proving both the physical plan and result cardinality.",
  ),
};

const CODE_EXAMPLES_15_TO_24: Record<string, InterviewAnswerCodeBlock[]> = {
  "How does Spark handle fault tolerance?": [{
    title: "Configure bounded task retries at application startup",
    language: "spark-submit",
    code: `spark-submit \\
  --master yarn \\
  --deploy-mode cluster \\
  --conf spark.task.maxFailures=4 \\
  jobs/orders_pipeline.py

# spark.task.maxFailures=4 means one particular task may fail continuously
# up to the configured limit before Spark gives up and aborts the job.
# Retries help with transient executor, network, or fetch failures; they do
# not fix deterministic exceptions, corrupt records, or incorrect code.`,
  }],
  "If a read operation is lazy, how does Spark detect an incorrect file path?": [{
    title: "Separate metadata validation from executable read validation",
    language: "PySpark",
    code: `from py4j.protocol import Py4JJavaError

path = "s3://company-data/orders/"

# The DataFrame reader may access metadata now to resolve files/schema.
orders = spark.read.schema(order_schema).parquet(path)

# This triggers executable input planning and reads at least one row when present.
try:
    orders.limit(1).count()
except (AnalysisException, Py4JJavaError) as exc:
    raise RuntimeError(f"Input is not readable: {path}") from exc

# For a strict existence/permission check, use the storage/filesystem API too;
# one-row validation does not prove that every file is healthy.`,
  }],
  "What is a shuffle in Spark?": [{
    title: "See the Exchange created by a keyed aggregation",
    language: "PySpark",
    code: `from pyspark.sql import functions as F

totals = (
    orders.filter(F.col("status") == "COMPLETED")
          .groupBy("customer_id")
          .agg(F.sum("amount").alias("total_amount"))
)

totals.explain(mode="formatted")
# Look for Exchange hashpartitioning(customer_id, ...).
# SQL UI metrics show shuffle write on the upstream stage and
# shuffle read, spill and task distribution on the downstream stage.`,
  }],
  "Which Spark operations cause a shuffle?": [{
    title: "Confirm exchanges instead of guessing from API names",
    language: "PySpark",
    code: `query = (
    events.select("customer_id", "event_time")
          .dropDuplicates(["customer_id", "event_time"])
          .repartition(400, "customer_id")
          .join(customers, "customer_id")
)

query.explain(mode="formatted")
# Inspect every Exchange and its partitioning expression.
# Catalyst may reuse or eliminate an exchange, and a broadcast join
# can avoid a large-side shuffle.`,
  }],
  "Why is reduceByKey generally better than groupByKey?": [{
    title: "Combine values before the network",
    language: "PySpark RDD",
    code: `pairs = orders.rdd.map(lambda row: (row.customer_id, row.amount))

# Anti-pattern for a sum: sends every amount and materializes each iterable.
grouped_sum = pairs.groupByKey().mapValues(sum)

# Preferred: combines partial totals in map partitions before the shuffle.
reduced_sum = pairs.reduceByKey(lambda left, right: left + right)

# Use aggregateByKey/combineByKey when input and accumulator types differ.
stats = pairs.aggregateByKey(
    (0.0, 0),
    lambda acc, value: (acc[0] + value, acc[1] + 1),
    lambda a, b: (a[0] + b[0], a[1] + b[1]),
)`,
  }],
  "What is partitioning in Spark?": [{
    title: "Compare hash, range, and round-robin partitioning",
    language: "PySpark",
    code: `# Hash partitioning: equal customer IDs reach the same bucket.
by_customer = orders.repartition(200, "customer_id")

# Range partitioning: create ordered customer-ID ranges.
by_customer_range = orders.repartitionByRange(200, "customer_id")

# Count-only repartition: Spark can use round-robin distribution because
# no key expression was supplied.
balanced = orders.repartition(200)

by_customer.explain(mode="formatted")
by_customer_range.explain(mode="formatted")
balanced.explain(mode="formatted")

# PySpark pair RDD: partitionBy defaults to
# portable_hash(key) % number_of_partitions. String hashing depends on a
# consistent PYTHONHASHSEED across Python workers; this is not the JVM
# key.hashCode behavior used by Scala/Java pair-RDD HashPartitioner.
pairs = orders.rdd.map(lambda row: (row.customer_id, row.amount))
hashed_pairs = pairs.partitionBy(200)
print(hashed_pairs.getNumPartitions())  # 200`,
  }],
  "How do you decide the number of Spark partitions?": [{
    title: "Calculate both requirements from explicit inputs",
    language: "Python calculation",
    code: `import math

# Worked-example values
executors = 10
usable_cores_per_executor = 4
cpus_per_task = 1                 # spark.task.cpus
estimated_shuffle_bytes = 600 * 1024**3  # 600 GiB
target_bytes_per_task = 128 * 1024**2     # 128 MiB

# Rule 1: enough runnable tasks for several waves
task_slots = (executors * usable_cores_per_executor) // cpus_per_task
parallelism_floor = 4 * task_slots

# Rule 2: keep average serialized input per task near the starting target
size_based = math.ceil(estimated_shuffle_bytes / target_bytes_per_task)

# Satisfy both requirements
initial_partitions = max(parallelism_floor, size_based)

print(task_slots)          # 40 concurrent one-CPU tasks
print(parallelism_floor)   # 160 partitions
print(size_based)          # 4,800 partitions
print(initial_partitions)  # 4,800 initial partitions
print(math.ceil(initial_partitions / task_slots))  # 120 idealized waves

# This is only a starting estimate. Validate max/median task bytes,
# duration, spill, GC, skew, scheduler overhead and the final AQE plan.`,
  }],
  "How do you decide spark.sql.shuffle.partitions?": [{
    title: "Use a conservative initial count with AQE",
    language: "PySpark",
    code: `import math

# Same worked-example values used in the explanation above
executors = 10
cores_per_executor = 4
cpus_per_task = 1  # spark.task.cpus
task_slots = (executors * cores_per_executor) // cpus_per_task

shuffle_bytes = 600 * 1024**3
target_bytes_per_task = 128 * 1024**2

parallelism_floor = 4 * task_slots
size_based = math.ceil(shuffle_bytes / target_bytes_per_task)
initial_partitions = max(parallelism_floor, size_based)

print(task_slots)         # 10 executors x 4 cores = 40 concurrent slots
print(parallelism_floor)   # 160
print(size_based)          # 4,800
print(initial_partitions)  # 4,800

spark.conf.set("spark.sql.shuffle.partitions", str(initial_partitions))
spark.conf.set("spark.sql.adaptive.enabled", "true")
spark.conf.set("spark.sql.adaptive.coalescePartitions.enabled", "true")
spark.conf.set(
    "spark.sql.adaptive.advisoryPartitionSizeInBytes",
    128 * 1024 * 1024,
)
spark.conf.set("spark.sql.adaptive.skewJoin.enabled", "true")

query.explain(mode="formatted")
# After execution, compare the initial and final AQE plans and
# measure actual map-output bytes per downstream task.`,
  }],
  "What is the difference between repartition and coalesce?": [{
    title: "Redistribute for balance or merge cheaply",
    language: "PySpark",
    code: `# Full Exchange: creates 400 hash-distributed, balanced-by-key buckets.
by_customer = events.repartition(400, "customer_id")

# Narrow reduction: groups existing partitions without global redistribution.
small_output = filtered.coalesce(40)

by_customer.explain(mode="formatted")  # Exchange hashpartitioning(...)
small_output.explain(mode="formatted") # Coalesce, normally no shuffle

# Avoid coalesce(1) or repartition(1) for large outputs: one task becomes
# the throughput, memory and recovery bottleneck.`,
  }],
  "What is a broadcast join?": [{
    title: "Inspect automatic broadcast settings and verify the chosen plan",
    language: "PySpark",
    code: `from pyspark.sql import functions as F
from pyspark.sql.functions import broadcast

# Current Apache Spark defaults are 10 MB and 300 seconds, but verify the
# effective values because a platform or application can override them.
print(spark.conf.get("spark.sql.autoBroadcastJoinThreshold"))
print(spark.conf.get("spark.sql.broadcastTimeout"))

# -1 disables automatic size-based broadcast selection. A positive value is
# expressed in bytes; do not increase it without measuring executor headroom.
# spark.conf.set("spark.sql.autoBroadcastJoinThreshold", 50 * 1024 * 1024)
# spark.conf.set("spark.sql.autoBroadcastJoinThreshold", -1)

small_dimension = (
    spark.table("dim_country")
         .filter(F.col("is_active"))
         .select("country_id", "region")
         .dropDuplicates(["country_id"])
)

result = huge_facts.join(broadcast(small_dimension), "country_id", "left")
result.explain(mode="formatted")

# Confirm BroadcastExchange + BroadcastHashJoin, the intended build side,
# runtime broadcast size, and output row-count invariants.
# Memory intuition: 50 MB x 20 executors is already about 1 GB of serialized
# cluster-wide copies, before hashed/deserialized representation overhead.`,
  }],
  "How would you optimize a join between a huge table and a small table?": [{
    title: "Reduce both inputs before selecting the physical strategy",
    language: "PySpark",
    code: `from pyspark.sql import functions as F
from pyspark.sql.functions import broadcast

facts = (
    spark.table("fact_orders")
         .filter(F.col("order_date") >= "2026-10-01")
         .select("order_id", "customer_id", "amount")
)

dimension = (
    spark.table("dim_customer")
         .filter(F.col("is_current"))
         .select("customer_id", "segment")
)

# First assert customer_id is unique according to the business contract.
joined = facts.join(broadcast(dimension), "customer_id", "left")
joined.explain(mode="formatted")

# Reconcile fact count, unmatched keys and monetary totals after the join.`,
  }],
};

for (const [question, codeBlocks] of Object.entries(CODE_EXAMPLES_15_TO_24)) {
  const answer = SPARK_INTERVIEW_ANSWERS_15_TO_24[question];
  if (answer) SPARK_INTERVIEW_ANSWERS_15_TO_24[question] = { ...answer, codeBlocks };
}
