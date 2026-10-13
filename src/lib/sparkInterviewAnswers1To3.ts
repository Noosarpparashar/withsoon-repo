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

export const SPARK_INTERVIEW_ANSWERS_1_TO_3: Record<string, InterviewAnswer> = {
  "What is Apache Spark?": detailedAnswer(
    "Apache Spark is a distributed computation engine for processing large datasets across a cluster. It supports batch processing, SQL and DataFrames, Structured Streaming, machine-learning workflows, and graph-oriented computation through a shared execution architecture. A driver coordinates an application, executors process data partitions in parallel, and an external cluster manager supplies resources. Spark is primarily an execution engine, not a permanent storage system.",
    [
      "Spark reads from and writes to systems such as HDFS, S3/ADLS/GCS, Kafka, JDBC databases, and lakehouse tables. Data durability normally belongs to those systems rather than executor memory.",
      "Its core abstraction began with RDDs—immutable partitioned collections with lineage. Modern production pipelines usually use Spark SQL, DataFrames, and Datasets so Catalyst can optimize relational expressions.",
      "Transformations are lazy. An action or streaming trigger causes Spark to optimize the required plan, form jobs and stages, and schedule one task per relevant partition.",
      "Performance comes from a combination of DAG execution, pipelining, reduced intermediate materialization, caching when reuse exists, compact binary/columnar processing, code generation, source pushdown, and adaptive execution—not simply 'keeping all data in RAM.'",
      "Fault tolerance comes from deterministic lineage, task/stage retry, reconstruction of lost partitions or shuffle outputs, durable input, and checkpointing where recovery state must survive application failure.",
      "Spark still has expensive operations: shuffles use network and local disk, skew creates stragglers, large state can OOM, and poorly chosen partitions or joins can make it slower than a simpler engine.",
    ],
    "A retailer can use one Spark application to read partitioned orders from object storage, join reference data, calculate daily revenue, and write an Iceberg/Delta table. A separate Structured Streaming application can continuously transform Kafka order events using the same DataFrame engine.",
    "Spark is a unified distributed execution engine: it coordinates parallel work over external data while exposing both low-level and optimizer-driven APIs.",
    [{
      title: "Spark control and data paths",
      relationships: [
        { from: "Driver", to: "Cluster manager", label: "Requests CPU and memory resources", direction: "both" },
        { from: "Cluster manager", to: "Executors", label: "Launches and manages worker processes" },
        { from: "Driver", to: "Executors", label: "Sends tasks; receives status and small results", direction: "both" },
        { from: "Executors", to: "Sources and sinks", label: "Read and write distributed data partitions", direction: "both" },
        { from: "Executor partitions", to: "Executor partitions", label: "Exchange shuffle blocks across the data plane", direction: "both" },
      ],
      note: "The driver coordinates work; it is not the normal path for the dataset. Executors read, shuffle, process, and write distributed data.",
    }],
  ),
  "How is Spark different from Hadoop MapReduce?": detailedAnswer(
    "Spark and Hadoop MapReduce are both distributed processing engines, but their execution models differ. MapReduce organizes computation into separate map and reduce jobs that commonly materialize intermediate results to distributed storage between jobs. Spark represents a multi-step computation as a DAG, pipelines narrow operators within stages, shuffles only at required distribution boundaries, and can persist reusable intermediates in memory or on disk. Spark also exposes richer SQL, streaming, ML, and graph APIs.",
    [
      "Do not compare Spark with all of Hadoop. Hadoop includes HDFS, YARN, MapReduce, and ecosystem projects. Spark can run on YARN and process data stored in HDFS, so it can complement Hadoop infrastructure.",
      "MapReduce's programming model centers on map, shuffle, and reduce phases. Complex workflows become chains of jobs, often with durable intermediate reads/writes between them.",
      "Spark supports arbitrary DAGs of stages, so multiple filters/maps can be pipelined and a workflow can express joins, aggregations, windows, iteration, and branching without forcing every step into a separate MapReduce job.",
      "Spark persistence is optional and storage-level controlled. If data is used once, Spark can stream it through a pipeline; if reused, it may cache partitions. Shuffle and spill still use disk, so Spark is not a disk-free engine.",
      "Spark's structured engine adds Catalyst planning, column pruning, predicate pushdown, vectorized/columnar execution paths, code generation, join strategy selection, and AQE. Classic MapReduce does not provide the same integrated relational optimizer.",
      "MapReduce can remain suitable for simple, throughput-oriented, disk-heavy batch jobs where latency is unimportant and operational infrastructure already exists. Engine choice should follow workload and platform, not branding.",
    ],
    "An iterative algorithm with 20 rounds may cause a MapReduce implementation to write and reread each round's state from HDFS. Spark can retain an appropriately sized state dataset across iterations and execute each round through DAG stages, reducing repeated durable I/O.",
    "MapReduce is a rigid durable map/reduce job model; Spark is a general DAG engine with optional reuse and an optimized structured runtime.",
  ),
  "Why is Spark faster than Hadoop MapReduce?": detailedAnswer(
    "Spark is often faster—especially for iterative, interactive, and multi-stage workloads—because it avoids mandatory distributed-filesystem materialization between every logical step, pipelines compatible transformations, retains reused data when requested, and optimizes structured queries as a whole. The advantage is architectural rather than a blanket guarantee: both engines can read disk, shuffle data, spill, and suffer from skew or insufficient resources.",
    [
      "DAG scheduling combines many operations into a smaller set of stages separated by true shuffle dependencies instead of forcing every transformation into an independent map/reduce job.",
      "Pipeline execution lets one task scan a partition and apply multiple filters, projections, and expressions without writing every intermediate dataset to durable storage.",
      "Persistence accelerates repeated use in iterative algorithms and interactive analysis. Spark stores only selected datasets and can use memory-and-disk levels; it does not automatically cache every transformation.",
      "Catalyst reduces work through pruning, pushdown, simplification, statistics-informed join planning, and AQE. Tungsten-style binary rows, columnar batches, and whole-stage code generation reduce JVM object and function-call overhead.",
      "Long-lived executors avoid the full startup cost of a new independent engine job for every small step, while local shuffle files and block management support efficient stage exchange and reuse.",
      "Spark can still be slower when a query has excessive shuffle, tiny files, Python/UDF boundaries, poor partitioning, unsafe caching, or memory pressure. A simple one-pass MapReduce job may show a much smaller gap than an iterative pipeline.",
    ],
    "A chain of filter → join → aggregation → another join can be planned as a Spark DAG with pipelined narrow work and only necessary Exchanges. A classic MapReduce workflow commonly requires multiple jobs and durable intermediate output between those phases.",
    "Spark's speed comes from reducing materialization and optimizing the complete execution path—not from an assumption that the entire dataset fits in memory.",
  ),

  "What is Spark's architecture?": detailedAnswer(
    "A Spark application uses a driver–executor architecture coordinated with a cluster manager. The driver runs the application control plane: it owns `SparkContext`, evaluates user control flow, plans work, creates jobs/stages/tasks, and tracks execution. The cluster manager allocates processes and resources. Application-specific executors run tasks over partitions, manage memory and cached/shuffle blocks, and communicate status and results back to the driver.",
    [
      "Driver internals include scheduling and coordination components such as the DAG Scheduler, Task Scheduler, scheduler backend, RPC environment, listener/event infrastructure, broadcast coordination, and block-location metadata.",
      "Executors are long-lived worker processes for one Spark application. Each has task threads/slots, a BlockManager, execution/storage memory, shuffle machinery, and language workers such as Python processes where required.",
      "The application requests executor count, cores, and memory through static configuration or dynamic allocation. The cluster manager—Standalone, YARN, or Kubernetes in common deployments—admits the request, grants available resources, chooses placements, launches the processes, and enforces the granted limits. It does not optimize a DataFrame or divide a join into stages.",
      "Tasks read partitions from external storage or shuffle, pipeline operators, produce shuffle blocks or sink output, and report heartbeats/metrics. Executors normally do not communicate business results directly with each other; shuffle blocks are fetched through Spark's data-transfer mechanisms.",
      "The driver is logically central even when physically inside the cluster. Its loss normally terminates that application attempt because executors do not elect a replacement driver from among themselves.",
      "An application can use dynamic allocation to add/remove executors. Driver planning metadata, executor memory, network/shuffle storage, and source/sink capacity are different scaling constraints.",
    ],
    "On Kubernetes in cluster mode, a driver pod requests ten executor pods. The driver plans a 400-task scan stage; executor pods run available tasks in waves, write shuffle blocks locally, and later fetch the required blocks for the reduce stage.",
    "The driver owns application intelligence, executors own distributed task execution, and the cluster manager owns resource lifecycle.",
    [{
      title: "Spark application relationships",
      relationships: [
        { from: "Submission client", to: "Driver", label: "Submits the application; hosts the driver in client mode" },
        { from: "Driver", to: "Cluster manager", label: "Negotiates executor resources", direction: "both" },
        { from: "Cluster manager", to: "Executors", label: "Launches, monitors, and removes processes" },
        { from: "Driver", to: "Executors", label: "Schedules tasks; receives heartbeats, metrics, and results", direction: "both" },
        { from: "Executors", to: "External data systems", label: "Read input partitions and commit distributed output", direction: "both" },
        { from: "Executor", to: "Executor", label: "Fetches shuffle blocks required by downstream tasks", direction: "both" },
      ],
      note: "Resource allocation, task coordination, and distributed data movement are separate paths. The cluster manager does not process rows, and the driver normally does not carry the full dataset.",
    }],
  ),
  "What are the responsibilities of the Driver, Executors, and Cluster Manager?": detailedAnswer(
    "The driver coordinates one Spark application, executors perform its distributed computation, and the cluster manager provisions and monitors resources. Separating these responsibilities is essential for diagnosing failures: driver OOM affects planning/control, executor OOM affects task partitions, and cluster-manager rejection means resources were not allocated as requested.",
    [
      "Driver: runs the main program, creates `SparkSession`/`SparkContext`, builds/analyzes work, owns DAG and task schedulers, tracks shuffle-map locations, distributes closures/broadcasts, and aggregates small task results and metrics.",
      "The driver must not collect large datasets. It holds plans, task/stage metadata, file listings, broadcast preparation state, and user-side objects, so millions of files/tasks or a large `collect` can exhaust it.",
      "Executors: deserialize and execute tasks, scan source partitions, build joins/aggregates, write/fetch shuffle blocks, cache persisted partitions, run JVM/Python code, and send heartbeats, accumulator updates, metrics, and bounded results.",
      "Executor loss is usually recoverable through task retry and lineage, though cached and shuffle data may need reconstruction. Executors are not a durable database and normally belong to only one Spark application.",
      "Cluster manager: admits applications, grants available resources, selects nodes, launches/terminates containers or pods, enforces the granted cores/memory/resources, and may restart the driver according to deployment policy. It does not choose the application's desired executor shape or understand Spark's operator DAG.",
      "Supporting systems still matter: object/HDFS storage holds data, history/event-log storage preserves UI evidence, and table/catalog/checkpoint systems provide metadata and recovery beyond executor lifetime.",
    ],
    "If one executor exceeds its container memory, the cluster manager kills that process and the driver reschedules its tasks. If the driver itself exhausts memory while listing files, executors cannot continue because the scheduling/control plane has disappeared.",
    "Driver = coordinate, executors = compute, cluster manager = allocate; tune and recover each according to its actual role.",
  ),
  "Where does each Spark component run?": detailedAnswer(
    "Component location depends mainly on deploy mode and cluster manager. In client mode, the driver runs in the submitting process—often a gateway, notebook, or developer machine—while executors run on allocated worker nodes. In cluster mode, the cluster manager launches the driver inside the managed cluster and then allocates executors. Cluster-manager control services run according to Standalone, YARN, or Kubernetes architecture.",
    [
      "Client mode keeps the submission process attached to the driver. That host must remain alive, network-reachable from executors, and sized for driver memory/CPU; it is convenient for shells and interactive development.",
      "Cluster mode places driver lifecycle under the cluster platform, which is normally preferable for production jobs. Logs and UI access then come through cluster tooling, services, or proxies.",
      "On YARN cluster mode, the driver runs within the ApplicationMaster process/container; executors run in YARN containers on NodeManagers. In client mode the ApplicationMaster coordinates resources while the driver stays with the client.",
      "On Kubernetes cluster mode, the driver runs in a driver pod and creates/requests executor pods through the Kubernetes API. Spark's driver is distinct from Kubernetes control-plane components.",
      "In Standalone cluster mode, a worker launches the driver process while Standalone master/workers manage resource offers; executor JVMs run on workers.",
      "The Spark UI and application scheduler live with the driver. Cached data, task working memory, Python workers, and local shuffle files live with executors/nodes; durable tables and checkpoints live externally.",
    ],
    "A notebook using client mode may run the driver on an edge node and executors on YARN workers. Closing or disconnecting that notebook process can kill the application even though all executor machines remain healthy.",
    "Client versus cluster mode determines driver placement; executors always run in cluster-allocated worker resources.",
  ),
  "What happens if the Driver fails?": detailedAnswer(
    "A driver failure normally ends the current Spark application attempt because the driver owns scheduling state, job/stage progress, executor registrations, and user control flow. Executors cannot elect a new driver or continue independently. A cluster platform may relaunch the application/driver according to its supervision or retry policy, but meaningful recovery depends on durable sources, compatible checkpoints, and retry-safe outputs.",
    [
      "In client mode, losing the client host/process or its network reachability usually terminates the application. Cluster mode gives the platform more control over relaunch, but does not replicate arbitrary in-memory driver state.",
      "Batch jobs generally restart from the application entry point. They may reuse already committed durable outputs if the pipeline is partitioned/idempotent, but caches and ordinary executor state from the failed attempt are not a recovery contract.",
      "Structured Streaming can reconstruct source offsets, completed batch commits, watermark/state-store data, and query metadata from a durable checkpoint when restarted with a compatible query and checkpoint location.",
      "If the sink committed output immediately before the driver crashed but the checkpoint/commit marker did not advance, the work can replay. The sink must use atomic commits, batch IDs, event keys, or idempotent upserts.",
      "Cluster-manager high availability is not Spark application-driver high availability. HA masters/resource managers can keep allocating resources even though a particular application driver was lost.",
      "Prevent driver failures by bounding `collect`/`toPandas`, file/task metadata, broadcast construction, and event/result size; preserve event logs and use platform restart policies appropriate to the workload.",
    ],
    "A streaming driver dies after writing batch 420 but before recording completion. Kubernetes restarts the application; Spark loads checkpoint progress and may rerun batch 420. An atomic table commit or batch-ID-aware database transaction prevents duplicate effects.",
    "Driver restart restores an application only from durable contracts; executors and lineage cannot reconstruct the lost control plane by themselves.",
  ),

  "What happens internally when you call spark-submit?": detailedAnswer(
    "`spark-submit` is Spark's application launcher. It parses master/deploy/resource/configuration options, resolves the application artifact and dependencies, constructs the appropriate launch command, and either starts the driver locally or asks the cluster manager to start it. The driver runs the user entry point, creates `SparkContext`, registers the application, requests executors, distributes dependencies, and begins scheduling jobs only when user code reaches actions or streaming triggers.",
    [
      "1. Submission script: `spark-submit` prepares the classpath, JVM options, Spark properties, application arguments, JARs, Python files, packages, files, and archives. It then invokes the `org.apache.spark.deploy.SparkSubmit` entry point.",
      "2. Argument resolution: `SparkSubmit` validates `--master`, `--deploy-mode`, the main class or Python file, application resources, dependencies, and `--conf` values. Configuration precedence still applies across command-line flags, properties files, and programmatic settings.",
      "3. Driver launch: in client mode, the submission process hosts the driver. In cluster mode, YARN, Kubernetes, or Spark Standalone launches the driver inside a managed container, pod, or worker process.",
      "4. Application initialization: the user `main` method or Python entry point runs. `SparkSession.builder.getOrCreate()` creates or obtains `SparkContext` and initializes the RPC environment, DAG Scheduler, Task Scheduler, BlockManager master, listeners, metrics, security, and scheduler backend.",
      "5. Resource request: the driver/application asks the cluster manager for the configured executor instances, cores, heap, memory overhead, and any custom resources. Dynamic allocation may change the executor count later.",
      "6. Executor startup: the cluster manager launches executor JVMs. Each executor initializes its task thread pool, BlockManager, memory manager, and executor-side shuffle manager; localizes application dependencies; registers with the driver; and begins sending heartbeats. If an external shuffle service is enabled, the executor also registers with that node-level service, such as the YARN NodeManager auxiliary service or Spark Standalone worker service—the service is not created inside each executor.",
      "7. Lazy program phase: transformations build RDD lineage or DataFrame logical plans. Spark may list files or inspect metadata, but defining a transformation does not yet schedule the complete distributed row computation.",
      "8. Action and planning: an action such as `count`, `write`, or a streaming trigger requests a result. Catalyst analyzes and optimizes structured queries and selects a physical plan.",
      "9. Stage creation: the DAG Scheduler traces dependencies, cuts the job at shuffle boundaries, creates stages, and creates approximately one task per partition for each stage.",
      "10. Task scheduling: the Task Scheduler serializes tasks and closures, applies locality and failure policies, and assigns task attempts to available executor resource offers.",
      "11. Executor runtime: executors deserialize tasks, read source or shuffle partitions, execute operator pipelines, spill when necessary, write and fetch shuffle blocks, update metrics, and return bounded results or commit distributed output.",
      "12. Completion and shutdown: after success or failure, `SparkContext` stops, executors are released, the live UI ends, event logs remain when enabled, and the submission command reports final status according to the deployment platform.",
    ],
    "Running `spark-submit --master yarn --deploy-mode cluster --executor-memory 8g jobs.py` uploads/localizes the application, asks YARN to launch the driver/ApplicationMaster, obtains executor containers, and runs user code. Only the first action turns the lazy pipeline into scheduled stages and tasks.",
    "`spark-submit` launches and configures the application control plane; actions inside that application launch distributed data-processing work.",
    [{
      title: "spark-submit lifecycle",
      steps: [
        { label: "Parse submission", detail: "Master, deploy mode, resources and artifacts" },
        { label: "Launch driver", detail: "Client process or cluster-managed container/pod" },
        { label: "Create SparkContext", detail: "Initialize RPC, schedulers and application" },
        { label: "Launch executors", detail: "Register workers and localize dependencies" },
        { label: "Action schedules work", detail: "Plans become jobs, stages and tasks" },
        { label: "Shutdown", detail: "Release resources and preserve event logs" },
      ],
    }],
  ),
};

