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

export const SPARK_INTERVIEW_ANSWERS_4_TO_14: Record<string, InterviewAnswer> = {
  "What is an RDD?": detailedAnswer(
    "An RDD, or Resilient Distributed Dataset, is Spark's low-level abstraction for an immutable collection of records divided into partitions and processed in parallel across executors. It is resilient because Spark records deterministic dependencies—lineage—that can recreate a lost partition. An RDD exposes functional operations and explicit control, but unlike a DataFrame it does not give Catalyst a relational schema and expression tree to optimize.",
    [
      "Distributed means the records are split into logical partitions. A stage normally runs one task per partition, with executor slots processing those tasks in waves.",
      "Immutable means `map`, `filter`, or another transformation creates a new RDD definition rather than modifying the parent. This makes lineage and retry reasoning practical.",
      "RDD transformations are lazy. Spark records dependencies and computes only the partitions required by an action such as `count`, `collect`, `saveAsTextFile`, or `reduce`.",
      "RDDs can contain arbitrary JVM/Python objects and support low-level operations such as `mapPartitions`, custom partitioners, and fine-grained pair-RDD transformations. That freedom also creates serialization and object-memory overhead.",
      "RDD lineage provides recomputation, not durable storage. If the original source is unavailable or an external side effect cannot be repeated safely, lineage alone cannot recover correctness.",
      "For structured ETL, joins, filters, and aggregations, DataFrames are normally preferred because Catalyst, code generation, column pruning, compact internal rows, and AQE can optimize them.",
    ],
    "An RDD of server-log objects might be partitioned across 200 tasks. A `filter` creates a new lazy RDD dependency; `count()` triggers execution. If partition 37 is lost, Spark can recompute only the upstream dependencies needed to rebuild that partition.",
    "An RDD is an immutable, partitioned, lineage-backed distributed collection that trades optimizer visibility for low-level control.",
    [{
      title: "RDD model",
      steps: [
        { label: "Source", detail: "Files, collection or another RDD" },
        { label: "Partitions", detail: "Independent distributed record groups" },
        { label: "Transformations", detail: "Create immutable lineage dependencies" },
        { label: "Action", detail: "Schedules tasks for required partitions" },
        { label: "Recovery", detail: "Recompute a lost partition from parents" },
      ],
    }],
  ),
  "What are the key properties of an RDD?": detailedAnswer(
    "The defining RDD properties are immutability, partitioned distributed storage/computation, lazy transformations, lineage-based fault recovery, typed records in JVM APIs, and optional persistence and partitioning metadata. These properties work together: immutability makes dependencies stable, partitions enable parallelism, and lineage lets Spark reconstruct lost work without replicating every intermediate record.",
    [
      "Immutable: each transformation returns another RDD. User code can still mutate an object inside a record, but doing so is unsafe and does not turn the RDD into coordinated mutable state.",
      "Partitioned and distributed: `getNumPartitions` exposes the task-level division. Preferred locations can let the scheduler place work near HDFS blocks or cached partitions.",
      "Lazy: a transformation such as `map` records a dependency and function; an action asks the scheduler to materialize the required partitions.",
      "Resilient through lineage: narrow dependencies can often rebuild a small parent chain, while lost shuffle output may require upstream map tasks or stages to run again.",
      "Persistable: `cache`/`persist` can retain computed partition blocks for reuse. Persistence improves speed but does not replace lineage or durable checkpointing.",
      "Partitioner-aware: pair RDDs may carry a `HashPartitioner` or custom partitioner. Compatible operations can preserve it and avoid unnecessary reshuffling; ordinary maps can discard it unless declared correctly.",
    ],
    "A pair RDD partitioned by customer ID can reuse its partitioner across compatible keyed aggregations. Caching it saves recomputation, but if an unreplicated cached block disappears Spark still uses the recorded parents to rebuild it.",
    "RDD resilience comes from stable immutable dependencies; performance comes from sensible partitioning, serialization, and selective persistence.",
  ),

  "What are the differences among RDDs, DataFrames, and Datasets?": detailedAnswer(
    "RDDs expose low-level distributed objects and functional transformations. DataFrames expose named, typed columns under a runtime schema and are optimized by Spark SQL. Datasets—primarily a Scala/Java API—combine a Catalyst-managed logical plan with JVM compile-time domain types through encoders. In Scala, a DataFrame is effectively a `Dataset[Row]`; PySpark provides DataFrames but not the same typed Dataset abstraction.",
    [
      "RDD execution treats custom transformation functions largely as opaque. Spark schedules them but cannot generally reorder or rewrite their internal business logic.",
      "DataFrames expose relational expressions, statistics, and schemas, enabling Catalyst analysis, predicate/column pushdown, join selection, whole-stage code generation, AQE, and compact binary/columnar processing.",
      "Datasets encode typed JVM objects into Spark SQL's internal representation and provide typed operations. Crossing into object-oriented lambdas can introduce encoder/object materialization and reduce optimizer visibility.",
      "RDDs offer compile-time element types in Scala/Java but no optimizer-visible relational schema. DataFrames validate unresolved column names during analysis, usually at runtime; Dataset typed lambdas can add compile-time domain checks.",
      "DataFrames have broad language parity and are the default for SQL, ETL, aggregations, streaming, and data sources. Dataset APIs are most relevant to Scala/Java applications; RDDs remain useful for specialized algorithms and unstructured control.",
      "Performance is not determined by the name alone. Built-in DataFrame expressions usually win, while opaque UDFs, repeated conversions, bad joins, skew, or poor partitioning can erase that advantage.",
    ],
    "A revenue pipeline should normally use DataFrame filters, joins, and aggregates. A Scala service may use `Dataset[Order]` for typed domain composition. A custom graph algorithm requiring explicit partition iteration and a specialized partitioner may justify an RDD.",
    "Choose DataFrames by default, Datasets when JVM type safety materially helps, and RDDs only when their low-level control is genuinely required.",
  ),
  "When would you use each one?": detailedAnswer(
    "Use DataFrames or SQL for most production data engineering because Spark can understand and optimize the computation. Use Datasets in Scala/Java when typed domain models, encoders, and compile-time function signatures improve maintainability without forcing excessive object conversion. Use RDDs when the data or algorithm cannot be represented cleanly with structured expressions and low-level partition/control is essential.",
    [
      "DataFrame: joins, aggregations, window functions, lakehouse/table reads and writes, Structured Streaming, schema validation, and analytical transformations using built-ins.",
      "Dataset: typed event/domain pipelines in JVM applications, especially where case classes and typed transformations are valuable. Verify the plan when typed lambdas create object-serialization boundaries.",
      "RDD: custom graph/iterative algorithms, unusual binary or unstructured records, legacy libraries, custom partitioners, or `mapPartitions` logic that structured APIs cannot express.",
      "Do not select an RDD merely to call familiar language functions. Higher-order array/map functions, joins, windows, and built-in Spark SQL expressions often keep the same logic optimizable.",
      "Crossing APIs is allowed: `df.rdd` and `createDataFrame` can bridge them. Repeated conversions between internal rows and Python/JVM objects cost CPU, serialization, and sometimes schema precision.",
      "Judge with correctness, plan visibility, portability, memory representation, and measured performance—not the outdated claim that DataFrames are always faster in every possible operation.",
    ],
    "For parsing a proprietary binary stream, an RDD `mapPartitions` stage may decode records once, then convert them to a DataFrame so all filtering, joining, aggregation, governance, and output remain in the structured engine.",
    "Stay in the highest-level optimizer-visible API that can express the requirement cleanly; drop lower only for a demonstrated need.",
  ),

  "What are transformations and actions in Spark?": detailedAnswer(
    "A transformation describes a new distributed dataset or query from existing data and is normally evaluated lazily. An action asks Spark to materialize a result, return data to the driver, execute side effects, or write output. The action causes the driver to trace the required dependencies, create one or more jobs/stages, and schedule tasks for only the partitions needed to satisfy it.",
    [
      "Transformations include narrow dependencies, which can be pipelined locally, and wide dependencies, which require a compatible redistribution and typically introduce a shuffle stage boundary.",
      "Calling a transformation does not mean no work of any kind occurs: DataFrame analysis, schema inference, file listing, and catalog lookup may access metadata before the eventual row computation.",
      "Actions include scalar/driver results such as `count`, bounded retrieval such as `take`, distributed side effects such as writes, and language-specific RDD operations such as `reduce` or `foreach`.",
      "An action executes only the lineage needed for its result. `take(10)` may scan a subset of partitions; `count()` normally needs every relevant partition; optimized SQL can prune unused branches and columns.",
      "Two actions over the same unpersisted lineage can rerun scans, transformations, and shuffles. Persist a reused expensive intermediate only when reuse savings exceed materialization and memory cost.",
      "The exact 'one action equals one job' rule is a useful simplification, not a guarantee. SQL subqueries, broadcast preparation, file commands, or internal planning can create additional jobs.",
    ],
    "`clean = raw.filter(...).select(...)` builds a lazy plan. `clean.count()` triggers computation for the count. A later `clean.write.parquet(...)` is another action and can repeat the lineage unless `clean` was appropriately persisted.",
    "Transformations define what to compute; actions establish a materialization boundary and make Spark execute the required dependency graph.",
  ),
  "What are some examples of transformations and actions?": detailedAnswer(
    "Typical transformations are `map`, `flatMap`, `filter`, `mapPartitions`, `select`, `withColumn`, `union`, `join`, `groupBy`, `distinct`, `repartition`, and `coalesce`. Typical actions are `count`, `collect`, `take`, `first`, `reduce`, `foreach`, `show`, and write/save operations. The important interview distinction is not memorizing lists but explaining dependency and execution behavior.",
    [
      "Common narrow transformations include `map`, `filter`, `flatMap`, `mapPartitions`, many projections, and union dependencies. They usually process a child partition from a limited parent partition set.",
      "Common wide transformations include keyed grouping, distinct/deduplication, repartition, global order, and large non-broadcast joins because records must be redistributed.",
      "`reduceByKey` is wide because final values for a key must meet, but it performs map-side combination to reduce shuffle bytes. `groupByKey` transfers every value required by the group.",
      "`coalesce` without shuffle is generally narrow; `repartition` is wide. A join may be wide or avoid a large-side shuffle through broadcast or compatible existing distribution.",
      "`collect` is dangerous on large results because it transfers every result record into driver memory. `take`/`limit` is bounded, though upstream work can still be substantial depending on ordering and filters.",
      "`show()` is an action even though it is for display, and a DataFrame writer is an action even though its result is stored externally rather than returned to the driver.",
    ],
    "A `filter` followed by `select` is a narrow transformation chain. Adding `groupBy('country').sum('amount')` introduces a wide dependency. Calling `show()` finally executes the chain and retrieves a bounded result for display.",
    "Classify an operation by whether it defines a lazy dataset or requests a materialized result, then inspect its partition dependency and physical plan.",
  ),

  "What is a Spark action?": detailedAnswer(
    "A Spark action is an operation that demands a result from a lazy RDD/DataFrame lineage: a value returned to the driver, records displayed or iterated, work executed on partitions, or data committed to a sink. The driver constructs the required job graph, schedules dependent stages, and waits or reports asynchronously according to the API.",
    [
      "Driver-returning actions include `count`, `first`, `take`, RDD `reduce`, and `collect`. Their result sizes differ radically; only bounded/small results belong on the driver.",
      "Output actions include DataFrameWriter operations and RDD save methods. Distributed tasks produce files or sink writes, then Spark uses the relevant commit protocol.",
      "`foreach`/`foreachPartition` execute functions on workers and are actions. External effects must be idempotent because task retries or speculation can execute user code more than once.",
      "Actions define job boundaries from the user's perspective, but one API call may involve multiple Spark jobs for broadcast creation, subqueries, metadata, or SQL execution details.",
      "An action does not automatically cache its result for a later action. Shuffle files may survive for stage recovery, but user-visible reuse needs persistence or durable output where appropriate.",
      "Use action-aware debugging: nothing in the row pipeline may run until the action, so parsing exceptions, UDF errors, and missing-file failures frequently appear there.",
    ],
    "`df.collect()` can create a job and then crash the driver by returning 100 GB. `df.write.parquet(path)` also triggers a job, but executors write distributed partitions and only coordination metadata returns to the driver.",
    "An action turns a lazy definition into executed work; choose an action whose result location and size are safe.",
  ),

  "What is lazy evaluation in Spark?": detailedAnswer(
    "Lazy evaluation means Spark records transformations as dependencies or logical expressions without immediately processing all input rows. Execution begins when an action requires a result. At that point Spark can optimize the complete structured plan, cut runtime stages at shuffle dependencies, pipeline narrow operators, and execute only the branches and partitions needed for the action.",
    [
      "For RDDs, laziness builds a lineage graph of transformation dependencies. The DAG Scheduler uses those dependencies to create stages and to recompute lost partitions.",
      "For DataFrames, Catalyst receives the full unresolved/analyzed logical plan and can prune columns, push filters, fold constants, reorder eligible operations, choose joins, and generate a physical plan.",
      "Lazy does not mean zero pre-action I/O. Schema inference, file listing, table-log reads, catalog resolution, and query analysis can touch metadata or even run small supporting work.",
      "An action may require only part of the data. `take(10)` can stop after enough partitions produce rows, while a global sort or count still requires broad computation.",
      "Errors inside transformations are deferred: a malformed value in a cast/UDF may not appear until an action reaches that record. Tests should deliberately materialize important validation paths.",
      "Repeated actions over an unpersisted plan execute it again. Laziness avoids premature work; it does not imply automatic memoization.",
    ],
    "Spark can turn `select 200 columns → filter → select 3 columns` into a scan of only needed fields with the filter pushed where possible. Eagerly materializing every call would lose that cross-operation optimization opportunity.",
    "Laziness gives Spark the complete dependency context needed for optimization, pipelining, selective execution, and recovery.",
  ),
  "Why is lazy evaluation important?": detailedAnswer(
    "Lazy evaluation matters because it lets Spark reason across an entire computation before committing cluster resources. Spark can remove unused work, push reductions closer to input scans, fuse compatible operators, choose physical strategies, and preserve a dependency graph for retries. It also prevents intermediate datasets from being materialized after every transformation.",
    [
      "Optimization: Catalyst can push filters/projections, simplify expressions, reorder eligible joins, and choose broadcast or distributed strategies based on the complete query.",
      "Pipelining: multiple narrow transformations can execute in one task iterator and one stage instead of writing each intermediate result to storage.",
      "Work avoidance: an unused branch is not evaluated, and bounded actions can sometimes compute only a subset of partitions.",
      "Fault recovery: deterministic lineage remains available to reconstruct a lost partition without saving every intermediate output.",
      "Resource efficiency: Spark can combine operations and plan task boundaries instead of allocating storage and scheduling a job per method call.",
      "Trade-off: failures surface later and execution can be recomputed across actions. Intentional validation actions, persistence, checkpointing, and good observability make this manageable.",
    ],
    "A pipeline defines three alternative derived DataFrames but writes only one. Spark executes only the dependencies of the written branch; it can also remove unused columns before reading the input files.",
    "Lazy evaluation is not merely delayed work—it is the foundation for whole-plan optimization, pipelined execution, and lineage recovery.",
  ),

  "What is a DAG in Spark?": detailedAnswer(
    "A DAG—Directed Acyclic Graph—is the dependency graph Spark needs to compute a result. It is directed because data dependencies flow from parents to children and acyclic because a computed dataset cannot depend circularly on itself. When an action is submitted, Spark uses the required dependencies to identify shuffle boundaries, form stages, pipeline narrow transformations, and recover missing work.",
    [
      "The RDD lineage graph exists lazily as transformations are declared. An action causes Spark to submit a job for the subset of that graph needed to produce the result.",
      "The DAG Scheduler separates shuffle-map stages from downstream result or map stages because downstream tasks require shuffle output from their parents.",
      "Within a stage, narrow operations can be pipelined into one task function over each partition; ten maps/filters do not imply ten stages.",
      "The Task Scheduler and backend place individual task attempts on executors. The DAG Scheduler operates at job/stage dependencies rather than selecting every worker directly.",
      "The DAG also enables recovery: missing shuffle output or a lost partition can make the scheduler resubmit only the necessary ancestors, subject to source availability.",
      "For Spark SQL, logical and physical query plans are distinct planning representations. Their physical operators ultimately execute as jobs, stages, and tasks represented in runtime DAG views.",
    ],
    "Suppose Spark processes 500 GB of e-commerce orders, filters completed transactions, and calculates revenue by city. The scan, filter, projection, and map-side partial aggregation can run together in Stage 1. Because the same city can occur in many input partitions, Spark then shuffles the partial totals by city. Stage 2 fetches those shuffle blocks, finishes the aggregation, and writes the result. The executed plan and Spark UI provide the authoritative stage boundaries because Catalyst and AQE may refine the initial plan.",
    "The DAG connects lazy dependency planning to concrete stage scheduling and targeted recovery.",
    [
      {
        title: "Revenue-by-city stage DAG",
        steps: [
          { label: "Stage 1", detail: "Read orders, filter completed rows, and calculate partial city totals" },
          { label: "Shuffle by city", detail: "Move each partial total to the partition responsible for that city" },
          { label: "Stage 2", detail: "Merge city totals and write the final distributed output" },
        ],
        note: "The shuffle is the stage boundary: downstream aggregation cannot finish until the required upstream map outputs are available.",
      },
      {
        title: "From query definition to runtime execution",
        steps: [
          { label: "Transformations", detail: "Create dependency edges lazily" },
          { label: "Action", detail: "Selects the required computation" },
          { label: "DAG Scheduler", detail: "Cuts the graph at shuffle boundaries" },
          { label: "Stages", detail: "Contain pipelined partition work" },
          { label: "Tasks", detail: "Executors run one stage pipeline per partition" },
        ],
        note: "This second view explains scheduling; the stage DAG above shows how the example's data dependencies are actually divided.",
      },
    ],
  ),
  "What is the role of the DAG Scheduler?": detailedAnswer(
    "The DAG Scheduler converts a submitted job's RDD dependencies into a stage graph, tracks which parent stages and shuffle outputs are available, and submits runnable stages to the lower-level Task Scheduler. It also coordinates stage-level recovery when tasks fail, shuffle output is lost, or a fetch failure invalidates upstream results.",
    [
      "It walks dependencies backward from the final RDD/result and identifies shuffle dependencies that require separate stages; narrow dependencies remain pipelined within a stage.",
      "A shuffle-map stage produces registered map outputs for downstream fetch. A result stage runs the final function needed by the action; an intermediate stage can itself feed another shuffle.",
      "The scheduler waits until all required parent stages are available before submitting a child stage, while independent branches may progress as dependencies permit.",
      "It receives task-completion information, records output availability, handles failed stages, and resubmits missing map outputs after executor loss or fetch failure.",
      "The Task Scheduler handles task sets, locality, resource offers, speculation, and executor placement. The cluster manager allocates executor processes; these are separate responsibilities.",
    ],
    "For a join followed by an aggregation, the DAG Scheduler can create shuffle stages for join inputs, a stage that performs the join and writes another shuffle, and a final aggregation stage. It submits each only after its required outputs exist.",
    "The DAG Scheduler owns dependency-aware stage construction and recovery; the Task Scheduler owns execution of each stage's task attempts.",
  ),
  "Does every Spark transformation create a new stage?": detailedAnswer(
    "No. A stage is not created per API call. Consecutive narrow transformations can be pipelined inside the same task and stage because each child partition reads a limited set of parent partitions. A new stage is generally required at a shuffle dependency, where downstream partitions need data produced by many upstream tasks.",
    [
      "`map → filter → select` can run as one iterator pipeline over each input partition without writing a distributed intermediate after every step.",
      "`groupBy`, repartition, global sort, and many joins introduce distribution requirements and usually an `Exchange`, which creates a stage boundary.",
      "The word 'wide' is a dependency concept, not a guarantee based only on method name. A broadcast join avoids shuffling the large side, and compatible distribution can let Spark reuse an exchange.",
      "One transformation can participate in different physical stages after Catalyst/AQE optimization. Conversely, a single high-level action may execute multiple stages and sometimes multiple jobs.",
      "Inspect the Spark UI DAG and formatted/final physical plan rather than counting source-code transformation lines.",
    ],
    "Twenty filter/withColumn expressions can compile into one whole-stage pipeline and one scan stage. A following `groupBy('customer_id')` inserts an Exchange and separates the map-side work from downstream aggregation.",
    "Stages follow physical shuffle dependencies, not the number of transformations written by the developer.",
  ),
  "What is the difference between a DAG and lineage?": detailedAnswer(
    "Lineage is the derivation history of a particular RDD or distributed result—its parent dependencies and transformations—used especially for recomputation. A DAG is the broader directed dependency graph for the computation required by a submitted job and is organized by the scheduler into stages. The ideas overlap, but lineage describes provenance/recovery while the runtime DAG describes executable dependency structure.",
    [
      "Each RDD carries dependencies such as narrow or shuffle dependencies to parents; following them backward forms its lineage graph.",
      "When an action requests a result, Spark traverses the required lineage and builds/submits a stage DAG for that job. Unrelated lazy branches need not appear in the job.",
      "Lineage persists conceptually even when data is cached; cache can satisfy a dependency without recomputing ancestors, but lost blocks can still fall back to that lineage.",
      "Reliable checkpointing materializes a new recovery base and truncates earlier lineage. The runtime job after checkpoint can therefore have a shorter dependency chain.",
      "Spark SQL also has logical/physical plans; calling every plan 'lineage' obscures analyzer/optimizer decisions and runtime shuffle-stage dependencies.",
    ],
    "An RDD `validated` remembers it came from `parsed → raw`. A `validated.count()` creates a job DAG using that lineage. If `validated` is reliably checkpointed, future recovery can begin at the checkpoint instead of rebuilding `raw` and `parsed`.",
    "Lineage is dataset derivation metadata; the DAG is the scheduler-visible dependency graph used to execute the required job.",
  ),
  "What is the difference between a Spark DAG and a Spark SQL execution plan?": detailedAnswer(
    "A Spark SQL execution plan describes relational query semantics and the selected physical operators—scans, filters, projections, joins, aggregates, sorts, and Exchanges. The runtime DAG describes jobs and stages created to execute those physical dependencies. Catalyst builds and optimizes plans first; Spark's scheduler later turns their RDD/exchange execution into stages and tasks.",
    [
      "The unresolved/analyzed logical plan answers what tables, columns, types, and expressions mean. The optimized logical plan applies semantic transformations without assigning executor tasks.",
      "The physical plan selects algorithms such as broadcast hash join or sort-merge join and inserts `Exchange`/sort nodes needed for their distributions.",
      "At execution, Exchanges and actions generate stage boundaries and tasks. Whole-stage code generation may fuse several physical operators into a single task pipeline.",
      "AQE can replace parts of the physical plan using runtime statistics, so the final executed plan may differ from the initial plan while the UI shows the actual jobs/stages produced.",
      "Use `explain`/SQL UI to diagnose operator choice and estimates; use Jobs/Stages DAG and task metrics to diagnose runtime scheduling, shuffle, skew, spill, and failure.",
    ],
    "A formatted plan may show `FileScan → Filter → Exchange → HashAggregate`. The runtime UI shows an upstream shuffle-map stage and a downstream aggregation stage, each containing many tasks. These are related views at different abstraction levels.",
    "The SQL plan is the optimized operator strategy; the DAG is the scheduled distributed execution of that strategy.",
  ),
  "Can you see the DAG in Spark?": detailedAnswer(
    "Yes. The Spark UI and History Server display DAG visualizations for jobs and stages, including stage dependencies, skipped/reused stages, task counts, and associated metrics. For structured queries, the SQL tab and `explain` methods show logical/physical operator plans, which complement rather than replace the runtime DAG.",
    [
      "The Jobs tab shows each job, its stage DAG, status, duration, and action/call-site information when available.",
      "The Stages tab exposes shuffle dependencies and task distributions; open a stage to inspect input, shuffle read/write, spill, GC, failures, and maximum-versus-median duration.",
      "The SQL tab links query executions to physical operators and metrics, and with AQE can display initial and final adaptive plans.",
      "`df.explain('formatted')` gives a readable physical hierarchy; `extended` includes parsed/analyzed/optimized/physical plans; `cost` includes available statistics.",
      "Enable event logging and a History Server for completed production applications. The live UI disappears with the driver unless its evidence is retained.",
    ],
    "When a job stalls at 99%, the DAG identifies the final active shuffle stage; its task table may reveal one 80 GB reducer while the median reads 500 MB. The SQL plan then maps that stage to a particular join or aggregate.",
    "Use the DAG to locate runtime boundaries and the SQL plan to explain which operators created them.",
  ),
  "How can you reduce the number of stages?": detailedAnswer(
    "Reduce stages by removing unnecessary shuffle dependencies, not by pursuing a low stage count as an end in itself. Filter and project early, eliminate redundant repartitions/sorts/distincts, use map-side aggregation, broadcast a safely small join side, and preserve compatible partitioning where reuse justifies it. A necessary distributed join or aggregation should keep its stage boundary and be sized correctly.",
    [
      "Inspect the final physical plan for repeated `Exchange` and global sort nodes. Catalyst can reuse some exchanges; user-added repartitions can prevent or duplicate useful distribution.",
      "Replace `groupByKey` plus reduction with `reduceByKey`/`aggregateByKey` in RDD code; this does not remove the stage but reduces shuffle bytes and downstream pressure.",
      "A broadcast join can eliminate the large-side shuffle and associated stages when the build relation is safely small and the join supports it.",
      "Avoid separately materializing intermediate actions merely for debugging because every action creates another job. Use explain/UI, or persist only when a result is intentionally reused.",
      "Fewer stages can be worse if it creates one enormous partition, unsafe broadcast, or unbounded task pipeline. Optimize wall time, bytes, reliability, and correctness rather than a UI count.",
    ],
    "Removing a `repartition('customer_id')` immediately followed by an `orderBy('event_time')` may eliminate one redundant Exchange because the global ordering must redistribute again anyway. Pre-filtering also shrinks the remaining required stage.",
    "Remove avoidable stage boundaries, but retain the shuffles required for correct, balanced distributed computation.",
  ),
  "Does caching break the DAG?": detailedAnswer(
    "Caching does not erase or truncate the DAG or lineage. It stores materialized partition blocks so later actions can satisfy part of the dependency graph from an in-memory/disk cache rather than recomputing ancestors. If a cached block is evicted or its executor is lost, Spark can return to the original lineage and rebuild that partition.",
    [
      "`cache`/`persist` is lazy: the first action computes and stores partitions; a later action can begin with an in-memory scan for blocks that exist.",
      "The UI may show a cached relation or skipped stages because previously materialized data satisfies dependencies, but recovery information remains available.",
      "Cache is executor-local optimization state and disappears with application/executor lifecycle according to storage level. It is not a durable lineage cut.",
      "Reliable `checkpoint` writes a new recovery base and truncates prior lineage after materialization; `localCheckpoint` uses local storage and does not provide the same reliability.",
      "Caching an excessively large or one-use dataset can evict useful blocks and steal execution memory, increasing rather than reducing work.",
    ],
    "An iterative algorithm caches iteration 10, so iterations 11–15 can reuse it. If one iteration-10 block disappears, Spark can recompute it through earlier lineage. A reliable checkpoint at iteration 10 would instead establish durable materialized parents and cut the earlier chain.",
    "Caching short-circuits available computation for speed; checkpointing is the mechanism that can truncate recovery lineage.",
  ),

  "What is a Spark job?": detailedAnswer(
    "A Spark job is the scheduler-level computation submitted to satisfy an action or an internal execution requirement. The driver traces the required RDD/query dependencies, the DAG Scheduler divides them into stages at shuffle boundaries, and those stages run tasks over partitions. One Spark application can execute many jobs sequentially or concurrently.",
    [
      "User actions such as `count`, `show`, `collect`, or write commonly trigger jobs. A later action over the same unpersisted DataFrame normally creates another job and recomputes its required lineage.",
      "One action is not guaranteed to map to exactly one UI job. Broadcast preparation, subqueries, eager commands, sampling/schema work, and SQL internals can generate supporting jobs.",
      "A job has a final result stage plus any ancestor shuffle-map stages needed to produce its inputs. It succeeds only when the required stage outputs and final action complete.",
      "Jobs belong to a Spark application and share its executors, configuration, caches, broadcasts, and scheduler pools. Job groups/descriptions can improve cancellation and observability.",
      "The Jobs UI reports submission time, duration, stage progress, failures, and call site; event logs preserve this after application exit.",
    ],
    "`sales.groupBy('region').sum('amount').count()` triggers a job whose upstream stage writes region-partitioned shuffle output and whose final stage aggregates and counts. Writing the same unpersisted result afterward triggers additional work/job execution.",
    "A job is the action-oriented unit coordinated by the DAG Scheduler; stages and tasks are its distributed execution structure.",
  ),

  "What is a Spark stage?": detailedAnswer(
    "A Spark stage is a set of parallel tasks that run the same operator pipeline for different partitions without requiring an intervening shuffle. The DAG Scheduler creates stage boundaries at shuffle dependencies: an upstream shuffle-map stage produces partitioned blocks, and downstream stages begin after the required outputs are available.",
    [
      "Narrow transformations can be pipelined inside a stage because each output partition reads a limited parent set. They do not create a stage merely because they are separate source-code calls.",
      "A shuffle-map stage ends by writing shuffle output for downstream partitions. A result stage applies the action's final function and returns results or commits output.",
      "A stage normally has one task per output partition for that stage. Its task count can differ from the previous stage because an Exchange creates a new partition count.",
      "Stages can be skipped when their outputs are already available from cache or a prior shared exchange; they can be retried when shuffle files are lost or fetches fail.",
      "AQE can alter partition counts and stage structure through query stages, coalescing, skew handling, or join conversion, so initial and final execution can differ.",
    ],
    "A 1,000-partition scan/filter stage writes 400 hash-partitioned shuffle buckets. The downstream aggregation stage therefore has about 400 tasks, not 1,000, and waits on the required upstream map outputs.",
    "A stage is the largest pipeline Spark can execute without crossing a shuffle dependency.",
  ),

  "What is a Spark task?": detailedAnswer(
    "A Spark task is the smallest unit the scheduler sends to an executor. It executes one stage's serialized operator/function pipeline for one partition, reads its assigned input or shuffle blocks, produces a result or shuffle output, and reports metrics and status to the driver. Multiple attempts may exist for the same logical task after failure or speculation.",
    [
      "Tasks in one stage run equivalent logic over different partitions. Available executor task slots determine how many run concurrently; remaining tasks wait in waves.",
      "A task carries the closure and partition metadata, not the complete dataset. Capturing a large driver object in the closure can nevertheless inflate every task; use appropriate broadcasts for reusable read-only state.",
      "Task memory depends on decoded rows and operator state—not just input bytes. Sorts, joins, aggregations, UDFs, and hot keys can spill or OOM inside one partition.",
      "Task metrics include duration, input records/bytes, shuffle read/write, fetch wait, spill, GC, locality, peak execution memory, and result size. Max-versus-median comparisons reveal skew or host stragglers.",
      "Spark accepts one successful attempt. Output commit protocols handle supported files, but arbitrary API/database side effects can run more than once and require idempotency.",
    ],
    "A stage has 800 shuffle partitions on an 80-slot cluster. Spark schedules 800 logical tasks in roughly ten waves. If task 317 loses its executor, a new attempt for partition 317 runs elsewhere rather than restarting every task.",
    "A task is one stage pipeline applied to one partition; attempts are retryable executions of that logical unit.",
  ),
  "How are jobs, stages, and tasks related?": detailedAnswer(
    "The hierarchy is application → jobs → stages → tasks. An action usually initiates job execution; the DAG Scheduler separates that job into dependency-ordered stages at shuffle boundaries; each stage contains approximately one task per partition. Executors run task attempts in parallel up to available resource slots.",
    [
      "A single application can execute many actions and therefore many jobs while reusing executors, caches, broadcasts, and configuration.",
      "A job contains the stages needed for its requested result. Shared shuffle stages or cached results may be reused/skipped instead of rerun.",
      "A stage's tasks have the same computation shape but different partition IDs and data. The next stage can have a different task count because its shuffle partitioning differs.",
      "Dependencies determine order: downstream reduce tasks require upstream shuffle-map output, while independent stage branches may be runnable concurrently.",
      "Failure recovery occurs at multiple levels: retry a task attempt, resubmit missing stage output, or fail/restart the application using durable checkpoints and sources when the driver is lost.",
    ],
    "One application runs a daily pipeline with three write actions, producing several jobs. A particular groupBy job has a 300-task scan stage and a 120-task final aggregation stage. Executors run only as many of those tasks simultaneously as slots allow.",
    "Jobs express requested results, stages express shuffle-separated pipelines, and tasks execute those pipelines partition by partition.",
    [{
      title: "Spark execution hierarchy",
      steps: [
        { label: "Application", detail: "Driver plus executors for the program lifetime" },
        { label: "Job", detail: "Computation requested by an action/internal need" },
        { label: "Stage", detail: "Tasks separated from other stages by shuffle dependencies" },
        { label: "Task", detail: "One stage pipeline for one partition" },
        { label: "Attempt", detail: "Retry or speculative execution of a task" },
      ],
    }],
  ),
  "Can you explain jobs, stages, and tasks with an example?": detailedAnswer(
    "Consider reading 200 order partitions, filtering completed orders, grouping revenue by city, and writing 50 output partitions. The write is an action and initiates job execution. Scan, filter, projection, and map-side partial aggregation can pipeline in an upstream stage with about 200 tasks. Grouping requires a shuffle by city; the downstream stage has about 50 tasks that fetch partials, finalize totals, and write output.",
    [
      "Job: the complete dependency work needed by the write action. Depending on physical planning and supporting operations, the UI can show additional jobs, so this is a conceptual primary job.",
      "Stage 1: each of 200 tasks processes one input partition and writes city-keyed partial aggregate shuffle blocks. No task needs all source partitions locally.",
      "Shuffle boundary: downstream city totals depend on output from many upstream partitions, so Spark cannot pipeline the final aggregation into the same task.",
      "Stage 2: each of 50 tasks fetches its city-key bucket from upstream map outputs, merges partial totals, and writes its result partition.",
      "Concurrency: with 40 task slots, stage 1 runs in roughly five waves and stage 2 in roughly two waves. Partition skew can make the actual tail longer.",
      "AQE may coalesce the 50 partitions or split supported skewed work, so final task counts should be read from the executed plan/UI rather than assumed from source code.",
    ],
    "Code shape: `read(200 partitions) → filter/select → groupBy(city).sum(amount) → write(50 shuffle/output partitions)`. The groupBy's Exchange separates two task pipelines and therefore two main stages.",
    "An action creates requested job work, a shuffle divides that work into stages, and each stage runs one task per partition.",
  ),

  "What are narrow and wide transformations?": detailedAnswer(
    "A narrow transformation has child partitions that depend on a limited, known subset of parent partitions, allowing Spark to pipeline work locally without redistributing the entire dataset. A wide transformation has child partitions that depend on records from many parent partitions and therefore normally requires a shuffle to establish the required distribution.",
    [
      "Narrow dependency examples include one-to-one and range dependencies: a filter/map child partition reads its corresponding parent, while coalesce can group several known parents into one child.",
      "Wide dependencies arise when equal keys, global ordering, or a requested repartition must combine records originating anywhere in the parent dataset.",
      "Narrow operations usually remain inside one stage and can be fused into one task iterator/code-generated pipeline. They can still be CPU- or memory-expensive; 'narrow' does not mean cheap.",
      "Wide operations create Exchange/shuffle output, local disk/network I/O, a downstream stage, and failure-recovery dependencies. Map-side combine can shrink data without changing the wide classification.",
      "The physical plan decides actual movement. A high-level join can broadcast one side, reuse existing partitioning, or shuffle both sides; classify the executed dependency rather than only the API name.",
    ],
    "`events.filter(...).select(...)` keeps each record in its existing partition and is narrow. `events.groupBy('customer_id')` must bring all rows for a customer together from many parents and is wide.",
    "Narrow means locally pipelineable partition dependencies; wide means cross-partition distribution and usually a stage boundary.",
    [{
      title: "Partition dependencies",
      steps: [
        { label: "Narrow", detail: "Each child reads a limited parent set" },
        { label: "Pipeline", detail: "Operators can remain within one stage" },
        { label: "Wide", detail: "A child needs records from many parents" },
        { label: "Shuffle", detail: "Records move into compatible buckets" },
        { label: "New stage", detail: "Downstream tasks consume shuffle output" },
      ],
    }],
  ),
  "What are some examples of each?": detailedAnswer(
    "Typical narrow operations are RDD `map`, `filter`, `flatMap`, `mapPartitions`, and many DataFrame `select`/`withColumn` expressions; `union` and no-shuffle `coalesce` also have narrow dependencies. Typical wide operations are `groupByKey`, `reduceByKey`, `distinct`, `repartition`, global `sort`/`orderBy`, and many joins and window operations.",
    [
      "`map` and `filter` preserve the parent-to-child partition relationship even if they change record count or computational cost.",
      "`union` is generally narrow because each output partition corresponds to a partition from one input; it does not need to intermix all parent records.",
      "`coalesce(n)` without shuffle is narrow even though one child can read multiple parents. `repartition(n)` deliberately redistributes records and is wide.",
      "`reduceByKey` is wide because final values for a key must meet, but it combines partial values map-side. `groupByKey` moves the raw values needed for the complete group.",
      "A broadcast hash join avoids shuffling the large side, while sort-merge normally exchanges both inputs. A window with `partitionBy`/`orderBy` usually shuffles and sorts.",
      "Check `explain('formatted')` for `Exchange` and the Spark UI for stage boundaries because Catalyst/AQE can alter the naive classification of high-level structured operations.",
    ],
    "`df.filter(...).withColumn(...)` is a narrow pipeline. `df.repartition('account_id').sortWithinPartitions('event_time')` has one wide repartition followed by local per-partition sorting; `orderBy('event_time')` instead requires a global range distribution.",
    "Examples are useful starting points, but the executed distribution requirement is the authoritative narrow-versus-wide evidence.",
  ),

  "What is lineage in Spark?": detailedAnswer(
    "Lineage is the immutable dependency history that describes how an RDD partition or distributed result can be derived from source data and parent datasets. Spark stores transformation/dependency metadata rather than every intermediate record. That recipe supports lazy scheduling and targeted recomputation when cached data, task output, or executor-local blocks are lost.",
    [
      "RDD lineage contains narrow and shuffle dependencies to parents. `toDebugString` can expose an RDD-oriented view of that chain.",
      "Lineage is not the materialized data itself and is not a backup. Recovery still requires accessible original/checkpoint data and deterministic/repeatable transformations.",
      "A narrow lost partition often needs only corresponding ancestors; a lost shuffle block can require its upstream shuffle-map task or stage output to be regenerated.",
      "Caching preserves lineage and adds reusable blocks. Reliable checkpointing materializes a new parent on durable storage and truncates the earlier recovery chain after completion.",
      "DataFrames have analyzed/optimized/physical plans and eventually RDD/exchange dependencies. 'Lineage' remains a helpful derivation concept, but it should not be confused with every Catalyst planning stage.",
      "Very long iterative lineage increases planning and recovery cost. Selective checkpointing can bound it, while persistence accelerates nearby reuse.",
    ],
    "`raw → parse → validate → keyed aggregate` records how the aggregate derives from raw partitions. If a cached validated partition is lost, Spark recomputes its required raw/parse/validate ancestors; it does not rerun unrelated partitions.",
    "Lineage is Spark's recomputation recipe: dependency metadata, not replicated intermediate data.",
  ),
  "How does lineage provide fault tolerance?": detailedAnswer(
    "When Spark discovers that a required partition or shuffle output is missing, the scheduler follows its dependencies backward to the nearest available parent data, cached block, checkpoint, or durable source and reruns the necessary task chain. Because transformations are immutable and should be deterministic, the recomputed partition should be logically equivalent to the lost one.",
    [
      "Narrow dependencies allow targeted recovery: losing one filtered partition usually requires the corresponding parent partition, not every partition in the dataset.",
      "Shuffle recovery can be broader. If a map output is lost, Spark reruns the producing map task; fetch failures or multiple losses can cause a stage attempt to be resubmitted.",
      "Cached blocks improve recovery speed when they survive but are optional. Replicated persistence can provide another copy before lineage recomputation.",
      "Checkpointing shortens the recovery path by making a durable materialized dataset the new parent, which is valuable for iterative or stateful workloads.",
      "Non-deterministic transformations, changing external sources, and arbitrary side effects weaken replay correctness. Capture stable inputs and design retry-safe outputs.",
    ],
    "An executor holding filtered partition 19 dies. Spark reads source split 19 again and reapplies parse/filter functions. If the lost data was a shuffle block, it reruns the corresponding shuffle-map attempt before the reducer retries its fetch.",
    "Lineage replaces eager replication of every intermediate with deterministic, dependency-directed recomputation.",
  ),
  "How does Spark recover from a failure?": detailedAnswer(
    "Spark classifies the lost work, retries task attempts within configured limits, reschedules them on healthy executors, and reconstructs missing partitions or shuffle output from lineage, surviving blocks, checkpoints, and durable sources. The exact scope can be one task, upstream map outputs, a stage attempt, or the whole application after driver failure. External effects require separate retry-safe design.",
    [
      "Task/executor failure: running attempts fail and are relaunched elsewhere. Cached partitions on the dead executor are read from replicas or recomputed.",
      "Shuffle fetch failure: Spark invalidates unavailable map-output locations and reruns the necessary producers before retrying downstream reduce work.",
      "Straggler: speculative execution can race a duplicate attempt when enabled, but does not repair deterministic skew or code errors.",
      "Structured Streaming restart: a compatible query uses its durable checkpoint to restore source offsets, commit progress, watermark/state-store data, then resumes or replays an incomplete batch.",
      "Driver/application failure: ordinary in-memory scheduling state is lost. Cluster restart policy can resubmit the application, but durable inputs, checkpoints, and idempotent/transactional sinks determine end-to-end recovery.",
      "Repeated deterministic exceptions eventually exceed task/stage retry limits and fail the job. Retrying bad data or broken code is not fault tolerance.",
    ],
    "If a query crashes after writing a database batch but before recording completion, Spark may replay the batch after restart. Lineage/checkpoint protects input progress; an upsert, event key, or transaction prevents the repeated attempt from duplicating business output.",
    "Spark recomputes distributed work, while the application architecture must make sources replayable and side effects safe.",
  ),
};

