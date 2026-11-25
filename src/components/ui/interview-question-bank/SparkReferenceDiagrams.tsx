import Image from "next/image";

type Step = { title: string; detail?: string; items?: string[]; tone?: "amber" | "green" };
type Flow = { title: string; steps: Step[]; caption: string };

const flows: Record<string, Flow> = {
  "missing-data-checkpoints": {
    title: "Measure quality before data reaches consumers",
    steps: [
      {title: "Raw ingestion", detail: "Record population size, source completeness, schema, and parse failures"},
      {title: "Transformation / enrichment", detail: "Measure NULL/blank/NaN changes and reconcile join/filter effects", tone: "amber"},
      {title: "Curated candidate + quality gate", detail: "Apply versioned thresholds; release, quarantine, or block according to severity", tone: "green"},
      {title: "Metrics history + operations", detail: "Store counts, denominators, run/batch IDs, and rule versions; monitor trends and notify owners"},
    ],
    caption: "Checkpoint here means a measurement point, not Spark RDD/DataFrame checkpoint(). Compare equivalent populations and enforce critical gates before publication.",
  },
  "sql-udf-registration": {
    title: "Make custom logic callable from Spark SQL",
    steps: [
      {title: "Define the implementation", detail: "Python function or an existing supported UDF; declare compatible output types"},
      {title: "Register a session SQL name", detail: "spark.udf.register associates the name with the function", tone: "amber"},
      {title: "Use the name in a query", detail: "SELECT classify_salary(salary) FROM employees"},
      {title: "Execute through the UDF runtime", detail: "An action triggers processing; Python functions still run through Python UDF execution", tone: "green"},
    ],
    caption: "Registration and view creation provide names, not cached results or a conversion to native SQL logic. Session registration is distinct from permanent catalog-function creation.",
  },
  "arrow-pandas-transfer": {
    title: "Arrow carries batches through a Pandas UDF",
    steps: [
      {title: "Executor JVM", detail: "Input columns from Spark partitions"},
      {title: "Arrow batch interchange", detail: "Prepare compatible columnar batches and transfer to Python", tone: "amber"},
      {title: "Python worker", detail: "Expose Arrow data as pandas Series / DataFrames where required"},
      {title: "Pandas UDF computation", detail: "Execute user-defined batch logic; vectorization depends on the body", tone: "amber"},
      {title: "Arrow results → executor JVM", detail: "Return compatible values and continue Spark processing", tone: "green"},
    ],
    caption: "Conceptual Series-to-Series path. Conversion and copying depend on data types and execution support; Arrow interchange is not an end-to-end zero-copy guarantee.",
  },
  "schema-on-read-flow": {
    title: "Schema-on-read: store first, interpret when consumed",
    steps: [
      {title: "Raw source", detail: "JSON / CSV / logs / events"},
      {title: "Store original payload", detail: "S3 / HDFS or a raw ingestion layer"},
      {title: "Apply a reader schema", detail: "Parse, interpret, and validate required fields", tone: "amber"},
      {title: "Transform and analyze", detail: "Readers use the interpretation appropriate to their contract", tone: "green"},
    ],
    caption: "Conceptual enforcement boundary. An explicit read schema is compatible with schema-on-read; stored files or a raw-event envelope may already have their own schema.",
  },
  "schema-on-write-flow": {
    title: "Schema-on-write: validate before target acceptance",
    steps: [
      {title: "Incoming data", detail: "JSON / CSV / events"},
      {title: "Validate against the target contract", detail: "Convert types where valid; check constraints and business rules", tone: "amber"},
      {title: "Write compatible structured data", detail: "Iceberg / Delta / warehouse; reject or quarantine invalid input", tone: "green"},
      {title: "Query curated data", detail: "Consumers rely on the agreed target schema", tone: "green"},
    ],
    caption: "Validation must actually be implemented and enforced. Table-schema compatibility alone does not validate every business rule or guarantee a faster query.",
  },
  "schema-read-write-layers": {
    title: "Use both approaches within one pipeline",
    steps: [
      {title: "Source systems", detail: "Kafka / CDC / APIs / files, through appropriate integrations"},
      {title: "Bronze — raw payload retention", detail: "Flexible payload interpretation; preserve source and version metadata"},
      {title: "Silver — validated target schema", detail: "Normalize fields, check types and quality, enforce the write contract", tone: "amber"},
      {title: "Gold — business-ready data", detail: "Stable, governed analytical schemas and quality requirements", tone: "green"},
    ],
    caption: "Illustrative architecture, not a fixed rule for every medallion layer. A Bronze table can enforce an envelope schema while preserving an evolving raw payload inside it.",
  },
  "jdbc-predicate-pushdown": {
    title:"Let the source database filter rows",
    steps:[
      {title:"Spark DataFrame filter",detail:"salary > 50000"},
      {title:"Catalyst Optimizer",detail:"Identify predicates eligible for pushdown",tone:"amber"},
      {title:"JDBC connector",detail:"Translate supported predicates into SQL WHERE clauses using the database dialect"},
      {title:"Source database",detail:"Execute the SQL query and filter records using the database's chosen access path"},
      {title:"Spark executors",detail:"Receive and process the returned matching records",tone:"green"},
    ],
    caption:"Conceptual execution after an action triggers the read. The database may choose an index or a scan. Connector dialect and predicate support determine what is pushed; parallel JDBC reads may issue multiple queries containing partition conditions and pushed filters.",
  },
  "nested-schema-pruning": {
    title:"Read only the required nested fields",
    steps:[
      {title:"Original Parquet schema",detail:"employee_id, name, address (city, state, country, pincode), salary"},
      {title:"Catalyst column pruning",detail:"Identify the fields referenced by the query",tone:"amber"},
      {title:"Required schema",items:["employee_id","address.city"],detail:"Unused address fields, name, and salary are omitted",tone:"green"},
      {title:"Parquet reader",detail:"Read only supported required nested fields",tone:"green"},
    ],
    caption:"Conceptual projection for the employee example. Physical pruning depends on the reader and query expression. Check ReadSchema to confirm that the scan requests address.city rather than the full address struct.",
  },
  "pruning-and-pushdown-flow": {
    title:"Apply both optimizations",
    steps:[
      {title:"Spark SQL query",detail:"year = 2026 AND month = 1 AND amount > 10000"},
      {title:"Partition pruning",detail:"Skip directories for other years and months",tone:"amber"},
      {title:"Predicate pushdown",detail:"Pass the amount filter to the reader; skip irrelevant row groups when possible",tone:"green"},
      {title:"Process remaining data",detail:"Evaluate required filters and produce the result",tone:"green"},
    ],
    caption:"Conceptual scan reduction, not Spark stage boundaries. Partition pruning selects storage partitions; pushed predicates may reduce reads within selected files. Actual savings depend on metadata, source capabilities, and layout.",
  },
  "join-order-orders-first": {
    title:"Plan A: Orders and Customers first",
    steps:[
      {title:"Orders (100M) + Customers (10M)",detail:"Join on customer_id"},
      {title:"Potentially large intermediate",detail:"Approximately 100M rows if every order matches exactly one customer",tone:"amber"},
      {title:"Join filtered Countries",detail:"Retain orders for customers whose country matches India"},
      {title:"Final result",tone:"green"},
    ],
    caption:"Conceptual logical join order. Filtering the Countries input can be pushed down in either plan; the difference is when its selectivity reduces the large intermediate.",
  },
  "join-order-selective-first": {
    title:"Plan B: Selective country join first",
    steps:[
      {title:"Customers (10M) + filtered Countries",detail:"Restrict to customers in India"},
      {title:"Filtered Customers",detail:"Approximately 1M customers if 10% match",tone:"green"},
      {title:"Join Orders (100M)",detail:"Use the smaller customer-side intermediate"},
      {title:"Final result",tone:"green"},
    ],
    caption:"Illustrative assumptions, not guaranteed cardinalities or speedup. Customer key uniqueness, country selectivity, data layout, and physical strategies affect the actual result and cost.",
  },
  "join-reordering-process": {
    title:"Statistics-driven join enumeration",
    steps:[
      {title:"1. Collect useful statistics",detail:"Table sizes, row counts, and relevant column statistics"},
      {title:"2. Consider eligible join orders",detail:"Compare alternative logical join trees"},
      {title:"3. Estimate costs",detail:"Estimate intermediate cardinalities and data sizes",tone:"amber"},
      {title:"4. Select a lower-cost join order",detail:"Produce the optimized logical plan",tone:"green"},
    ],
    caption:"Spark uses bounded dynamic-programming-based enumeration for eligible joins. It does not simply join the smallest table first or guarantee a globally optimal plan. Physical join algorithms are selected separately.",
  },
  "explain-plan-views": {
    title:"Four views from EXPLAIN EXTENDED",
    steps:[
      {title:"Parsed logical plan",detail:"What was requested"},
      {title:"Analyzed logical plan",detail:"Resolved tables, columns, functions, and types"},
      {title:"Optimized logical plan",detail:"What Catalyst simplified and optimized",tone:"amber"},
      {title:"Physical plan",detail:"How Spark plans to execute the query",tone:"green"},
    ],
    caption:"These are planning representations, not Spark execution stages. EXPLAIN does not provide all runtime measurements; use the SQL UI and final adaptive plan after an action for observed execution behavior.",
  },
  "cpu-memory-hierarchy": {
    title:"Conceptual CPU memory hierarchy",
    steps:[
      {title:"CPU registers",detail:"Very fast, very small",tone:"green"},
      {title:"L1 cache",detail:"Small cache close to the core",tone:"green"},
      {title:"L2 cache",detail:"Additional cache capacity"},
      {title:"L3 cache",detail:"Larger cache, often shared across cores"},
      {title:"Main memory (RAM)",detail:"Much larger, typically higher access latency",tone:"amber"},
    ],
    caption:"Conceptual hierarchy, not a Spark data-flow diagram. Cache sizes, topology, and latency vary by processor. Locality reduces pointer chasing and helps avoid stalls on memory access; CPU caches differ from Spark's dataset cache.",
  },
  "tungsten-generic-operators": {
    title:"Conceptual operator pipeline",
    steps:[
      {title:"Scan",detail:"Read input records"},
      {title:"Filter",detail:"Evaluate the row condition"},
      {title:"Project",detail:"Select or compute output values"},
      {title:"Aggregate",detail:"Update aggregation state",tone:"green"},
    ],
    caption:"Separate generic operator calls can add overhead per record. Whole-stage code generation can fuse compatible operators into generated regions. This is an operator sketch, not a complete physical plan or a guarantee that every aggregation fits in one region.",
  },
  "tungsten-architecture": {
    title:"Catalyst planning and Tungsten execution techniques",
    steps:[
      {title:"SQL query / DataFrame API",detail:"User-defined structured operations"},
      {title:"Catalyst",detail:"Analysis → Logical optimization → Physical planning",tone:"amber"},
      {title:"Tungsten execution optimizations",items:["Compact binary data","Cache-aware computation","Code generation / fused operators"],detail:"Reduce memory overhead and CPU cost for supported operations",tone:"green"},
      {title:"Distributed execution",detail:"Spark tasks run on executors",tone:"green"},
    ],
    caption:"Conceptual responsibilities, not separate engines. Tungsten techniques are integrated into Spark's execution runtime; they do not require all data to be off-heap or fuse the entire job into one function.",
  },
  "four-query-plans": {
    title:"Four query-plan representations",
    steps:[
      {title:"SQL query / DataFrame operations",detail:"Describe the requested computation"},
      {title:"1. Unresolved logical plan",detail:"Represent the query structure before references are fully resolved"},
      {title:"2. Analyzed logical plan",detail:"Resolve relations, attributes, functions, and types; validate semantics"},
      {title:"3. Optimized logical plan",detail:"Simplify expressions, prune columns, and move eligible filters",tone:"amber"},
      {title:"4. Physical plan",detail:"Select executable scans, joins, aggregates, sorts, and exchanges",tone:"green"},
      {title:"Spark execution engine",detail:"An action triggers jobs, stages, and tasks scheduled on executors",tone:"green"},
    ],
    caption:"Planning phases are distinct from execution stages. SQL parsing creates an initial plan; DataFrame APIs can construct plans programmatically. AQE may update eligible physical decisions during execution.",
  },
  "catalyst-global-optimization": {
    title:"Optimize the complete query",
    steps:[
      {title:"Read required columns",items:["name","salary"],detail:"Prune unused department data where supported"},
      {title:"Filter salary > 100000",detail:"Push supported filtering toward the data source",tone:"amber"},
      {title:"Select name",detail:"Return only the requested output column",tone:"green"},
    ],
    caption:"Conceptual optimized flow, not a stage diagram. Salary is needed to evaluate the filter even though it is absent from the output. Source-level pushdown and data skipping depend on scan capabilities and metadata.",
  },
  "catalyst-query-lifecycle": {
    title:"Catalyst query-compilation lifecycle",
    steps:[
      {title:"SQL query / DataFrame API",detail:"User-defined structured transformations"},
      {title:"1. Parsing / plan construction",detail:"SQL is parsed; DataFrame expressions construct an initial logical plan"},
      {title:"2. Analysis",detail:"Resolve relations, columns, functions, and types using metadata"},
      {title:"3. Logical optimization",detail:"Rewrite the analyzed plan with applicable rules and statistics",tone:"amber"},
      {title:"4. Physical planning",detail:"Select executable operators and strategies",tone:"green"},
      {title:"Code generation and execution",detail:"Generate code for supported operators; Spark schedules tasks across executors",tone:"green"},
    ],
    caption:"These are query-compilation phases, not Spark job stages. Catalyst plans the work; actions trigger distributed execution. AQE may revise eligible physical decisions using runtime statistics.",
  },
  "spark-sql-execution": {
    title:"From structured query to distributed execution",
    steps:[
      {title:"SQL query / DataFrame / Dataset API",detail:"Express the structured-data computation"},
      {title:"Catalyst",detail:"Analysis → Logical optimization → Physical planning",tone:"amber"},
      {title:"Optimized physical execution plan",detail:"Whole-stage code generation and Tungsten optimizations where applicable",tone:"green"},
      {title:"Spark executors",detail:"Execute distributed tasks across partitions",tone:"green"},
    ],
    caption:"Conceptual flow. SQL text is parsed before analysis; DataFrame APIs construct logical plans programmatically. Actions trigger execution, scheduling coordinates tasks, and AQE can revise supported plan decisions at runtime.",
  },
  "expensive-pipeline-checkpoint": {
    title:"Checkpoint after expensive upstream work",
    steps:[
      {title:"Read 500 GB",detail:"Load the required source data"},
      {title:"Complex joins",detail:"Execute costly upstream processing"},
      {title:"Aggregations",detail:"Compute the reusable intermediate result"},
      {title:"Reliable checkpoint",detail:"Materialize data to the configured reliable filesystem",tone:"amber"},
      {title:"Further transformations",detail:"Recover required upstream data from the checkpoint instead of repeating joins and aggregations",tone:"green"},
    ],
    caption:"Logical pipeline, not a stage diagram. The checkpoint must complete successfully and remain accessible. Choose placement and frequency by balancing recovery and planning savings against checkpoint I/O.",
  },
  "lineage-before-checkpoint": {
    title:"Without checkpointing: full dependency chain",
    steps:[
      {title:"Read Parquet",detail:"df1: original source"},
      {title:"Filter",detail:"df2: age > 25"},
      {title:"GroupBy + count",detail:"df3: count rows by city"},
      {title:"Filter",detail:"df4: count > 100"},
      {title:"OrderBy",detail:"df5: sort by count",tone:"green"},
    ],
    caption:"Logical dependency flow, not a stage diagram. Lost partitions can be recomputed through accessible dependencies; very long chains can make recovery expensive.",
  },
  "lineage-after-checkpoint": {
    title:"With checkpointing: a new starting point",
    steps:[
      {title:"Read → Filter → GroupBy",detail:"Compute df3 before creating the checkpoint"},
      {title:"Reliable checkpoint",detail:"Save the computed result to configured HDFS or S3 storage",tone:"amber"},
      {title:"Earlier lineage truncated",detail:"After successful materialization, the returned DataFrame depends on checkpointed data",tone:"green"},
      {title:"Filter → OrderBy",detail:"Downstream computation starts from the checkpoint",tone:"green"},
    ],
    caption:"The upper computation runs to write the checkpoint. Subsequent recovery reads that saved result instead of rebuilding the earlier chain. A checkpoint does not automatically resume application code after driver failure.",
  },
  "cache-population-reuse": {
    title:"First action populates; later actions reuse",
    steps:[
      {title:"First action: count()",detail:"Cache population",tone:"amber"},
      {title:"Read source and apply transformations",items:["Scan partitions","Filter rows"]},
      {title:"Store cached blocks",detail:"Executor BlockManagers use the selected storage level",tone:"green"},
      {title:"Second action: show()",detail:"Cache reuse",tone:"amber"},
      {title:"Read required cached blocks",detail:"Use available memory or disk blocks instead of repeating the source scan and filter",tone:"green"},
      {title:"Execute action",detail:"Produce the requested output",tone:"green"},
    ],
    caption:"Conceptual flow with available cached blocks. Missing blocks require recomputation from accessible dependencies. An action that needs only some partitions may populate only part of a cache.",
  },
  deserialization: {
    title:"Serialization and deserialization",
    steps:[
      {title:"Original dictionary",detail:"{'id': 101, 'name': 'Rahul'}"},
      {title:"Serialization: pickle.dumps(data)",detail:"Encode the object's values and structure",tone:"amber"},
      {title:"Serialized bytes",detail:"Can be stored or transferred between compatible processes"},
      {title:"Deserialization: pickle.loads(serialized)",detail:"Decode bytes and reconstruct a usable dictionary",tone:"green"},
      {title:"Reconstructed dictionary",detail:"{'id': 101, 'name': 'Rahul'}",tone:"green"},
    ],
    caption:"The reconstructed dictionary contains equivalent values in a new object instance. This Python example illustrates the concept; Spark SQL also uses internal binary representations.",
  },
  "distributed-object-transfer": {
    title: "Transfer information between independent memory spaces",
    steps: [
      {title:"Machine A: Driver",detail:"Python object in local RAM",items:["{id: 101, name: 'John'}"]},
      {title:"Serialize",detail:"Encode values and structure, not local memory addresses",tone:"amber"},
      {title:"Network transfer",detail:"01001010 11001010 ...",tone:"amber"},
      {title:"Machine B: Executor",detail:"Receives the encoded bytes in its own memory"},
      {title:"Deserialize",detail:"Decode using a compatible reader",tone:"green"},
      {title:"New local object",detail:"{id: 101, name: 'John'}",tone:"green"},
    ],
    caption:"Illustrative bytes, not an actual encoding of this object. Equivalent values are reconstructed in Machine B; Machine A's object identity and memory address are not transferred.",
  },
  serialization: {
    title: "Object to bytes and back",
    steps: [
      {title:"Original object",detail:"{id: 101, name: 'John', salary: 50000}"},
      {title:"Serialization",detail:"Encode the object using a serializer",tone:"amber"},
      {title:"Byte representation",detail:"01001010 01101111 00110101 ..."},
      {title:"Deserialization",detail:"Decode the bytes using a compatible deserializer",tone:"amber"},
      {title:"Reconstructed object",detail:"{id: 101, name: 'John', salary: 50000}",tone:"green"},
    ],
    caption:"The bytes are illustrative, not an actual encoding of this dictionary. The exact representation depends on the serializer; reconstruction preserves values rather than the original memory address.",
  },
  "output-compaction": {
    title:"Compact existing small output files",
    steps:[
      {title:"10,000 small files",detail:"Approximately 1 MiB each"},
      {title:"Read and redistribute",detail:"Rewrite to a separate destination using approximately 40 output partitions",tone:"amber"},
      {title:"Approximately 40 larger files",detail:"Validate output before switching downstream readers",tone:"green"},
    ],
    caption:"Illustrative compaction of roughly 10 GiB. Actual file count and compressed sizes depend on the data and write layout.",
  },
  "groupby-aggregation": {
    title:"Two-phase Spark SQL aggregation",
    steps:[
      {title:"Read input partitions",detail:"Transaction rows with customer_id and amount"},
      {title:"Partial HashAggregate",detail:"Compute local sums or counts within each input partition"},
      {title:"Exchange hashpartitioning(customer_id)",detail:"Shuffle partial results by grouping key",tone:"amber"},
      {title:"Final HashAggregate",detail:"Merge partial states into one result per customer",tone:"green"},
      {title:"Output grouped results",detail:"An action triggers execution of the required plan",tone:"green"},
    ],
    caption:"Typical sum/count aggregation. Partial aggregation can greatly reduce shuffled records; high cardinality and large per-group states can limit that benefit.",
  },
  "architecture-execution": {
    title:"Spark architecture: execution flow",
    steps:[
      {title:"1. Application submission",detail:"Submit with spark-submit or another supported interface"},
      {title:"2. Driver initialization",detail:"Initialize SparkSession and SparkContext"},
      {title:"3. Resource allocation",detail:"Cluster Manager allocates resources and launches Executors",tone:"amber"},
      {title:"4. Execution planning",detail:"Build and optimize the query plan; an action triggers execution"},
      {title:"5. Stage and task creation",detail:"Organize jobs into stages and partition tasks"},
      {title:"6. Distributed execution",detail:"Driver schedules tasks; Executors process partitions",tone:"green"},
      {title:"7. Result generation",detail:"Return requested results or write to the configured destination",tone:"green"},
    ],
    caption:"High-level flow. An action may trigger multiple jobs; startup details vary by deployment mode.",
  },
  cache: {
    title:"Cache reuse preserves lineage",
    steps:[
      {title:"Read Parquet",detail:"Source data"},
      {title:"Filter amount > 1000",detail:"Initial transformation"},
      {title:"GroupBy customer_id",detail:"Aggregate transaction amounts"},
      {title:"Cached DataFrame",detail:"Materialized by the first action; later actions can start here",tone:"amber"},
      {title:"Filter total > 5000",detail:"Read the cached intermediate result",tone:"green"},
      {title:"show()",detail:"Trigger the subsequent computation",tone:"green"},
    ],
    caption:"Lineage remains available above the cache. Lost cached partitions can be recomputed when the required sources and dependencies remain accessible.",
  },
  "sql-stages": {
    title:"Stage DAG for a SQL aggregation",
    steps:[
      {title:"Stage 1 · ShuffleMapStage",items:["Scan Parquet","Filter amount > 1000","Partial aggregation","Shuffle write"]},
      {title:"Shuffle boundary",detail:"Redistribute by region",tone:"amber"},
      {title:"Stage 2 · ResultStage",items:["Shuffle read","Final aggregation","Return required results"],tone:"green"},
    ],
    caption:"Simplified aggregation DAG. Actual jobs and stages depend on the physical plan, partitioning, AQE, and requested action.",
  },
  "sql-planning": {
    title:"From SQL planning to distributed execution",
    steps:[
      {title:"SQL / DataFrame operations",detail:"User defines transformations"},
      {title:"Catalyst optimizer",detail:"Analyze and optimize the logical plan"},
      {title:"Physical planning",detail:"Select physical operators and exchanges"},
      {title:"RDD execution dependencies",detail:"Physical operators produce distributed execution dependencies"},
      {title:"DAG Scheduler",detail:"Create stages from dependencies",tone:"amber"},
      {title:"Task Scheduler",detail:"Schedule partition tasks on Executors"},
      {title:"Executors",detail:"Process partitions and produce results",tone:"green"},
    ],
    caption:"Conceptual flow. AQE can revise parts of the physical plan during execution using runtime statistics.",
  },
  scheduler: {
    title:"DAG Scheduler execution flow",
    steps:[
      {title:"Spark action",detail:"For example, collect()"},
      {title:"Job submission",detail:"Submit the required computation"},
      {title:"DAG Scheduler",detail:"Analyze RDD dependencies and shuffle boundaries",items:["Create stages","Resolve stage dependencies","Find runnable stages"]},
      {title:"TaskSet submission",detail:"Submit runnable stage tasks to the Task Scheduler",tone:"amber"},
      {title:"Task Scheduler",detail:"Assign tasks to available executor resources"},
      {title:"Executors",detail:"Execute partition tasks and report results/status",tone:"green"},
    ],
    caption:"The DAG Scheduler coordinates stages; the Task Scheduler assigns individual tasks. These scheduling components run in the Driver.",
  },
  "key-stages": {
    title:"Two-stage DAG for a keyed aggregation",
    steps:[
      {title:"Input RDD",detail:"Original key-value data"},
      {title:"Stage 1 · ShuffleMapStage",items:["map()","filter()","Map-side combine","Shuffle write"],detail:"Narrow operations pipeline before shuffle output"},
      {title:"Shuffle boundary",detail:"Redistribute records by key",tone:"amber"},
      {title:"Stage 2 · ResultStage",items:["Shuffle read","Final reduceByKey()","collect()"],tone:"green"},
    ],
    caption:"Conceptual two-stage example when aggregation requires a shuffle. The downstream stage depends on upstream shuffle outputs.",
  },
  pipeline: {
    title:"One stage: compatible narrow transformations",
    steps:[
      {title:"Input RDD",detail:"[1, 2, 3, 4, 5]"},
      {title:"Stage 1 · no shuffle",items:["map(x × 2)","filter(x > 5)","map(x + 10)"],detail:"[2, 4, 6, 8, 10] → [6, 8, 10] → [16, 18, 20]"},
      {title:"collect()",detail:"Driver receives [16, 18, 20]",tone:"green"},
    ],
    caption:"Compatible operations are pipelined within each partition task. Intermediate lists explain the values; they need not be materialized as separate datasets.",
  },
  lazy: {
    title:"Lazy evaluation: from definition to execution",
    steps:[
      {title:"Read DataFrame",detail:"Define source and obtain metadata"},
      {title:"Define transformations",items:["filter()","select()","groupBy().sum()"],detail:"Lazy: build the computation plan"},
      {title:"show()",detail:"Action triggers execution",tone:"amber"},
      {title:"Query optimization",detail:"Finalize the optimized execution plan"},
      {title:"Distributed execution",items:["Jobs","Stages","Tasks","Executors"],tone:"green"},
    ],
    caption:"Metadata work can occur before an action. The action triggers the required distributed computation.",
  },
  transformations: {
    title: "Transformations define work; an action triggers it",
    steps: [
      {title:"Input RDD",detail:"[1, 2, 3, 4, 5]"},
      {title:"map(x × 2)",detail:"Lazy transformation → [2, 4, 6, 8, 10]"},
      {title:"filter(x > 5)",detail:"Lazy transformation → [6, 8, 10]"},
      {title:"collect()",detail:"Action: triggers the required computation",tone:"amber"},
      {title:"Driver receives result",detail:"[6, 8, 10]",tone:"green"},
    ],
    caption:"Intermediate values illustrate the computation; defining transformations does not immediately process the records.",
  },
  submit: {
    title: "Spark application submission and execution",
    steps: [
      { title: "1. spark-submit", detail: "Parse command arguments and configuration" },
      { title: "2. Prepare application", detail: "Resolve deployment mode, dependencies, and application resources" },
      { title: "3. Start Driver", detail: "Client environment or cluster, depending on deploy mode" },
      { title: "4. Initialize SparkContext", detail: "Initialize the Spark execution environment" },
      { title: "5. Request resources", detail: "Cluster Manager allocates executor resources", tone: "amber" },
      { title: "6. Start Executors", detail: "Executors register with the Driver" },
      { title: "7. Execute application", items: ["Action", "Job(s)", "Stages", "Tasks"], tone: "green" },
      { title: "8. Complete application", detail: "Commit output, report status, and release resources", tone: "green" },
    ],
    caption: "Conceptual flow. Startup and allocation can overlap; details depend on deployment mode and Cluster Manager.",
  },
};

