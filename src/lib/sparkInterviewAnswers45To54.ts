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

export const SPARK_INTERVIEW_ANSWERS_45_TO_54: Record<string, InterviewAnswer> = {
  "What does verbose serialized output mean?": detailedAnswer(
    "Verbose serialized output means the encoded byte representation contains substantial structural overhead—class descriptors, field metadata, object references, collection wrappers, and repeated type information—relative to the business values being represented. It refers to serialized bytes, not verbose console logging. Java's general-purpose object serialization is a common example: a logical record containing a few primitives can become a much larger byte stream when encoded as a nested JVM object graph.",
    [
      "Serialization must describe enough of the object graph for another process to reconstruct it. Flexible serializers often write more metadata than schema-aware formats.",
      "Pointer-heavy JVM objects, boxed primitives, nested collections, and repeated class names increase both the in-memory representation and serialized payload.",
      "Keep three measurements separate: logical payload size, live in-memory object size, and serialized byte size. They are not interchangeable; compression can further change the bytes written or transferred.",
      "A useful measurement is `serialization expansion ratio = serialized bytes ÷ logical payload bytes`. A value of 3.5 means the representation is 3.5 times the essential business payload before any transport compression.",
      "Spark SQL's internal binary rows and columnar cache avoid much of this general object overhead because the schema supplies structure separately.",
      "Kryo with registered classes can replace repeated class names with compact numeric identifiers for object-heavy RDD workloads, but it does not automatically fix a poor data model.",
      "Measure representative records and verify map-output, shuffle, spill, and cached sizes in the Spark UI. A compressed source-file size is not a reliable estimate of decoded memory or serialized shuffle size.",
    ],
    "Suppose a shuffle contains 20 GiB of essential values but its serialized representation is 70 GiB. The expansion ratio is `70 ÷ 20 = 3.5×`, so Spark writes, transfers, and decodes 50 GiB of representation overhead. This is an illustrative calculation; measure the real ratio for the actual classes and serializer.",
    "Verbose serialization spends bytes on representation rather than data; compact schemas and encodings reduce that tax.",
    [{
      title: "Where verbose bytes multiply cost",
      steps: [
        { label: "Object graph", detail: "Values plus wrappers and references" },
        { label: "Serialize", detail: "Add type and structural metadata" },
        { label: "Store / transfer", detail: "More cache, disk and network bytes" },
        { label: "Deserialize", detail: "More decoding, allocation and GC" },
      ],
    }],
  ),
  "Why is verbose output harmful to Spark performance?": detailedAnswer(
    "Larger serialized payloads increase every resource Spark uses to move or retain data: network transfer, shuffle disk, cache memory, spill I/O, checkpoint size, and deserialization CPU. The additional objects created during encoding and decoding also increase allocation and garbage-collection pressure. The same logical computation therefore requires more bytes and more CPU at every stage boundary.",
    [
      "During shuffle, verbose records consume more network bandwidth and produce larger map-output files, so reduce tasks fetch, merge, and spill more data.",
      "A fixed executor cache holds fewer partitions, causing eviction and recomputation or disk reads for later actions.",
      "Serialization and deserialization allocate temporary buffers and objects; high allocation rates lead to frequent minor GC and can promote objects into old generation.",
      "Large task closures or results increase scheduler/driver communication and can exceed message or result-size limits.",
      "Reduce verbosity with structured APIs, primitive/compact data structures, column pruning, registered Kryo for custom JVM objects, and avoiding accidental capture of large objects in closures.",
      "Compression can reduce bytes sent or written, but it adds compression/decompression CPU and does not remove the cost of traversing a needlessly complicated object graph. Reduce the representation first, then choose compression from measurements.",
    ],
    "If a 20 GB logical shuffle expands to 70 GB because of object/serialization overhead, Spark must write, fetch, deserialize, and possibly spill the additional 50 GB even though it carries no extra business information.",
    "Serialization overhead multiplies across memory, disk, network, CPU, and GC, so bytes avoided early improve the entire stage.",
  ),

  "What is the difference between cache and persist?": detailedAnswer(
    "Both mark a dataset for reuse through the same persistence subsystem. `RDD.cache()` uses `MEMORY_ONLY`; `DataFrame.cache()` and `Dataset.cache()` use `MEMORY_AND_DISK`, displayed by current PySpark as `MEMORY_AND_DISK_DESER`. `persist(explicitLevel)` selects another policy. The programmatic `cache()`/`persist()` calls are lazy, while SQL `CACHE TABLE` is eager unless written as `CACHE LAZY TABLE`.",
    [
      "For JVM RDDs, the documented default is `MEMORY_ONLY` with deserialized objects. Python RDD objects are always serialized with Pickle even though the level is named `MEMORY_ONLY`.",
      "For DataFrame/Dataset APIs, the default is the memory-and-disk deserialized SQL cache level: Scala exposes `MEMORY_AND_DISK`, while current PySpark displays `MEMORY_AND_DISK_DESER`. Spark SQL stores optimized cached batches rather than ordinary user-facing `Row` objects.",
      "`spark.sql.defaultCacheStorageLevel` controls the default used by DataFrame/Dataset cache, `CACHE TABLE`, and catalog caching; its default is `MEMORY_AND_DISK`.",
      "SQL `CACHE TABLE table_name` materializes the table eagerly. `CACHE LAZY TABLE table_name` registers the cache request but defers population until the table is first used. This differs from the lazy DataFrame, Dataset, and RDD cache methods.",
      "Caching does not copy the source dataset into driver memory. Each executor's BlockManager stores the partitions produced by tasks running there.",
      "If a cached partition is missing or evicted, Spark can normally recompute it from lineage. A disk-inclusive level reads the persisted local block instead of recomputing when it did not fit in memory.",
      "Calling both methods repeatedly does not create independent caches for the same dataset. Set the intended level before materialization and unpersist before changing it when required by the API.",
      "Persistence is an optimization, not durable storage or a checkpoint. Executor-local blocks can disappear with executor loss or application termination; lineage supplies fault recovery, and replicated levels only reduce recovery delay.",
    ],
    "Cache an expensive cleaned DataFrame reused by five actions. If it does not fit comfortably in memory, explicitly persist with a memory-and-disk level rather than allowing repeated recomputation or assuming cache means RAM-only for every API.",
    "`cache` chooses the default; `persist` chooses the policy. Both materialize lazily and remain recoverable through lineage.",
    [{
      title: "Persistence lifecycle",
      steps: [
        { label: "Mark", detail: "cache() or persist(level)" },
        { label: "Materialize", detail: "First action computes partitions" },
        { label: "Reuse", detail: "Later actions read stored blocks" },
        { label: "Recover", detail: "Missing blocks read disk or recompute" },
        { label: "Release", detail: "unpersist when reuse ends" },
      ],
    }],
  ),
  "What does cache() do?": detailedAnswer(
    "`cache()` marks an RDD, DataFrame, or Dataset to retain computed partitions using that API's default storage level. It does not immediately execute the lineage. When the first action reaches the dataset, each task computes its partition and registers the resulting block with the executor BlockManager; subsequent actions can read those blocks instead of repeating the upstream transformations.",
    [
      "The method returns the same logical dataset reference with persistence metadata, allowing normal transformation chaining.",
      "RDD cache defaults to `MEMORY_ONLY` (`MEMORY_ONLY` names the JVM policy even though PySpark RDD values are Pickle-serialized). DataFrame/Dataset cache defaults to `MEMORY_AND_DISK`; current PySpark displays that deserialized SQL level as `MEMORY_AND_DISK_DESER`.",
      "SQL `CACHE TABLE` is eager unless the statement includes `LAZY`; the object API's `cache()` call remains lazy until an action reaches the dataset.",
      "A partial first action may materialize only the partitions it touches. Use a full, intentional action only when eager warming is actually required.",
      "The physical plan for a cached DataFrame can show an in-memory relation/table scan after materialization; the Storage tab reports stored partitions and sizes.",
      "Cached blocks can be evicted under storage pressure and are lost with executors. Spark recomputes them unless the chosen level has a surviving disk/replica block. `unpersist()` releases them explicitly; its non-blocking form can return before physical removal completes.",
    ],
    "Calling `cleaned.cache()` followed by `cleaned.count()` materializes all partitions for the count; a later aggregation can reuse the cached cleaned rows rather than rereading and reparsing the source.",
    "`cache()` is a lazy request to reuse partitions under the default storage policy, not an immediate load-everything command.",
  ),
  "What does persist() do?": detailedAnswer(
    "`persist()` marks a dataset for repeated use and optionally accepts a storage level describing where and how partitions are retained. The level controls memory versus local disk, deserialized versus serialized JVM representation where supported, replication count, and off-heap use. Like cache, persistence begins only when an action computes the partitions.",
    [
      "`persist()` without an argument uses the API's default. Supplying `DISK_ONLY`, `MEMORY_AND_DISK`, serialized, replicated, or off-heap variants makes the trade-off explicit.",
      "Memory-only favors fast reads but can recompute partitions that do not fit. Memory-and-disk stores overflow partitions locally, avoiding expensive recomputation at the cost of disk I/O.",
      "Serialized JVM levels reduce object count and memory consumption but spend CPU decoding on each reuse. Python RDD storage is serialized, so JVM serialized/deserialized labels do not map identically.",
      "Replication levels retain copies on multiple executors for faster failure recovery but consume additional cluster memory/disk and network.",
      "A storage level normally cannot be replaced on an already persisted dataset. Call `unpersist()` and then persist again with the new level when the API requires it.",
      "Use `unpersist(blocking=...)` when the final consumer completes; otherwise stale blocks compete with execution memory and other caches. Non-blocking removal is the normal default.",
    ],
    "An expensive iterative feature dataset larger than cache memory can use `MEMORY_AND_DISK`: hot partitions remain in memory and overflow partitions are read from executor-local disk rather than rebuilding a long lineage each iteration.",
    "`persist` is cache with an explicit storage contract; choose the level from recomputation cost, size, CPU, disk, and recovery needs.",
  ),
  "Where is cached or persisted data stored?": detailedAnswer(
    "Partitions are stored by executor BlockManagers, not as one object on the driver. Depending on the storage level, a block lives in executor storage memory, executor-local disk, off-heap storage, or replicated copies on other executors. Metadata about available blocks is coordinated so tasks can retrieve a local or remote block when reusing the dataset.",
    [
      "Memory blocks occupy the executor's Spark storage region. Under unified memory management, storage and execution share a managed region and cached blocks can be evicted when execution needs space.",
      "Disk-persisted blocks use executor/node-local directories selected through Spark's local-directory configuration. They are application-scoped temporary blocks, not durable lake/table files; node or executor loss can remove them.",
      "Replicated levels create additional block copies on other nodes, improving recovery latency but doubling or tripling storage for the selected replication factor.",
      "DataFrame caching commonly uses Spark SQL's cached batch representation rather than retaining arbitrary user-facing Row objects exactly as shown by the API.",
      "The Spark UI Storage tab shows executor distribution, fraction cached, memory size, disk size, and partition count; use it to confirm what was actually materialized.",
    ],
    "A 200-partition DataFrame cached across ten executors produces many independent cached blocks. Losing executor 3 removes only its blocks; Spark can retrieve replicas or recompute those partitions from lineage.",
    "Persistence is distributed block storage owned by executors; the driver tracks it but does not hold the dataset.",
  ),
  "What happens internally when a dataset is cached or persisted?": detailedAnswer(
    "Spark records the selected storage level on the logical dataset/RDD. The first action still executes the normal lineage. As each task produces its partition, the BlockManager stores the computed block according to the level and reports it. Later plans replace the repeated upstream work with cached-block reads for partitions that are present; missing partitions fall back to disk, replicas, or lineage recomputation.",
    [
      "Persistence is partition-granular. Tasks do not wait for one global object to be assembled before a cached partition becomes available.",
      "For DataFrames, Spark can materialize cached columnar batches with compression chosen from observed statistics, then use an `InMemoryTableScan` in later physical plans.",
      "Storage memory uses eviction policies when capacity is needed. Evicted memory-only blocks are no longer reusable until recomputed; with a disk-inclusive level, partitions that cannot remain in memory have a local disk representation to read. This persistence behavior is different from an operator spilling temporary sort/shuffle data.",
      "Block location and status metadata let schedulers prefer executors that already hold needed partitions, improving data locality when resources permit.",
      "Caching does not truncate lineage. Fault recovery can recompute blocks, which is why caching and checkpointing solve different problems.",
    ],
    "The first `count()` over a cached joined DataFrame executes scans, shuffle, and join while storing output batches. A later `groupBy` begins from `InMemoryTableScan`; if 3 of 200 blocks were evicted, only those partitions need recovery.",
    "Spark caches computed partitions as distributed blocks and substitutes block scans for upstream lineage wherever those blocks survive.",
  ),
  "When should you use cache()?": detailedAnswer(
    "Use `cache()` when the same expensive deterministic dataset will be consumed by multiple actions and the default storage level is appropriate for its measured size and cluster memory. Common cases include interactive exploration, iterative algorithms, a shared cleaned/joined intermediate, and multiple downstream aggregates over identical input.",
    [
      "There must be reuse. Caching a dataset read once adds materialization, serialization, memory pressure, and eviction work without avoiding any later computation.",
      "Cache after expensive selective transformations rather than before them, so stored partitions contain only rows and columns required by repeated consumers.",
      "Estimate whether saved recomputation exceeds cache write/read cost. A cheap scan with strong source caching may not benefit.",
      "Confirm the default level can hold enough of the dataset without starving shuffle/sort execution. If not, choose an explicit persist level or redesign reuse.",
      "Avoid caching nondeterministic results unless reusing the exact materialized snapshot is intentional. Caching fixes the first computed values for later consumers in that application.",
      "Name cached RDDs where possible, inspect the Storage/SQL UI, materialize deliberately, and unpersist immediately after the final dependent action.",
    ],
    "A validated feature table feeds model training, summary statistics, and quality reports in the same application. Cache the projected feature rows once, use them three times, then unpersist before the next training window.",
    "Cache only a reused, expensive, appropriately sized intermediate whose default storage behavior you understand.",
  ),
  "When should you use persist()?": detailedAnswer(
    "Use `persist(level)` when a reused dataset justifies caching but the default storage policy is not the right trade-off. Explicit persistence is appropriate when the dataset may exceed memory, object overhead is high, recomputation is expensive, local disk is acceptable, serialized storage is beneficial, or replicated recovery latency matters.",
    [
      "Choose memory-and-disk for expensive datasets that should remain reusable even when not every partition fits RAM.",
      "Choose serialized JVM storage for object-heavy RDDs when memory saving is worth repeated decode CPU; pair it with Kryo where appropriate.",
      "Choose disk-only when memory must remain available for execution and recomputation is costlier than local disk reads.",
      "Choose replicated levels only for workloads where faster recovery is worth the storage/network multiplier; normal lineage already provides fault tolerance.",
      "Do not persist merely as insurance against all failure. Durable checkpointing or output is required when recovery must survive loss of executor-local blocks or truncate lineage.",
    ],
    "An iterative graph RDD is expensive to reconstruct and too large as deserialized objects. `MEMORY_AND_DISK_SER` with Kryo can keep compact blocks in RAM and place partitions that do not fit on local disk, while a one-pass input scan should remain unpersisted.",
    "Use persist when reuse is proven and you need to choose the memory, CPU, disk, or recovery policy explicitly.",
  ),
  "What is the difference among the persistence storage levels?": detailedAnswer(
    "Storage levels combine four decisions: use memory, use local disk, keep values deserialized or serialized where the API supports that distinction, and replicate blocks. These choices trade read speed, memory footprint, CPU, disk I/O, and recovery latency. All ordinary levels remain recoverable through lineage; replication changes recovery speed rather than correctness.",
    [
      "`MEMORY_ONLY`: fastest reuse for deserialized JVM objects, but partitions that do not fit are recomputed. It is the documented RDD cache default.",
      "`MEMORY_AND_DISK`: keep blocks in memory and store overflow on local disk, avoiding recomputation at the cost of disk reads.",
      "`MEMORY_ONLY_SER` / `MEMORY_AND_DISK_SER` in Java/Scala: retain compact serialized partition bytes, reducing object count and memory while adding deserialization CPU.",
      "`DISK_ONLY`: preserve reusable partitions on local disk with minimal storage-memory use; appropriate only when recomputation is more expensive than disk access.",
      "`*_2` and other replicated variants keep copies on multiple executors; `OFF_HEAP` uses configured off-heap storage and has additional operational requirements.",
      "DataFrame/Dataset caching uses Spark SQL cached batches and API-specific defaults; Python RDDs are serialized, so storage-level names should be interpreted through the deployed API documentation.",
      "The suffix `_2` means replication factor two, not two complete copies in both RAM and disk on each executor. Replication consumes roughly twice the selected storage and network needed to create the extra block copy.",
    ],
    "For a small hot RDD use memory-only; for a 2×-memory expensive intermediate use memory-and-disk; for object-heavy JVM RDDs test serialized Kryo storage; use replication only when recovery latency is part of the SLA.",
    "Select a storage level by measuring size, reuse, recomputation cost, decode CPU, disk throughput, and failure requirements.",
  ),

  "What does storing Spark data in memory or on disk mean?": detailedAnswer(
    "It means the materialized output blocks of computed partitions are retained by executor BlockManagers for later reuse. Memory storage keeps the chosen block representation in executor storage memory; disk storage writes application-scoped block files to executor-local storage. Spark is not storing the driver variable name, the complete dataset as one object, or necessarily the original source bytes—it stores the computed representation of each partition under the selected storage level.",
    [
      "An RDD level may store deserialized JVM objects or one serialized byte array per partition. A cached DataFrame typically stores optimized SQL cached batches.",
      "Local persisted disk differs from durable output such as Parquet in object storage. It is tied to the application/executor lifecycle and can disappear with node loss.",
      "Memory reuse is normally faster but competes with execution work. Spark's unified region is approximately `M = spark.memory.fraction × (executor heap − 300 MiB)`. With the current default fraction of 0.6, an 8 GiB heap gives `M ≈ 0.6 × (8,192 − 300) MiB ≈ 4,735 MiB` shared by execution and storage.",
      "Within that shared region, `R = spark.memory.storageFraction × M` identifies storage protected from execution eviction. With the current default 0.5, the example gives `R ≈ 2,368 MiB`. This is not a fixed cache allocation: storage may grow beyond `R` when execution is idle, and execution may evict it back toward `R` when tasks need memory.",
      "Disk storage saves recomputation but consumes local I/O and capacity. Shuffle files, spills, and cached blocks can all compete for the same local disks.",
      "The storage level describes fallback behavior: recompute an absent memory-only partition from lineage, read a disk block for memory-and-disk, or read every persisted block from disk for disk-only. Disk persistence is not the same as writing a governed output table.",
    ],
    "Caching the result of a parsed and joined dataset stores each output partition as a reusable executor block. It does not keep the original JSON files in RAM or create a durable business table.",
    "Persisted data is the materialized partition output held by executor BlockManagers, not a permanent replacement for source or target storage.",
    [{
      title: "What persistence retains",
      steps: [
        { label: "Compute partition", detail: "Execute the upstream lineage once" },
        { label: "Create block", detail: "Encode the partition for its storage level" },
        { label: "Keep locally", detail: "Executor memory, local disk or off-heap" },
        { label: "Reuse", detail: "Read the block in a later action" },
        { label: "Recover", detail: "Use a replica/disk block or recompute lineage" },
      ],
      note: "Executor-local persistence accelerates reuse; it is not durable business storage.",
    }],
  ),
  "What exactly is stored?": detailedAnswer(
    "Spark stores one block per computed partition of the persisted RDD/DataFrame representation. For an RDD, that can be deserialized JVM objects or serialized partition bytes. For DataFrames/Datasets, Spark SQL commonly stores compressed columnar cached batches derived from its internal rows. Metadata records the dataset/RDD identity, partition index, storage level, size, and block locations.",
    [
      "Only the columns and rows present in the persisted dataset are stored. Cache after projection/filtering to avoid retaining unused data.",
      "The block contains computed output, not the transformation code alone. Lineage remains separately available to rebuild a lost block.",
      "Materialization is incremental and partition-specific. If an action reads only part of a dataset, only the partitions actually computed by that action are guaranteed to have cache blocks.",
      "Broadcast variables, shuffle blocks, and cached dataset blocks all use BlockManager-related infrastructure but have different lifecycle and semantics.",
      "A memory-and-disk level stores each partition in one chosen location according to availability; it does not necessarily keep a full memory copy plus full disk copy unless replication/design requires it.",
      "The user-visible row representation can differ from the cached physical representation. Spark SQL can cache encoded batches and reconstruct rows/columns for consumers.",
    ],
    "Persisting `orders.select('customer_id','amount').where('amount > 0')` stores partition blocks containing those projected, filtered results—not every column from the original orders files.",
    "Spark stores the materialized partition representation of the exact dataset you persisted.",
  ),
  "What happens when the data is not cached or persisted?": detailedAnswer(
    "Spark keeps the logical lineage/plan but does not retain that dataset's materialized partition blocks for future actions. Every action executes the required upstream work again from available sources and shuffle outputs. This is normal and often optimal for one-pass computations; recomputation becomes wasteful only when multiple actions repeatedly traverse an expensive shared lineage.",
    [
      "Lazy transformations still do not run until an action. Lack of cache does not mean Spark holds the entire dataset in memory during planning.",
      "Within one job/stage, Spark pipelines operators and automatically retains required shuffle outputs for stage execution/failure recovery; that internal behavior is not user persistence across independent actions.",
      "A second action can reread files, reapply filters/UDFs, and repeat joins/shuffles. Optimizations such as exchange/subquery reuse within an applicable query do not imply that arbitrary independent actions retain the intermediate dataset.",
      "Lineage provides fault recovery by recomputing lost partitions. Long/expensive lineage can make repeated recovery costly, motivating checkpointing in selected workloads.",
      "Avoid reflexive caching: one scan followed by one write usually benefits more from correct partitioning and source pushdown than from storing an intermediate.",
    ],
    "Calling `count()` and later `write()` on the same unpersisted expensive DataFrame can execute its source scans and transformations twice. If write is the only action, no cache is needed.",
    "Without persistence, Spark recomputes required lineage per action; that is efficient until meaningful reuse makes storage cheaper than repetition.",
  ),

  "How does Spark manage memory?": detailedAnswer(
    "Spark memory must be reasoned about at two levels. Inside the executor JVM heap, Spark shares a unified region between execution work and storage. Outside that region are user objects and reserved heap; outside the JVM heap are direct/native buffers, Python workers, optional Spark off-heap memory, and other container overhead. An executor can therefore be killed for exceeding its container limit even when the JVM never reports `Java heap space`.",
    [
      "Worked example: `spark.executor.memory=10g` gives a 10,240 MiB JVM heap. After Spark's 300 MiB reserved region, 9,940 MiB remains. With `spark.memory.fraction=0.6`, the unified execution-and-storage region is `M = (10,240 − 300) × 0.6 ≈ 5,964 MiB`.",
      "With `spark.memory.storageFraction=0.5`, the protected storage subregion is `R = 5,964 × 0.5 ≈ 2,982 MiB`. Storage may borrow unused execution space above `R`, but execution can evict cached blocks back toward `R`; storage does not evict active execution allocations.",
      "Execution memory supports shuffle hash tables, sort buffers, joins, aggregation, and other task working structures. When a spill-capable operator exceeds available execution memory, it writes temporary runs/partitions to local disk. Spill is a safety mechanism, but excessive spill creates heavy disk and serialization cost.",
      "Storage memory contains cached/persisted blocks and broadcast blocks. Cached data is normally evictable and recomputable; broadcasting or caching too much can reduce the shared headroom available to execution.",
      "The remaining user-memory region is approximately `(10,240 − 300) × 0.4 ≈ 3,976 MiB`. It holds application objects, metadata, UDF-created structures, and memory Spark does not manage as execution/storage; an unbounded per-key map can fail despite apparently available cache space.",
      "If `spark.executor.memoryOverhead` is not supplied, a common JVM-executor calculation is `max(384 MiB, 10% of executor heap)`. For a 10 GiB heap that is about 1,024 MiB, making the container request roughly 11 GiB before adding configured off-heap memory or a separate `spark.executor.pyspark.memory` pool. Python/native-heavy workloads may need more measured overhead.",
      "For YARN/Kubernetes-style limits, reason approximately as `executor container = executor heap + memoryOverhead + configured off-heap size + configured PySpark memory`. When `spark.executor.pyspark.memory` is not set, Python normally consumes the overhead allowance instead of receiving a separate capped pool.",
      "Concurrency multiplies the task working set. With `N` active tasks, Spark's execution-memory fairness model lets a task grow between roughly `1/(2N)` and `1/N` of the available execution pool before spill/fair-sharing limits apply. `simultaneous tasks per executor ≈ executor cores ÷ spark.task.cpus`; reducing partition size or cores per executor can solve a peak-memory problem that a larger heap merely postpones.",
      "Driver memory is separate. Query-plan metadata, file listings, broadcast creation, `collect()`, `toPandas()`, and large task results can exhaust the driver even when every executor is healthy.",
      "Tune after identifying the domain: heap OOM, overhead kill, spill, GC, driver memory, broadcast, or Python memory require different fixes. Prefer query/partition/skew corrections before increasing memory fractions.",
      "Current Spark guidance generally recommends leaving unified-memory fractions at defaults unless measurements justify change; increasing one region can starve another and worsen GC/spill.",
    ],
    "For a 10 GiB executor heap, the unified pool is about 5,964 MiB, protected storage is about 2,982 MiB, user memory is about 3,976 MiB, and default overhead is about 1,024 MiB—so the container request is roughly 11 GiB before optional additions. With four active tasks and the whole unified pool hypothetically available to execution, the fairness range is roughly `5,964 ÷ 8 = 746 MiB` to `5,964 ÷ 4 = 1,491 MiB` per task; actual cache, broadcasts, skew, and operator buffers reduce that headroom.",
    "Spark memory is a set of competing domains; diagnose which domain grows before tuning a number.",
    [{
      title: "Executor memory domains",
      steps: [
        { label: "Execution", detail: "Shuffle, sort, join and aggregation work" },
        { label: "Storage", detail: "Cached blocks and broadcasts" },
        { label: "User / reserved", detail: "Application objects and safety space" },
        { label: "Overhead", detail: "Python, native, direct and container use" },
      ],
      note: "Heap metrics alone do not explain Python-worker or native/container memory failures.",
    }],
  ),

  "What is checkpointing in Spark?": detailedAnswer(
    "Checkpointing creates a materialized recovery boundary, but its exact meaning depends on the API. Reliable RDD/DataFrame checkpointing writes data to the configured fault-tolerant checkpoint directory and truncates dependency on the earlier lineage or logical plan. Structured Streaming checkpointing instead maintains the query's restart protocol—metadata, source progress, commit logs, and state-store data—so the same logical query can resume consistently after failure.",
    [
      "RDD `checkpoint()` marks the RDD before a job executes; an action materializes it. Spark recommends persisting that RDD first when it will also be reused, otherwise the checkpoint write can require another computation of the lineage. After a successful reliable checkpoint, parent references can be removed.",
      "DataFrame `checkpoint(eager=True)` returns a new checkpointed DataFrame and truncates its logical plan. Current PySpark defaults `eager` to true; with lazy checkpointing, a later action performs the write. The API is useful for exponentially growing iterative plans, not as a governed table-write interface.",
      "`localCheckpoint()` uses the executor caching subsystem and ephemeral local storage. It avoids the reliable-filesystem write but sacrifices fault tolerance; executor removal—including dynamic allocation—can make the checkpoint irrecoverable.",
      "A Structured Streaming checkpoint can contain offset logs, commit logs, query metadata, source identities, watermark/batch progress, and state-store files for stateful operators. A checkpoint alone does not make an arbitrary sink exactly-once; the source must be replayable and the sink must be transactional or idempotent for retries.",
      "Each streaming query needs its own durable checkpoint location. Deleting, sharing, manually editing, or incompatibly reusing it can cause replay, lost state, corrupt semantics, or startup failure.",
      "Not every streaming-query edit is compatible with an existing checkpoint. Changing source topology, state schema, state-store provider, or state partitioning can be disallowed; start a deliberately new query/checkpoint when recovery compatibility cannot be preserved.",
      "Checkpointing has I/O, storage, and recovery cost. It should target long lineage, iterative state, or restart requirements—not be inserted after every transformation.",
    ],
    "An iterative graph algorithm whose lineage grows every iteration can reliably checkpoint every selected number of iterations, limiting driver planning/recovery depth while retaining cache between nearby iterations for speed.",
    "Caching accelerates reuse while preserving lineage; checkpointing creates a recovery boundary and can truncate lineage.",
  ),
  "When should you use checkpointing?": detailedAnswer(
    "Use checkpointing when lineage or state has become too long, expensive, or operationally important to reconstruct from the beginning. Typical cases are iterative algorithms with expanding plans, stateful Structured Streaming that must restart across application failure, and pipelines where a durable intermediate recovery boundary is worth the additional I/O.",
    [
      "For an RDD or DataFrame iterative loop, checkpoint periodically when plan/lineage growth increases driver planning time, stack complexity, or failure recomputation cost.",
      "For production Structured Streaming, use a durable unique checkpoint for source progress, commits, watermark/state progress, and restart continuity. Place it on storage available after driver/executor replacement, not an executor-local path.",
      "Use local checkpoint only for plan truncation when loss is acceptable and the input can be recreated; it is backed by executor storage and is not fault tolerant.",
      "Cache before reliable checkpoint when the checkpoint materialization and subsequent actions would otherwise compute the same expensive lineage twice; verify actual behavior for the API.",
      "Do not use checkpoint as a substitute for idempotent sink commits, source retention, backups, or curated output. It is internal execution state tied to query/application semantics and often should be lifecycle-managed with that query.",
    ],
    "A streaming aggregation with a seven-day watermark needs checkpointed offsets and state to restart after deployment. A one-pass nightly batch that writes an atomic final table usually does not need an extra internal checkpoint.",
    "Checkpoint when durable recovery or lineage truncation has a measurable value greater than its storage and materialization cost.",
  ),

  "How should serialization and garbage collection be tuned in Spark?": detailedAnswer(
    "Treat serialization and garbage collection as consequences of data representation, allocation rate, partition size, concurrency, and caching—not as isolated JVM switches. First reduce how many objects and bytes the job creates: prefer DataFrames and built-in expressions, prune early, avoid object-heavy collections/UDFs, size partitions, control concurrent tasks, and release unused caches. Then use Spark metrics and GC logs to prove whether encoding, allocation, young collections, mixed/full collections, old-generation pressure, or non-JVM memory is actually limiting the application.",
    [
      "Serialization: use Kryo for object-heavy JVM RDD paths when compatible, register frequently used custom classes, avoid capturing large closures, and size the Kryo maximum buffer only above the largest legitimate single object. Do not expect Kryo to accelerate a DataFrame-only plan already using Spark SQL's internal rows.",
      "Object model: millions of wrappers, strings, maps, and linked structures consume far more heap and GC work than primitive arrays or Spark SQL's binary rows.",
      "Persistence: serialized caching reduces object count and memory but adds decode CPU. Unpersist promptly and do not fill storage memory so aggressively that shuffle execution continually spills.",
      "Concurrency: executor cores determine simultaneous task working sets. Fewer cores per executor or smaller partitions can reduce peak allocation and GC more safely than one enormous heap.",
      "Measure executor GC time, task GC time, heap-pool occupancy, allocation, spill, executor loss, and container-overhead failures. Compare maximum versus median tasks: one long, high-memory task often indicates skew or an oversized partition rather than a cluster-wide collector problem.",
      "Separate JVM GC from Python/native pressure. Python worker memory, Arrow buffers, direct network buffers, and native libraries are outside the managed JVM heap, so a container kill with low JVM GC requires overhead/Python investigation instead of GC flags.",
      "Spark 4 uses JDK 17 by default, making G1GC the JVM default. Older tuning recipes based on Parallel GC, fixed young-generation sizes, or `NewRatio` should not be copied blindly into a G1 deployment. Apply one collector/region change only after production-like evidence.",
      "There is no universal acceptable GC percentage. An illustrative 35% GC-time reading is a strong symptom, not a root cause: correlate it with allocation, old-generation occupancy, spill, task size, and throughput before changing heap or collector settings.",
    ],
    "If executors spend an observed 35% of wall time in GC on an object-heavy RDD, first test compact/primitive representations or Kryo serialized persistence, shrink oversized task partitions, reduce unnecessary concurrency, and unpersist stale blocks. Compare the same workload again. Only if GC remains the demonstrated bottleneck should you test G1 region/heap changes with retained logs and one-variable-at-a-time experiments.",
    "Reduce objects and peak working sets first; serializer and GC flags are the final measured layer, not the initial fix.",
  ),

  "What is Spark SQL?": detailedAnswer(
    "Spark SQL is Spark's structured-data module. It lets applications query DataFrames, Datasets, catalog tables, files, and external sources through SQL text or programmatic expressions. Both forms become logical plans that Catalyst analyzes and optimizes, then Spark executes as distributed physical operators using its SQL runtime, code generation, shuffle, scheduling, and data-source connectors.",
    [
      "The analyzer resolves table and column names, functions, aliases, data types, and catalog relationships, rejecting invalid or ambiguous references.",
      "Catalyst rewrites the logical plan through pruning, pushdown, constant folding, null simplification, join planning, and other rule/cost-based decisions.",
      "Spark SQL reads formats such as Parquet, ORC, JSON, CSV, Avro, and JDBC sources, and integrates with Hive-compatible catalogs/tables when configured.",
      "Its optimized internal row and columnar representations let execution avoid much of the overhead of arbitrary JVM/Python objects.",
      "Spark SQL is not merely a SQL parser. It is the shared engine underneath DataFrame/Dataset relational operations and Structured Streaming's structured queries.",
      "It can also expose a distributed SQL service through JDBC/ODBC, letting BI tools submit SQL while Spark performs the physical distributed execution.",
    ],
    "A pipeline can read partitioned Parquet, register a view, express a multi-join aggregation in SQL, inspect the optimized plan, and write an Iceberg/Delta/Hive-compatible table—all through Spark SQL's planning and execution stack.",
    "Spark SQL turns structured relational expressions into optimized distributed Spark execution, whether the user writes SQL text or DataFrame code.",
    [{
      title: "Spark SQL planning path",
      steps: [
        { label: "SQL / DataFrame", detail: "Relational expression" },
        { label: "Analyzer", detail: "Resolve names and types" },
        { label: "Catalyst", detail: "Optimize logical plan" },
        { label: "Planner + AQE", detail: "Choose and adapt operators" },
        { label: "Spark execution", detail: "Run stages and tasks" },
      ],
    }],
  ),
  "How is Spark SQL different from Hive?": detailedAnswer(
    "Spark SQL is a distributed query module inside the general Spark processing engine; Apache Hive is a data-warehouse and SQL ecosystem with its own metastore, HiveQL, SerDes, table conventions, and execution integrations. Spark can use Hive metadata and formats while executing queries with Spark's DAG/SQL engine. Modern Hive is not accurately described only as 'MapReduce' because deployments can use engines such as Tez and LLAP.",
    [
      "Spark SQL supports SQL plus DataFrame/Dataset APIs and integrates queries with batch pipelines, streaming, ML preparation, and application code in one Spark application.",
      "Hive historically centered warehouse SQL, metadata, partitioned tables, and Hive-compatible storage/SerDes. Its metastore is commonly shared by multiple query engines, including Spark.",
      "Spark's Catalyst optimizer, Tungsten-style runtime, whole-stage code generation, and AQE differ from Hive's optimizer and execution architecture.",
      "Spark can create/query Hive tables when Hive support, dependencies, metastore connectivity, filesystem configuration, and SerDes are correctly available on driver and workers.",
      "A Hive Metastore stores catalog metadata rather than the table's actual row data. Spark can reuse that metadata while reading the referenced HDFS/object-store files and executing the plan with Spark.",
      "Performance depends on versions, formats, statistics, engine configuration, caching, concurrency, and query shape; comparing product names without equivalent plans and resources is misleading.",
    ],
    "An organization can keep table definitions and partitions in a Hive Metastore while Spark SQL, Hive/Tez, and Trino query the same Parquet data. Spark supplies one execution engine; Hive supplies important catalog and warehouse conventions.",
    "Spark SQL and Hive overlap in SQL warehousing, but Spark is an execution module and Hive is a broader warehouse/catalog ecosystem that Spark can interoperate with.",
  ),
  "Are SQL queries faster than equivalent DataFrame operations?": {
    summary:
      "No. Equivalent SQL and DataFrame expressions normally converge to the same optimized physical plan, so neither syntax is inherently faster. A measured difference means the plans, expressions, configuration, or cache state differ.",
    takeaway:
      "Performance follows the physical plan. See “What is the difference between Spark SQL and the DataFrame API?” for the canonical comparison.",
  },
  "Can Spark SQL query Hive tables?": detailedAnswer(
    "Yes. With Hive support and the required catalog, filesystem, authentication, and SerDe dependencies configured, Spark SQL can discover Hive databases/tables, read their storage formats, use partition metadata, and execute HiveQL-compatible queries with Spark's engine. Spark can also convert compatible Hive Metastore Parquet/ORC tables to its native readers for better optimization.",
    [
      "Build the `SparkSession` with `enableHiveSupport()` when persistent Hive metastore connectivity, Hive SerDes, and Hive UDF integration are required.",
      "Configure the catalog/metastore endpoint (commonly through `hive-site.xml`) and the storage filesystem separately. Successfully resolving a table name does not prove executors are authorized to read its location.",
      "Provide `hive-site.xml`, filesystem/security settings, and matching client dependencies to driver and executors. A catalog entry alone does not grant data access.",
      "Native-format tables such as Parquet/ORC may be read through Spark's built-in data-source implementation, enabling vectorization, pruning, and pushdown.",
      "Custom Hive SerDes/InputFormats require their JARs on the cluster classpath and can have different performance/compatibility characteristics.",
      "Validate partition repair/synchronization, timestamp/decimal compatibility, case sensitivity, and table properties when multiple engines write the same catalog.",
    ],
    "A Spark session connected to the enterprise Hive Metastore can run `SELECT * FROM finance.orders WHERE dt='2026-10-09'`; Catalyst prunes partitions and Spark tasks read the referenced files from governed storage.",
    "Spark can use Hive metadata and storage conventions while executing the query through Spark SQL.",
  ),
  "Does Spark SQL require a Hive Metastore?": detailedAnswer(
    "No. Spark SQL can query DataFrames, temporary views, files, JDBC sources, and tables in other catalog implementations without a Hive Metastore. A metastore or catalog becomes important when persistent table/view metadata, shared namespaces, partition registration, permissions, and cross-session discovery are required. Hive is one catalog option, not a prerequisite for structured processing.",
    [
      "A DataFrame created from Parquet can be queried directly or registered as a session temporary view with no persistent metastore entry.",
      "Without an external catalog, Spark can use its session/catalog implementation for application-scoped objects, but persistence/sharing behavior depends on configuration.",
      "The relevant distinction is temporary versus persistent metadata, not SQL versus no SQL. Direct file queries and temporary views need no persistent catalog; discoverable tables shared by independent applications need some persistent catalog implementation.",
      "Hive support provides connectivity to a persistent Hive Metastore plus Hive SerDes and functions; enable it only when those capabilities are needed.",
      "Modern table formats/catalogs can use Glue, REST, JDBC-backed, Hadoop, Nessie, Unity-like, or other catalog implementations depending on the platform.",
      "The storage files and the catalog are separate concerns: files contain data; the catalog supplies names, schemas, locations, versions, and governance metadata.",
    ],
    "A notebook can run SQL against `spark.read.parquet(...).createOrReplaceTempView('events')` without Hive. A production shared table referenced by many jobs needs a persistent governed catalog of some kind.",
    "Spark SQL needs structured data and a resolvable relation; it does not require Hive unless Hive-specific persistence or compatibility is part of the design.",
  ),
  "What is the difference between temporary views and permanent tables?": detailedAnswer(
    "A temporary view is a named logical query scoped to a Spark session and stores no independent table data or persistent catalog object. A global temporary view survives across sessions in the same Spark application under a reserved namespace but disappears when the application ends. A permanent table is registered in a persistent catalog and has storage/metadata lifecycle that survives sessions and applications.",
    [
      "Session temporary views take precedence in name resolution in relevant contexts and disappear when the creating session ends.",
      "Global temporary views live under the `global_temp` namespace and are application-scoped, not cluster/permanent objects.",
      "A permanent view stores a cataloged query definition but no physical rows of its own; a permanent table references/manages physical data according to its provider and managed/external semantics. Therefore, 'permanent' describes metadata lifetime, not necessarily materialized data inside the view.",
      "Persistent objects support shared discovery, grants, schema metadata, lineage, and multi-job use, subject to catalog capabilities.",
      "Dropping a managed versus external table can have different data-deletion behavior; understand the catalog/provider contract before treating 'permanent' as ownership of files.",
    ],
    "Use a temporary view to let one job run SQL over an intermediate DataFrame. Publish a curated `analytics.daily_sales` table when independent jobs and BI users need a governed object after the original Spark session ends.",
    "Temporary views name session/application plans; permanent catalog objects survive and are intended for shared data contracts.",
  ),
  "Is Spark SQL always faster than Hive?": detailedAnswer(
    "No. Spark SQL often performs very well because of Catalyst, efficient readers, code generation, in-memory reuse, and AQE, especially for multi-stage or interactive workloads. But Hive deployments using Tez/LLAP, optimized ORC layouts, cached data, strong statistics, and workload-specific tuning can match or outperform Spark for particular warehouse queries. Startup, concurrency, file layout, and resource isolation can dominate engine differences.",
    [
      "A small query can spend more time starting a Spark application and allocating executors than scanning data; a persistent warehouse service may respond faster.",
      "Hive/LLAP may benefit from long-lived caches and ORC-specific optimizations, while a cold Spark cluster reads the same data from remote storage.",
      "Spark can lose through skew, poor partitioning, excessive shuffles, Python UDFs, stale statistics, or an undersized cluster despite a capable optimizer.",
      "Hive can lose through inefficient execution configuration or older MapReduce-based plans; version and chosen execution engine matter.",
      "Benchmark equivalent SQL, data snapshots, formats, statistics, cache state, concurrency, and resource budgets. Include cost and operational SLA, not only one elapsed time.",
    ],
    "Spark may win an iterative ETL pipeline that reuses intermediates, while an always-on Hive LLAP service may answer a selective ORC dashboard query faster than a newly launched Spark application.",
    "Spark SQL is not categorically faster; compare current engines under equivalent data, plans, and operating conditions.",
  ),

  "What is the difference between Spark SQL and the DataFrame API?": detailedAnswer(
    "Spark SQL and the DataFrame API are two ways to express structured relational computations. SQL uses declarative text parsed by Spark; the DataFrame API constructs expressions and logical plans through language methods. Both normally flow through the same analyzer, Catalyst optimizer, physical planner, AQE, and execution engine. The practical differences are composition, tooling, type ergonomics, and how easily dynamic logic is expressed.",
    [
      "SQL is concise for joins, aggregates, windows, CTEs, and work shared with analysts. It separates query text from application control flow.",
      "DataFrames integrate naturally with Python/Scala/Java code, reusable functions, conditional pipeline assembly, testing helpers, and IDE support for API methods. However, ordinary DataFrame column names are generally resolved during analysis, not compile time; `df.select('countri')` can still fail only when Spark analyzes the plan. Strongly typed Scala `Dataset[T]` operations provide additional compile-time type safety.",
      "Column expressions in either API should use built-in functions. Moving from SQL to DataFrames does not make a Python UDF native or remove its overhead.",
      "When expressions are equivalent, both APIs can produce identical scans, filters, exchanges, joins, aggregates, code-generated stages, and AQE changes. SQL parsing is normally negligible beside distributed execution.",
      "If timings differ, compare `explain('formatted')`, the final adaptive plan, runtime metrics, session settings, hints, casts, null semantics, selected columns, UDFs, and cache state before blaming the API syntax.",
      "SQL injection and identifier/literal handling matter when generating SQL strings; DataFrame expressions and parameterized SQL mechanisms can make dynamic values safer.",
      "Select the representation that makes the logic clearest, then inspect the resulting plan. Teams commonly mix them by registering views or calling `spark.sql` within a DataFrame pipeline.",
    ],
    "A stable finance aggregation may be clearest as reviewed SQL, while a metadata-driven ingestion framework builds DataFrame transformations programmatically. If their expressions are equivalent, their physical plans can be identical.",
    "SQL and DataFrames are front ends to the same structured engine; choose for clarity and composition, not assumed speed.",
  ),
  "Do Spark SQL and the DataFrame API use the same execution engine?": {
    summary:
      "Yes. SQL is parsed into a logical plan and DataFrame calls construct one programmatically; both then use Spark SQL's analyzer, Catalyst optimizer, physical planner, AQE, and execution runtime.",
    takeaway:
      "They have different entry points, not different engines. See “What is the difference between Spark SQL and the DataFrame API?” for the canonical comparison.",
  },
  "Do they have different performance characteristics?": {
    summary:
      "Only when they produce different plans or add different work—for example through UDFs, casts, hints, typed Dataset conversions, selected columns, null logic, or cache state. Equivalent physical plans have the same distributed execution characteristics.",
    takeaway:
      "Compare the optimized and final adaptive plans. See “What is the difference between Spark SQL and the DataFrame API?” for the canonical comparison.",
  },

  "What is the Catalyst Optimizer?": detailedAnswer(
    "Catalyst is Spark SQL's tree-based query-compilation framework for analyzing, optimizing, and planning SQL, DataFrame, and Dataset queries. It is broader than one optimizer algorithm: it resolves names and types, rewrites logical plans, generates physical-plan candidates, and selects an executable SparkPlan. Cost-based statistics can influence pre-execution choices, while Adaptive Query Execution can revise supported physical decisions after runtime statistics become available. Catalyst plans the work; it does not itself schedule executor tasks.",
    [
      "Parsing or DataFrame construction creates an unresolved plan containing names and operations but not yet fully bound attributes.",
      "The analyzer consults catalogs and function/type rules to resolve relations, columns, aliases, functions, star expansion, and coercions.",
      "Logical optimization applies rule batches such as predicate/projection movement, constant folding, null propagation, expression simplification, and redundant operator removal.",
      "Physical planning maps logical operators to candidate strategies such as file scans, hash or sort aggregates, broadcast-hash joins, sort-merge joins, and exchanges. Spark then selects and prepares an executable physical plan.",
      "AQE is a later runtime optimization layer, not another logical-plan stage. After query stages materialize, it can use actual shuffle statistics to coalesce partitions, handle skew, and convert supported join strategies.",
      "Catalyst is powerful because built-in expressions expose semantics as inspectable trees. Opaque UDF bodies give it far less information.",
    ],
    "A query with an early projection, filter, and join may be rewritten so the scan reads only needed columns, pushes supported predicates, and broadcasts a small filtered side—even if the SQL/DataFrame code was written in a less efficient-looking order.",
    "Catalyst systematically turns declarative structured logic into an optimized executable plan through analyzable tree transformations.",
  ),
  "Why is Catalyst powerful?": detailedAnswer(
    "Catalyst separates query meaning from execution and expresses both as transformable trees. Rules can match plan patterns and replace them while preserving semantics, enabling many optimizations to compose without hard-coding one path for every query. The framework is extensible across analysis, logical optimization, physical planning, statistics, data sources, and adaptive runtime changes.",
    [
      "Immutability makes transformations predictable: each rule returns a new tree, and rule batches can run to a fixed point where no further change applies.",
      "Semantic knowledge of built-in expressions lets Catalyst reason about determinism, null propagation, foldable constants, referenced attributes, and data types.",
      "Logical and physical concerns remain separate. The same relational join can have broadcast-hash, sort-merge, shuffled-hash, or nested-loop implementations.",
      "Data-source capabilities participate through pruning and pushdown contracts, letting optimization cross the boundary between Spark operators and storage systems.",
      "Cost-based and adaptive layers add statistics without replacing correctness rules, so Spark can start with estimates and improve selected decisions using actual execution data.",
    ],
    "A new connector can report filter and projection support to the planner; Catalyst then combines that capability with its existing logical rules rather than requiring the application to manually rewrite every query for the source.",
    "Catalyst is powerful because it provides a common, extensible language of plans and rules from SQL semantics through physical execution.",
  ),
  "What happens in the unresolved, analyzed, optimized logical, and physical plan stages?": detailedAnswer(
    "The unresolved plan captures requested operations before names and types are fully bound. Analysis resolves those references against catalogs and schemas. Logical optimization rewrites the validated relational plan without choosing machines or concrete algorithms. Physical planning selects executable operators and exchanges; AQE may later revise supported parts using runtime statistics.",
    [
      "Unresolved: `sales.amount` may still be an unresolved attribute and `sales` an unresolved relation; functions and stars await binding.",
      "Analyzed: Spark resolves the table, attributes, aliases, functions, types, star expansion, and required coercions. Missing or ambiguous columns fail during analysis before executor tasks for the query run; an API call that forces analysis can therefore fail even before an action.",
      "Optimized logical: rules push filters/projections, fold constants, simplify predicates, remove redundancies, and potentially reorder eligible joins while preserving results.",
      "Physical: Spark chooses file scans, broadcast or sort-merge joins, hash/sort aggregates, exchanges, partitioning, and code-generation boundaries.",
      "Executed adaptive: query stages provide actual row/byte distributions; Spark can coalesce shuffle partitions, address skew, or convert supported joins before downstream stages run.",
      "`explain('extended')`, `explain('cost')`, and `explain('formatted')` expose different views; the SQL UI shows initial/final adaptive plans and operator metrics.",
    ],
    "For `SELECT SUM(amount) FROM sales WHERE dt=...`, analysis resolves columns/types, logical optimization pushes/prunes, physical planning chooses a partitioned scan and partial/final hash aggregates, and execution schedules tasks for the selected files.",
    "The stages move from requested meaning, to validated meaning, to improved relational logic, to concrete distributed operators.",
    [{
      title: "Catalyst plan stages",
      steps: [
        { label: "Unresolved", detail: "Names and types not fully bound" },
        { label: "Analyzed", detail: "Catalog and schema resolution complete" },
        { label: "Optimized logical", detail: "Semantics-preserving rewrites" },
        { label: "Physical", detail: "Concrete operators and exchanges" },
        { label: "Adaptive execution", detail: "Runtime-supported revisions" },
      ],
    }],
  ),

  "What is Apache Spark Tungsten?": detailedAnswer(
    "Project Tungsten, introduced during Spark 1.4, is the umbrella name for execution-engine improvements that make Spark SQL use memory and CPU more efficiently. It is not a separate engine or one configuration switch. Its ideas include compact binary data formats such as `UnsafeRow`, Spark-managed memory, cache-friendly layouts, specialized encodings, and whole-stage code generation that fuses compatible operators into generated JVM code.",
    [
      "Traditional JVM object graphs carry headers, pointers, boxing, and GC cost. Binary rows store fields at known offsets in compact memory, reducing objects and enabling direct operations.",
      "Spark SQL can keep values in its internal representation across operators, avoiding repeated conversion to user objects until an API boundary requires it.",
      "Whole-stage code generation emits specialized Java for a pipeline of compatible operators, reducing virtual calls, iterator overhead, and repeated expression interpretation.",
      "Columnar and cache-friendly processing improves locality and lets CPUs process predictable contiguous data more efficiently.",
      "Binary processing and off-heap memory are related but not identical. An `UnsafeRow`-style binary representation may live on heap or off heap; selected off-heap/native buffers reduce JVM GC pressure but still count against the executor process and container memory limit.",
      "Tungsten complements Catalyst: Catalyst decides the plan and operator strategy; Tungsten-style execution makes many selected operators efficient at runtime.",
    ],
    "Catalyst may choose a filter followed by a projection and hash aggregate. Whole-stage code generation can fuse their row-processing loops, operating on compact internal rows instead of allocating several intermediate JVM objects per record.",
    "Catalyst optimizes what to execute; Tungsten-era runtime techniques optimize how structured operators use memory and CPU.",
    [{
      title: "Catalyst-to-Tungsten execution path",
      steps: [
        { label: "Catalyst", detail: "Chooses the logical and physical plan" },
        { label: "SparkPlan", detail: "Defines scans, joins, aggregates, and exchanges" },
        { label: "Code generation", detail: "Fuses compatible operators into specialized loops" },
        { label: "Binary execution", detail: "Processes compact rows or columnar batches" },
        { label: "Hardware", detail: "Reduces allocation, GC, cache misses, and virtual calls" },
      ],
    }],
  ),
  "Why was Tungsten needed?": detailedAnswer(
    "Spark's early performance was often limited not only by disk or network but by JVM object overhead, garbage collection, pointer chasing, virtual method calls, and generic iterator-based execution. Large clusters magnify those per-record costs. Tungsten targeted the hardware efficiency of execution so Spark could process more rows per CPU cycle and more logical data per byte of memory.",
    [
      "A boxed integer can require far more memory than its four-byte logical value when object headers and references are included; nested collections multiply the difference.",
      "Millions of short-lived row/expression objects raise allocation rates and GC pauses, reducing executor throughput even when heap capacity appears sufficient.",
      "Generic operator chains repeatedly dispatch methods and materialize intermediates, preventing the JVM compiler from optimizing one tight loop across the pipeline.",
      "Pointer-heavy row layouts produce cache misses; compact contiguous/binary layouts improve CPU cache locality and memory bandwidth use.",
      "Explicit encodings and generated code let Spark specialize work for known schemas and expressions instead of paying general-purpose object costs for every record.",
    ],
    "Processing a billion rows with several allocated wrapper objects per expression creates billions of allocations. A fused generated loop over compact rows can evaluate the same logic with dramatically fewer objects and calls.",
    "Tungsten addressed CPU, memory-layout, and GC bottlenecks that distributed scaling alone could not solve economically.",
  ),
  "How do off-heap memory, binary processing, cache-friendly layouts, and whole-stage code generation improve performance?": detailedAnswer(
    "They reduce different layers of runtime overhead. Off-heap or explicitly managed buffers reduce pressure on JVM object tracking; binary processing avoids materializing general objects; cache-friendly layouts keep relevant values contiguous; and whole-stage code generation fuses compatible operators into specialized loops. Together they reduce allocation, GC, memory footprint, cache misses, function dispatch, and data conversion.",
    [
      "Off-heap: selected execution/storage buffers can live outside the JVM heap, lowering GC scanning pressure. They still count against process/container memory and must be bounded and released correctly.",
      "Binary rows: a null bitset, fixed-width slots, and a variable-length region allow direct field access, comparison, hashing, and copying without constructing a Scala/Java object for every field. Binary representation does not by itself imply off-heap allocation.",
      "Cache-friendly layout: contiguous data and columnar batches improve spatial locality, vectorized decoding, and CPU prefetch behavior compared with pointer-linked objects scattered across heap.",
      "Whole-stage codegen: Spark generates Java tailored to the schema and expressions, combines filters/projections/aggregations where supported, and removes many iterator and virtual-call boundaries.",
      "Not every operator is fused or off-heap. Exchanges, some scans/operators, object conversions, unsupported expressions, and Python UDF boundaries can split generated pipelines. Very large generated methods can also be split or fall back to non-code-generated execution.",
      "Use `explain('codegen')` or plan markers/SQL UI metrics to inspect generated stages; do not assume every query receives the same benefit.",
    ],
    "A scan-filter-project pipeline can decode columnar values, test the predicate, and write selected fields inside one generated loop over compact rows. Crossing into a Python UDF breaks that tight JVM pipeline and adds batch transfer.",
    "These techniques make each executor do more useful work per byte moved, object allocated, and CPU instruction executed.",
  ),
};

