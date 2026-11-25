# How do you limit the amount of data processed at one time?

In Apache Spark, you can limit the amount of data processed at one time by controlling partition sizes, task concurrency, and batch sizes.

This is especially useful when you have a huge dataset (say 1 TiB) but only a small cluster (8 CPU cores and 32 GB RAM).

There are three different things you might want to control:

1. Data per task: How much data one Spark task processes.
2. Concurrent tasks: How many tasks execute simultaneously.
3. Data per batch: How much input the application processes in one iteration or micro-batch.

## 1. Limit data per task using partitions

Suppose you have 1 TB of data and 8 cores.

If you create 8 partitions, each partition averages 128 GiB. That is usually far too much work per task.

Instead, create smaller partitions so Spark processes the dataset in successive waves.

For file-based input:

```
spark.conf.set(
    "spark.sql.files.maxPartitionBytes",
    "128m"
)
```

This sets a 128 MiB maximum target input split size for supported file scans, subject to file format, splitting behavior, and other file-planning settings.

For shuffle operations:

```
spark.conf.set(
    "spark.sql.shuffle.partitions",
    "2000"
)
```

This controls the initial number of partitions for many SQL/DataFrame shuffles. It does not impose a hard byte limit on each partition, and Adaptive Query Execution may change the number at runtime.

## 2. Limit the number of concurrent tasks

Spark generally schedules one task per available executor core for normal single-CPU tasks.

For example:

```
spark-submit \
  --num-executors 2 \
  --executor-cores 2 \
  --executor-memory 8g \
  job.py
```

This configuration provides approximately four concurrent task slots.

[spark-controlled-concurrency]

Simplified illustration: Spark schedules more partitions as task slots become available. Actual concurrency depends on resource availability and task requirements.

This is useful when each task is memory-intensive. Reducing concurrent tasks can lower peak memory pressure, although it may increase total runtime.

## 3. Process large datasets in smaller batches

Partitioning controls task sizes, but it does not stop an entire Spark job from eventually processing all the input data.

If you need to limit the overall input handled by one processing cycle, split the workload into independent batches.

For example, process one date partition at a time:

```
from pyspark.sql import functions as F

days = ["2026-11-01", "2026-11-02", "2026-11-03"]

for day in days:
    df = (
        spark.read.parquet("s3://bucket/orders/")
        .filter(F.col("order_date") == day)
    )
    result = transform(df)
    result.write.mode("append").parquet(
        "s3://bucket/processed/"
    )
```

If the source is physically partitioned by `order_date`, Spark can use partition pruning to read only the required date.

For production, use restartable batches, idempotent writes, and checkpoint or progress tracking so failed batches can be retried safely.

## 4. Limit input per micro-batch in Structured Streaming

For streaming workloads, Spark provides source-specific rate controls.

Kafka:

```
df = (
    spark.readStream
    .format("kafka")
    .option("kafka.bootstrap.servers", "localhost:9092")
    .option("subscribe", "orders")
    .option("maxOffsetsPerTrigger", 100000)
    .load()
)
```

This limits the source to approximately 100,000 Kafka offsets per micro-batch across subscribed partitions.

File-based streaming:

```
df = (
    spark.readStream
    .schema(schema)
    .option("maxFilesPerTrigger", 50)
    .parquet("s3://bucket/input/")
)
```

This processes at most 50 newly discovered files per micro-batch. On Spark versions that support it, alternatively use `maxBytesPerTrigger` to control approximate total input file bytes, but not both options together.

## 5. Additional configurations

| Configuration                                     | What it controls                            |
| ------------------------------------------------- | ------------------------------------------- |
| `spark.sql.files.maxPartitionBytes`               | Planned input bytes per file-scan task      |
| `spark.sql.shuffle.partitions`                    | Number of shuffle partitions                |
| `spark.executor.cores`                            | CPU cores allocated per executor            |
| `spark.task.cpus`                                 | CPU slots required per task                 |
| `spark.sql.adaptive.advisoryPartitionSizeInBytes` | Target partition size for AQE optimizations |
| `maxOffsetsPerTrigger`                            | Kafka records/offsets per micro-batch       |
| `maxFilesPerTrigger`                              | Files per streaming micro-batch             |

One important point: `df.limit(1000)` is not a reliable way to restrict the amount of source data read. It limits the returned rows, but depending on the query plan, Spark may still scan substantially more data.

## Interview-ready answer

> To limit how much data Spark processes at one time, I use three techniques.
>
> First, I control per-task input size using `spark.sql.files.maxPartitionBytes` and tune shuffle partition counts to keep individual tasks manageable.
>
> Second, I control parallel execution through executor cores, executor count, and task CPU requirements to avoid excessive concurrent memory usage.
>
> Third, when necessary, I divide the workload into smaller batches using date partitions, incremental processing, or source-level limits such as Kafka's `maxOffsetsPerTrigger`.
>
> This lets a small cluster process a much larger dataset incrementally without requiring the entire dataset to fit into memory.

Remember: Increasing partitions reduces average data per task, reducing concurrency limits simultaneous memory usage, and batching limits how much new input enters each processing cycle. These solve three different problems.