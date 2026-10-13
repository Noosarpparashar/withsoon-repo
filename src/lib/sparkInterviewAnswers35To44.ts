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

export const SPARK_INTERVIEW_ANSWERS_35_TO_44: Record<string, InterviewAnswer> = {
  "What is the small-files problem?": detailedAnswer(
    "The small-files problem occurs when a dataset is split into far more files than are useful for parallel processing—often thousands or millions of files that are only kilobytes or a few megabytes. The total data volume may be modest, but Spark and the storage/catalog system must list, authorize, open, plan, schedule, and commit work for every file, so metadata and task overhead dominate actual data processing.",
    [
      "On object storage, every list/open/footer request has latency and cost. Parquet/ORC readers may fetch metadata for many objects before useful scanning begins.",
      "One file does not always mean one Spark task. Spark SQL can split large splittable files and bin-pack several small files into one scan partition. Small files remain expensive because every physical object still requires discovery, metadata/open work, and planning even when several are processed by one task.",
      "Tiny inputs can therefore produce many tiny tasks or expensive bin-packing and file-index work, increasing driver planning state and scheduler traffic.",
      "Small columnar files also contain small row groups/stripes, which weakens compression, dictionary efficiency, vectorized scan batches, and predicate statistics.",
      "The problem often comes from over-partitioned writes, high-cardinality directory partitioning, excessive streaming micro-batches, or `repartition` values disconnected from output size.",
      "Fix both existing layout and future writers: compact historical files, control write partitioning, choose table partitions from query patterns, and run maintenance in transactional table formats.",
    ],
    "A 1 TB table stored as five million 200 KB Parquet objects can take minutes just to list and open before scanning. Rewriting it into consistently sized files turns metadata-bound work into throughput-oriented scans.",
    "Small files convert data processing into metadata, scheduling, and object-store overhead; healthy layout matters as much as total bytes.",
    [{
      title: "Why tiny files slow a query",
      steps: [
        { label: "List metadata", detail: "Discover millions of objects" },
        { label: "Open files", detail: "Pay request and footer latency" },
        { label: "Plan splits", detail: "Driver groups file work" },
        { label: "Schedule tasks", detail: "Many short task attempts" },
        { label: "Read little data", detail: "Useful work is a small fraction" },
      ],
    }],
  ),
  "Why are many small files bad for Spark?": detailedAnswer(
    "They create fixed overhead per file that does not shrink with the file's data: directory/object listing, metadata parsing, permission checks, file opens, task descriptors, scheduler events, input metrics, and output commits. When tasks finish in milliseconds, cluster cores spend more time coordinating than computing, and the driver can become the bottleneck before executors are busy.",
    [
      "Driver pressure increases because Spark must represent a very large file index and many input splits/tasks; planning and garbage collection can become significant.",
      "Object stores charge and add latency per request, so millions of GET/HEAD/LIST operations can dominate both cost and wall-clock time.",
      "Tiny Parquet/ORC units compress poorly, expose weak min/max ranges, and cannot provide large vectorized batches, reducing the benefit of columnar storage.",
      "A huge number of short tasks increases task-launch, serialization, event-log, and Spark UI overhead and can overload the scheduler.",
      "Downstream systems also suffer: catalogs contain more partitions/files, table snapshots/manifests grow, backups/listings slow, and concurrent writers create commit contention.",
    ],
    "Reading 100 GB as 100 files of about 1 GB provides manageable metadata and splits; reading the same volume as one million 100 KB files can issue a million opens and schedule enormous administrative work.",
    "The cost of a file is not only its bytes—the per-file control-plane cost becomes dominant at small sizes.",
  ),
  "How do you read many small files efficiently?": detailedAnswer(
    "Reduce per-file planning and task overhead while avoiding a single giant task. Spark SQL can bin-pack multiple small files into one scan partition using file size plus `spark.sql.files.openCostInBytes`; parallel partition discovery helps list large path sets; `minPartitionNum` and `maxPartitionNum` can guide split counts in supported versions. These settings improve a read but do not remove the underlying file-layout debt.",
    [
      "Read a dataset root or catalog table in one operation instead of launching a separate Spark job or `DataFrameReader` call per file.",
      "Tune `maxPartitionBytes` together with `openCostInBytes`. Spark treats each file open as an estimated byte cost so many tiny files are grouped before reaching the target partition budget.",
      "Use parallel path discovery settings when listing is the bottleneck, but avoid overwhelming object storage or the driver with uncontrolled parallel listing.",
      "Prune directories/partitions and columns before reading; a catalog manifest or table format can avoid repeatedly listing unrelated objects.",
      "AQE post-shuffle coalescing does not merge the physical source objects or retroactively redesign the initial file scan. It may improve a later Exchange, while `maxPartitionBytes`, `openCostInBytes`, catalog metadata, and compaction address the input-file problem.",
      "For recurring reads, compact the data. No scan-planning setting can give millions of tiny Parquet objects the compression and metadata efficiency of a well-written table.",
    ],
    "If 200,000 tiny files must be read once, let Spark group them into bounded scan partitions and list them in parallel. If the table is read daily, schedule compaction and correct the streaming/batch writer so the problem does not recur.",
    "Coalesce work at scan planning for immediate relief, but compact and repair the producer for a durable fix.",
  ),
  "How do you reduce or compact small output files?": detailedAnswer(
    "Control the number and distribution of writer tasks before output, then compact existing fragments with an idempotent rewrite or the table format's maintenance command. `coalesce` can reduce partitions without a full shuffle when data is already reasonably balanced; `repartition` or `REBALANCE` can redistribute skewed data and produce more even files at the cost of a shuffle. File-count choices should follow output bytes and target file size, not cluster cores alone.",
    [
      "Estimate `target_writer_tasks = ceil(expected compressed output bytes ÷ desired bytes per file)`, then validate actual file distribution because compression, table partitioning, skew, and one-task-to-multiple-directory writes can change the resulting file count.",
      "Avoid high-cardinality directory partition columns that create one or more tiny files per key. Use date/bucket/transform partitioning aligned with real filters.",
      "`maxRecordsPerFile` caps rows per file; it prevents oversized files but does not guarantee a minimum size or reduce the number of writer tasks by itself.",
      "For streaming, choose a practical trigger volume, write to a transactional table, and run asynchronous compaction rather than forcing each micro-batch to create large files.",
      "Compact atomically and preserve table snapshots/partitions. Rewriting files outside catalog/table metadata can expose duplicates, missing data, or concurrent-write races.",
    ],
    "A daily 80 GB partition targeting roughly 512 MB compressed files might write about 160 balanced partitions after testing. A lakehouse maintenance job later rewrites residual fragments while committing a new atomic snapshot.",
    "Fix writer partitioning for new data and use atomic compaction for existing fragments; never solve small files by blindly forcing one output task.",
  ),

  "What does spark.sql.files.maxPartitionBytes do?": detailedAnswer(
    "`spark.sql.files.maxPartitionBytes` sets the maximum file-byte budget Spark uses when constructing an input partition for supported file-based scans. Apache Spark 4.2 defaults it to `134,217,728` bytes, or 128 MiB. Spark combines it with file splitability, file length, open-cost estimates, and partition-count guidance; it does not rewrite files or guarantee a task's memory consumption stays below that value.",
    [
      "For splittable files, Spark can create multiple input partitions from one large file. For many small files, it can group several files into one input partition.",
      "Spark first derives an effective split target: `bytesPerCore = (sum of file lengths + openCostInBytes × number of files) ÷ defaultParallelism`, then `maxSplitBytes = min(maxPartitionBytes, max(openCostInBytes, bytesPerCore))`. Therefore `maxPartitionBytes` is a ceiling, not a promise that every planned split will be 128 MiB.",
      "A useful approximation for many small files is `planning weight per file ≈ file length + spark.sql.files.openCostInBytes`. Spark 4.2 documents a 4 MiB default open cost. This is a planning weight representing file-open latency, not extra bytes physically read from the file.",
      "Worked example: 100 files total 10 GiB, `defaultParallelism=200`, and `openCostInBytes=4 MiB` give `bytesPerCore = (10,240 MiB + 100 × 4 MiB) ÷ 200 ≈ 53 MiB`. Therefore `maxSplitBytes = min(128 MiB, max(4 MiB, 53 MiB)) ≈ 53 MiB`, producing roughly 200 scan tasks rather than the 80 suggested by `10 GiB ÷ 128 MiB`. Spark deliberately uses smaller splits to expose work to the available parallelism.",
      "Parquet adds a row-group nuance: Spark plans byte-range splits, and a row group is read by the split containing that row group's midpoint. A single 1 GiB row group therefore remains one effective unit of Parquet work even if the file is described by several 128 MiB byte ranges; healthy row-group sizing is required for real parallelism.",
      "The setting controls scan partition planning, not shuffle partitions. A later join or aggregation uses exchange partitioning such as `spark.sql.shuffle.partitions` and AQE.",
      "It applies to supported file sources, not Kafka partitions, JDBC partitioning, RDD partitioners, streaming state partitions, or general output-file sizing.",
      "It is not output-file sizing; output count depends on writer partitions, distribution, records-per-file controls, compression, and table maintenance.",
      "It is not a hard RAM cap. Compressed bytes can expand, decoded rows allocate memory, and downstream operators build additional structures inside the task.",
    ],
    "A 1 GB splittable Parquet file can produce roughly eight 128 MB scan partitions, while many 2 MB files can be grouped into fewer partitions after accounting for each file's open cost.",
    "`maxPartitionBytes` budgets file bytes per scan task; it does not directly control shuffle, output files, or peak task memory.",
  ),
  "Why is 128 MB a common value?": detailedAnswer(
    "It is a historical and practical compromise: large enough to amortize task scheduling, file-open, and sequential-I/O overhead, yet small enough to expose parallelism and keep each scan task's decoded working set manageable on typical executors. It also aligns with long-standing distributed-filesystem block conventions, but it is a default starting point—not a law or a guarantee of optimal task size.",
    [
      "Very small scan partitions create excessive tasks and repeated setup; very large partitions reduce concurrency, lengthen stragglers, and increase recovery granularity.",
      "A 128 MB compressed Parquet split can expand to several times that size when decoded, so executor memory must account for selected columns, encodings, filters, and downstream operators.",
      "Modern cloud storage does not require matching an HDFS block, but request latency and throughput still reward sufficiently large sequential reads.",
      "The best value depends on file format, compression, column projection, storage throughput, executor cores/memory, and desired task duration.",
      "AQE does not rewrite initial file-scan partitioning in the same way it coalesces shuffle partitions, so input planning still deserves measurement.",
    ],
    "On a cluster where 128 MB scans finish in 5–20 seconds with low memory pressure and enough task waves, the default is reasonable. If they finish in 100 ms or repeatedly OOM after decoding, it is not.",
    "128 MB is a balanced default based on overhead and parallelism; choose the production value from measured task behavior.",
  ),
  "When should you change it?": detailedAnswer(
    "Change `maxPartitionBytes` only when scan-stage evidence shows input partitions are too small or too large. Increase it when tasks are extremely short, scheduler/open overhead dominates, and memory/parallelism have headroom. Decrease it when scan tasks are long, decoded working sets or downstream per-task structures cause memory pressure, or a few large partitions create stragglers.",
    [
      "Inspect input bytes/records per task, duration distribution, locality, CPU utilization, GC, spill, and executor loss in the scan stage before tuning.",
      "With tiny files, adjust `openCostInBytes` and compaction as well; changing only the byte target can pack too many opens into one task or hide the root layout problem.",
      "With large unsplittable compressed files, lowering the setting cannot split the codec stream. Rewrite into a splittable format/layout instead.",
      "Ensure enough partitions for cluster utilization. Increasing the target can reduce tasks below available cores; decreasing it can flood the scheduler with low-value tasks.",
      "Test representative projections and filters. A narrow Parquet scan and a wide full-row scan can have very different decoded memory for the same compressed input bytes.",
    ],
    "If scan tasks average 200 ms and the driver schedules hundreds of thousands, increase the target and compact. If a 128 MB compressed split expands into a wide row set that OOMs a task, reduce it and fix the wide downstream operation.",
    "Tune when metrics identify scan-task granularity as the bottleneck, and change related layout/open-cost settings coherently.",
  ),

  "How do you optimize a slow Spark job in production?": detailedAnswer(
    "Optimize by locating the dominant bottleneck before changing configuration. Start with the Spark UI/event log and the final executed plan: identify the longest job/stage, determine whether time is spent in scan, shuffle, skewed tasks, spill/GC, Python/UDF execution, serialization, retries, or the sink, and then apply the smallest change that addresses that measured cause.",
    [
      "Use a reproducible sequence: capture the slow run and input snapshot, locate the critical stage, map that stage to the physical operator, classify the limiting resource, make one targeted change, rerun under comparable conditions, and reconcile output correctness.",
      "Establish the regression and workload context: input volume/file count, data distribution, source/sink health, cluster shape, code/config/version changes, and whether the run is cold or cached.",
      "Inspect stage/task metrics: maximum versus median duration, input/shuffle bytes, fetch wait, spill, GC time, peak execution memory, locality, failed attempts, and executor loss.",
      "Inspect the physical/final AQE plan for partition pruning, pushed filters, read schema, exchanges, join strategy, broadcast size, aggregation type, skew handling, and unexpected UDF/Python boundaries.",
      "Fix high-leverage logic first: filter/project early, remove accidental Cartesian or many-to-many joins, replace UDFs, pre-aggregate, correct join keys, address skew, and compact small files.",
      "Then tune partitioning and resources: input split size, shuffle partitions/AQE, executor cores/memory overhead, broadcast threshold, and sink concurrency based on task bytes and bottleneck capacity.",
      "Prioritize algorithm and data-shape corrections over resource scaling. Removing a many-to-many join, pruning 90% of columns, pre-aggregating before an Exchange, or separating one hot key usually has more leverage than increasing every executor setting.",
      "Validate one change with before/after metrics and output reconciliation. Faster incorrect output, hidden data loss, or a fix that only moves pressure to the database is not an optimization.",
    ],
    "If one reduce task reads 80 GB while the median reads 600 MB, adding executor memory treats the symptom. Profile the key, enable/verify AQE skew handling or salt/pre-aggregate that key, then confirm the maximum task duration and output counts improve.",
    "Plan, stage, and task evidence should lead the tuning decision; configuration guessing should not.",
    [{
      title: "Production tuning workflow",
      steps: [
        { label: "Reproduce", detail: "Confirm workload and regression" },
        { label: "Locate", detail: "Find longest stage/operator" },
        { label: "Classify", detail: "I/O, skew, shuffle, memory, CPU or sink" },
        { label: "Change", detail: "Apply one targeted correction" },
        { label: "Verify", detail: "Compare metrics and data correctness" },
      ],
    }],
  ),

  "What Spark configurations should be tuned when the data is huge but the cluster is small?": {
    summary:
      "Tune source admission, scan partition size, shuffle partitioning, concurrent tasks, executor heap and overhead, AQE, broadcast limits, spill capacity, and sink concurrency from measured per-task work—not from total dataset size.",
    takeaway:
      "For the full sizing and restartability strategy, see “How do you process a huge dataset safely when the Spark cluster is small?”",
  },
  "How do you limit the amount of data processed at one time?": detailedAnswer(
    "Limit source admission or divide bounded data into restartable slices. In Structured Streaming, cap Kafka offsets per trigger or use the built-in file source's file-count limit. Use a byte limit only with a connector that implements one, such as Delta Lake or Databricks Auto Loader. In batch, filter by date/range/source partition, process a manifest subset, or orchestrate sequential chunks with idempotent output. Source admission limits a batch; partition sizing limits a task; task slots limit concurrency. These are three different controls.",
    [
      "Kafka `maxOffsetsPerTrigger` limits total offsets planned for a trigger and distributes the allowance across topic partitions.",
      "Apache Spark's built-in file source uses `maxFilesPerTrigger`; `latestFirst`, `maxFileAge`, and `cleanSource` affect discovery order, file age, and post-processing cleanup rather than providing a byte budget. Delta Lake supports a soft `maxBytesPerTrigger` limit, and Databricks Auto Loader exposes `cloudFiles.maxBytesPerTrigger`; do not present either option as a plain Parquet file-source feature.",
      "Batch filters and partition pruning reduce the bounded dataset before tasks are planned. A control table can record completed date/range chunks for safe resume.",
      "`maxPartitionBytes` changes input bytes per scan task but does not cap the total job input; Spark can schedule many such partitions over successive task waves.",
      "A trigger such as `ProcessingTime('30 seconds')` controls when the next micro-batch is attempted. If a batch takes 70 seconds, Spark cannot finish a new batch every 30 seconds, and the trigger does not independently cap records or bytes.",
      "Limit sink concurrency and records per transaction as well. A safe Spark batch can still overload a database if every partition writes concurrently.",
    ],
    "With built-in `maxFilesPerTrigger=5` and five files of about 200 MB each, one micro-batch admits roughly `5 × 200 MB = 1 GB`. If those files vary from 20 MB to 2 GB, however, five files is not a 1 GB guarantee. A Delta source can instead use `maxBytesPerTrigger`; Auto Loader uses `cloudFiles.maxBytesPerTrigger`. For Kafka, a limit of 200,000 offsets controls record count, not payload bytes.",
    "Control total admitted data with batch/trigger slicing and control per-task data with partition sizing.",
  ),
  "What exactly is being limited?": detailedAnswer(
    "It depends on the source and setting. For Apache Spark's built-in file source, `maxFilesPerTrigger` limits newly admitted file count. Delta Lake's `maxBytesPerTrigger` and Auto Loader's `cloudFiles.maxBytesPerTrigger` target admitted source bytes. Kafka `maxOffsetsPerTrigger` limits offset count across partitions. Separately, `maxPartitionBytes` limits file bytes grouped into one scan partition, and `spark.sql.shuffle.partitions` controls the initial number of post-exchange partitions. None is a universal cap on rows, decoded memory, CPU, or final output size.",
    [
      "Five files can mean 5 MB or 500 GB, so the built-in file source's count limit only indirectly controls load. Connector-specific byte limits are safer when file sizes vary widely; Delta still admits at least one file when that file alone exceeds its soft byte limit.",
      "One Kafka offset normally corresponds to one record, but record sizes and transformation expansion vary, so equal offset counts do not imply equal memory or CPU.",
      "Compressed scan bytes can expand during decoding, and an `explode`, join, or aggregation can greatly increase downstream work.",
      "Partition count controls concurrency/granularity, not a hard memory reservation. Each task's algorithm and key distribution determine working-set size.",
      "A processing-time trigger controls when Spark attempts another micro-batch; it does not guarantee a particular input rate or batch size.",
    ],
    "`maxOffsetsPerTrigger=100000` admits at most roughly 100,000 Kafka records, not 100,000 bytes. `maxPartitionBytes=128MB` plans scan splits near 128 MB compressed file bytes, not 128 MB executor heap use.",
    "Name the unit—files, source bytes, offsets, scan bytes, or partitions—because each control bounds a different part of the pipeline.",
  ),

  "What does serialization mean?": detailedAnswer(
    "Serialization converts an in-memory value or object graph into a byte representation that can be transferred across a network, written to disk, placed in a shuffle block, cached compactly, or sent to another process. The bytes encode values plus enough structural/type information—or rely on a shared schema—so a compatible deserializer can reconstruct the required representation later.",
    [
      "A live object reference is meaningful only inside one process/address space; another executor cannot dereference it directly.",
      "General object serializers encode arbitrary graphs and metadata. Schema-aware formats can encode fields more compactly because both sides already understand the structure.",
      "Spark serializes task closures and captured variables from the driver, RDD shuffle records, broadcasts, cached serialized partitions, and many task results. Serialization can happen without network transfer—for example, when a block is cached or spilled to local disk.",
      "Spark SQL often processes its own compact binary rows rather than applying the configured general Java/Kryo serializer to every DataFrame expression.",
      "Correctness requires compatible classes/schemas and stable semantics. Spark's internal serializers are intended for communication within an application, not necessarily durable cross-version storage contracts.",
    ],
    "The driver cannot send a Scala `Customer` object pointer to an executor. It serializes the closure and captured value to bytes; the executor receives those bytes and reconstructs what the task needs.",
    "Serialization turns process-local structures into portable bytes under an agreed decoding contract.",
  ),
  "Why must distributed systems convert objects to bytes?": detailedAnswer(
    "Machines and processes do not share the same heap, object addresses, class instances, or runtime layout. Networks, disks, message queues, and operating-system I/O move byte sequences. A serializer converts a logical value into a stable transmissible representation; the receiver uses the corresponding schema/type rules to rebuild or directly interpret it.",
    [
      "Memory addresses are only valid in the originating process and can change because of garbage collection, allocation, or restart.",
      "Different machines may use different CPU architecture, language runtime, classloader, endianness, or software version, so the wire contract must define representation independently.",
      "Bytes can be checksummed, compressed, encrypted, framed, retried, stored, and replayed by transport systems without understanding the original object.",
      "A schema or type descriptor defines field order, types, nullability, version compatibility, and how readers handle added/removed fields.",
      "Serialization cost is the price of isolation and portability; compact encodings and batching reduce that cost but cannot eliminate the need for a transferable representation.",
    ],
    "A Python worker and JVM executor cannot exchange a Python dictionary object itself. Spark sends Pickle/Arrow or another byte representation across an inter-process channel and constructs a compatible representation on the other side.",
    "Distributed boundaries carry bytes, not live objects; serialization defines the shared language across those boundaries.",
  ),

  "What does deserialization mean?": detailedAnswer(
    "Deserialization is the reverse boundary: it reads serialized bytes and reconstructs values, objects, internal rows, columnar batches, or task code in the receiving process. Conceptually the receiver reads and frames the bytes, decrypts/decompresses when required, interprets them with the expected serializer and schema/class definition, constructs the usable representation, and hands it to the operator. Corrupt bytes or an incompatible reader fail this process.",
    [
      "Executors deserialize task closures and broadcast variables sent by the driver; reduce tasks deserialize shuffle data fetched from upstream executors.",
      "Cached serialized RDD partitions must be decoded when records are processed, trading a smaller cache footprint for repeated CPU/allocation cost.",
      "Object deserialization can allocate many short-lived objects and increase GC; columnar/internal readers can process buffers with fewer object conversions.",
      "Class version, serial version identifiers, classloader availability, field evolution, nullability, and schema resolution determine compatibility. The receiver must use the matching contract; arbitrary bytes cannot explain themselves.",
      "Deserializing untrusted bytes can be a security risk for general object serializers. Distributed platforms should restrict allowed types and use safe governed formats at system boundaries.",
    ],
    "A reduce task fetches a compressed shuffle block, decompresses it, decodes records using the configured/internal serializer, and feeds keys and values into the aggregation operator.",
    "Deserialization turns portable bytes back into a representation the receiving runtime can compute with.",
  ),

  "Why does Spark need serialization and deserialization?": detailedAnswer(
    "Spark separates the driver, executors, tasks, JVMs, Python workers, network shuffle, and local storage. Code and data must cross those boundaries. Serialization lets the driver ship task closures and broadcasts, map tasks write shuffle blocks, reduce tasks fetch them, persisted partitions occupy compact storage, and results return to the driver or sink; deserialization makes each payload usable at its destination.",
    [
      "Driver-to-executor: the driver serializes task descriptions, closures, and captured variables; the executor deserializes them before running the task. Accidentally capturing a large object can replicate it into many tasks.",
      "Executor-to-executor: wide transformations write partitioned shuffle output that downstream tasks fetch and decode over the network.",
      "Executor storage: persisted serialized RDDs and spill/shuffle files trade encode/decode CPU for reduced memory/disk bytes. Local disk still requires a byte representation even when no network is involved.",
      "JVM-to-Python: PySpark scalar, Arrow, and Pandas UDF paths exchange rows or columnar batches between processes using different serialization mechanisms.",
      "Executor-to-driver: task status and small action results are encoded; large `collect()` results can overwhelm driver memory regardless of serializer efficiency.",
      "Structured DataFrames often stay in optimized internal binary/columnar forms, reducing general object serialization compared with arbitrary RDD objects.",
    ],
    "For a `groupBy`, a map task computes the destination partition, serializes records into partitioned shuffle blocks, may compress them, and writes them to local storage. A downstream task fetches its blocks, verifies/decompresses them, deserializes or directly decodes the records, and performs the aggregation. Results are encoded again if they cross another process, storage, or sink boundary.",
    "Serialization is the transport and storage contract connecting every isolated process and stage in a Spark application.",
    [{
      title: "Spark serialization boundaries",
      steps: [
        { label: "Driver", detail: "Serializes tasks, closures and broadcasts" },
        { label: "Map task", detail: "Encodes partitioned shuffle output" },
        { label: "Network / disk", detail: "Moves and stores byte blocks" },
        { label: "Reduce task", detail: "Decodes records for computation" },
        { label: "Result / sink", detail: "Encodes final transfer or storage" },
      ],
    }],
  ),

  "Why are serialization and deserialization expensive?": detailedAnswer(
    "They perform CPU work to traverse values, encode types/fields, copy buffers, compress/decompress, and reconstruct objects. They also allocate temporary and output objects, increasing memory bandwidth use and garbage collection. Larger encodings amplify network, disk, shuffle, spill, and cache costs, so the expense is both conversion time and the downstream cost of the produced bytes.",
    [
      "General object serializers use reflection, metadata, reference tracking, and nested object traversal, which are more expensive than operating on compact primitive arrays or schema-aware rows.",
      "Deserialization can create many wrappers, strings, arrays, and collections per record; allocation rate can dominate executor CPU and trigger frequent GC.",
      "Copying between JVM heap, native buffers, network buffers, Python processes, and user objects consumes memory bandwidth even when no business calculation occurs.",
      "Compression reduces I/O but adds CPU; the best codec and batch size depend on whether the workload is network/disk-bound or CPU-bound.",
      "Millions of tiny records pay per-record overhead repeatedly. Batching/columnar formats amortize calls and improve locality.",
      "Reduce cost with DataFrames/built-ins, compact schemas, fewer object boundaries, Kryo for suitable RDD objects, Arrow/vectorization for Python, and smaller shuffle volume through early aggregation/filtering.",
      "A useful stage-level model is `boundary time ≈ serialize CPU + compression CPU + bytes ÷ disk/network throughput + decompression CPU + deserialize CPU + allocation/GC/copy time`. Several terms can overlap, but the model shows why choosing a faster serializer alone cannot repair skew, excess records, or a slow network.",
    ],
    "With `groupByKey`, every value for a key crosses the shuffle boundary. With an associative aggregation such as `reduceByKey`, Spark combines values on the map side first, so fewer records and bytes are serialized, written, fetched, and deserialized. A shuffle of 500 million nested JVM objects may otherwise spend more CPU allocating and decoding objects than performing the business calculation.",
    "Serialization cost includes CPU, allocation, GC, byte copying, and every I/O operation caused by an inflated payload.",
  ),

  "What is the difference between Java serialization and Kryo serialization?": detailedAnswer(
    "Spark's Java serializer uses Java's `ObjectOutputStream` model: it is flexible and usually works for classes implementing `Serializable`, but it often writes large representations and spends more CPU on general object-graph handling. Kryo is a compact binary object serializer designed for speed. Spark's tuning guide describes Kryo as significantly faster and more compact—sometimes up to about 10×—but that is a workload-dependent upper observation, not a guaranteed application speedup.",
    [
      "Java serialization prioritizes compatibility and convenience. It carries class/object metadata, handles references through general Java mechanisms, and can invoke reflection or custom `writeObject`/`readObject` logic. That flexibility commonly produces more bytes and CPU work.",
      "Kryo uses compact binary encodings and benefits from registered class IDs and known serializers. For repeated custom JVM object types, this can reduce serialized size, network/disk traffic, allocation, and GC as well as encode/decode time.",
      "Enable it before the `SparkContext` is created with `spark.serializer=org.apache.spark.serializer.KryoSerializer`. This controls Spark's pluggable object-serialization paths, including applicable RDD shuffle data and serialized RDD persistence.",
      "Spark has internally used Kryo for shuffling RDDs of simple types, arrays of simple types, and strings since Spark 2.0. Therefore, 'the default is Java' does not mean every byte in every Spark shuffle always uses Java serialization.",
      "Spark SQL DataFrames already use optimized internal encodings for many operations, so changing the general serializer may have little effect on a pure SQL/DataFrame workload.",
      "The setting does not change Parquet/ORC/Avro files into Kryo, eliminate Python-JVM serialization, or replace Arrow. Those are different boundaries with their own encodings.",
      "Current defaults use a 64 KiB initial Kryo buffer per worker core that can grow to a 64 MiB maximum. The maximum must exceed the largest single object being serialized; tune it only after measuring legitimate object size or observing a buffer-limit error.",
      "Neither Java nor Kryo serialization is a durable, interoperable business-data format. Use schema-governed formats such as Parquet, Avro, or Protobuf for persistent/external contracts.",
    ],
    "A custom graph RDD repeatedly shuffling millions of nested case-class objects is a strong Kryo candidate: measure map-output bytes, serialization CPU, GC, and stage time before and after registration. A Parquet-to-Parquet DataFrame aggregation may show almost no change because its critical path uses Spark SQL's internal binary execution instead of the general object serializer.",
    "Java favors broad convenience; Kryo favors compact speed with registration and compatibility responsibility.",
  ),
  "When does Kryo provide the most benefit?": detailedAnswer(
    "Kryo provides the most benefit when many custom JVM objects cross Spark's general serializer boundary—large RDD shuffles, serialized RDD persistence, broadcasts, task closures, or object-heavy iterative algorithms—and when Java serialization metadata/size is a material part of runtime. High record counts and network-intensive stages amplify every byte and CPU cycle saved.",
    [
      "Custom case classes, nested collections, graph structures, and repeated object types often shrink substantially when registered with compact Kryo encodings.",
      "Serialized cache levels can store one byte array per partition; Kryo reduces the array size and object count compared with deserialized objects or Java serialization.",
      "Network-bound shuffles benefit when smaller blocks reduce write, fetch, disk spill, and transfer time.",
      "Iterative RDD algorithms repeatedly serialize the same shapes, making one-time registration and optimized encoders valuable over many stages.",
      "The benefit grows when serialization lies on the critical path: high record counts, nested/custom JVM objects, network-bound shuffle, serialized persistence, or repeated iterative exchange. 'Large data' alone is not sufficient evidence.",
      "Measure the fraction of time/bytes actually using the configured serializer. Compare shuffle read/write bytes, cache size, executor CPU/GC, spill, and stage duration. Pure DataFrame operators, source decoding, or slow external sinks may be unaffected.",
    ],
    "A recommendation graph uses RDDs of registered vertex and edge classes across repeated joins/shuffles. Kryo can reduce block size and GC enough to improve every iteration; that compounding reuse makes it a strong case.",
    "Kryo matters most when custom JVM object serialization is frequent, large, and on the critical path.",
  ),
  "When might Kryo not be the right choice?": detailedAnswer(
    "Kryo may not be worthwhile when the workload stays in Spark SQL's internal formats, serialization is a small share of runtime, or operational compatibility and registration burden outweigh measured savings. It can also be risky when object graphs include unsupported/problematic libraries, class registration changes across deployments, or unexpectedly large single objects exceed configured buffers.",
    [
      "A DataFrame-only pipeline dominated by Parquet I/O, skewed joins, or database writes should fix those bottlenecks first; changing the RDD serializer may produce no visible gain.",
      "Registration IDs and custom serializers must remain consistent within the application deployment. Incorrect or incomplete registration can fail tasks or complicate upgrades.",
      "Kryo's maximum buffer must hold the largest single serialized object, not the entire partition. Increasing it blindly raises potential per-core buffer memory and can hide an unbounded record, closure, or collection design.",
      "Some third-party classes require custom serializers or contain runtime state that should not be serialized at all; construct such resources per partition instead.",
      "Cross-language PySpark overhead, Arrow conversion, and external storage formats are separate; enabling Kryo does not remove Python/JVM transfer or replace an interoperable durable schema.",
      "For a small job whose serialized payload and runtime are already trivial, the deployment/testing complexity may exceed any measurable benefit. Benchmark rather than adopting a serializer by slogan.",
    ],
    "A SQL ETL job spends 80% of time waiting on a throttled JDBC sink and uses no custom RDD objects. Kryo adds testing/configuration risk but does not address the critical path.",
    "Choose Kryo only after proving general JVM object serialization is important and its registration/compatibility contract is manageable.",
  ),

  "Why should Kryo classes be registered?": detailedAnswer(
    "Registering a class lets Kryo represent the class with a compact numeric identifier and select its known serializer instead of writing and resolving the fully qualified class name with each unregistered object. This reduces payload and lookup overhead. The identifier is stable only within a consistently configured application; Kryo bytes should not be treated as a permanent cross-deployment contract.",
    [
      "Without registration, Kryo can serialize many classes, but it may include the fully qualified class name repeatedly, wasting bytes in high-volume object streams.",
      "Use `SparkConf.registerKryoClasses`, `spark.kryo.classesToRegister`, or a custom `KryoRegistrator` for advanced/custom serializers.",
      "Register every custom class reachable in RDD records, closures, broadcasts, and nested fields—not only the top-level case class.",
      "`spark.kryo.registrationRequired` defaults to `false`: unregistered classes can still work, but their class names are written with the objects. Setting it to `true` enforces the contract and fails immediately when a needed class is missing; enable strict mode only after representative integration tests.",
      "A custom `KryoRegistrator` is appropriate when registration needs custom serializers or special construction logic; `spark.kryo.classesToRegister` is simpler when only a class list is needed.",
      "Keep registrations consistent across driver and executor code in one deployment. Do not treat Kryo bytes as a durable cross-version file/message format.",
      "Registration improves the encoding contract but cannot fix huge objects, unbounded collections, or a workload that does not use Kryo's serializer path.",
    ],
    "Register `CustomerEvent`, its nested `Address`, and custom enum/value classes before shuffling the RDD. Strict registration then exposes an accidentally captured third-party object during testing instead of producing unpredictable runtime overhead.",
    "Registration replaces repeated class metadata with compact known IDs and makes the serialized object contract explicit.",
  ),
};