const CODE_EXAMPLES_1_TO_3: Record<string, InterviewAnswerCodeBlock[]> = {
  "What is Apache Spark?": [{
    title: "A structured Spark application",
    language: "PySpark",
    code: `from pyspark.sql import SparkSession, functions as F

spark = SparkSession.builder.appName("daily-revenue").getOrCreate()

revenue = (
    spark.read.parquet("s3://company/orders/")
         .filter(F.col("status") == "COMPLETED")
         .groupBy("order_date", "country")
         .agg(F.sum("amount").alias("revenue"))
)

revenue.explain(mode="formatted")
revenue.write.mode("overwrite").partitionBy("order_date").parquet(
    "s3://company/curated/daily_revenue/"
)

spark.stop()`,
  }],
  "Where does each Spark component run?": [{
    title: "Client mode versus cluster mode",
    language: "spark-submit",
    code: `# Driver stays in the submitting process/host.
spark-submit \\
  --master yarn \\
  --deploy-mode client \\
  job.py

# Driver runs in a cluster-managed container; normal production choice.
spark-submit \\
  --master yarn \\
  --deploy-mode cluster \\
  job.py

# In both cases, executors run in worker resources allocated by YARN.`,
  }],
  "What happens internally when you call spark-submit?": [{
    title: "Submit a Scala or Java application with explicit resources",
    language: "spark-submit",
    code: `spark-submit \\
  --master yarn \\
  --deploy-mode cluster \\
  --name orders-curation \\
  --class com.company.jobs.OrdersCurate \\
  --executor-instances 10 \\
  --executor-cores 4 \\
  --executor-memory 8g \\
  --conf spark.executor.memoryOverhead=2g \\
  --conf spark.sql.adaptive.enabled=true \\
  --conf spark.eventLog.enabled=true \\
  orders-curation.jar \\
  --processing-date 2026-10-10

# Submission launches the driver/application. Distributed stages begin only
# when the program reaches an action or streaming trigger.`,
  }, {
    title: "Transformations remain lazy until an action",
    language: "Scala",
    code: `val df = spark.read.parquet("s3://company/orders/")
val filtered = df.filter($"status" === "COMPLETED")

// A logical plan exists, but the complete row computation has not run.
filtered.explain("formatted")

// This action creates executable job, stage, and task work.
val completedOrderCount = filtered.count()`,
  }],
};

for (const [question, codeBlocks] of Object.entries(CODE_EXAMPLES_1_TO_3)) {
  const answer = SPARK_INTERVIEW_ANSWERS_1_TO_3[question];
  if (answer) SPARK_INTERVIEW_ANSWERS_1_TO_3[question] = { ...answer, codeBlocks };
}