const CODE_EXAMPLES_45_TO_54: Record<string, InterviewAnswerCodeBlock[]> = {
  "What is the difference between cache and persist?": [
    {
      title: "Default cache versus explicit persistence",
      language: "PySpark",
      code: `from pyspark import StorageLevel

reused = (
    orders.where("status = 'COMPLETE'")
          .select("customer_id", "amount")
)

# Uses the DataFrame API's configured default storage level.
reused.cache()
reused.count()  # First action computes and stores all partitions.
print("default:", reused.storageLevel)

# A persisted DataFrame normally cannot switch levels in place.
reused.unpersist(blocking=True)

# Persist the same logical DataFrame again with an explicit policy.
reused.persist(StorageLevel.MEMORY_AND_DISK)
reused.count()
print("explicit:", reused.storageLevel)

# Release blocks after the final consumer.
reused.unpersist(blocking=False)`,
    },
    {
      title: "Eager versus lazy SQL table caching",
      language: "Spark SQL",
      code: `-- Eager: materializes the table when this command runs.
CACHE TABLE active_orders
AS SELECT * FROM orders WHERE status = 'ACTIVE';

-- Lazy: records the cache request and materializes on first use.
CACHE LAZY TABLE active_customers
AS SELECT * FROM customers WHERE is_active = true;

UNCACHE TABLE active_orders;
UNCACHE TABLE active_customers;`,
    },
  ],
  "What happens internally when a dataset is cached or persisted?": [
    {
      title: "Confirm that Spark uses an in-memory scan",
      language: "PySpark",
      code: `reused = expensive_transformation.cache()

# First action computes and stores partition blocks.
reused.count()

# A later plan should show InMemoryTableScan / InMemoryRelation.
reused.groupBy("region").sum("amount").explain("formatted")

# Also inspect the driver's Storage and SQL tabs.
print(reused.storageLevel)`,
    },
  ],
  "What is the difference among the persistence storage levels?": [
    {
      title: "Choose a storage level for the workload",
      language: "PySpark",
      code: `from pyspark import StorageLevel

# Memory first, local disk for overflow
features.persist(StorageLevel.MEMORY_AND_DISK)

# Keep only executor-local disk blocks
large_intermediate.persist(StorageLevel.DISK_ONLY)

# Replicate blocks on two executors when recovery latency justifies it
serving_data.persist(StorageLevel.MEMORY_AND_DISK_2)

# RDD/JVM APIs expose additional serialized storage-level choices.
# Always inspect the deployed API/version and measure the result.`,
    },
  ],
  "What does storing Spark data in memory or on disk mean?": [
    {
      title: "Materialize partition blocks and inspect their policy",
      language: "PySpark",
      code: `from pyspark import StorageLevel

reused_orders = (
    orders.where("status = 'COMPLETE'")
          .select("customer_id", "amount")
          .persist(StorageLevel.MEMORY_AND_DISK)
)

# persist() only marks the DataFrame. This action computes the rows and
# creates distributed partition blocks in executor memory/local disk.
reused_orders.count()

print(reused_orders.storageLevel)
reused_orders.explain(mode="formatted")

# Inspect the Spark UI Storage tab for cached partition count,
# memory size, disk size, and executor distribution.

# DISK_ONLY would keep the reusable blocks on executor-local disk;
# it would not create a durable Parquet table in the data lake.
reused_orders.unpersist(blocking=True)`,
    },
  ],
  "How does Spark manage memory?": [
    {
      title: "Calculate the executor's managed heap regions",
      language: "Python sizing calculation",
      code: `executor_heap_mib = 10 * 1024      # 10 GiB = 10,240 MiB
reserved_mib = 300
memory_fraction = 0.60
storage_fraction = 0.50

usable_heap_mib = executor_heap_mib - reserved_mib  # 9,940 MiB
unified_mib = memory_fraction * (
    usable_heap_mib
)                                      # 5,964 MiB
protected_storage_mib = (
    storage_fraction * unified_mib
)                                      # 2,982 MiB
user_memory_mib = (
    (1 - memory_fraction) * usable_heap_mib
)                                      # 3,976 MiB

memory_overhead_mib = max(
    384,
    0.10 * executor_heap_mib
)                                      # 1,024 MiB
container_mib = executor_heap_mib + memory_overhead_mib
# 11,264 MiB = about 11 GiB, before configured off-heap/PySpark memory.

executor_cores = 4
cpus_per_task = 1
task_slots = executor_cores // cpus_per_task  # 4 concurrent tasks

# With N active tasks, each task can claim roughly 1/(2N) to 1/N
# of the available execution pool before spill/fair-sharing limits apply.
minimum_share_mib = unified_mib / (2 * task_slots)  # 745.5 MiB
maximum_share_mib = unified_mib / task_slots        # 1,491 MiB

# Container sizing is a separate boundary:
# heap + memoryOverhead + configured off-heap + configured PySpark memory.
# When PySpark memory is not separately configured, Python normally uses
# the overhead allowance. Validate every value with production metrics.`,
    },
  ],
  "What is checkpointing in Spark?": [
    {
      title: "Create a reliable batch checkpoint",
      language: "PySpark",
      code: `# Reliable shared storage, not executor-local disk.
spark.sparkContext.setCheckpointDir(
    "s3://company-spark-checkpoints/batch-job/"
)

current = source
for iteration in range(20):
    current = run_iteration(current)
    if iteration % 5 == 4:
        current = current.checkpoint(eager=True)

# localCheckpoint() truncates plans but uses executor storage;
# it is not a durable recovery boundary.`,
    },
    {
      title: "Materialize a reliable RDD checkpoint once",
      language: "PySpark RDD",
      code: `sc.setCheckpointDir("s3://company-spark-checkpoints/rdd-job/")

checkpointed = expensive_rdd.persist()

# checkpoint() marks the RDD; it must be called before the action.
checkpointed.checkpoint()
checkpointed.count()  # Materializes both persistence and checkpoint.

print(checkpointed.isCheckpointed())
print(checkpointed.getCheckpointFile())

# Persistence avoids recomputing the expensive lineage for nearby reuse.
# Remove it when consumers have finished; the reliable checkpoint remains
# a recovery/lineage boundary according to its storage lifecycle.
checkpointed.unpersist()`,
    },
    {
      title: "Give each streaming query a durable checkpoint",
      language: "PySpark Structured Streaming",
      code: `from pyspark.sql import functions as F

query = (
    streaming_result.writeStream
        .queryName("daily-customer-totals")
        .outputMode("update")
        .option(
            "checkpointLocation",
            "s3://company-stream-checkpoints/daily-customer-totals-v1/",
        )
        .foreachBatch(idempotent_upsert)
        .start()
)

# The checkpoint restores query progress/state after failure.
# Idempotent/transactional sink behavior is still required for safe retries.
# Do not share this location with another logical query.`,
    },
  ],
  "How should serialization and garbage collection be tuned in Spark?": [
    {
      title: "Configure Kryo and capture modern GC evidence",
      language: "spark-submit",
      code: `spark-submit \\
  --conf spark.serializer=org.apache.spark.serializer.KryoSerializer \\
  --conf spark.kryo.classesToRegister=com.acme.Event,com.acme.Customer \\
  --conf spark.executor.extraJavaOptions="-Xlog:gc*:stdout:time,uptime,level,tags" \\
  --conf spark.eventLog.enabled=true \\
  --conf spark.eventLog.logStageExecutorMetrics=true \\
  app.jar

# Sending GC logs to stdout lets the cluster's log aggregation retain them.
# Set memoryOverhead from measured Python/native/direct memory; do not copy
# an unexplained fixed value from another cluster.
# Change one measured bottleneck at a time.
# Query shape, partition size and object allocation come first.`,
    },
  ],
  "What is Spark SQL?": [
    {
      title: "Move between DataFrames and SQL",
      language: "PySpark / SQL",
      code: `sales = spark.read.parquet("s3://lake/sales/")
sales.createOrReplaceTempView("sales")

result = spark.sql("""
  SELECT region,
         SUM(amount) AS revenue
  FROM sales
  WHERE event_date >= DATE '2026-10-01'
  GROUP BY region
""")

result.explain(mode="formatted")
result.write.mode("overwrite").saveAsTable("analytics.region_revenue")`,
    },
  ],
  "Can Spark SQL query Hive tables?": [
    {
      title: "Enable Hive catalog and query a table",
      language: "PySpark",
      code: `from pyspark.sql import SparkSession

spark = (
    SparkSession.builder
        .appName("hive-query")
        .enableHiveSupport()
        .getOrCreate()
)

orders = spark.sql("""
  SELECT customer_id, amount
  FROM finance.orders
  WHERE dt = '2026-10-09'
""")

orders.explain(mode="formatted")`,
    },
  ],
  "What is the difference between temporary views and permanent tables?": [
    {
      title: "Create session, application and persistent objects",
      language: "PySpark / SQL",
      code: `# Exists only in this SparkSession.
df.createOrReplaceTempView("session_orders")

# Exists across sessions in this application under global_temp.
df.createOrReplaceGlobalTempView("application_orders")
spark.sql("SELECT * FROM global_temp.application_orders")

# Registered in a persistent catalog and survives the application.
df.write.mode("overwrite").saveAsTable("analytics.orders")
spark.sql("SELECT * FROM analytics.orders")`,
    },
  ],
  "What is the difference between Spark SQL and the DataFrame API?": [
    {
      title: "Equivalent expressions should converge to one plan",
      language: "PySpark / SQL",
      code: `from pyspark.sql import functions as F

sales.createOrReplaceTempView("sales")

sql_result = spark.sql("""
  SELECT region, SUM(amount) AS revenue
  FROM sales
  GROUP BY region
""")

df_result = sales.groupBy("region").agg(
    F.sum("amount").alias("revenue")
)

sql_result.explain(mode="formatted")
df_result.explain(mode="formatted")`,
    },
  ],
  "What happens in the unresolved, analyzed, optimized logical, and physical plan stages?": [
    {
      title: "Inspect every plan layer",
      language: "PySpark",
      code: `query = (
    spark.table("sales")
         .where(F.col("amount") > 100)
         .groupBy("region")
         .agg(F.sum("amount").alias("revenue"))
)

# Parsed, analyzed, optimized logical and physical plans
query.explain(mode="extended")

# Statistics used by cost-based decisions
query.explain(mode="cost")

# Readable physical operator hierarchy and details
query.explain(mode="formatted")`,
    },
  ],
  "How do off-heap memory, binary processing, cache-friendly layouts, and whole-stage code generation improve performance?": [
    {
      title: "Inspect whole-stage generated code boundaries",
      language: "PySpark",
      code: `query = (
    spark.read.parquet("s3://lake/events/")
         .where("event_type = 'purchase'")
         .select("customer_id", "amount")
         .groupBy("customer_id")
         .sum("amount")
)

query.explain(mode="formatted")
query.explain(mode="codegen")

# Python UDFs and exchanges can introduce boundaries;
# compare the generated stages before and after such operators.`,
    },
  ],
};

for (const [question, codeBlocks] of Object.entries(CODE_EXAMPLES_45_TO_54)) {
  const answer = SPARK_INTERVIEW_ANSWERS_45_TO_54[question];
  if (answer) SPARK_INTERVIEW_ANSWERS_45_TO_54[question] = { ...answer, codeBlocks };
}