const CODE_EXAMPLES_35_TO_44: Record<string, InterviewAnswerCodeBlock[]> = {
  "How do you read many small files efficiently?": [
    {
      title: "Tune file-scan planning, then compact",
      language: "PySpark",
      code: `# Group small files into practical scan partitions.
spark.conf.set("spark.sql.files.maxPartitionBytes", 256 * 1024 * 1024)
spark.conf.set("spark.sql.files.openCostInBytes", 8 * 1024 * 1024)

# Suggest an upper split-count target in supported Spark versions.
# This setting is guidance, not a guaranteed hard cap.
spark.conf.set("spark.sql.files.maxPartitionNum", 20_000)

# Read the dataset root once; do not loop over files.
events = spark.read.parquet("s3://lake/events/")
events.explain(mode="formatted")`,
    },
  ],
  "How do you reduce or compact small output files?": [
    {
      title: "Write a measured number of balanced files",
      language: "PySpark",
      code: `from pyspark.sql import functions as F

# Overwrite only the date partitions present in the DataFrame.
spark.conf.set("spark.sql.sources.partitionOverwriteMode", "dynamic")

# Rewriting ONE date: round-robin across the target writer tasks.
# Do not partition the shuffle by event_date: every row has the same date.
target_files = 160

(
    daily_events
      .repartition(target_files)
      .write
      .mode("overwrite")
      .partitionBy("event_date")
      .option("maxRecordsPerFile", 5_000_000)
      .parquet(compacted_path)
)

# Rewriting MANY dates: bound the buckets within each date.
files_per_date = 16
bucketed = (
    events
      .withColumn(
          "_bucket",
          F.pmod(F.hash("event_id"), F.lit(files_per_date))
      )
      .repartition("event_date", "_bucket")
      .drop("_bucket")
)

(
    bucketed.write
            .mode("overwrite")
            .partitionBy("event_date")
            .option("maxRecordsPerFile", 5_000_000)
            .parquet(compacted_path)
)

# For transactional tables, prefer their atomic compaction command
# so metadata and concurrent readers remain consistent.`,
    },
  ],
  "What does spark.sql.files.maxPartitionBytes do?": [
    {
      title: "Set and verify file-scan partition sizing",
      language: "PySpark",
      code: `# Illustrative planning calculation: 100 files total 10 GiB.
total_file_bytes = 10 * 1024 * 1024 * 1024
number_of_files = 100
default_parallelism = 200
open_cost_bytes = 4 * 1024 * 1024
max_partition_bytes = 128 * 1024 * 1024

bytes_per_core = (
    total_file_bytes + open_cost_bytes * number_of_files
) / default_parallelism
max_split_bytes = min(
    max_partition_bytes,
    max(open_cost_bytes, bytes_per_core)
)

print("effective split target MiB:", max_split_bytes / 1024 / 1024)
# About 53 MiB, below maxPartitionBytes because Spark targets parallelism.

spark.conf.set(
    "spark.sql.files.maxPartitionBytes",
    max_partition_bytes
)

scan = spark.read.parquet("s3://lake/orders/")

print("planned scan partitions:", scan.rdd.getNumPartitions())
scan.explain(mode="formatted")

# This does not set shuffle partitions or output file size.
print(spark.conf.get("spark.sql.shuffle.partitions"))`,
    },
  ],
  "How do you optimize a slow Spark job in production?": [
    {
      title: "Expose the plan and preserve event-log evidence",
      language: "PySpark / spark-submit",
      code: `# Before execution: inspect estimates and physical operators.
query.explain(mode="cost")
query.explain(mode="formatted")

# At submission: retain evidence after the application exits.
spark-submit \\
  --conf spark.eventLog.enabled=true \\
  --conf spark.eventLog.dir=s3://company-spark-event-logs/ \\
  --conf spark.eventLog.logStageExecutorMetrics=true \\
  job.py

# In the Spark UI / history server compare:
# max vs median task time, shuffle bytes, spill, GC,
# failed attempts, skew and the final adaptive plan.`,
    },
  ],
  "What Spark configurations should be tuned when the data is huge but the cluster is small?": [
    {
      title: "Start with bounded tasks and adaptive execution",
      language: "PySpark",
      code: `from math import ceil

# Example assumptions (replace with measurements from your stage/UI):
executors = 3
executor_cores = 2
cpus_per_task = 1
estimated_shuffle_bytes = 1 * 1024**4   # 1 TiB
target_shuffle_bytes = 256 * 1024**2    # 256 MiB per reduce task

task_slots = (executors * executor_cores) // cpus_per_task  # 6
parallelism_floor = 4 * task_slots                         # 24
size_based_partitions = ceil(
    estimated_shuffle_bytes / target_shuffle_bytes
)                                                           # 4,096
initial_shuffle_partitions = max(
    parallelism_floor, size_based_partitions
)                                                           # 4,096

spark.conf.set("spark.sql.adaptive.enabled", "true")
spark.conf.set("spark.sql.adaptive.coalescePartitions.enabled", "true")
spark.conf.set("spark.sql.adaptive.skewJoin.enabled", "true")
spark.conf.set(
    "spark.sql.adaptive.advisoryPartitionSizeInBytes",
    target_shuffle_bytes,
)

# Input splits and shuffle partitions control different stage boundaries.
spark.conf.set("spark.sql.files.maxPartitionBytes", 128 * 1024 * 1024)
spark.conf.set("spark.sql.shuffle.partitions", initial_shuffle_partitions)

# AQE may coalesce small partitions at runtime. Recalculate from the
# actual shuffle bytes and inspect max/median task size, spill and skew.
query.explain(mode="formatted")`,
    },
  ],
  "How do you limit the amount of data processed at one time?": [
    {
      title: "Bound streaming source admission",
      language: "PySpark",
      code: `kafka_source = (
    spark.readStream
         .format("kafka")
         .option("kafka.bootstrap.servers", brokers)
         .option("subscribe", "events")
         .option("maxOffsetsPerTrigger", 200_000)
         .load()
)

# Apache Spark built-in file source: limit newly discovered file count.
file_source = (
    spark.readStream
         .format("parquet")
         .option("maxFilesPerTrigger", 20)
         .schema(event_schema)
         .load(landing_path)
)

# Delta Lake connector: optional soft byte-based admission limit.
delta_source = (
    spark.readStream
         .format("delta")
         .option("maxFilesPerTrigger", 200)
         .option("maxBytesPerTrigger", "2g")
         .load(delta_path)
)

# For Databricks Auto Loader, the byte option is
# cloudFiles.maxBytesPerTrigger. Plain Parquet does not support it.
# For bounded batch data, orchestrate idempotent date/range slices.`,
    },
  ],
  "What does serialization mean?": [
    {
      title: "A minimal serialization round trip",
      language: "Python concept",
      code: `import pickle

event = {"id": 42, "country": "IN"}

# Process-local object -> transferable bytes
payload = pickle.dumps(event)

# Bytes -> a new process-local object representation
decoded = pickle.loads(payload)

assert decoded == event
assert decoded is not event

# Spark uses several serializers and internal formats;
# this only demonstrates the boundary concept.`,
    },
    {
      title: "The same object-to-bytes idea in Scala",
      language: "Scala concept",
      code: `case class User(id: Int, name: String)

val user = User(1, "Prasoon")

// In one JVM this is a live object. Spark cannot transmit its
// memory address to another JVM. A serializer encodes its values
// and structure as bytes; the receiving JVM deserializes a new
// compatible User representation from those bytes.`,
    },
  ],
  "Why are serialization and deserialization expensive?": [
    {
      title: "Reduce the number of records crossing the shuffle boundary",
      language: "Scala / Spark RDD",
      code: `val events = sc.parallelize(Seq(
  ("IN", 1L), ("IN", 1L), ("US", 1L)
))

// groupByKey sends every value across the shuffle and then groups them.
val expensive = events.groupByKey().mapValues(_.sum)

// reduceByKey performs map-side combining first, so fewer values and
// bytes normally need serialization, disk/network I/O, and decoding.
val preferred = events.reduceByKey(_ + _)

// This optimization is valid because addition is associative and
// commutative. Do not substitute it blindly for arbitrary logic.`,
    },
  ],
  "What is the difference between Java serialization and Kryo serialization?": [
    {
      title: "Enable Kryo for Spark's pluggable serializer paths",
      language: "Scala",
      code: `import org.apache.spark.{SparkConf, SparkContext}

val conf = new SparkConf()
  .setAppName("registered-kryo")
  .set(
    "spark.serializer",
    "org.apache.spark.serializer.KryoSerializer"
  )
  .registerKryoClasses(Array(
    classOf[CustomerEvent],
    classOf[Address]
  ))

val sc = new SparkContext(conf)`,
    },
  ],
  "Why should Kryo classes be registered?": [
    {
      title: "Register classes and optionally enforce the contract",
      language: "spark-submit",
      code: `spark-submit \\
  --conf spark.serializer=org.apache.spark.serializer.KryoSerializer \\
  --conf spark.kryo.classesToRegister=com.acme.CustomerEvent,com.acme.Address \\
  --conf spark.kryo.registrationRequired=true \\
  app.jar

# Test all reachable custom and nested classes before strict mode.
# Current buffer defaults are 64 KiB initial per worker core and 64 MiB max.
# Set buffer.max only when a measured legitimate object requires more;
# do not use it to hide an unbounded record, closure, or collection.`,
    },
  ],
};

for (const [question, codeBlocks] of Object.entries(CODE_EXAMPLES_35_TO_44)) {
  const answer = SPARK_INTERVIEW_ANSWERS_35_TO_44[question];
  if (answer) SPARK_INTERVIEW_ANSWERS_35_TO_44[question] = { ...answer, codeBlocks };
}