const CODE_EXAMPLES_4_TO_14: Record<string, InterviewAnswerCodeBlock[]> = {
  "What is an RDD?": [{
    title: "Create, transform and materialize an RDD",
    language: "PySpark",
    code: `numbers = spark.sparkContext.parallelize(range(1, 1_000_001), 100)

# Transformations create new lazy RDD definitions.
even_squares = numbers.filter(lambda value: value % 2 == 0).map(lambda value: value * value)

print("partitions:", even_squares.getNumPartitions())
print("lineage:", even_squares.toDebugString().decode("utf-8"))

# Action: schedules tasks for all required partitions.
total = even_squares.sum()`,
  }],
  "What are the differences among RDDs, DataFrames, and Datasets?": [{
    title: "The same data at different abstraction levels",
    language: "Scala",
    code: `case class Order(id: Long, customerId: Long, amount: BigDecimal)

val orderRdd: RDD[Order] = spark.sparkContext.parallelize(orders)
val orderDataset: Dataset[Order] = orderRdd.toDS()
val orderDataFrame: DataFrame = orderDataset.toDF()

// Structured expression: Catalyst can reason about columns and predicates.
val revenue = orderDataFrame
  .filter($"amount" > 0)
  .groupBy($"customerId")
  .agg(sum($"amount").as("revenue"))

revenue.explain("formatted")`,
  }],
  "What are transformations and actions in Spark?": [{
    title: "Transformations remain lazy until an action",
    language: "PySpark",
    code: `from pyspark.sql import functions as F

# Lazy transformations: no full row computation is requested here.
completed = (
    spark.read.parquet(orders_path)
         .filter(F.col("status") == "COMPLETED")
         .select("customer_id", "amount")
)

# Each action requests materialization.
row_count = completed.count()
completed.write.mode("overwrite").parquet(output_path)

# Without persistence, the two actions can recompute the same lineage.`,
  }],
  "What is lazy evaluation in Spark?": [{
    title: "Inspect the plan before executing it",
    language: "PySpark",
    code: `query = (
    spark.table("orders")
         .select("customer_id", "status", "amount")
         .filter("status = 'COMPLETED'")
         .groupBy("customer_id")
         .sum("amount")
)

# Planning is visible before result rows are computed.
query.explain(mode="extended")

# The action executes the required optimized physical work.
query.write.mode("overwrite").saveAsTable("customer_revenue")`,
  }],
  "What is a DAG in Spark?": [{
    title: "A 500 GB revenue pipeline with a shuffle boundary",
    language: "PySpark",
    code: `from pyspark.sql import functions as F

# Assume this source contains roughly 500 GB of e-commerce orders.
orders = spark.read.parquet("s3://company/orders/")

revenue_by_city = (
    orders
        .filter(F.col("status") == "COMPLETED")
        .groupBy("city")
        .agg(F.sum("amount").alias("total_revenue"))
)

# The physical plan exposes the Exchange that normally separates the
# scan/filter/partial-aggregate stage from the final aggregate stage.
revenue_by_city.explain(mode="formatted")

# The write is an action: it causes Spark to schedule the required DAG.
revenue_by_city.write.mode("overwrite").parquet(
    "s3://company/curated/revenue_by_city/"
)`,
  }],
  "Can you see the DAG in Spark?": [{
    title: "Retain both plan and runtime evidence",
    language: "PySpark / spark-submit",
    code: `query.explain(mode="formatted")
query.explain(mode="cost")

spark-submit \\
  --conf spark.eventLog.enabled=true \\
  --conf spark.eventLog.dir=s3://company-spark-history/ \\
  job.py

# Use the SQL tab for physical operators and the Jobs/Stages tabs
# for the runtime DAG, tasks, shuffle, spill, GC and failures.`,
  }],
  "Can you explain jobs, stages, and tasks with an example?": [{
    title: "One action with a shuffle boundary",
    language: "PySpark",
    code: `from pyspark.sql import functions as F

# Make the groupBy Exchange create 50 shuffle partitions.
spark.conf.set("spark.sql.shuffle.partitions", 50)

result = (
    spark.read.parquet(orders_path)                 # e.g. 200 scan partitions
         .filter(F.col("status") == "COMPLETED")  # narrow pipeline
         .groupBy("city")                          # shuffle by city
         .agg(F.sum("amount").alias("revenue"))
)

result.write.mode("overwrite").parquet(output_path)  # action

# The executed plan/UI—not the comments—contains the authoritative
# job, Exchange, stage and task counts, especially when AQE is enabled.`,
  }],
  "What are narrow and wide transformations?": [{
    title: "Compare a narrow pipeline with a wide dependency",
    language: "PySpark",
    code: `from pyspark.sql import functions as F

# filter/select are commonly pipelined without redistribution.
narrow = events.filter(F.col("valid")).select("customer_id", "amount")

# groupBy requires equal customer IDs to meet across parent partitions.
wide = narrow.groupBy("customer_id").agg(F.sum("amount").alias("total"))

wide.explain(mode="formatted")
# The Exchange marks the physical wide dependency and stage boundary.`,
  }],
  "What is lineage in Spark?": [{
    title: "Inspect lineage and create a durable recovery boundary",
    language: "PySpark",
    code: `sc = spark.sparkContext
sc.setCheckpointDir("s3://company-spark-checkpoints/batch/")

raw = sc.textFile(input_path)
parsed = raw.map(parse_event).filter(lambda event: event.is_valid)

print(parsed.toDebugString().decode("utf-8"))

parsed.persist()
parsed.checkpoint()
parsed.count()  # materializes both persistence and checkpoint

# After reliable checkpoint completion, recovery can start from the
# checkpointed data instead of the complete earlier lineage.`,
  }],
};

for (const [question, codeBlocks] of Object.entries(CODE_EXAMPLES_4_TO_14)) {
  const answer = SPARK_INTERVIEW_ANSWERS_4_TO_14[question];
  if (answer) SPARK_INTERVIEW_ANSWERS_4_TO_14[question] = { ...answer, codeBlocks };
}