function StepCard({ step }: { step: Step }) {
  const tone = step.tone === "amber" ? "border-amber-400/35 bg-amber-400/5" : step.tone === "green" ? "border-emerald-400/35 bg-emerald-400/5" : "border-blue-400/35 bg-blue-400/5";
  return <div className={`rounded-xl border p-3 text-center sm:p-4 ${tone}`}>
    <p className="text-sm font-bold text-white">{step.title}</p>
    {step.detail && <p className="mt-1 text-xs leading-5 text-neutral-300">{step.detail}</p>}
    {step.items && <div className="mt-3 flex flex-wrap items-center justify-center gap-2">{step.items.map((item,i)=><span key={i} className="rounded-md border border-neutral-600 bg-neutral-800 px-3 py-2 text-xs">{item}</span>)}</div>}
  </div>;
}

export default function SparkReferenceDiagram({ name }: { name: string }) {
  if (name === "missing-data-trend") return <figure aria-label="Illustrative customer ID missing rates from November 19 to 25: 0.4, 0.3, 0.5, 0.4, 0.6, 1.8, and 5.2 percent. These are invented demonstration values, not live metrics." className="rounded-2xl border border-neutral-700 bg-[#0b0d10] p-4 text-neutral-200 sm:p-5">
    <p className="text-center font-bold text-white">Customer-ID missing rate over time</p><p className="mb-5 mt-1 text-center text-xs text-neutral-400">Illustrative values · percent of rows</p>
    <div className="grid grid-cols-[2rem_minmax(0,1fr)] gap-2"><div aria-hidden="true" className="flex h-48 flex-col justify-between pb-0 text-right text-xs text-neutral-500">{[6,4,2,0].map(value=><span key={value}>{value}%</span>)}</div><div><div className="relative grid h-48 grid-cols-7 items-end gap-1 border-b border-neutral-600 pt-1">{[19,20,21,22,23,24,25].map((day,i)=>{const rate=[0.4,0.3,0.5,0.4,0.6,1.8,5.2][i];return <div key={day} className={`relative mx-auto w-full max-w-8 rounded-t ${i===6?"bg-rose-400/80":i===5?"bg-amber-400/80":"bg-blue-400/70"}`} style={{height:`${rate/6*100}%`}}><span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-semibold text-neutral-200">{rate.toFixed(1)}</span></div>;})}</div><div className="mt-2 grid grid-cols-7 gap-1 text-center text-[10px] text-neutral-400">{[19,20,21,22,23,24,25].map(day=><span key={day}><span className="block">Nov</span>{day}</span>)}</div></div></div>
    <div className="mt-5 rounded-xl border border-rose-400/30 bg-rose-400/5 p-3 text-center text-xs leading-5 text-rose-200">0.4% → 5.2%: investigate source mix, volume, and upstream changes</div><figcaption className="mt-4 text-xs leading-5 text-neutral-400">All plotted points are demonstration data on a 0–6% scale. This separate source example does not set a universal limit. Compare compatible windows and retain counts/denominators alongside rates.</figcaption>
  </figure>;
  if (name === "ansi-cast-outcomes") return <figure aria-label="For the string INVALID cast to INT, ANSI disabled produces null, ANSI enabled raises CAST_INVALID_INPUT, and TRY_CAST with ANSI enabled produces null intentionally so the raw value and conversion failure can be classified" className="rounded-2xl border border-neutral-700 bg-[#0b0d10] p-4 text-neutral-200 sm:p-5">
    <p className="mb-4 text-center font-bold text-white">Invalid conversion differs from missing input</p><div className="rounded-xl border border-blue-400/40 bg-blue-400/5 p-3 text-center font-mono text-sm text-blue-200">Raw STRING: 'INVALID'</div><div aria-hidden="true" className="py-3 text-center text-xs text-neutral-400">↓ Convert to INT ↓</div>
    <div className="grid gap-3 sm:grid-cols-3">{[
      {title:"CAST · ANSI false",outcome:"NULL",detail:"Can silently become a skipped aggregate input",tone:"border-amber-400/40 bg-amber-400/5",text:"text-amber-200"},
      {title:"CAST · ANSI true",outcome:"ERROR",detail:"CAST_INVALID_INPUT exposes the bad value",tone:"border-rose-400/40 bg-rose-400/5",text:"text-rose-200"},
      {title:"TRY_CAST · ANSI true",outcome:"NULL",detail:"Intentional tolerance: retain raw value and failure reason",tone:"border-emerald-400/40 bg-emerald-400/5",text:"text-emerald-200"},
    ].map(item=><div key={item.title} className={`rounded-xl border p-4 text-center ${item.tone}`}><p className="text-xs font-semibold text-white">{item.title}</p><p className={`mt-4 text-xl font-bold ${item.text}`}>{item.outcome}</p><p className="mt-3 break-words text-xs leading-5">{item.detail}</p></div>)}</div>
    <div className="mt-4 rounded-xl border border-neutral-600 p-3 text-center text-xs leading-5">An original NULL still propagates normally in both modes.</div><figcaption className="mt-4 text-xs leading-5 text-neutral-400">Illustrative outcomes for a supported STRING-to-INT conversion. Tolerant functions are not universal exception handlers. See <a href="https://spark.apache.org/docs/latest/sql-ref-ansi-compliance.html" target="_blank" rel="noreferrer" className="underline">Spark ANSI compliance</a>.</figcaption>
  </figure>;
  if (name === "empty-string-normalization") return <figure aria-label="Two explicit normalization rules: null remains null under either rule; an empty string becomes null under either; three ordinary spaces remain spaces under an exact-empty rule but become null with empty-after-trim detection; Rahul is unchanged under both" className="rounded-2xl border border-neutral-700 bg-[#0b0d10] p-4 text-neutral-200 sm:p-5">
    <p className="mb-2 text-center font-bold text-white">Choose what counts as missing</p><p className="mb-4 text-center text-xs text-neutral-400">Existing DataFrame values · explicit normalization</p>
    <div className="grid gap-3 sm:grid-cols-2">{[
      {input:"NULL",exact:"NULL",spaces:"NULL",detail:"Already missing"},
      {input:'""',exact:"NULL",spaces:"NULL",detail:"Zero characters"},
      {input:'"   "',exact:'"   "',spaces:"NULL",detail:"Three ordinary spaces"},
      {input:'"Rahul"',exact:'"Rahul"',spaces:'"Rahul"',detail:"Present nonempty text"},
    ].map(item=><div key={item.input} className="rounded-xl border border-neutral-700 p-4"><p className="text-center font-mono text-lg font-bold text-blue-200">{item.input}</p><p className="mt-1 text-center text-xs text-neutral-400">{item.detail}</p><div className="mt-4 space-y-2 text-xs"><div className="rounded-lg border border-amber-400/30 bg-amber-400/5 p-3"><p className="text-amber-200">Exact empty → NULL</p><p className="mt-2 whitespace-pre-wrap font-mono font-bold text-white">Result: {item.exact}</p></div><div className="rounded-lg border border-emerald-400/30 bg-emerald-400/5 p-3"><p className="text-emerald-200">Empty after trim → NULL</p><p className="mt-2 whitespace-pre-wrap font-mono font-bold text-white">Result: {item.spaces}</p></div></div></div>)}</div>
    <figcaption className="mt-4 text-xs leading-5 text-neutral-400">Both illustrated rules preserve nonempty original values; trim is used only to detect strings made of ordinary spaces. Default <a href="https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.functions.trim.html" target="_blank" rel="noreferrer" className="underline">trim</a> is not a universal whitespace rule. <a href="https://spark.apache.org/docs/latest/sql-data-sources-csv.html" target="_blank" rel="noreferrer" className="underline">CSV parsing options</a> apply separately at ingestion.</figcaption>
  </figure>;
  if (name === "coalesce-vs-fillna-values") return <figure aria-label="Coalesce chooses employee 102's secondary email b@yahoo.com after a null primary email. Fillna replaces employee 104's missing department with UNKNOWN and missing salary with the constant zero. Neither example changes partition count." className="rounded-2xl border border-neutral-700 bg-[#0b0d10] p-4 text-neutral-200 sm:p-5">
    <p className="mb-4 text-center font-bold text-white">Choose a fallback or apply fixed defaults</p>
    <div className="grid gap-4 sm:grid-cols-2"><div className="rounded-xl border border-blue-400/40 bg-blue-400/5 p-4"><p className="text-center font-mono text-sm font-bold text-blue-200">functions.coalesce</p><p className="mt-2 text-center text-xs text-neutral-400">Employee 102 · email input</p><ol className="mt-4 space-y-2 text-xs"><li className="rounded-lg border border-neutral-700 p-3">1. Primary email: <span className="font-mono text-neutral-400">NULL</span></li><li className="rounded-lg border border-emerald-400/40 bg-emerald-400/5 p-3">2. Secondary email: <span className="font-mono text-emerald-200">b@yahoo.com</span></li><li className="rounded-lg border border-neutral-700 p-3">3. Literal fallback: <span className="font-mono">UNKNOWN</span></li></ol><p className="mt-4 text-center text-xs leading-5 text-emerald-200">First non-NULL value → b@yahoo.com</p></div><div className="rounded-xl border border-amber-400/40 bg-amber-400/5 p-4"><p className="text-center font-mono text-sm font-bold text-amber-200">DataFrame.fillna</p><p className="mt-2 text-center text-xs text-neutral-400">Employee 104 · salary input</p><div className="mt-4 space-y-3 text-xs"><div className="rounded-lg border border-neutral-700 p-3"><p>department: NULL</p><p className="mt-2 text-emerald-200">↓ Constant default: UNKNOWN</p></div><div className="rounded-lg border border-neutral-700 p-3"><p>salary: NULL</p><p className="mt-2 text-emerald-200">↓ Constant default: 0.0</p></div></div><p className="mt-4 text-center text-xs leading-5 text-amber-200">Each target column gets its specified literal</p></div></div>
    <figcaption className="mt-4 text-xs leading-5 text-neutral-400">Separate employee examples. <a href="https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.functions.coalesce.html" target="_blank" rel="noreferrer" className="underline">functions.coalesce</a> returns a Column expression; <a href="https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.DataFrame.fillna.html" target="_blank" rel="noreferrer" className="underline">fillna</a> returns a new DataFrame. DataFrame.coalesce(n) controls partitions instead.</figcaption>
  </figure>;
  if (name === "null-safe-change-detection") return <figure aria-label="Negated null-safe equality detects email changes: null to null is unchanged, null to a@test.com is changed, a@test.com to null is changed, and a@test.com to the same email is unchanged" className="rounded-2xl border border-neutral-700 bg-[#0b0d10] p-4 text-neutral-200 sm:p-5">
    <p className="mb-2 text-center font-bold text-white">Detect changes across NULL boundaries</p><p className="mb-4 text-center font-mono text-xs text-neutral-300">NOT (old_email &lt;=&gt; new_email)</p>
    <div className="grid gap-3 sm:grid-cols-2">{[
      {id:101,old:"NULL",next:"NULL",changed:false},
      {id:102,old:"NULL",next:"a@test.com",changed:true},
      {id:103,old:"a@test.com",next:"NULL",changed:true},
      {id:104,old:"a@test.com",next:"a@test.com",changed:false},
    ].map(item=><div key={item.id} className={`rounded-xl border p-4 text-center ${item.changed?"border-amber-400/40 bg-amber-400/5":"border-neutral-600 bg-neutral-800/40"}`}><p className="text-xs text-neutral-400">Customer {item.id}</p><div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 font-mono text-xs"><span className="break-words">{item.old}</span><span aria-hidden="true">→</span><span className="break-words">{item.next}</span></div><p className={`mt-4 text-sm font-bold ${item.changed?"text-amber-200":"text-neutral-300"}`}>{item.changed?"TRUE · Changed":"FALSE · Unchanged"}</p></div>)}</div>
    <figcaption className="mt-4 text-xs leading-5 text-neutral-400">The negated comparison retains customers 102 and 103. This compares aligned field values; inserts/deletes need separate row-presence handling. See <a href="https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.Column.eqNullSafe.html" target="_blank" rel="noreferrer" className="underline">eqNullSafe</a> and <a href="https://spark.apache.org/docs/latest/sql-ref-null-semantics.html#comparison-operators" target="_blank" rel="noreferrer" className="underline">Spark NULL comparison semantics</a>.</figcaption>
  </figure>;
  if (name === "null-hot-partition") return <figure aria-label="Of ten million rows, seven million have null customer IDs. Hash repartitioning by customer ID into four buckets sends all seven million null keys to one hot bucket. That bucket has at least seven million rows; the other three buckets together have at most three million." className="rounded-2xl border border-neutral-700 bg-[#0b0d10] p-4 text-neutral-200 sm:p-5">
    <p className="mb-4 text-center font-bold text-white">One hot key defeats even distribution</p>
    <div className="rounded-xl border border-blue-400/40 bg-blue-400/5 p-3 text-center text-sm">10M input rows · 7M NULL customer IDs</div><div aria-hidden="true" className="py-3 text-center text-xs text-neutral-400">↓ Hash shuffle on customer_id into 4 buckets ↓</div>
    <div className="rounded-xl border border-rose-400/40 bg-rose-400/5 p-4"><p className="text-sm font-bold text-rose-200">Hot bucket: at least 7M rows</p><div className="mt-3 h-6 overflow-hidden rounded bg-neutral-800"><div className="h-full w-[70%] bg-rose-400/70" /></div><p className="mt-2 text-xs leading-5">All NULL keys share this destination; other keys may collide here too.</p></div>
    <div className="mt-3 rounded-xl border border-blue-400/40 bg-blue-400/5 p-4"><p className="text-sm font-bold text-blue-200">Other 3 buckets: at most 3M rows combined</p><div className="mt-3 grid grid-cols-3 gap-2">{[1,2,3].map(i=><div key={i} className="rounded border border-blue-400/30 p-2 text-center text-xs">Other bucket</div>)}</div><p className="mt-2 text-xs leading-5">The remaining keys can collide or leave buckets empty.</p></div>
    <figcaption className="mt-4 text-xs leading-5 text-neutral-400">Bounds for the stated row counts under single-key hash partitioning, not measured partition sizes or a task-time benchmark. More hash buckets do not divide one identical key. Physical bytes and runtime depend on the records and operator.</figcaption>
  </figure>;
  if (name === "null-key-billion-pairs") return <figure aria-label="A null-safe join with one hundred thousand null-key rows on the left and ten thousand on the right produces one billion pairs for that key when there are no additional restricting predicates" className="rounded-2xl border border-neutral-700 bg-[#0b0d10] p-4 text-neutral-200 sm:p-5">
    <p className="mb-4 text-center font-bold text-white">A hot key can also create a huge result</p><div className="grid gap-3 sm:grid-cols-2">{[{side:"Left",rows:"100,000"},{side:"Right",rows:"10,000"}].map(item=><div key={item.side} className="rounded-xl border border-amber-400/40 bg-amber-400/5 p-4 text-center"><p className="text-xs text-amber-200">{item.side} NULL-key rows</p><p className="mt-2 text-2xl font-bold text-white">{item.rows}</p></div>)}</div><div aria-hidden="true" className="py-3 text-center text-xs text-neutral-400">↓ NULL &lt;=&gt; NULL matches every pair ↓</div><div className="rounded-xl border border-rose-400/40 bg-rose-400/5 p-4 text-center"><p className="text-xs text-rose-200">100,000 × 10,000</p><p className="mt-2 text-2xl font-bold text-white">1,000,000,000 rows</p><p className="mt-2 text-xs leading-5">Balancing tasks does not remove logically required matches.</p></div>
    <figcaption className="mt-4 text-xs leading-5 text-neutral-400">For the single null-safe key condition without additional predicates. Ordinary equality produces no NULL-to-NULL matches. <a href="https://spark.apache.org/docs/latest/sql-performance-tuning.html#optimizing-skew-join" target="_blank" rel="noreferrer" className="underline">AQE skew-join optimization</a> can redistribute eligible work but cannot shrink the required result.</figcaption>
  </figure>;
  if (name === "null-safe-null-matches") return <figure aria-label="With two null-key employees and three null-key departments, ordinary equality produces zero matches. Null-safe equality produces all six pairs: employees 101 and 102 each match Unknown A, B, and C." className="rounded-2xl border border-neutral-700 bg-[#0b0d10] p-4 text-neutral-200 sm:p-5">
    <p className="mb-4 text-center font-bold text-white">NULL-safe matching can multiply rows</p>
    <div className="grid grid-cols-2 gap-3 text-center"><div className="rounded-xl border border-blue-400/40 bg-blue-400/5 p-3"><p className="text-2xl font-bold text-white">2</p><p className="mt-2 text-xs text-blue-200">Left NULL-key employees</p></div><div className="rounded-xl border border-amber-400/40 bg-amber-400/5 p-3"><p className="text-2xl font-bold text-white">3</p><p className="mt-2 text-xs text-amber-200">Right NULL-key departments</p></div></div>
    <div className="my-4 rounded-xl border border-neutral-600 p-3 text-center text-xs"><span className="font-mono">NULL = NULL</span><span className="ml-2 text-neutral-300">→ UNKNOWN → 0 inner-join matches</span></div>
    <p className="mb-3 text-center font-mono text-sm text-emerald-200">NULL &lt;=&gt; NULL → TRUE → 2 × 3 = 6 pairs</p>
    <div className="grid gap-2 sm:grid-cols-3">{[101,102].flatMap(employee=>["A","B","C"].map(department=><div key={`${employee}-${department}`} className="rounded-lg border border-emerald-400/30 bg-emerald-400/5 p-3 text-center text-xs"><p className="font-bold text-white">Employee {employee}</p><p className="mt-2 text-emerald-200">↔ Unknown {department}</p></div>))}</div>
    <figcaption className="mt-4 text-xs leading-5 text-neutral-400">Each pair passes the single null-safe key condition. Further predicates can restrict the result. These are logical matches, not an illustration of a required shuffle strategy. See <a href="https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.Column.eqNullSafe.html" target="_blank" rel="noreferrer" className="underline">eqNullSafe</a>.</figcaption>
  </figure>;
  if (name === "all-null-zero-empty") return <figure aria-label="Ungrouped aggregate comparison: four null salaries have row count four, salary count zero, and null sum and average; four zero salaries have both counts four and sum and average zero; empty input has both counts zero and null sum and average" className="rounded-2xl border border-neutral-700 bg-[#0b0d10] p-4 text-neutral-200 sm:p-5">
    <p className="mb-4 text-center font-bold text-white">Unknown amounts differ from known zeros</p>
    <div className="grid gap-3 sm:grid-cols-3">{[
      {title:"All NULL",input:"NULL · NULL · NULL · NULL",rows:"4",values:"0",aggregate:"NULL",tone:"border-amber-400/40 bg-amber-400/5",text:"text-amber-200"},
      {title:"Known zeros",input:"0 · 0 · 0 · 0",rows:"4",values:"4",aggregate:"0",tone:"border-emerald-400/40 bg-emerald-400/5",text:"text-emerald-200"},
      {title:"Empty input",input:"No rows",rows:"0",values:"0",aggregate:"NULL",tone:"border-blue-400/40 bg-blue-400/5",text:"text-blue-200"},
    ].map(item=><div key={item.title} className={`rounded-xl border p-4 ${item.tone}`}><p className={`text-center text-sm font-bold ${item.text}`}>{item.title}</p><p className="mt-3 text-center font-mono text-xs leading-5">{item.input}</p><dl className="mt-4 space-y-2 text-xs"><div className="flex justify-between gap-2"><dt>COUNT(*)</dt><dd className="font-bold text-white">{item.rows}</dd></div><div className="flex justify-between gap-2"><dt>COUNT(salary)</dt><dd className="font-bold text-white">{item.values}</dd></div><div className="flex justify-between gap-2 border-t border-neutral-600 pt-2"><dt>SUM / AVG</dt><dd className={`font-bold ${item.text}`}>{item.aggregate}</dd></div></dl></div>)}</div>
    <figcaption className="mt-4 text-xs leading-5 text-neutral-400">Ungrouped numeric aggregates produce one summary row in each case. Keep row and non-null counts alongside the metric to preserve the distinction. See <a href="https://spark.apache.org/docs/latest/sql-ref-null-semantics.html#builtin-aggregate-expressions" target="_blank" rel="noreferrer" className="underline">Spark aggregate NULL semantics</a>.</figcaption>
  </figure>;
  if (name === "count-rows-vs-values") return <figure aria-label="Five employee rows contribute to COUNT star. Only the first and third rows have non-null salary, so COUNT salary is two. The fifth row has all fields null and still contributes one to COUNT star." className="rounded-2xl border border-neutral-700 bg-[#0b0d10] p-4 text-neutral-200 sm:p-5">
    <p className="mb-4 text-center font-bold text-white">A NULL row is still a row</p>
    <div className="grid grid-cols-[minmax(0,1fr)_4rem_4rem] gap-2 border-b border-neutral-700 pb-3 text-center text-xs"><p className="text-left">Input row</p><p className="font-mono text-blue-200">COUNT<br />(*)</p><p className="font-mono text-emerald-200">COUNT<br />(salary)</p></div>
    {[{label:"101 · salary 50000",salary:true},{label:"102 · salary NULL",salary:false},{label:"103 · salary 70000",salary:true},{label:"104 · salary NULL",salary:false},{label:"All fields NULL",salary:false}].map((row,i)=><div key={i} className={`mt-2 grid grid-cols-[minmax(0,1fr)_4rem_4rem] items-center gap-2 rounded-lg border p-3 text-xs ${i===4?"border-amber-400/40 bg-amber-400/5":"border-neutral-700"}`}><p className={i===4?"font-semibold text-amber-200":"text-neutral-200"}>{row.label}</p><p className="text-center font-bold text-blue-200">+1</p><p className={`text-center font-bold ${row.salary?"text-emerald-200":"text-neutral-500"}`}>{row.salary?"+1":"+0"}</p></div>)}
    <div className="mt-4 grid grid-cols-2 gap-3 text-center"><div className="rounded-xl border border-blue-400/40 bg-blue-400/5 p-3"><p className="font-mono text-xs text-blue-200">COUNT(*)</p><p className="mt-2 text-2xl font-bold text-white">5</p><p className="mt-1 text-xs">All rows</p></div><div className="rounded-xl border border-emerald-400/40 bg-emerald-400/5 p-3"><p className="font-mono text-xs text-emerald-200">COUNT(salary)</p><p className="mt-2 text-2xl font-bold text-white">2</p><p className="mt-1 text-xs">Non-null salaries</p></div></div>
    <figcaption className="mt-4 text-xs leading-5 text-neutral-400">Logical contributions for the five-row example, independent of the physical execution strategy. See <a href="https://spark.apache.org/docs/latest/sql-ref-null-semantics.html#builtin-aggregate-expressions" target="_blank" rel="noreferrer" className="underline">Spark aggregate NULL semantics</a>.</figcaption>
  </figure>;
  if (name === "null-nan-empty-zero") return <figure aria-label="Four distinct values: NULL is missing and tested with isNull, NaN is a non-null floating-point value tested with isnan, an empty string has zero characters, and numeric zero is a known amount" className="rounded-2xl border border-neutral-700 bg-[#0b0d10] p-4 text-neutral-200 sm:p-5">
    <p className="mb-4 text-center font-bold text-white">Four values, four meanings</p>
    <div className="grid gap-3 sm:grid-cols-2">{[
      {value:"NULL",meaning:"No known value",example:"Amount is unknown",test:"amount.isNull()",tone:"border-amber-400/40 bg-amber-400/5",text:"text-amber-200"},
      {value:"NaN",meaning:"Floating-point Not a Number",example:"Present, but not a normal numeric amount",test:"isnan(amount)",tone:"border-rose-400/40 bg-rose-400/5",text:"text-rose-200"},
      {value:'""',meaning:"String with zero characters",example:"Present string; may be a business-quality issue",test:'name == ""',tone:"border-blue-400/40 bg-blue-400/5",text:"text-blue-200"},
      {value:"0",meaning:"Known numeric zero",example:"An amount known to be zero",test:"amount == 0",tone:"border-emerald-400/40 bg-emerald-400/5",text:"text-emerald-200"},
    ].map(item=><div key={item.value} className={`rounded-xl border p-4 text-center ${item.tone}`}><p className={`font-mono text-xl font-bold ${item.text}`}>{item.value}</p><p className="mt-2 text-sm font-semibold text-white">{item.meaning}</p><p className="mt-2 text-xs leading-5">{item.example}</p><p className="mt-3 font-mono text-xs">{item.test}</p></div>)}</div>
    <div className="mt-4 rounded-xl border border-neutral-600 p-3 text-center text-xs leading-5">COUNT(column) skips NULL; it includes NaN, empty strings, and zero</div>
    <figcaption className="mt-4 text-xs leading-5 text-neutral-400">Conceptual cases across numeric and string columns. Spark defines special <a href="https://spark.apache.org/docs/latest/sql-ref-datatypes.html#nan-semantics" target="_blank" rel="noreferrer" className="underline">NaN semantics</a>; SQL <a href="https://spark.apache.org/docs/latest/sql-ref-null-semantics.html" target="_blank" rel="noreferrer" className="underline">NULL semantics</a> apply separately. Normalize only under an explicit data contract.</figcaption>
  </figure>;
  if (name === "null-three-valued-filter") return <figure aria-label="For salary greater than 50000, Priya's 60000 evaluates true and is kept, Rahul's 50000 evaluates false and is dropped, and null salaries evaluate unknown and are dropped by the filter" className="rounded-2xl border border-neutral-700 bg-[#0b0d10] p-4 text-neutral-200 sm:p-5">
    <p className="mb-4 text-center font-bold text-white">WHERE keeps only TRUE</p><div className="rounded-xl border border-blue-400/40 bg-blue-400/5 p-3 text-center font-mono text-sm text-blue-200">salary &gt; 50000</div><div aria-hidden="true" className="py-3 text-center text-neutral-400">↓ Evaluate each row ↓</div><div className="grid gap-3 sm:grid-cols-3">{[{truth:"TRUE",input:"Priya: 60000",action:"Keep row",tone:"border-emerald-400/40 bg-emerald-400/5",text:"text-emerald-200"},{truth:"FALSE",input:"Rahul: 50000",action:"Drop row",tone:"border-neutral-600 bg-neutral-800",text:"text-neutral-300"},{truth:"UNKNOWN / NULL",input:"Amit, Neha: NULL",action:"Drop row",tone:"border-amber-400/40 bg-amber-400/5",text:"text-amber-200"}].map(outcome=><div key={outcome.truth} className={`rounded-xl border p-4 text-center ${outcome.tone}`}><p className={`text-sm font-bold ${outcome.text}`}>{outcome.truth}</p><p className="mt-3 text-xs leading-5">{outcome.input}</p><p className="mt-3 text-xs font-bold text-white">{outcome.action}</p></div>)}</div>
    <figcaption className="mt-4 text-xs leading-5 text-neutral-400">UNKNOWN is not TRUE. Use IS NULL/isNull for missing SQL values; NaN and empty strings are separate cases. See <a href="https://spark.apache.org/docs/latest/sql-ref-null-semantics.html" target="_blank" rel="noreferrer" className="underline">Spark NULL semantics</a>.</figcaption>
  </figure>;
  if (name === "native-expression-helpers") return <figure aria-label="Python helpers build Spark Column expressions or DataFrame plans during query construction; Catalyst optimizes the native plan and executors process data without a Python row UDF for these expressions" className="rounded-2xl border border-neutral-700 bg-[#0b0d10] p-4 text-neutral-200 sm:p-5">
    <p className="mb-4 text-center font-bold text-white">Reusable Python code can build native Spark plans</p>
    <div className="grid gap-3 sm:grid-cols-2"><div className="rounded-xl border border-blue-400/40 bg-blue-400/5 p-4 text-center"><p className="text-sm font-bold text-blue-200">Column-building helper</p><p className="mt-2 font-mono text-xs">calculate_bonus(col("salary"))</p><p className="mt-2 text-xs">Returns a native expression</p></div><div className="rounded-xl border border-blue-400/40 bg-blue-400/5 p-4 text-center"><p className="text-sm font-bold text-blue-200">DataFrame-building helper</p><p className="mt-2 font-mono text-xs">df.transform(add_bonus)</p><p className="mt-2 text-xs">Returns a composed DataFrame plan</p></div></div>
    <div aria-hidden="true" className="py-3 text-center text-neutral-400">↓ Query construction ↓</div><div className="rounded-xl border border-amber-400/40 bg-amber-400/5 p-4 text-center"><p className="text-sm font-bold text-amber-200">Catalyst sees the native operations</p><p className="mt-2 text-xs">Optimize eligible expressions and relational operators</p></div><div aria-hidden="true" className="py-3 text-center text-neutral-400">↓ Action triggers execution ↓</div><div className="rounded-xl border border-emerald-400/40 bg-emerald-400/5 p-4 text-center"><p className="text-sm font-bold text-emerald-200">Spark executors process the rows</p><p className="mt-2 text-xs">No Python row UDF is introduced by these native-only helpers</p></div>
    <figcaption className="mt-4 text-xs leading-5 text-neutral-400">A helper that calls a UDF still introduces that UDF; the benefit here comes from composing native operations. <a href="https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.DataFrame.transform.html" target="_blank" rel="noreferrer" className="underline">DataFrame.transform</a> composes pipelines, while <a href="https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.functions.transform.html" target="_blank" rel="noreferrer" className="underline">functions.transform</a> builds array expressions.</figcaption>
  </figure>;
  if (name === "mergeable-weighted-aggregate") return <figure aria-label="Partition 1 contributes IT weighted sum 50000 and weight 1 plus HR weighted sum 80000 and weight 2; partition 2 contributes IT 210000 and weight 3 plus HR 120000 and weight 2; merging gives IT 260000 over 4 equals 65000 and HR 200000 over 4 equals 50000" className="rounded-2xl border border-neutral-700 bg-[#0b0d10] p-4 text-neutral-200 sm:p-5">
    <p className="mb-4 text-center font-bold text-white">Merge summary buffers, then finalize</p>
    <div className="grid gap-3 sm:grid-cols-2">{[{title:"Partition 1 — partial buffers",it:"IT: (50,000, 1)",hr:"HR: (80,000, 2)"},{title:"Partition 2 — partial buffers",it:"IT: (210,000, 3)",hr:"HR: (120,000, 2)"}].map(partition=><div key={partition.title} className="rounded-xl border border-blue-400/40 bg-blue-400/5 p-3 text-center"><p className="text-sm font-bold text-blue-200">{partition.title}</p><p className="mt-3 font-mono text-xs leading-6">{partition.it}<br />{partition.hr}</p></div>)}</div>
    <p className="mt-3 text-center text-xs text-neutral-400">Each pair = (sum of salary × weight, sum of weight)</p><div aria-hidden="true" className="py-3 text-center text-neutral-400">↓ Bring matching groups together ↓</div><div className="rounded-xl border border-amber-400/40 bg-amber-400/5 p-4 text-center"><p className="text-sm font-bold text-amber-200">Merge by adding buffer components</p><p className="mt-3 font-mono text-xs leading-6">IT: (260,000, 4)<br />HR: (200,000, 4)</p></div><div aria-hidden="true" className="py-3 text-center text-neutral-400">↓ finish: weighted_sum / total_weight ↓</div><div className="grid grid-cols-2 gap-3">{["IT: 65,000","HR: 50,000"].map(value=><div key={value} className="rounded-xl border border-emerald-400/40 bg-emerald-400/5 p-3 text-center text-sm font-bold text-emerald-200">{value}</div>)}</div>
    <figcaption className="mt-4 text-xs leading-5 text-neutral-400">Illustrative mergeable aggregation for the validated sample. This is not the execution model of the Series-to-scalar Pandas UDF above. Built-in sums can implement these same buffers. See <a href="https://spark.apache.org/docs/latest/sql-ref-functions-udf-aggregate.html" target="_blank" rel="noreferrer" className="underline">Spark Aggregator</a> and <a href="https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.GroupedData.agg.html" target="_blank" rel="noreferrer" className="underline">group aggregate Pandas limitations</a>.</figcaption>
  </figure>;
  if (name === "udf-determinism-comparison") return <figure aria-label="For repeated salary input 50000, the fixed bonus function returns 5000 twice; for repeated employee ID 101, a random-score function can return different illustrative values 0.234 and 0.876" className="rounded-2xl border border-neutral-700 bg-[#0b0d10] p-4 text-neutral-200 sm:p-5">
    <p className="mb-4 text-center font-bold text-white">What does repeating the same input mean?</p>
    <div className="grid gap-4 sm:grid-cols-2"><div className="rounded-xl border border-emerald-400/40 bg-emerald-400/5 p-4 text-center"><p className="text-sm font-bold text-emerald-200">Deterministic bonus</p><p className="mt-3 font-mono text-xs">salary = 50,000</p><div aria-hidden="true" className="py-3 text-neutral-400">↓ Same rule and inputs ↓</div><div className="grid grid-cols-2 gap-2">{[1,2].map(run=><div key={run} className="rounded-lg border border-emerald-400/30 p-3 text-xs"><p>Evaluation {run}</p><p className="mt-2 font-mono font-bold text-white">5,000</p></div>)}</div></div><div className="rounded-xl border border-amber-400/40 bg-amber-400/5 p-4 text-center"><p className="text-sm font-bold text-amber-200">Non-deterministic random score</p><p className="mt-3 font-mono text-xs">employee_id = 101</p><div aria-hidden="true" className="py-3 text-neutral-400">↓ Random state may change ↓</div><div className="grid grid-cols-2 gap-2">{["0.234","0.876"].map((value,i)=><div key={value} className="rounded-lg border border-amber-400/30 p-3 text-xs"><p>Evaluation {i+1}</p><p className="mt-2 font-mono font-bold text-white">{value}</p></div>)}</div></div></div>
    <div className="mt-4 rounded-xl border border-neutral-600 p-3 text-center text-xs leading-5">Declare varying UDFs with asNondeterministic() before use; this is not an exactly-once invocation guarantee</div>
    <figcaption className="mt-4 text-xs leading-5 text-neutral-400">Random values are illustrative and are not guaranteed to differ on every pair of calls. The declaration informs optimizer assumptions, not sink idempotency. See <a href="https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.udf.UserDefinedFunction.asNondeterministic.html" target="_blank" rel="noreferrer" className="underline">asNondeterministic</a> and <a href="https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.functions.udf.html" target="_blank" rel="noreferrer" className="underline">UDF evaluation semantics</a>.</figcaption>
  </figure>;
  if (name === "udf-exception-recovery") return <figure aria-label="A task evaluates a UDF, an unhandled exception fails the attempt, and Spark retries if permitted; a later successful attempt continues the job, while repeated failures can exhaust the per-task budget and abort the job" className="rounded-2xl border border-neutral-700 bg-[#0b0d10] p-4 text-neutral-200 sm:p-5">
    <p className="mb-4 text-center font-bold text-white">An unhandled row error fails a task attempt</p>
    <div className="rounded-xl border border-blue-400/40 bg-blue-400/5 p-3 text-center"><p className="text-sm font-bold text-blue-200">Task processes partition data</p><p className="mt-2 text-xs">Evaluate the Python UDF</p></div><div aria-hidden="true" className="py-2 text-center text-neutral-400">↓</div>
    <div className="rounded-xl border border-rose-400/40 bg-rose-400/5 p-4 text-center"><p className="text-sm font-bold text-rose-200">UDF raises an unhandled exception</p><p className="mt-2 font-mono text-xs">ValueError: invalid salary</p><p className="mt-2 text-xs">Task attempt marked failed</p></div><div aria-hidden="true" className="py-2 text-center text-neutral-400">↓ Scheduler applies retry policy ↓</div>
    <div className="rounded-xl border border-amber-400/40 bg-amber-400/5 p-3 text-center"><p className="text-sm font-bold text-amber-200">Retry the task when permitted</p><p className="mt-2 text-xs leading-5">A deterministic bad value normally causes the same failure again</p></div>
    <div className="mt-4 grid gap-3 sm:grid-cols-2"><div className="rounded-xl border border-emerald-400/40 bg-emerald-400/5 p-4 text-center"><p className="text-sm font-bold text-emerald-200">Later attempt succeeds</p><p className="mt-2 text-xs">Dependent processing can continue</p></div><div className="rounded-xl border border-rose-400/40 bg-rose-400/5 p-4 text-center"><p className="text-sm font-bold text-rose-200">Failure budget exhausted</p><p className="mt-2 text-xs">Stage/job can be aborted</p></div></div>
    <figcaption className="mt-4 text-xs leading-5 text-neutral-400">The documented default is four consecutive failed attempts for a particular task, normally one initial attempt plus up to three retries where the policy applies. This is not automatic bad-row skipping. See <a href="https://spark.apache.org/docs/latest/configuration.html" target="_blank" rel="noreferrer" className="underline">spark.task.maxFailures</a> and <a href="https://spark.apache.org/docs/latest/api/python/reference/pyspark.ss/api/pyspark.sql.streaming.StreamingQuery.awaitTermination.html" target="_blank" rel="noreferrer" className="underline">streaming query termination</a>.</figcaption>
  </figure>;
  if (name === "udf-memory-regions") return <figure aria-label="An executor environment includes JVM heap, JVM native and off-heap allocations, and separate Python worker processes; all contribute to the applicable container memory limit" className="rounded-2xl border border-neutral-700 bg-[#0b0d10] p-4 text-neutral-200 sm:p-5">
    <p className="mb-4 text-center font-bold text-white">Executor environment — multiple memory regions</p>
    <div className="rounded-xl border border-neutral-600 p-3"><p className="mb-3 text-center text-xs font-semibold text-neutral-300">Applicable container/process budget</p><div className="grid gap-3 sm:grid-cols-3">{[{title:"JVM heap",items:["Execution / aggregation", "Cached data", "Scala/Java UDF objects"],tone:"border-blue-400/40 bg-blue-400/5",label:"text-blue-200"},{title:"JVM native / off-heap",items:["Direct / Arrow buffers", "Native libraries", "Other JVM overhead"],tone:"border-amber-400/40 bg-amber-400/5",label:"text-amber-200"},{title:"Python workers",items:["Python objects / models", "pandas / NumPy arrays", "Arrow / native buffers"],tone:"border-emerald-400/40 bg-emerald-400/5",label:"text-emerald-200"}].map(region=><div key={region.title} className={`rounded-lg border p-3 ${region.tone}`}><p className={`text-center text-sm font-bold ${region.label}`}>{region.title}</p><ul className="mt-3 space-y-2 text-xs leading-5">{region.items.map(item=><li key={item}>{item}</li>)}</ul></div>)}</div></div>
    <div className="mt-4 rounded-xl border border-rose-400/40 bg-rose-400/5 p-3 text-center text-xs leading-5">Heap OOM, Python allocation failure, and container OOM kill are distinct outcomes</div>
    <figcaption className="mt-4 text-xs leading-5 text-neutral-400">Conceptual regions, not proportional slices or fixed reservations. Arrow buffers may exist on either side. YARN/Kubernetes accounting includes heap, overhead, and applicable extra allocations; other deployments differ. See <a href="https://spark.apache.org/docs/latest/configuration.html" target="_blank" rel="noreferrer" className="underline">Spark executor memory configuration</a>.</figcaption>
  </figure>;
  if (name === "udf-worker-memory") return <figure aria-label="Four concurrent Python workers each use an illustrative one GiB, totaling approximately four GiB before adding JVM and other native memory" className="rounded-2xl border border-neutral-700 bg-[#0b0d10] p-4 text-neutral-200 sm:p-5">
    <p className="mb-4 text-center font-bold text-white">Concurrent workers multiply memory demand</p><div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{[1,2,3,4].map(worker=><div key={worker} className="rounded-xl border border-amber-400/40 bg-amber-400/5 p-3 text-center"><p className="text-xs font-bold text-amber-200">Worker {worker}</p><p className="mt-3 text-lg font-bold text-white">1 GiB</p></div>)}</div><div aria-hidden="true" className="py-3 text-center text-neutral-400">↓ Sum simultaneous usage ↓</div><div className="rounded-xl border border-rose-400/40 bg-rose-400/5 p-4 text-center"><p className="text-sm font-bold text-rose-200">≈ 4 GiB of Python worker memory</p><p className="mt-2 text-xs leading-5">Plus executor JVM and other native allocations</p></div>
    <figcaption className="mt-4 text-xs leading-5 text-neutral-400">Illustrative independent worker usage, not a memory allocation formula or measured benchmark. Model copies and batch intermediates can coexist. Tune concurrency using process/container metrics; worker exits alone do not establish OOM. See <a href="https://spark.apache.org/docs/latest/api/python/development/debugging.html" target="_blank" rel="noreferrer" className="underline">PySpark debugging and profiling</a>.</figcaption>
  </figure>;
  if (name === "udf-justification-decision") return <figure aria-label="First check whether native expressions or relational APIs solve the requirement; if custom execution is needed, select the appropriate JVM, scalar Python, or batch interface and validate correctness, dependencies, runtime, memory, and retry behavior before adoption" className="rounded-2xl border border-neutral-700 bg-[#0b0d10] p-4 text-neutral-200 sm:p-5">
    <p className="mb-4 text-center font-bold text-white">Is custom execution worth its cost?</p>
    <div className="rounded-xl border border-blue-400/40 bg-blue-400/5 p-4 text-center"><p className="text-sm font-bold text-blue-200">Can a clear native solution meet the contract?</p><p className="mt-2 text-xs leading-5">Built-in / higher-order expressions · join · native model API</p></div>
    <div className="mt-4 grid gap-3 sm:grid-cols-2"><div className="rounded-xl border border-emerald-400/40 bg-emerald-400/5 p-4 text-center"><p className="text-sm font-bold text-emerald-200">Yes → prefer the native solution</p><p className="mt-2 text-xs leading-5">Preserve semantics and inspect its execution plan</p></div><div className="rounded-xl border border-amber-400/40 bg-amber-400/5 p-4 text-center"><p className="text-sm font-bold text-amber-200">Custom logic justified → choose an interface</p><p className="mt-2 text-xs leading-5">JVM library · scalar Python · vectorized batches</p><div aria-hidden="true" className="py-2 text-neutral-400">↓</div><p className="rounded-lg border border-neutral-600 p-3 text-xs leading-5">Specialized functionality / tested library / maintainability benefit</p></div></div>
    <div aria-hidden="true" className="py-3 text-center text-neutral-400">↓ Validate the chosen implementation ↓</div><div className="rounded-xl border border-neutral-600 p-4 text-center"><p className="text-sm font-bold text-white">Correctness · dependencies · runtime · memory · retries</p><p className="mt-2 text-xs leading-5">Adopt when measured behavior and engineering benefits justify the cost; otherwise revise the approach</p></div>
    <figcaption className="mt-4 text-xs leading-5 text-neutral-400">Decision guide, not a universal speed ranking. Batched inference can amortize initialization, but worker/task lifetime matters. See <a href="https://spark.apache.org/docs/latest/api/python/tutorial/sql/arrow_pandas.html" target="_blank" rel="noreferrer" className="underline">Spark iterator Pandas UDFs</a> and <a href="https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.functions.udf.html" target="_blank" rel="noreferrer" className="underline">UDF evaluation and determinism</a>.</figcaption>
  </figure>;
  if (name === "catalyst-around-udf") return <figure aria-label="Catalyst prunes six employee columns to employee_id, department, and salary, can push an IT department filter, and evaluates an opaque salary bonus UDF separately before projecting employee_id and bonus" className="rounded-2xl border border-neutral-700 bg-[#0b0d10] p-4 text-neutral-200 sm:p-5">
    <p className="mb-4 text-center font-bold text-white">Optimize the scan; keep the Python body separate</p>
    <div className="rounded-xl border border-blue-400/40 bg-blue-400/5 p-3"><p className="mb-3 text-center text-sm font-bold text-blue-200">Source columns</p><div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{["employee_id","name","department","salary","location","joining_date"].map(field=><div key={field} className={`rounded-lg border p-3 text-center font-mono text-xs ${["employee_id","department","salary"].includes(field) ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-100" : "border-neutral-700 bg-neutral-800 text-neutral-400"}`}><p>{field}</p><p className="mt-2 font-sans">{["employee_id","department","salary"].includes(field) ? "Required" : "Pruned"}</p></div>)}</div></div>
    <div aria-hidden="true" className="py-3 text-center text-neutral-400">↓ Read required columns ↓</div><div className="rounded-xl border border-emerald-400/40 bg-emerald-400/5 p-4 text-center"><p className="text-sm font-bold text-emerald-200">Native predicate: department = 'IT'</p><p className="mt-2 text-xs leading-5">Eligible for reader pushdown; Spark may retain a residual filter</p></div>
    <div aria-hidden="true" className="py-3 text-center text-neutral-400">↓</div><div className="rounded-xl border border-amber-400/40 bg-amber-400/5 p-4 text-center"><p className="text-sm font-bold text-amber-200">Python UDF: calculate_bonus(salary)</p><p className="mt-2 text-xs leading-5">Body stays opaque; values cross the Python process boundary</p></div>
    <div aria-hidden="true" className="py-3 text-center text-neutral-400">↓</div><div className="rounded-xl border border-neutral-600 p-3 text-center text-sm font-bold text-white">Final output: employee_id, bonus</div>
    <figcaption className="mt-4 text-xs leading-5 text-neutral-400">Illustrative unpartitioned Parquet scan. Department is read for the filter even though it is absent from output. Python evaluation does not globally disable relational optimization. See Spark&apos;s <a href="https://github.com/apache/spark/blob/master/sql/core/src/main/scala/org/apache/spark/sql/execution/python/ExtractPythonUDFs.scala" target="_blank" rel="noreferrer" className="underline">Python UDF extraction rules</a>. Limited opt-in transpilation in <a href="https://spark.apache.org/releases/spark-release-4-3-0.html" target="_blank" rel="noreferrer" className="underline">Spark 4.3</a> is a separate supported-subset feature.</figcaption>
  </figure>;
  if (name === "pandas-bonus-series") return <figure aria-label="A pandas salary Series with values 50000, 60000, 70000, and 80000 is multiplied by 0.10, returning bonus values 5000, 6000, 7000, and 8000 with the same length" className="rounded-2xl border border-neutral-700 bg-[#0b0d10] p-4 text-neutral-200 sm:p-5">
    <p className="mb-4 text-center font-bold text-white">One illustrative Series batch</p>
    <div className="rounded-xl border border-blue-400/40 bg-blue-400/5 p-3"><p className="mb-3 text-center text-sm font-bold text-blue-200">Input salaries</p><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{[50000,60000,70000,80000].map(value=><div key={value} className="rounded-lg border border-neutral-600 bg-neutral-900 p-3 text-center font-mono text-xs">{value.toLocaleString("en-US")}</div>)}</div></div>
    <div aria-hidden="true" className="py-3 text-center text-neutral-400">↓</div><div className="rounded-xl border border-amber-400/40 bg-amber-400/5 p-3 text-center font-mono text-sm text-amber-200">salary * 0.10</div><div aria-hidden="true" className="py-3 text-center text-neutral-400">↓</div>
    <div className="rounded-xl border border-emerald-400/40 bg-emerald-400/5 p-3"><p className="mb-3 text-center text-sm font-bold text-emerald-200">Output bonuses — same length</p><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{[5000,6000,7000,8000].map(value=><div key={value} className="rounded-lg border border-emerald-400/30 bg-emerald-400/5 p-3 text-center font-mono text-xs">{value.toLocaleString("en-US")}</div>)}</div></div>
    <figcaption className="mt-4 text-xs leading-5 text-neutral-400">Four values illustrate the Series-to-Series contract, not a configured batch size. Arrow handles interchange here, while the pandas expression performs the arithmetic. Arrow also has its own <a href="https://arrow.apache.org/docs/python/compute.html" target="_blank" rel="noreferrer" className="underline">compute kernels</a>; those are separate from merely using Arrow as Spark&apos;s transport format. See <a href="https://spark.apache.org/docs/latest/api/python/tutorial/sql/arrow_pandas.html" target="_blank" rel="noreferrer" className="underline">Spark Pandas UDF documentation</a>.</figcaption>
  </figure>;
  if (name === "scalar-vs-pandas-batches") return <figure aria-label="Scalar Python UDFs call a Python function on individual row values, while scalar Pandas UDFs receive Series batches; one million rows means about one million scalar calls versus an idealized one hundred full ten-thousand-row batch calls" className="rounded-2xl border border-neutral-700 bg-[#0b0d10] p-4 text-neutral-200 sm:p-5">
    <p className="mb-4 text-center font-bold text-white">Transfer batching and function vectorization are different</p>
    <div className="grid gap-4 sm:grid-cols-2"><div className="rounded-xl border border-blue-400/40 bg-blue-400/5 p-3 text-center"><p className="mb-3 text-sm font-bold text-blue-200">Scalar Python interface</p>{["JVM input / batched transfer", "Python function receives one row's values", "Return individual results through batched transport"].map((step,i)=><div key={step}>{i>0&&<div aria-hidden="true" className="py-2 text-neutral-400">↓</div>}<div className="rounded-lg border border-neutral-600 bg-neutral-900 p-3 text-xs leading-5">{step}</div></div>)}<p className="mt-3 text-xs font-semibold text-blue-200">1M rows ≈ 1M function calls</p></div><div className="rounded-xl border border-emerald-400/40 bg-emerald-400/5 p-3 text-center"><p className="mb-3 text-sm font-bold text-emerald-200">Scalar Pandas interface</p>{["JVM input → Arrow batches", "Function receives a pandas Series batch", "Vectorized operations → Arrow results"].map((step,i)=><div key={step}>{i>0&&<div aria-hidden="true" className="py-2 text-neutral-400">↓</div>}<div className="rounded-lg border border-neutral-600 bg-neutral-900 p-3 text-xs leading-5">{step}</div></div>)}<p className="mt-3 text-xs font-semibold text-emerald-200">100 calls only if all 100 batches hold 10K rows</p></div></div>
    <figcaption className="mt-4 text-xs leading-5 text-neutral-400">Illustrative call counts, not timings. Partition tails, byte limits, and smaller batches can increase Pandas call counts. This describes Series-to-Series UDFs, not iterator/grouped interfaces. Receiving a Series does not guarantee vectorized body logic. See <a href="https://spark.apache.org/docs/latest/api/python/tutorial/sql/arrow_pandas.html" target="_blank" rel="noreferrer" className="underline">Spark Pandas UDF and batch-size guidance</a> and <a href="https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.functions.udf.html" target="_blank" rel="noreferrer" className="underline">scalar UDF transfer options</a>.</figcaption>
  </figure>;
  if (name === "scala-vs-python-udf-path") return <figure aria-label="Scala UDF input, custom function, and output remain inside the executor JVM; Python UDF values cross from JVM to Python worker and results return to the JVM" className="rounded-2xl border border-neutral-700 bg-[#0b0d10] p-4 text-neutral-200 sm:p-5">
    <p className="mb-4 text-center font-bold text-white">Custom logic: JVM call versus Python process boundary</p>
    <div className="grid gap-4 sm:grid-cols-2"><div className="rounded-xl border border-blue-400/40 bg-blue-400/5 p-3 text-center"><p className="mb-3 text-sm font-bold text-blue-200">Scala UDF — executor JVM</p>{["Input / internal-value conversion", "Invoke Scala function in JVM", "Convert result back to Spark"].map((step,i)=><div key={step}>{i>0&&<div aria-hidden="true" className="py-2 text-neutral-400">↓</div>}<div className="rounded-lg border border-neutral-600 bg-neutral-900 p-3 text-xs leading-5">{step}</div></div>)}<p className="mt-3 text-xs leading-5">No Python worker transfer<br />Function body remains opaque to Catalyst</p></div><div className="rounded-xl border border-amber-400/40 bg-amber-400/5 p-3 text-center"><p className="mb-3 text-sm font-bold text-amber-200">Python UDF</p>{["Executor JVM: prepare inputs", "Transfer to Python worker", "Decode → execute → encode", "Return results to JVM"].map((step,i)=><div key={step}>{i>0&&<div aria-hidden="true" className="py-2 text-neutral-400">↓</div>}<div className={`rounded-lg border p-3 text-xs leading-5 ${i===2 ? "border-amber-400/40 bg-amber-400/10" : "border-neutral-600 bg-neutral-900"}`}>{step}</div></div>)}<p className="mt-3 text-xs leading-5">Arrow can improve interchange<br />Vectorized APIs can process batches</p></div></div>
    <figcaption className="mt-4 text-xs leading-5 text-neutral-400">Conceptual comparison, not a speed benchmark. Transfers may be batched. JVM code generation can invoke a Scala UDF without understanding its body. References: <a href="https://docs.aws.amazon.com/prescriptive-guidance/latest/tuning-aws-glue-for-apache-spark/optimize-user-defined-functions.html" target="_blank" rel="noreferrer" className="underline">AWS execution guidance</a>, <a href="https://github.com/apache/spark/blob/master/sql/catalyst/src/main/scala/org/apache/spark/sql/catalyst/expressions/ScalaUDF.scala" target="_blank" rel="noreferrer" className="underline">Spark ScalaUDF implementation</a>, and <a href="https://spark.apache.org/docs/latest/api/python/user_guide/udfandudtf.html" target="_blank" rel="noreferrer" className="underline">Python UDF interfaces</a>.</figcaption>
  </figure>;
  if (name === "builtin-vs-python-udf-path") return <figure aria-label="A native Spark expression processes input and output in JVM operators; a Python UDF encodes input, transfers it to a Python worker, evaluates it, and transfers results back to the JVM" className="rounded-2xl border border-neutral-700 bg-[#0b0d10] p-4 text-neutral-200 sm:p-5">
    <p className="mb-4 text-center font-bold text-white">Equivalent logic, different execution paths</p>
    <div className="grid gap-4 sm:grid-cols-2"><div className="rounded-xl border border-emerald-400/40 bg-emerald-400/5 p-3 text-center"><p className="mb-3 text-sm font-bold text-emerald-200">Built-in expression</p>{["Input values", "Native JVM operators", "Result values"].map((step,i)=><div key={step}>{i>0&&<div aria-hidden="true" className="py-2 text-neutral-400">↓</div>}<div className="rounded-lg border border-neutral-600 bg-neutral-900 p-3 text-xs">{step}</div></div>)}<p className="mt-3 text-xs leading-5">Supported operations can be optimized and fused</p></div><div className="rounded-xl border border-amber-400/40 bg-amber-400/5 p-3 text-center"><p className="mb-3 text-sm font-bold text-amber-200">Python UDF</p>{["JVM: encode input", "Transfer to Python worker", "Decode → run function → encode", "Return results to JVM"].map((step,i)=><div key={step}>{i>0&&<div aria-hidden="true" className="py-2 text-neutral-400">↓</div>}<div className={`rounded-lg border p-3 text-xs ${i===2 ? "border-amber-400/40 bg-amber-400/10" : "border-neutral-600 bg-neutral-900"}`}>{step}</div></div>)}<p className="mt-3 text-xs leading-5">Extra process boundary; function body remains opaque</p></div></div>
    <figcaption className="mt-4 text-xs leading-5 text-neutral-400">Conceptual Python UDF comparison, not a measured speed ratio. Transfers may be batched, and Arrow can improve interchange without removing the process boundary. Scala/Java UDFs have a different execution path. See <a href="https://spark.apache.org/docs/latest/api/python/user_guide/udfandudtf.html" target="_blank" rel="noreferrer" className="underline">Spark UDF execution models</a>.</figcaption>
  </figure>;
  if (name === "python-udf-execution") return <figure aria-label="Partitioned DataFrame input flows through executor JVM operators to a Python worker for UDF evaluation, then results return to JVM operators; data transfer can use pickle or Arrow" className="rounded-2xl border border-neutral-700 bg-[#0b0d10] p-4 text-neutral-200 sm:p-5">
    <p className="mb-4 text-center font-bold text-white">Python UDF execution crosses a process boundary</p>
    <div className="rounded-xl border border-neutral-600 p-3 text-center"><p className="text-sm font-bold text-white">Distributed DataFrame partitions</p><p className="mt-2 text-xs">Tasks evaluate the required rows when an action runs</p></div><div aria-hidden="true" className="py-3 text-center text-neutral-400">↓</div>
    <div className="rounded-xl border border-blue-400/40 bg-blue-400/5 p-4 text-center"><p className="text-sm font-bold text-blue-200">Executor JVM — input operators</p><p className="mt-2 text-xs">Prepare inputs for Python execution</p></div><div aria-hidden="true" className="py-3 text-center text-neutral-400">↓ Serialized / Arrow transfer ↓</div>
    <div className="rounded-xl border border-amber-400/40 bg-amber-400/5 p-4 text-center"><p className="text-sm font-bold text-amber-200">Python worker process</p><p className="mt-2 text-xs leading-5">Decode inputs → execute the function → encode outputs</p><p className="mt-2 text-xs text-neutral-400">Scalar interface: ordinary Python values<br />Pandas / Arrow vectorized interface: batches</p></div><div aria-hidden="true" className="py-3 text-center text-neutral-400">↓ Return results ↓</div>
    <div className="rounded-xl border border-emerald-400/40 bg-emerald-400/5 p-4 text-center"><p className="text-sm font-bold text-emerald-200">Executor JVM — downstream operators</p><p className="mt-2 text-xs">Continue filtering, projecting, aggregating, or writing</p></div>
    <figcaption className="mt-4 text-xs leading-5 text-neutral-400">Conceptual local process boundary, not a separate machine or one network request per row. Transfers may be batched. Arrow improves interchange but does not turn a scalar function into vectorized Python logic. See <a href="https://spark.apache.org/docs/latest/api/python/user_guide/udfandudtf.html" target="_blank" rel="noreferrer" className="underline">Spark UDF execution models</a> and the <a href="https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.functions.udf.html" target="_blank" rel="noreferrer" className="underline">udf API</a>.</figcaption>
  </figure>;
  if (name === "schema-risk-silent-total") return <figure aria-label="The source renames amount to total_amount with values 5000, 8000, and 12000; a stale reader keeps amount as null, so the job succeeds but SUM(amount) returns null instead of the expected total 25000" className="rounded-2xl border border-neutral-700 bg-[#0b0d10] p-4 text-neutral-200 sm:p-5">
    <p className="mb-4 text-center font-bold text-white">Successful execution can hide an incomplete result</p>
    <div className="rounded-xl border border-blue-400/40 bg-blue-400/5 p-4 text-center"><p className="text-sm font-bold text-blue-200">Source field renamed</p><p className="mt-2 font-mono text-xs">amount → total_amount</p><p className="mt-2 text-xs">5,000 + 8,000 + 12,000</p></div><div aria-hidden="true" className="py-3 text-center text-neutral-400">↓ Stale read schema / NULL fallback ↓</div>
    <div className="rounded-xl border border-amber-400/40 bg-amber-400/5 p-4 text-center"><p className="text-sm font-bold text-amber-200">Pipeline retains the old field</p><p className="mt-2 font-mono text-xs">amount = NULL for all three rows</p><p className="mt-2 text-xs">No explicit mapping from total_amount</p></div><div aria-hidden="true" className="py-3 text-center text-neutral-400">↓ SUM(amount) ↓</div>
    <div className="grid gap-3 sm:grid-cols-2"><div className="rounded-xl border border-emerald-400/40 bg-emerald-400/5 p-4 text-center"><p className="text-sm font-bold text-emerald-200">Job status</p><p className="mt-2 text-lg font-bold text-white">Succeeded</p></div><div className="rounded-xl border border-rose-400/40 bg-rose-400/5 p-4 text-center"><p className="text-sm font-bold text-rose-200">Reported total: NULL</p><p className="mt-2 text-xs">Expected from source values: 25,000</p><p className="mt-2 text-xs">Completeness check fails</p></div></div>
    <figcaption className="mt-4 text-xs leading-5 text-neutral-400">Illustrative all-null case: SUM returns NULL, not zero. Mixed valid and missing values can produce an understated total. If amount is absent from the DataFrame schema, the query fails instead. See <a href="https://spark.apache.org/docs/latest/sql-ref-null-semantics.html#builtin-aggregate-expressions" target="_blank" rel="noreferrer" className="underline">Spark aggregate NULL semantics</a>.</figcaption>
  </figure>;
  if (name === "json-drift-medallion") return <figure aria-label="JSON sources feed durable raw Bronze storage, followed by schema validation and normalization; valid records enter Silver and Gold, while invalid records enter quarantine for investigation and replay" className="rounded-2xl border border-neutral-700 bg-[#0b0d10] p-4 text-neutral-200 sm:p-5">
    <p className="mb-4 text-center font-bold text-white">Preserve raw events before normalizing drift</p>
    <div className="rounded-xl border border-blue-400/40 bg-blue-400/5 p-3 text-center"><p className="text-sm font-bold text-blue-200">JSON sources</p><p className="mt-2 text-xs">Kafka · CDC · APIs · cloud files</p></div><div aria-hidden="true" className="py-2 text-center text-neutral-400">↓ Ingestion integration ↓</div>
    <div className="rounded-xl border border-orange-400/40 bg-orange-400/5 p-4 text-center"><p className="text-sm font-bold text-orange-200">Bronze — durable raw ingestion</p><p className="mt-2 text-xs leading-5">Original JSON + timestamps + source coordinates + schema version</p></div><div aria-hidden="true" className="py-2 text-center text-neutral-400">↓</div>
    <div className="rounded-xl border border-amber-400/40 bg-amber-400/5 p-4 text-center"><p className="text-sm font-bold text-amber-200">Detect, validate, and normalize</p><p className="mt-2 text-xs leading-5">New/missing fields · rename conflicts · type conversions · business rules</p></div><div aria-hidden="true" className="py-2 text-center text-neutral-400">↓ Route results ↓</div>
    <div className="grid gap-3 sm:grid-cols-2"><div className="rounded-xl border border-emerald-400/40 bg-emerald-400/5 p-3 text-center"><p className="text-sm font-bold text-emerald-200">Silver — validated records</p><p className="mt-2 text-xs">Stable normalized schema</p><div aria-hidden="true" className="py-2 text-neutral-400">↓</div><div className="rounded-lg border border-yellow-400/40 bg-yellow-400/5 p-3"><p className="text-sm font-bold text-yellow-200">Gold — curated business data</p><p className="mt-2 text-xs">Stable downstream contracts</p></div></div><div className="rounded-xl border border-rose-400/40 bg-rose-400/5 p-4 text-center"><p className="text-sm font-bold text-rose-200">Quarantine</p><p className="mt-2 text-xs leading-5">Invalid / unsupported events<br />Raw payload + error reason<br />Investigate and replay after correction</p></div></div>
    <figcaption className="mt-4 text-xs leading-5 text-neutral-400">Conceptual architecture; validation and routing need application logic. Unknown valid fields are distinct from corrupt input. References: <a href="https://spark.apache.org/docs/latest/sql-data-sources-json.html" target="_blank" rel="noreferrer" className="underline">Spark JSON parsing</a>, <a href="https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.functions.from_json.html" target="_blank" rel="noreferrer" className="underline">from_json</a>, and <a href="https://docs.databricks.com/aws/en/ingestion/cloud-object-storage/auto-loader/schema" target="_blank" rel="noreferrer" className="underline">Auto Loader rescue mode</a>.</figcaption>
  </figure>;
  if (name === "deleted-column-outcomes") return <figure aria-label="When the source removes department, a retained read-schema field yields null values; if the DataFrame schema omits the field, selecting department fails with an unresolved-column error" className="rounded-2xl border border-neutral-700 bg-[#0b0d10] p-4 text-neutral-200 sm:p-5">
    <p className="mb-4 text-center font-bold text-white">Missing value or missing column?</p>
    <div className="rounded-xl border border-blue-400/40 bg-blue-400/5 p-4 text-center"><p className="text-sm font-bold text-blue-200">New source records omit department</p><p className="mt-2 font-mono text-xs">employee_id, name, salary</p></div>
    <div aria-hidden="true" className="py-3 text-center text-neutral-400">↓ Depends on the reader schema ↓</div>
    <div className="grid gap-4 sm:grid-cols-2"><div className="rounded-xl border border-amber-400/40 bg-amber-400/5 p-4 text-center"><p className="text-sm font-bold text-amber-200">Field retained in read schema</p><p className="mt-3 font-mono text-xs">department = NULL</p><p className="mt-3 text-xs leading-5">Query can continue<br />Filters, joins, and groups may change meaning</p></div><div className="rounded-xl border border-rose-400/40 bg-rose-400/5 p-4 text-center"><p className="text-sm font-bold text-rose-200">Field absent from DataFrame schema</p><p className="mt-3 font-mono text-xs">select("department")</p><p className="mt-3 text-xs leading-5">Unresolved-column error<br />Normalize before referencing the field</p></div></div>
    <figcaption className="mt-4 text-xs leading-5 text-neutral-400">Retained-field behavior assumes a compatible reader such as explicit-schema JSON or supported Parquet reads. NULL is not proof that the deletion is harmless: see <a href="https://spark.apache.org/docs/latest/sql-ref-null-semantics.html" target="_blank" rel="noreferrer" className="underline">Spark NULL semantics</a>. Stateful query changes also have <a href="https://spark.apache.org/docs/latest/streaming/apis-on-dataframes-and-datasets.html#recovery-semantics-after-changes-in-a-streaming-query" target="_blank" rel="noreferrer" className="underline">checkpoint recovery restrictions</a>.</figcaption>
  </figure>;
  if (name === "streaming-schema-pipeline") return <figure aria-label="Streaming inputs pass schema validation and normalization; valid records go to a table sink and invalid records go to quarantine, with checkpoint and version management throughout" className="rounded-2xl border border-neutral-700 bg-[#0b0d10] p-4 text-neutral-200 sm:p-5">
    <p className="mb-4 text-center font-bold text-white">Validate and normalize before downstream processing</p>
    <div className="rounded-xl border border-blue-400/40 bg-blue-400/5 p-4 text-center"><p className="text-sm font-bold text-blue-200">Streaming inputs</p><p className="mt-2 text-xs">Kafka events · CDC feeds · arriving files</p><p className="mt-2 text-xs text-neutral-400">Preserve raw payload and source/version metadata</p></div>
    <div aria-hidden="true" className="py-3 text-center text-neutral-400">↓</div>
    <div className="rounded-xl border border-amber-400/40 bg-amber-400/5 p-4 text-center"><p className="text-sm font-bold text-amber-200">Schema validation and normalization</p><p className="mt-2 text-xs leading-5">Data contract / registry policy → schema-aware decoding<br />Validate defaults, casts, aliases, and required fields</p></div>
    <div aria-hidden="true" className="py-3 text-center text-neutral-400">↓ Route by validation result ↓</div>
    <div className="grid gap-3 sm:grid-cols-2"><div className="rounded-xl border border-emerald-400/40 bg-emerald-400/5 p-4 text-center"><p className="text-sm font-bold text-emerald-200">Valid records</p><p className="mt-2 text-xs leading-5">Stable canonical schema<br />Delta / Iceberg sink</p></div><div className="rounded-xl border border-rose-400/40 bg-rose-400/5 p-4 text-center"><p className="text-sm font-bold text-rose-200">Invalid records</p><p className="mt-2 text-xs leading-5">Quarantine / dead-letter store<br />Original payload + error details</p></div></div>
    <div className="mt-4 rounded-xl border border-neutral-600 p-3 text-center text-xs leading-5">Checkpoint recovery · schema versions · monitoring · controlled restarts</div>
    <figcaption className="mt-4 text-xs leading-5 text-neutral-400">Conceptual architecture; routing and validation require application logic, and table sinks need their connectors. Checkpoint reuse depends on the query change. References: <a href="https://spark.apache.org/docs/latest/streaming/apis-on-dataframes-and-datasets.html#recovery-semantics-after-changes-in-a-streaming-query" target="_blank" rel="noreferrer" className="underline">Spark recovery restrictions</a>, <a href="https://docs.delta.io/delta-batch/#automatic-schema-update" target="_blank" rel="noreferrer" className="underline">Delta schema evolution</a>, and <a href="https://docs.databricks.com/aws/en/ingestion/cloud-object-storage/auto-loader/schema" target="_blank" rel="noreferrer" className="underline">Auto Loader evolution</a>.</figcaption>
  </figure>;
  if (["backward-schema-read", "forward-schema-read", "full-schema-compatibility"].includes(name)) {
    const full = name === "full-schema-compatibility";
    const backward = name === "backward-schema-read";
    const paths = full ? [true, false] : [backward];
    return <figure aria-label={full ? "Full compatibility supports both old V1 data to new V2 reader and new V2 data to old V1 reader" : backward ? "Backward compatibility: old data written with V1 is read by a new V2 reader, which supplies the department default" : "Forward compatibility: new data written with V2 is read by an old V1 reader, which ignores department"} className="rounded-2xl border border-neutral-700 bg-[#0b0d10] p-4 text-neutral-200 sm:p-5">
      <p className="mb-4 text-center font-bold text-white">{full ? "Full compatibility: both reader directions" : backward ? "Backward: new reader, old data" : "Forward: old reader, new data"}</p>
      <div className="space-y-4">{paths.map(isBackward=><div key={String(isBackward)} className="rounded-xl border border-neutral-700 p-3"><div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr]"><div className="rounded-lg border border-blue-400/40 bg-blue-400/5 p-3 text-center"><p className="text-sm font-bold text-blue-200">{isBackward ? "Old data · V1 writer" : "New data · V2 writer"}</p><p className="mt-2 font-mono text-xs leading-5">{isBackward ? "id, name" : "id, name, department"}</p></div><div aria-hidden="true" className="flex items-center justify-center text-neutral-400"><span className="sm:hidden">↓</span><span className="hidden sm:inline">→</span></div><div className="rounded-lg border border-emerald-400/40 bg-emerald-400/5 p-3 text-center"><p className="text-sm font-bold text-emerald-200">{isBackward ? "New reader · V2" : "Old reader · V1"}</p><p className="mt-2 text-xs leading-5">{isBackward ? "Supplies department = null from its declared default" : "Reads id and name; ignores department"}</p></div></div><p className="mt-3 text-center text-xs font-semibold text-neutral-300">{isBackward ? "Backward-compatible read" : "Forward-compatible read"}</p></div>)}</div>
      <figcaption className="mt-4 text-xs leading-5 text-neutral-400">Arrows show data flowing to a reader, not deployment order. This example uses Avro record resolution; other formats have different rules. References: <a href="https://avro.apache.org/docs/1.12.0/specification/#schema-resolution" target="_blank" rel="noreferrer" className="underline">Apache Avro</a> and <a href="https://docs.confluent.io/platform/current/schema-registry/fundamentals/schema-evolution.html" target="_blank" rel="noreferrer" className="underline">Confluent compatibility modes</a>.</figcaption>
    </figure>;
  }
  if (name === "rename-field-identity") return <figure aria-label="Plain Parquet schema merging exposes name and full_name as separate fields, while Iceberg retains field ID 2 when name is renamed to full_name" className="rounded-2xl border border-neutral-700 bg-[#0b0d10] p-4 text-neutral-200 sm:p-5">
    <p className="mb-4 text-center font-bold text-white">A rename needs preserved field identity</p>
    <div className="grid gap-4 sm:grid-cols-2"><div className="rounded-xl border border-amber-400/40 bg-amber-400/5 p-4 text-center"><p className="text-sm font-bold text-amber-200">Plain Parquet name-based merge</p><div className="mt-3 grid grid-cols-2 gap-2 font-mono text-xs"><div className="rounded-lg border border-neutral-600 p-3">name</div><div className="rounded-lg border border-neutral-600 p-3">full_name</div></div><p className="mt-3 text-xs leading-5">Two columns in the merged schema<br />No inferred rename relationship</p></div><div className="rounded-xl border border-emerald-400/40 bg-emerald-400/5 p-4 text-center"><p className="text-sm font-bold text-emerald-200">Iceberg metadata rename</p><div className="mt-3 rounded-lg border border-neutral-600 p-3 font-mono text-xs">Field ID 2: name</div><div aria-hidden="true" className="py-2 text-neutral-400">↓ Same field ID ↓</div><div className="rounded-lg border border-emerald-400/40 p-3 font-mono text-xs">Field ID 2: full_name</div><p className="mt-3 text-xs leading-5">Historical values stay associated<br />Existing files remain unchanged</p></div></div>
    <figcaption className="mt-4 text-xs leading-5 text-neutral-400">Illustrative field IDs. A DataFrame rename alone changes the query output schema, not the stored files. See <a href="https://iceberg.apache.org/docs/latest/evolution/" target="_blank" rel="noreferrer" className="underline">Iceberg field identity</a> and <a href="https://docs.delta.io/delta-column-mapping/" target="_blank" rel="noreferrer" className="underline">Delta Lake column mapping</a> for metadata-managed renames.</figcaption>
  </figure>;
  if (name === "parquet-type-conflict") return <figure aria-label="Old Parquet files encode salary as INT and new files encode salary as STRING; schema merging cannot automatically reconcile these incompatible types" className="rounded-2xl border border-neutral-700 bg-[#0b0d10] p-4 text-neutral-200 sm:p-5">
    <p className="mb-4 text-center font-bold text-white">Same column name, incompatible file types</p>
    <div className="grid gap-3 sm:grid-cols-2">{[{title:"Old Parquet files",type:"INT",value:"50000"},{title:"New Parquet files",type:"STRING",value:'"50000" or "unknown"'}].map(file=><div key={file.title} className="rounded-xl border border-blue-400/40 bg-blue-400/5 p-4 text-center"><p className="text-sm font-bold text-white">{file.title}</p><p className="mt-3 font-mono text-xs text-blue-200">salary: {file.type}</p><p className="mt-2 break-words font-mono text-xs text-neutral-300">{file.value}</p></div>)}</div>
    <div aria-hidden="true" className="py-3 text-center text-neutral-400">↓ Read with mergeSchema = true ↓</div>
    <div className="rounded-xl border border-rose-400/40 bg-rose-400/5 p-4 text-center"><p className="text-sm font-bold text-rose-200">Schema merge can fail</p><p className="mt-2 text-xs leading-5">Matching names do not make INT and STRING compatible</p></div>
    <div aria-hidden="true" className="py-3 text-center text-neutral-400">↓ Controlled migration ↓</div>
    <div className="rounded-xl border border-emerald-400/40 bg-emerald-400/5 p-4 text-center"><p className="text-sm font-bold text-emerald-200">Read separately → validate → normalize → rewrite</p><p className="mt-2 text-xs leading-5">Select a common target type and handle conversion failures explicitly</p></div>
    <figcaption className="mt-4 text-xs leading-5 text-neutral-400">Illustrative plain Parquet conflict. Schema merging is not a general cast. Table formats have separate evolution rules: <a href="https://iceberg.apache.org/docs/latest/evolution/" target="_blank" rel="noreferrer" className="underline">Iceberg promotions</a> and <a href="https://docs.delta.io/delta-type-widening/" target="_blank" rel="noreferrer" className="underline">Delta Lake type widening</a>. Invalid casts depend on <a href="https://spark.apache.org/docs/latest/sql-ref-ansi-compliance.html" target="_blank" rel="noreferrer" className="underline">Spark ANSI settings</a>.</figcaption>
  </figure>;
  if (name === "parquet-mixed-schema-read") return <figure aria-label="Old three-column and new four-column Parquet files feed schema merging; the unified DataFrame includes department with null for older records" className="rounded-2xl border border-neutral-700 bg-[#0b0d10] p-4 text-neutral-200 sm:p-5">
    <p className="mb-4 text-center font-bold text-white">Read old and new Parquet files together</p>
    <div className="grid gap-3 sm:grid-cols-2">{[{title:"Old files",fields:["employee_id", "name", "salary"],note:"Original files stay unchanged"},{title:"New files",fields:["employee_id", "name", "salary", "department"],note:"New writes include department"}].map(group=><div key={group.title} className="rounded-xl border border-blue-400/40 bg-blue-400/5 p-3"><p className="text-center text-sm font-bold text-white">{group.title}</p><div className="mt-3 flex flex-wrap justify-center gap-2">{group.fields.map(field=><span key={field} className={`rounded-md border px-2 py-2 font-mono text-xs ${field==="department" ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-100" : "border-neutral-600 bg-neutral-900"}`}>{field}</span>)}</div><p className="mt-3 text-center text-xs text-neutral-400">{group.note}</p></div>)}</div>
    <div aria-hidden="true" className="py-3 text-center text-neutral-400">↓ File schema metadata ↓</div>
    <div className="rounded-xl border border-amber-400/40 bg-amber-400/5 p-4 text-center"><p className="text-sm font-bold text-amber-200">Spark schema merging</p><p className="mt-2 font-mono text-xs">mergeSchema = true</p><p className="mt-2 text-xs">Reconcile compatible fields into one read schema</p></div>
    <div aria-hidden="true" className="py-3 text-center text-neutral-400">↓</div>
    <div className="rounded-xl border border-emerald-400/40 bg-emerald-400/5 p-4 text-center"><p className="text-sm font-bold text-emerald-200">Unified DataFrame schema</p><p className="mt-2 break-words font-mono text-xs leading-5">employee_id, name, salary, department</p><div className="mt-3 grid gap-2 text-xs sm:grid-cols-2"><div className="rounded-lg border border-neutral-600 p-3">Older rows: department = NULL</div><div className="rounded-lg border border-emerald-400/30 p-3">Newer rows: IT, HR, …</div></div></div>
    <figcaption className="mt-4 text-xs leading-5 text-neutral-400">Read-time reconciliation does not backfill or rewrite older files. Record values are read when execution is triggered. See <a href="https://spark.apache.org/docs/latest/sql-data-sources-parquet.html#schema-merging" target="_blank" rel="noreferrer" className="underline">Spark&apos;s Parquet schema-merging documentation</a>.</figcaption>
  </figure>;
  if (name === "schema-add-column") return <figure aria-label="Schema evolution adds a department string column to employee ID, name, and salary; older records expose null for the new field" className="rounded-2xl border border-neutral-700 bg-[#0b0d10] p-4 text-neutral-200 sm:p-5">
    <p className="mb-4 text-center font-bold text-white">An additive schema change</p><div className="grid gap-4 sm:grid-cols-2">{[1,2].map(version=><div key={version} className="rounded-xl border border-blue-400/40 bg-blue-400/5 p-3"><p className="mb-3 text-center text-sm font-bold text-white">Version {version}</p><div className="space-y-2">{["employee_id: INT","name: STRING","salary: DOUBLE",...(version===2?["department: STRING"]:[])].map((field,i)=><div key={field} className={`rounded-lg border p-3 font-mono text-xs ${i===3 ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-100" : "border-neutral-600 bg-neutral-900"}`}>{field}</div>)}</div></div>)}</div><div className="mt-4 rounded-xl border border-emerald-400/40 bg-emerald-400/5 p-4 text-center"><p className="text-sm font-bold text-emerald-200">Compatible unified schema</p><p className="mt-2 text-xs leading-5">Older records: department = NULL<br />New records: department contains the supplied value</p></div>
    <figcaption className="mt-4 text-xs leading-5 text-neutral-400">This illustrates adding a nullable field. Parquet merges compatible file schemas at read time; table formats manage schema changes through their own metadata and compatibility rules. References: <a href="https://spark.apache.org/docs/latest/sql-data-sources-parquet.html#schema-merging" target="_blank" rel="noreferrer" className="underline">Spark</a>, <a href="https://docs.delta.io/delta-batch/" target="_blank" rel="noreferrer" className="underline">Delta Lake</a>, and <a href="https://iceberg.apache.org/docs/latest/evolution/" target="_blank" rel="noreferrer" className="underline">Iceberg</a>.</figcaption>
  </figure>;
  if (name === "region-partition-selection") return <figure aria-label="For the South region join example, dynamic partition pruning selects sales region 2 and skips regions 1, 3, and 4" className="rounded-2xl border border-neutral-700 bg-[#0b0d10] p-4 text-neutral-200 sm:p-5">
    <p className="text-center font-bold text-white">sales/</p><p className="mt-2 text-center text-xs text-neutral-300">Partitions selected for the South-region query below</p><div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">{[1,2,3,4].map(region=><div key={region} className={`rounded-xl border p-3 text-center text-xs ${region===2 ? "border-emerald-400/50 bg-emerald-400/15 text-emerald-100" : "border-neutral-700 bg-neutral-800 text-neutral-400"}`}><p className="font-mono">region_id={region}/</p><p className="mt-3 font-bold">{region===2 ? "Read" : "Skip"}</p></div>)}</div>
    <figcaption className="mt-4 text-xs leading-5 text-neutral-400">Illustrative file partitions for an eligible DPP plan. The value 2 comes from the filtered Regions table, rather than a direct sales filter. These are storage partitions, not a count of executor tasks.</figcaption>
  </figure>;
  if (name === "sql-filter-before-join") return <figure aria-label="Orders are filtered by amount greater than 10000 before joining with customers; equivalent SQL structures can produce this same optimized plan" className="rounded-2xl border border-neutral-700 bg-[#0b0d10] p-4 text-neutral-200 sm:p-5">
    <p className="mb-4 text-center font-bold text-white">An equivalent optimized join flow</p><div className="grid gap-3 sm:grid-cols-2"><div className="rounded-xl border border-blue-400/40 bg-blue-400/5 p-3 text-center"><div className="rounded-lg border border-neutral-600 p-3 text-xs">Scan orders</div><div aria-hidden="true" className="py-2 text-neutral-400">↓</div><div className="rounded-lg border border-amber-400/40 bg-amber-400/5 p-3 text-xs font-bold text-amber-200">Filter amount &gt; 10000</div></div><div className="flex items-center justify-center rounded-xl border border-blue-400/40 bg-blue-400/5 p-4 text-center text-xs">Scan customers</div></div><div aria-hidden="true" className="py-3 text-center text-neutral-400">↓ Join inputs ↓</div><div className="rounded-xl border border-emerald-400/40 bg-emerald-400/5 p-4 text-center"><p className="text-sm font-bold text-emerald-200">Join on customer_id</p><p className="mt-2 text-xs">Use filtered orders and the customer input</p></div>
    <figcaption className="mt-4 text-xs leading-5 text-neutral-400">Conceptual inner-join flow, not a guaranteed physical algorithm. Catalyst can often move the orders filter below the join for either SQL structure. Supported predicates may also be pushed into the orders scan; textual placement alone does not prove a performance gain.</figcaption>
  </figure>;
  if (name === "join-derived-region-pruning") return <figure aria-label="Filter regions for South to obtain region ID 2, then dynamically prune sales to region_id=2 and skip regions 1, 3, and 4 before joining" className="rounded-2xl border border-neutral-700 bg-[#0b0d10] p-4 text-neutral-200 sm:p-5">
    <p className="mb-4 text-center font-bold text-white">Derive the sales partition filter from the join</p><div className="rounded-xl border border-blue-400/40 bg-blue-400/5 p-4 text-center"><p className="text-sm font-bold text-white">Regions table</p><p className="mt-2 text-xs">Filter region_name = 'South'</p><p className="mt-3 text-sm font-bold text-blue-200">Matching region_id = 2</p></div><div aria-hidden="true" className="py-3 text-center text-neutral-400">↓ Runtime partition value ↓</div><div className="rounded-xl border border-amber-400/40 bg-amber-400/5 p-4 text-center"><p className="text-sm font-bold text-amber-200">Dynamic Partition Pruning</p><p className="mt-2 text-xs">Use the join-derived value to restrict the sales scan</p></div><div aria-hidden="true" className="py-3 text-center text-neutral-400">↓</div><div className="rounded-xl border border-neutral-600 p-3"><p className="mb-3 text-center text-sm font-bold text-white">Sales table: partitioned by region_id</p><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{[1,2,3,4].map(id=><div key={id} className={`rounded-lg border p-3 text-center text-xs ${id===2 ? "border-emerald-400/50 bg-emerald-400/15 text-emerald-100" : "border-neutral-700 bg-neutral-800 text-neutral-400"}`}><p>region_id={id}</p><p className="mt-2 font-bold">{id===2 ? "Scan" : "Skip"}</p></div>)}</div></div><div aria-hidden="true" className="py-3 text-center text-neutral-400">↓</div><div className="rounded-xl border border-emerald-400/40 bg-emerald-400/5 p-3 text-center text-sm font-bold text-emerald-200">Execute the join on relevant data</div>
    <figcaption className="mt-4 text-xs leading-5 text-neutral-400">The sales filter value is derived from Regions, not supplied directly in the query. This illustrates an eligible DPP plan; application depends on join semantics, scan support, selectivity, and broadcast reuse or pruning-subquery cost.</figcaption>
  </figure>;
  if (name === "sales-partition-pruning") return <figure aria-label="Sales directories for 2025 and 2026 January and February: only year 2026 month 01 is selected, three other partitions are skipped" className="rounded-2xl border border-neutral-700 bg-[#0b0d10] p-4 text-neutral-200 sm:p-5">
    <p className="text-center font-bold text-white">sales/</p><p className="mt-2 text-center text-xs text-neutral-300">Partition filter: year = 2026 AND month = 1</p><div className="mt-4 space-y-2">{["year=2025/month=01/","year=2025/month=02/","year=2026/month=01/","year=2026/month=02/"].map((path,i)=><div key={path} className={`flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-xs ${i===2 ? "border-emerald-400/50 bg-emerald-400/15 text-emerald-100" : "border-neutral-700 bg-neutral-800 text-neutral-400"}`}><span className="font-mono">{path}</span><span className="font-semibold">{i===2 ? "Selected" : "Skipped"}</span></div>)}</div><div className="mt-4 grid grid-cols-2 gap-3 text-center text-xs"><div className="rounded-lg border border-neutral-700 p-3">3 partitions skipped</div><div className="rounded-lg border border-emerald-400/40 p-3 text-emerald-200">1 partition selected</div></div>
    <figcaption className="mt-4 text-xs leading-5 text-neutral-400">Illustrative storage partitions, not executor task partitions. Spark uses discovered partition values or catalog metadata to avoid scanning irrelevant directories; an amount predicate can then be pushed into the selected Parquet files.</figcaption>
  </figure>;
  if (name === "predicate-pushdown-comparison") return <figure aria-label="Without predicate pushdown a full scan reads all rows before Spark filters; with pushdown the Parquet reader can skip irrelevant data before Spark finishes filtering" className="rounded-2xl border border-neutral-700 bg-[#0b0d10] p-4 text-neutral-200 sm:p-5">
    <p className="mb-4 text-center font-bold text-white">Filter closer to the source</p><div className="grid gap-4 sm:grid-cols-2">{[{title:"Without pushdown",steps:["Full scan baseline: 100M rows","Spark filters rows","IT employees"],tone:"border-amber-400/40 bg-amber-400/5"},{title:"With pushdown",steps:["Parquet reader filters / skips","Potentially less data read","Spark final filtering and output"],tone:"border-emerald-400/40 bg-emerald-400/5"}].map(path=><div key={path.title} className={`rounded-xl border p-3 ${path.tone}`}><p className="mb-3 text-center text-sm font-bold text-white">{path.title}</p>{path.steps.map((step,i)=><div key={step}>{i>0 && <div aria-hidden="true" className="py-2 text-center text-neutral-400">↓</div>}<div className="rounded-lg border border-neutral-600 bg-neutral-900 p-3 text-center text-xs leading-5">{step}</div></div>)}</div>)}</div>
    <figcaption className="mt-4 text-xs leading-5 text-neutral-400">Conceptual full-scan comparison. Pushdown does not guarantee that only matching rows are physically read. Parquet skipping depends on statistics and layout; actions that need only a few rows may read less even without pushdown.</figcaption>
  </figure>;
  if (name === "column-pruning-fifty") return <figure aria-label="Fifty conceptual source columns with employee_id and salary selected and forty-eight unnecessary columns omitted" className="rounded-2xl border border-neutral-700 bg-[#0b0d10] p-4 text-neutral-200 sm:p-5">
    <p className="mb-4 text-center font-bold text-white">Conceptual view: 50-column dataset</p><div className="grid grid-cols-5 gap-2 sm:grid-cols-10">{Array.from({length:50},(_,i)=><div key={i} className={`rounded-md border py-2 text-center text-xs ${i<2 ? "border-emerald-400/50 bg-emerald-400/20 text-emerald-100" : "border-neutral-700 bg-neutral-800 text-neutral-400"}`}>{i+1}</div>)}</div><div className="mt-4 grid gap-2 sm:grid-cols-2"><div className="rounded-lg border border-emerald-400/40 bg-emerald-400/5 p-3 text-center text-xs"><p className="font-bold text-emerald-200">2 required columns</p><p className="mt-2">employee_id + salary</p></div><div className="rounded-lg border border-neutral-600 p-3 text-center text-xs text-neutral-400">48 unnecessary columns</div></div>
    <figcaption className="mt-4 text-xs leading-5 text-neutral-400">Column numbers are illustrative. For the select-only query, a supported Parquet reader can skip unneeded column data. Adding a department filter may also require reading department even though it is absent from the final output.</figcaption>
  </figure>;
  if (name === "aqe-cbo-initial" || name === "aqe-cbo-runtime") {
    const adaptive = name === "aqe-cbo-runtime";
    return <figure aria-label={adaptive ? "AQE can use the observed 5 MB customer side to convert the join to BroadcastHashJoin" : "Initial planning can select SortMergeJoin from estimates of 500 GB orders and 2 GB customers"} className="rounded-2xl border border-neutral-700 bg-[#0b0d10] p-4 text-neutral-200 sm:p-5">
      <p className="mb-4 text-center font-bold text-white">{adaptive ? "Possible adaptive physical plan" : "Possible initial physical plan"}</p><div className="grid gap-3 sm:grid-cols-2"><div className="rounded-xl border border-blue-400/40 bg-blue-400/5 p-4 text-center"><p className="text-sm font-bold text-white">Orders</p><p className="mt-2 text-xs">{adaptive ? "200 GB after filtering" : "Estimated: 500 GB"}</p></div><div className={`rounded-xl border p-4 text-center ${adaptive ? "border-emerald-400/40 bg-emerald-400/5" : "border-blue-400/40 bg-blue-400/5"}`}><p className="text-sm font-bold text-white">{adaptive ? "Broadcast Customers" : "Customers"}</p><p className="mt-2 text-xs">{adaptive ? "Observed: 5 MB after filtering" : "Estimated: 2 GB"}</p></div></div><div aria-hidden="true" className="py-3 text-center text-neutral-400">↓ Join inputs ↓</div><div className="rounded-xl border border-amber-400/40 bg-amber-400/5 p-4 text-center"><p className="text-sm font-bold text-amber-200">{adaptive ? "BroadcastHashJoin" : "SortMergeJoin"}</p><p className="mt-2 text-xs leading-5">{adaptive ? "Runtime statistics can enable a different physical strategy" : "Initial statistics suggest both sides exceed the broadcast threshold"}</p></div>
      <figcaption className="mt-4 text-xs leading-5 text-neutral-400">{adaptive ? "Illustrative conversion for an eligible join and adaptive threshold. AQE may avoid sorting and optimize shuffle reads, but cannot undo completed shuffle work or generally reconsider logical join order." : "Simplified operator sketch; actual plans include scans, exchanges, and sorts as needed. Dedicated CBO supports statistics-based logical planning; the physical planner chooses the join algorithm."}</figcaption>
    </figure>;
  }
  if (name === "spark-statistics-sources") return <figure aria-label="Spark gets statistics from data sources, the catalog, and runtime execution; catalog and source estimates inform planning while AQE uses runtime statistics" className="rounded-2xl border border-neutral-700 bg-[#0b0d10] p-4 text-neutral-200 sm:p-5">
    <p className="mb-4 text-center font-bold text-white">Three sources of Spark statistics</p><div className="grid gap-3 sm:grid-cols-3">{[{title:"Data source",detail:"File sizes and supported source metadata",note:"Availability depends on the connector"},{title:"Catalog",detail:"Stored table and column statistics",note:"Collected with ANALYZE TABLE where supported"},{title:"Runtime",detail:"Actual shuffle statistics",note:"Used by AQE during execution"}].map(source=><div key={source.title} className="rounded-xl border border-blue-400/40 bg-blue-400/5 p-3 text-center"><p className="text-sm font-bold text-white">{source.title}</p><p className="mt-3 text-xs leading-5">{source.detail}</p><p className="mt-3 text-xs leading-5 text-neutral-400">{source.note}</p></div>)}</div>
    <div aria-hidden="true" className="py-3 text-center text-neutral-400">↓ Inform planning and adaptive decisions ↓</div><div className="rounded-xl border border-emerald-400/40 bg-emerald-400/5 p-4 text-center"><p className="text-sm font-bold text-emerald-200">Spark query optimization</p><p className="mt-2 text-xs leading-5">Catalyst uses available estimates; AQE uses runtime measurements for eligible physical-plan changes</p></div>
    <figcaption className="mt-4 text-xs leading-5 text-neutral-400">File-format metadata is not automatically a complete set of CBO column statistics. Runtime statistics arrive during execution and do not replace all pre-execution catalog estimates.</figcaption>
  </figure>;
  if (name === "catalyst-rbo-cbo") return <figure aria-label="Catalyst contains parsing, analysis, logical optimization with rule-based and cost-based techniques, and physical planning; its output runs in the Spark execution engine" className="rounded-2xl border border-neutral-700 bg-[#0b0d10] p-4 text-neutral-200 sm:p-5">
    <div className="rounded-xl border border-neutral-600 p-3 text-center text-sm font-bold text-white">SQL query / DataFrame API</div><div aria-hidden="true" className="py-3 text-center text-neutral-400">↓</div>
    <div className="rounded-xl border border-blue-400/40 bg-blue-400/5 p-3 sm:p-4"><p className="mb-3 text-center font-bold text-blue-200">Catalyst framework</p><div className="rounded-lg border border-neutral-600 p-3 text-center text-xs">Parsing / plan construction and analysis</div><div aria-hidden="true" className="py-2 text-center text-neutral-400">↓</div><div className="rounded-lg border border-amber-400/40 bg-amber-400/5 p-3"><p className="text-center text-sm font-bold text-amber-200">Logical optimization</p><div className="mt-3 grid gap-2 sm:grid-cols-2"><div className="rounded-lg border border-neutral-600 p-3 text-center"><p className="text-xs font-bold text-white">RBO</p><p className="mt-2 text-xs leading-5">Predefined transformation rules</p></div><div className="rounded-lg border border-neutral-600 p-3 text-center"><p className="text-xs font-bold text-white">CBO</p><p className="mt-2 text-xs leading-5">Statistics-based estimates and eligible join ordering</p></div></div></div><div aria-hidden="true" className="py-2 text-center text-neutral-400">↓</div><div className="rounded-lg border border-neutral-600 p-3 text-center text-xs">Physical planning</div></div>
    <div aria-hidden="true" className="py-3 text-center text-neutral-400">↓</div><div className="rounded-xl border border-emerald-400/40 bg-emerald-400/5 p-3 text-center text-sm font-bold text-emerald-200">Physical execution plan</div><div aria-hidden="true" className="py-3 text-center text-neutral-400">↓</div><div className="rounded-xl border border-neutral-600 p-4 text-center"><p className="text-sm font-bold text-white">Spark execution engine</p><p className="mt-2 text-xs">Tungsten techniques and code generation where supported</p></div>
    <figcaption className="mt-4 text-xs leading-5 text-neutral-400">CBO is a capability within Catalyst, not a competing engine. Cost-based rules need applicable configuration and useful statistics. The boxes group responsibilities; they do not imply exhaustive physical-plan search or fixed execution stages.</figcaption>
  </figure>;
  if (name === "rbo-cbo-join-order") return <figure aria-label="Illustrative original join order joins orders and customers first; possible cost-based order joins customers to filtered countries first to reduce intermediate rows" className="rounded-2xl border border-neutral-700 bg-[#0b0d10] p-4 text-neutral-200 sm:p-5">
    <p className="mb-4 text-center font-bold text-white">Statistics can guide join ordering</p><div className="grid gap-4 sm:grid-cols-2">{[{title:"Original join order",steps:["Orders + Customers","Potentially large intermediate","Join Countries","Final result"],tone:"border-amber-400/40 bg-amber-400/5"},{title:"Possible CBO join order",steps:["Customers + Filtered Countries","Potentially smaller intermediate","Join Orders","Final result"],tone:"border-emerald-400/40 bg-emerald-400/5"}].map(order=><div key={order.title} className={`rounded-xl border p-3 ${order.tone}`}><p className="mb-3 text-center text-sm font-bold text-white">{order.title}</p>{order.steps.map((step,i)=><div key={step}>{i>0 && <div aria-hidden="true" className="py-2 text-center text-neutral-400">↓</div>}<div className="rounded-lg border border-neutral-600 bg-neutral-900 p-3 text-center text-xs leading-5">{step}</div></div>)}</div>)}</div>
    <figcaption className="mt-4 text-xs leading-5 text-neutral-400">Illustrative alternatives, not guaranteed plans. Join conditions, selectivity, statistics, and configuration determine whether reordering helps; rule-based filter movement still applies. References: <a className="underline" href="https://spark.apache.org/docs/latest/sql-performance-tuning.html" target="_blank" rel="noreferrer">Spark SQL tuning</a> and <a className="underline" href="https://spark.apache.org/docs/latest/configuration.html" target="_blank" rel="noreferrer">configuration</a>.</figcaption>
  </figure>;
  if (name === "tungsten-memory-spaces") return <figure aria-label="On-heap objects are managed by JVM garbage collection; supported off-heap binary buffers are managed explicitly by Spark" className="rounded-2xl border border-neutral-700 bg-[#0b0d10] p-4 text-neutral-200 sm:p-5">
    <p className="mb-4 text-center font-bold text-white">Two memory spaces</p><div className="grid gap-4 sm:grid-cols-2">{[{title:"On-heap memory",space:"JVM heap",data:"Objects and arrays",manager:"Garbage collector",note:"JVM manages the lifetime of ordinary heap objects",tone:"border-blue-400/40 bg-blue-400/5"},{title:"Off-heap memory",space:"Native memory",data:"Binary data buffers",manager:"Explicit management",note:"Spark manages supported allocations outside the JVM heap",tone:"border-emerald-400/40 bg-emerald-400/5"}].map(kind=><div key={kind.title} className={`rounded-xl border p-3 text-center ${kind.tone}`}><p className="text-sm font-bold text-white">{kind.title}</p><div className="mt-3 rounded-lg border border-neutral-600 p-3"><p className="text-sm font-semibold">{kind.space}</p><p className="mt-2 text-xs">{kind.data}</p></div><p className="mt-4 text-xs font-bold">{kind.manager}</p><p className="mt-2 text-xs leading-5 text-neutral-400">{kind.note}</p></div>)}</div>
    <figcaption className="mt-4 text-xs leading-5 text-neutral-400">Binary data can also live on-heap. Enabling Spark-managed off-heap allocation is optional and does not move every object outside the JVM or eliminate GC. Both memory spaces consume real machine resources.</figcaption>
  </figure>;
  if (name === "unsafe-row-layout") return <figure aria-label="Simplified UnsafeRow: null bitmap, three eight-byte field slots for id, salary, and a string offset and length, followed by variable-length string data" className="rounded-2xl border border-neutral-700 bg-[#0b0d10] p-4 text-neutral-200 sm:p-5">
    <p className="mb-4 text-center font-bold text-white">Simplified UnsafeRow memory layout</p><div className="overflow-hidden rounded-xl border border-blue-400/40"><div className="bg-blue-400/10 p-4 text-center"><p className="text-sm font-bold text-blue-200">Null bitset</p><p className="mt-2 text-xs">Tracks fields containing null values</p></div><div className="grid sm:grid-cols-3">{["id = 101","salary = 80000","Offset + length"].map(slot=><div key={slot} className="border-t border-blue-400/30 bg-neutral-900 p-4 text-center sm:border-r last:sm:border-r-0"><p className="text-xs font-bold">{slot}</p><p className="mt-2 text-xs text-neutral-400">8-byte field slot</p></div>)}</div><div className="border-t border-emerald-400/30 bg-emerald-400/10 p-4 text-center"><p className="text-sm font-bold text-emerald-200">Variable-length data: “IT”</p><p className="mt-2 text-xs">A separate region within the same row buffer</p></div></div>
    <figcaption className="mt-4 text-xs leading-5 text-neutral-400">Conceptual row layout, not to scale. Field slots can contain values or references encoded as offsets and lengths within the row buffer. This illustrates compact binary processing, independently of whether the buffer is on-heap or off-heap.</figcaption>
  </figure>;
  if (name === "tungsten-memory-layout") return <figure aria-label="Conceptual comparison of object-heavy records with headers, references, values, and padding versus compact binary rows with a null bitmap, fixed-width fields, and variable-length data" className="rounded-2xl border border-neutral-700 bg-[#0b0d10] p-4 text-neutral-200 sm:p-5">
    <p className="mb-4 text-center font-bold text-white">Conceptual memory layout comparison</p>
    <div className="grid gap-4 sm:grid-cols-2"><div className="rounded-xl border border-amber-400/40 bg-amber-400/5 p-3"><p className="mb-3 text-center text-sm font-bold text-amber-200">Object-heavy representation</p><div className="grid grid-cols-2 gap-2">{["Object header","Object references","Individual values","Padding / overhead"].map(part=><div key={part} className="flex min-h-14 items-center justify-center rounded-lg border border-neutral-600 bg-neutral-900 p-2 text-center text-xs">{part}</div>)}</div><p className="mt-3 text-center text-xs text-neutral-400">Multiple allocations and references</p></div><div className="rounded-xl border border-emerald-400/40 bg-emerald-400/5 p-3"><p className="mb-3 text-center text-sm font-bold text-emerald-200">Compact binary representation</p><div className="overflow-hidden rounded-lg border border-emerald-400/40">{["Null bitmap","Fixed-width fields","Variable-length data"].map((part,i)=><div key={part} className={`p-3 text-center text-xs ${i>0 ? "border-t border-emerald-400/30" : ""}`}>{part}</div>)}</div><p className="mt-3 text-center text-xs text-neutral-400">Compact structured storage</p></div></div>
    <figcaption className="mt-4 text-xs leading-5 text-neutral-400">Illustrative structure, not measured byte sizes. Compact formats such as UnsafeRow reduce per-value object overhead; their data can reside on-heap or, where supported and configured, off-heap.</figcaption>
  </figure>;
  if (name === "tungsten-operator-fusion") return <figure aria-label="Scan, filter, and project can run within one whole-stage generated code region instead of separate generic operator calls" className="rounded-2xl border border-neutral-700 bg-[#0b0d10] p-4 text-neutral-200 sm:p-5">
    <p className="mb-3 text-sm font-bold text-white">Conceptual operator pipeline</p><div className="flex flex-wrap items-center justify-center gap-2">{["Scan","Filter","Project"].map((op,i)=><div key={op} className="flex items-center gap-2">{i>0 && <span aria-hidden="true" className="text-neutral-400">→</span>}<span className="rounded-lg border border-blue-400/40 bg-blue-400/5 px-4 py-3 text-xs">{op}</span></div>)}</div>
    <div aria-hidden="true" className="py-3 text-center text-neutral-400">↓ Whole-stage code generation ↓</div>
    <div className="rounded-xl border border-emerald-400/40 bg-emerald-400/5 p-4 text-center"><p className="text-sm font-bold text-emerald-200">One generated code region</p><p className="mt-2 text-xs leading-5">Read input → Evaluate salary filter → Produce selected values</p><p className="mt-2 text-xs text-neutral-400">Reduce repeated calls and intermediate row materialization</p></div>
    <figcaption className="mt-4 text-xs leading-5 text-neutral-400">Illustrative fusion of compatible operators. Scan behavior depends on the source and reader; shuffles, Python UDFs, and unsupported operators may separate generated regions.</figcaption>
  </figure>;
  if (name === "catalyst-broadcast-selection") return <figure aria-label="Transactions scan with 500 million rows joins a broadcast of 200 country rows through BroadcastHashJoin" className="rounded-2xl border border-neutral-700 bg-[#0b0d10] p-4 text-neutral-200 sm:p-5">
    <p className="mb-4 text-center font-bold text-white">A possible broadcast hash join plan</p>
    <div className="grid gap-3 sm:grid-cols-2"><div className="rounded-xl border border-blue-400/40 bg-blue-400/5 p-4 text-center"><p className="text-sm font-bold text-white">Scan transactions</p><p className="mt-2 text-xs">500 million records</p><p className="mt-4 text-xs text-blue-200">Large-side partitions stay distributed</p></div><div className="rounded-xl border border-emerald-400/40 bg-emerald-400/5 p-4 text-center"><p className="text-sm font-bold text-white">Scan countries</p><p className="mt-2 text-xs">200 records</p><div aria-hidden="true" className="py-2 text-neutral-400">↓</div><div className="rounded-lg border border-amber-400/40 bg-amber-400/5 p-3 text-xs text-amber-200">BroadcastExchange</div></div></div>
    <div aria-hidden="true" className="py-3 text-center text-neutral-400">↓ Join inputs ↓</div><div className="rounded-xl border border-emerald-400/40 bg-emerald-400/5 p-4 text-center"><p className="text-sm font-bold text-emerald-200">BroadcastHashJoin</p><p className="mt-2 text-xs">Join transaction partitions with the broadcast country lookup</p></div>
    <figcaption className="mt-4 text-xs leading-5 text-neutral-400">Illustrative strategy, not a guaranteed plan. Eligibility depends on join type, estimated bytes, statistics, thresholds, hints, and configuration. Row count alone does not establish broadcast safety.</figcaption>
  </figure>;
  if (name === "sql-dataframe-full-pipeline") return <figure aria-label="SQL statements and DataFrame operations converge into logical planning, Catalyst optimization, physical planning, and distributed Spark execution" className="rounded-2xl border border-neutral-700 bg-[#0b0d10] p-4 text-neutral-200 sm:p-5">
    <div className="grid gap-3 sm:grid-cols-2">{[{title:"Spark SQL",detail:"SQL statements"},{title:"DataFrame API",detail:"Programmatic operations"}].map(api=><div key={api.title} className="rounded-xl border border-blue-400/40 bg-blue-400/5 p-4 text-center"><p className="text-sm font-bold text-white">{api.title}</p><p className="mt-2 text-xs">{api.detail}</p></div>)}</div>
    {[{title:"Logical plan",detail:"SQL parsing when applicable, analysis, and resolution",tone:"border-blue-400/40 bg-blue-400/5"},{title:"Catalyst optimizer",detail:"Rule-based and cost-based optimizations where applicable",tone:"border-amber-400/40 bg-amber-400/5"},{title:"Physical planning",detail:"Select operators and execution strategies",tone:"border-emerald-400/40 bg-emerald-400/5"},{title:"Spark execution engine",detail:"Distributed execution across executor tasks",tone:"border-emerald-400/40 bg-emerald-400/5"}].map(step=><div key={step.title}><div aria-hidden="true" className="py-3 text-center text-neutral-400">↓</div><div className={`rounded-xl border p-4 text-center ${step.tone}`}><p className="text-sm font-bold text-white">{step.title}</p><p className="mt-2 text-xs leading-5">{step.detail}</p></div></div>)}
    <figcaption className="mt-4 text-xs leading-5 text-neutral-400">Both interfaces share the planning and execution infrastructure. Actions trigger distributed execution; AQE may revise supported physical decisions using runtime statistics. This is a conceptual query-compilation flow, not a stage diagram.</figcaption>
  </figure>;
  if (name === "sql-dataframe-shared-engine") return <figure aria-label="Spark SQL and DataFrame operations converge into Catalyst optimization and the same Spark execution engine" className="rounded-2xl border border-neutral-700 bg-[#0b0d10] p-4 text-neutral-200 sm:p-5">
    <div className="grid gap-3 sm:grid-cols-2"><div className="rounded-xl border border-blue-400/40 bg-blue-400/5 p-4 text-center"><p className="text-sm font-bold text-white">Spark SQL</p><p className="mt-2 text-xs">SQL query → Parsed logical plan</p></div><div className="rounded-xl border border-emerald-400/40 bg-emerald-400/5 p-4 text-center"><p className="text-sm font-bold text-white">DataFrame API</p><p className="mt-2 text-xs">Operations → Constructed logical plan</p></div></div>
    <div aria-hidden="true" className="py-3 text-center text-neutral-400">↓ Shared planning pipeline ↓</div>
    <div className="rounded-xl border border-amber-400/40 bg-amber-400/5 p-4 text-center"><p className="text-sm font-bold text-amber-200">Catalyst</p><p className="mt-2 text-xs leading-5">Analysis → Logical optimization → Physical plan selection</p></div>
    <div aria-hidden="true" className="py-3 text-center text-neutral-400">↓</div>
    <div className="rounded-xl border border-blue-400/40 bg-blue-400/5 p-4 text-center"><p className="text-sm font-bold text-white">Spark execution engine</p><p className="mt-2 text-xs leading-5">Physical operators, code generation, tasks, and executors</p></div>
    <figcaption className="mt-4 text-xs leading-5 text-neutral-400">Equivalent expressions can yield equivalent plans. Actions trigger execution; AQE can revise supported decisions at runtime. Choosing SQL or DataFrame syntax alone does not determine execution speed.</figcaption>
  </figure>;
  if (name === "spark-sql-vs-hive-execution") return <figure aria-label="Spark SQL runs through Catalyst and Spark executors; HiveQL runs through the Hive optimizer and its configured engine such as Tez" className="rounded-2xl border border-neutral-700 bg-[#0b0d10] p-4 text-neutral-200 sm:p-5">
    <p className="mb-4 text-center font-bold text-white">Two query execution paths</p>
    <div className="grid gap-4 sm:grid-cols-2">{[{title:"Spark SQL",steps:["SQL query","Catalyst optimizer","Spark execution engine","Executors: distributed tasks"],tone:"border-blue-400/40 bg-blue-400/5"},{title:"Apache Hive",steps:["HiveQL query","Hive optimizer","Configured engine: Tez / MapReduce","Distributed execution tasks"],tone:"border-emerald-400/40 bg-emerald-400/5"}].map(path=><div key={path.title} className={`rounded-xl border p-3 ${path.tone}`}><p className="mb-3 text-center text-sm font-bold text-white">{path.title}</p>{path.steps.map((step,i)=><div key={step}>{i>0 && <div aria-hidden="true" className="py-2 text-center text-neutral-400">↓</div>}<div className="rounded-lg border border-neutral-600 bg-neutral-900 p-3 text-center text-xs leading-5">{step}</div></div>)}</div>)}</div>
    <figcaption className="mt-4 text-xs leading-5 text-neutral-400">Conceptual paths; Hive engine support depends on version and distribution. Hive on Tez can also use DAG-based execution. Sharing Hive Metastore metadata does not make a Spark SQL query run through Hive's query engine.</figcaption>
  </figure>;
  if (name === "serialization-gc-improvement") return <figure aria-label="Hypothetical garbage collection time before optimization 18 minutes, after optimization 5 minutes" className="rounded-2xl border border-neutral-700 bg-[#0b0d10] p-4 text-neutral-200 sm:p-5">
    <p className="mb-5 text-center font-bold text-white">Illustrative garbage collection time</p>
    <div className="space-y-5">{[{label:"Before optimization",minutes:18,tone:"bg-amber-400"},{label:"After optimization",minutes:5,tone:"bg-emerald-400"}].map(item=><div key={item.label}><div className="mb-2 flex flex-wrap justify-between gap-2 text-sm"><span>{item.label}</span><strong>{item.minutes} min</strong></div><div className="h-8 overflow-hidden rounded-md bg-neutral-800"><div className={`h-full rounded-md ${item.tone}`} style={{width:`${item.minutes*5}%`}} /></div></div>)}</div>
    <div aria-hidden="true" className="mt-2 flex justify-between text-[10px] text-neutral-400">{[0,5,10,15,20].map(n=><span key={n}>{n} min</span>)}</div>
    <figcaption className="mt-4 text-xs leading-5 text-neutral-400">Hypothetical example, not measured results or a promised improvement. Compare the same GC metric across equivalent runs; aggregate executor or task GC time is not the same as job wall-clock time.</figcaption>
  </figure>;
  if (name === "unified-memory-layout") return <figure aria-label="Ten GiB executor JVM heap: 300 MiB reserved, approximately 5.824 GiB unified memory, and 3.883 GiB other heap memory" className="rounded-2xl border border-neutral-700 bg-[#0b0d10] p-4 text-neutral-200 sm:p-5">
    <p className="text-center font-bold text-white">Executor JVM heap: 10 GiB</p>
    <div className="mt-4 rounded-lg border border-neutral-600 bg-neutral-800 p-3 text-center text-xs">300 MiB reserved internally</div>
    <div className="mt-3 rounded-xl border border-blue-400/40 bg-blue-400/5 p-3"><p className="text-center text-sm font-bold text-blue-200">Unified memory: approximately 5.824 GiB</p><div className="mt-3 grid gap-2 sm:grid-cols-2"><div className="rounded-lg border border-amber-400/35 p-3 text-center"><p className="text-sm font-bold text-amber-200">Execution</p><p className="mt-2 text-xs">Joins, sorting, aggregation, shuffle</p></div><div className="rounded-lg border border-emerald-400/35 p-3 text-center"><p className="text-sm font-bold text-emerald-200">Storage</p><p className="mt-2 text-xs">Cached partitions and broadcast blocks</p></div></div><p className="mt-3 text-center text-xs text-neutral-300">Shared dynamically; boxes do not represent fixed halves</p><p className="mt-2 text-center text-xs text-neutral-400">Protected storage threshold: approximately 2.912 GiB</p></div>
    <div className="mt-3 rounded-xl border border-neutral-600 p-3 text-center"><p className="text-sm font-bold">Other heap: approximately 3.883 GiB</p><p className="mt-2 text-xs text-neutral-300">Application objects, metadata, and memory outside the unified region</p></div>
    <figcaption className="mt-4 text-xs leading-5 text-neutral-400">Uses memory.fraction = 0.6 and storageFraction = 0.5 after the 300 MiB reservation. Execution can reclaim eligible borrowed storage above the protected threshold; storage cannot evict active execution memory. Excludes native memory, configured off-heap memory, and Python workers outside the JVM heap.</figcaption>
  </figure>;
  if (name === "uncached-vs-cached-actions") return <figure aria-label="Without caching each action may repeat source reads and transformations; with caching actions reuse materialized partitions" className="rounded-2xl border border-neutral-700 bg-[#0b0d10] p-4 text-neutral-200 sm:p-5">
    <p className="mb-4 text-center font-bold text-white">Repeated computation vs. cached reuse</p>
    <div className="grid gap-4 sm:grid-cols-2">{[false,true].map(cached=><div key={String(cached)} className={`rounded-xl border p-3 ${cached ? "border-emerald-400/40 bg-emerald-400/5" : "border-amber-400/40 bg-amber-400/5"}`}><p className="mb-3 text-center text-sm font-bold text-white">{cached ? "With caching" : "Without caching"}</p>{cached && <div className="mb-3 rounded-lg border border-emerald-400/30 p-3 text-center text-xs">Read → Transform → Store partitions<br /><span className="mt-1 block text-neutral-400">Materialized by the first action</span></div>}<div className="space-y-2">{["count()","show()","Parquet write"].map(action=><div key={action} className="rounded-lg border border-neutral-700 p-3 text-xs"><span className={cached ? "text-emerald-200" : "text-amber-200"}>{cached ? "Cached partitions" : "Read + required transformations"}</span><span className="mt-1 block">→ {action}</span></div>)}</div></div>)}</div>
    <figcaption className="mt-4 text-xs leading-5 text-neutral-400">Conceptual comparison. Actions may have different optimized plans; some intermediate shuffle work can be reused without caching. Cached blocks that are missing must be recomputed from available dependencies.</figcaption>
  </figure>;
  if (name === "cached-result-partitions") return <figure aria-label="One million rows and ten columns become two hundred thousand rows and two columns, cached across four illustrative partitions" className="rounded-2xl border border-neutral-700 bg-[#0b0d10] p-4 text-neutral-200 sm:p-5">
    <div className="rounded-xl border border-blue-400/40 bg-blue-400/5 p-4 text-center"><p className="font-bold text-white">Original Parquet dataset</p><p className="mt-2 text-xs">1,000,000 rows × 10 columns</p></div>
    <p className="py-3 text-center text-xs text-amber-200">↓ Filter + Select ↓</p>
    <div className="rounded-xl border border-emerald-400/40 bg-emerald-400/5 p-3"><p className="text-center text-sm font-bold text-white">Computed DataFrame</p><p className="mt-2 text-center text-xs">200,000 rows × 2 columns</p><div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">{["1–50,000","50,001–100,000","100,001–150,000","150,001–200,000"].map((range,i)=><div key={range} className="rounded-lg border border-emerald-400/30 bg-neutral-900 p-3 text-center"><p className="text-xs font-bold text-emerald-200">Partition {i+1}</p><p className="mt-2 text-[11px] leading-5">Rows {range}</p></div>)}</div><p className="mt-4 text-center text-xs text-emerald-200">Cached in executor RAM or local disk</p></div>
    <figcaption className="mt-4 text-xs leading-5 text-neutral-400">Four balanced partitions are assumed for illustration. Row ranges label conceptual groups, not a guaranteed global order. Filter and select do not themselves request four partitions.</figcaption>
  </figure>;
  if (name === "memory-disk-placement") return <figure aria-label="Computed partitions are stored in executor RAM when they fit, otherwise on executor local disk with memory and disk persistence" className="rounded-2xl border border-neutral-700 bg-[#0b0d10] p-4 text-neutral-200 sm:p-5">
    <div className="rounded-xl border border-blue-400/40 bg-blue-400/5 p-4 text-center"><p className="font-bold text-white">Computed DataFrame partitions</p><p className="mt-2 text-xs">MEMORY_AND_DISK</p></div>
    <p className="py-3 text-center text-xs text-neutral-400">Spark stores each partition according to available storage</p>
    <div className="grid gap-3 sm:grid-cols-2"><div className="rounded-xl border border-emerald-400/40 bg-emerald-400/5 p-4 text-center"><p className="font-bold text-emerald-200">RAM</p><p className="mt-2 text-xs">Partitions that fit in executor storage memory</p></div><div className="rounded-xl border border-amber-400/40 bg-amber-400/5 p-4 text-center"><p className="font-bold text-amber-200">Local disk</p><p className="mt-2 text-xs">Partitions that cannot fit in memory</p></div></div>
    <figcaption className="mt-4 text-xs leading-5 text-neutral-400">Both locations belong to executors on worker nodes. Disk fallback is cache storage, separate from execution spill and durable writes to S3 or HDFS. This is a placement decision, not a guarantee of equal-sized groups.</figcaption>
  </figure>;
  if (name === "storage-level-capacity") return <figure aria-label="100 GB cached dataset: memory only caches 60 GB, memory and disk caches 60 GB in RAM and 40 GB on disk, disk only stores 100 GB on disk" className="rounded-2xl border border-neutral-700 bg-[#0b0d10] p-4 text-neutral-200 sm:p-5">
    <p className="mb-5 text-center font-bold text-white">100 GB of cache storage / 60 GB available RAM</p>
    <div className="space-y-5">{[{name:"MEMORY_ONLY",ram:60,disk:0,missing:40,note:"40 GB not cached; recomputed when required"},{name:"MEMORY_AND_DISK",ram:60,disk:40,missing:0,note:"Remaining partitions stored on local disk"},{name:"DISK_ONLY",ram:0,disk:100,missing:0,note:"All partitions stored on local disk"}].map(level=><div key={level.name}><p className="mb-2 text-sm font-bold">{level.name}</p><div className="flex h-10 overflow-hidden rounded-lg text-xs font-semibold">{[{size:level.ram,tone:"bg-blue-400/25 text-blue-100"},{size:level.disk,tone:"bg-emerald-400/25 text-emerald-100"},{size:level.missing,tone:"bg-amber-400/20 text-amber-100"}].filter(segment=>segment.size>0).map((segment,i)=><div key={i} style={{width:`${segment.size}%`}} className={`flex items-center justify-center ${segment.tone}`}>{segment.size} GB</div>)}</div><p className="mt-2 text-xs text-neutral-300">{level.note}</p></div>)}</div>
    <div className="mt-5 flex flex-wrap gap-4 text-xs">{[{label:"RAM",color:"bg-blue-400"},{label:"Disk",color:"bg-emerald-400"},{label:"Not cached",color:"bg-amber-400"}].map(item=><span key={item.label} className="flex items-center gap-2"><span className={`h-3 w-3 rounded-sm ${item.color}`} />{item.label}</span>)}</div>
    <figcaption className="mt-4 text-xs leading-5 text-neutral-400">Simplified example assuming sufficient disk space and partition sizes that permit this distribution. Actual placement and eviction depend on representation and available resources; memory and disk encodings can have different sizes.</figcaption>
  </figure>;
  if (name === "cached-partition-location") return <figure aria-label="Driver coordinates three executors, each storing two cached partitions in RAM with local disk available for fallback" className="rounded-2xl border border-neutral-700 bg-[#0b0d10] p-4 text-neutral-200 sm:p-5">
    <div className="rounded-xl border border-blue-400/40 bg-blue-400/5 p-4 text-center"><p className="font-bold text-white">Spark Driver</p><p className="mt-1 text-xs text-neutral-300">Schedules tasks and tracks cached block locations</p></div>
    <p aria-hidden="true" className="py-3 text-center text-neutral-400">↓</p>
    <div className="grid gap-3 sm:grid-cols-3">{[1,2,3].map(n=><div key={n} className="rounded-xl border border-neutral-600 p-3 text-center"><p className="text-sm font-bold text-white">Executor {n}</p><p className="mt-1 text-xs text-neutral-400">BlockManager</p><div className="mt-3 rounded-lg border border-emerald-400/40 bg-emerald-400/5 p-3"><p className="text-xs font-bold text-emerald-200">RAM</p><div className="mt-2 flex justify-center gap-2">{[n*2-1,n*2].map(p=><span key={p} className="rounded border border-emerald-400/30 bg-emerald-400/15 px-3 py-2 text-xs">P{p}</span>)}</div></div><div className="mt-3 rounded-lg border border-amber-400/40 bg-amber-400/5 p-3"><p className="text-xs font-bold text-amber-200">Local disk</p><p className="mt-1 text-xs text-neutral-400">Fallback when allowed</p></div></div>)}</div>
    <figcaption className="mt-4 text-xs leading-5 text-neutral-400">Illustrative distribution of six cached partitions across three executors. All six fit in RAM here; local disk is available for storage levels that permit it. Driver arrows show coordination, not movement of the whole dataset through the driver.</figcaption>
  </figure>;
  if (name === "persist-storage-comparison") return <figure aria-label="For a conceptual 100 GB cached dataset with 60 GB available memory, memory only leaves 40 GB uncached while memory and disk stores the remainder on disk" className="rounded-2xl border border-neutral-700 bg-[#0b0d10] p-4 text-neutral-200 sm:p-5">
    <p className="mb-5 text-center font-bold text-white">Illustrative storage behavior</p>
    <div className="space-y-5">{[false,true].map(disk=><div key={String(disk)}><p className="mb-2 text-sm font-bold">{disk ? "MEMORY_AND_DISK" : "MEMORY_ONLY"}</p><div className="flex h-10 overflow-hidden rounded-lg text-center text-xs font-semibold"><div className="flex w-3/5 items-center justify-center bg-blue-400/25 text-blue-100">60 GB memory</div><div className={`flex w-2/5 items-center justify-center border-l border-neutral-600 ${disk ? "bg-emerald-400/25 text-emerald-100" : "bg-amber-400/20 text-amber-100"}`}>{disk ? "40 GB disk" : "40 GB uncached"}</div></div><p className="mt-2 text-xs leading-5 text-neutral-300">{disk ? "Remaining partitions can be read from disk rather than recomputed." : "Partitions that cannot be cached must be recomputed when needed."}</p></div>)}</div>
    <figcaption className="mt-4 text-xs leading-5 text-neutral-400">Conceptual example assuming sufficient disk space. Uses cached data size, not source file size. Actual placement depends on representation, partition boundaries, available memory, and eviction; disk encoding size may differ.</figcaption>
  </figure>;
  if (name === "cache-reuse-comparison") return <figure aria-label="Without caching three actions may repeat the scan and filter; with caching subsequent actions reuse stored partitions" className="rounded-2xl border border-neutral-700 bg-[#0b0d10] p-4 text-neutral-200 sm:p-5">
    <p className="mb-4 text-center font-bold text-white">Reuse work across three actions</p>
    <div className="grid gap-4 sm:grid-cols-2"><div className="rounded-xl border border-amber-400/40 bg-amber-400/5 p-3"><p className="mb-3 text-center text-sm font-bold text-amber-200">Without caching</p><div className="space-y-2">{["count()","groupBy region","groupBy category"].map(action=><div key={action} className="rounded-lg border border-neutral-700 p-3 text-xs">Read → Filter → {action}</div>)}</div></div><div className="rounded-xl border border-emerald-400/40 bg-emerald-400/5 p-3"><p className="mb-3 text-center text-sm font-bold text-emerald-200">With caching</p><div className="rounded-lg border border-neutral-700 p-3 text-xs">Read → Filter → Cache partitions</div><p className="py-2 text-center text-xs">First count() materializes the cache</p><div className="space-y-2">{["groupBy region","groupBy category"].map(action=><div key={action} className="rounded-lg border border-emerald-400/30 p-3 text-xs">Cached partitions → {action}</div>)}</div></div></div>
    <figcaption className="mt-4 text-xs leading-5 text-neutral-400">Conceptual comparison. Calling cache() only marks data for storage; an action materializes it. Reuse depends on blocks remaining available; aggregation shuffles still require their own computation.</figcaption>
  </figure>;
  if (name === "verbose-shuffle-size") return <figure aria-label="Hypothetical shuffle data: verbose serialization contains 10 GB useful data plus 10 GB overhead; compact serialization contains 10 GB useful data" className="rounded-2xl border border-neutral-700 bg-[#0b0d10] p-4 text-neutral-200 sm:p-5">
    <p className="mb-5 text-center font-bold text-white">Total serialized shuffle data</p>
    <div className="space-y-5">{[{label:"Verbose serialization",size:20,extra:true},{label:"Compact serialization",size:10,extra:false}].map(item=><div key={item.label}><div className="mb-2 flex flex-wrap justify-between gap-2 text-sm"><span>{item.label}</span><strong>{item.size} GB</strong></div><div className="flex h-8 overflow-hidden rounded-md bg-neutral-800"><div className="h-full w-1/2 bg-blue-400" />{item.extra && <div className="h-full w-1/2 bg-amber-400" />}</div></div>)}</div>
    <div className="mt-5 flex flex-wrap gap-4 text-xs"><span className="flex items-center gap-2"><span className="h-3 w-3 rounded-sm bg-blue-400" />Useful data: 10 GB</span><span className="flex items-center gap-2"><span className="h-3 w-3 rounded-sm bg-amber-400" />Extra overhead: 10 GB</span></div>
    <figcaption className="mt-4 text-xs leading-5 text-neutral-400">Hypothetical decimal-unit example: 100 million objects × 100 useful bytes = 10 GB; another 100 bytes per object adds 10 GB. The compact baseline omits encoding overhead for illustration. Actual transfer sizes also depend on encoding and compression.</figcaption>
  </figure>;
  if (name === "serializer-size-comparison") return <figure aria-label="Hypothetical serialized size comparison: Java 500 MB and Kryo 150 MB" className="rounded-2xl border border-neutral-700 bg-[#0b0d10] p-4 text-neutral-200 sm:p-5">
    <p className="mb-5 text-center font-bold text-white">Illustrative serialized data size</p>
    <div className="space-y-5">{[{label:"Java Serialization",size:500,tone:"bg-blue-400"},{label:"Kryo Serialization",size:150,tone:"bg-emerald-400"}].map(item=><div key={item.label}><div className="mb-2 flex flex-wrap justify-between gap-2 text-sm"><span>{item.label}</span><strong>{item.size} MB</strong></div><div className="h-7 overflow-hidden rounded-md bg-neutral-800"><div className={`h-full rounded-md ${item.tone}`} style={{width:`${item.size/5}%`}} /></div></div>)}</div>
    <figcaption className="mt-5 text-xs leading-5 text-neutral-400">Hypothetical example for one million JVM objects, not measured benchmark results. Actual sizes and speed depend on object types, serializers, registration, and configuration.</figcaption>
  </figure>;
  if (name === "ui-screenshot") return <figure aria-label="Spark Web UI example with job stages and their dependency graph" className="overflow-hidden rounded-2xl border border-neutral-300 bg-white">
    <a href="/images/spark/spark-ui-dag-aws.png" target="_blank" rel="noreferrer" aria-label="Open Spark UI DAG screenshot at full size"><Image src="/images/spark/spark-ui-dag-aws.png" alt="Spark Web UI showing Job 2, stages 2 and 3 feeding stage 4, exchanges, and a sort-merge join" width={885} height={664} sizes="(max-width: 1023px) 90vw, 60vw" className="h-auto w-full" /></a>
    <figcaption className="p-4 text-xs leading-5 text-neutral-600">Example from <a href="https://docs.aws.amazon.com/glue/latest/dg/monitor-spark-ui.html" target="_blank" rel="noreferrer" className="underline">AWS Glue documentation</a>. This older Spark UI screenshot illustrates stage dependencies; it is a different job from the aggregation below. Open the image to view it at full size.</figcaption>
  </figure>;
  if (name === "dataset-types") return <figure aria-label="Dataset T includes DataFrame as Dataset Row and typed Dataset Employee in Scala" className="rounded-2xl border border-neutral-700 bg-[#0b0d10] p-4 text-neutral-200 sm:p-5">
    <StepCard step={{title:"Dataset[T]", detail:"General structured Dataset abstraction (Scala)"}} />
    <div aria-hidden="true" className="py-3 text-center">↓</div>
    <div className="grid gap-3 sm:grid-cols-2"><StepCard step={{title:"DataFrame",items:["Dataset[Row]"],detail:"Generic rows with named columns",tone:"green"}} /><StepCard step={{title:"Typed Dataset",items:["Dataset[Employee]"],detail:"Strongly typed Employee objects",tone:"green"}} /></div>
    <figcaption className="mt-4 text-center text-xs leading-5 text-neutral-400">Both use Spark SQL planning and execution. Typed Dataset APIs are available in Scala and Java; PySpark exposes DataFrames.</figcaption>
  </figure>;
  if (name === "rdd-partitions") return <figure aria-label="RDD with six elements split into three partitions, each processed by one task" className="rounded-2xl border border-neutral-700 bg-[#0b0d10] p-4 text-neutral-200 sm:p-5">
    <p className="text-center font-bold text-white">RDD: [10, 20, 30, 40, 50, 60]</p>
    <div aria-hidden="true" className="py-3 text-center text-neutral-400">↓</div>
    <div className="grid gap-3 sm:grid-cols-3">{[[10,20],[30,40],[50,60]].map((values,i)=><div key={i} className="text-center"><div className="rounded-xl border border-blue-400/35 bg-blue-400/5 p-3"><p className="text-xs font-bold text-blue-300">Partition {i+1}</p><div className="mt-3 flex justify-center gap-2">{values.map(v=><span key={v} className="rounded border border-neutral-600 bg-neutral-800 px-3 py-2 text-xs">{v}</span>)}</div></div><div aria-hidden="true" className="py-2">↓</div><div className="rounded-lg border border-emerald-400/35 bg-emerald-400/5 p-3 text-xs font-bold text-emerald-300">Task {i+1}</div></div>)}</div>
    <figcaption className="mt-4 text-center text-xs leading-5 text-neutral-400">One task processes each partition within the stage. All three can run concurrently when sufficient task slots are available.</figcaption>
  </figure>;
  const flow = flows[name];
  if (!flow) return null;
  return <figure aria-label={flow.title} className="rounded-2xl border border-neutral-700 bg-[#0b0d10] p-4 text-neutral-200 sm:p-5">
    <p className="mb-4 text-center font-bold text-white">{flow.title}</p>
    {flow.steps.map((step,i)=><div key={i}>{i>0 && <div aria-hidden="true" className="py-2 text-center text-neutral-400">↓</div>}<StepCard step={step} /></div>)}
    <figcaption className="mt-4 text-center text-xs leading-5 text-neutral-400">{flow.caption}</figcaption>
  </figure>;
}
