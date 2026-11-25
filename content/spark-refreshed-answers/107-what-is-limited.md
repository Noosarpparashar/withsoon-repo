# What exactly is being limited?

In Spark, what gets limited depends on the configuration. There are three different limits:

1. **Data per task:** How much data one task is assigned to process.
2. **Concurrent tasks:** How many tasks can run simultaneously.
3. **Data per batch:** How much input is processed in one processing cycle.

Let's take an example:

- Total dataset: **1 TiB**
- Cluster: **8 CPU cores**
- Input partition size: **128 MiB**

## 1. `spark.sql.files.maxPartitionBytes = 128m`

This controls the planned input split size per task, not the total data processed by Spark. It is a file-scan planning target, subject to file format, splittability, file-open costs, and other planning settings.

For a 1 TiB splittable dataset, Spark might create roughly **8,192 input partitions**, ignoring file overhead and other planning effects.

Each task is assigned approximately 128 MiB of input, although the actual in-memory data can be much larger after decompression.

## 2. `spark.executor.cores` and executor count

These control how many tasks can run simultaneously.

Suppose you have **2 executors with 4 cores each**.

[spark-eight-task-executors]

Spark can run approximately eight normal single-core tasks at once, assuming all slots are available.

If each task reads around 128 MiB:

`8 tasks x 128 MiB = 1,024 MiB = 1 GiB of assigned input`

Approximately 1 GiB of input data is assigned to concurrently running tasks.

However, this is **not a 1 GiB RAM limit**. Joins, aggregations, decompression, caching, and shuffle operations can consume substantially more memory. Tasks can also stream through their input rather than loading each whole partition into memory.

## 3. `spark.sql.shuffle.partitions = 2000`

This limits neither total data nor memory directly.

It controls the initial number of partitions produced for many shuffle operations.

If a shuffle contains 1 TiB of data:

`1,024 GiB / 2,000 = 0.512 GiB = 524.288 MiB per partition`

Each downstream reduce task handles approximately **524 MiB on average**, assuming uniform distribution. AQE may change the partition count, and skew can make individual partitions much larger than the average.

## 4. `maxOffsetsPerTrigger = 100000`

This controls the maximum approximate Kafka input offsets per micro-batch, not bytes, memory, or total records processed over the application's lifetime.

Spark processes another batch after completing the current one, according to the query's trigger settings.

## The important distinction

| Setting | What is actually limited? |
| --- | --- |
| `spark.sql.files.maxPartitionBytes` | Planned file-scan input bytes per partition |
| `spark.sql.shuffle.partitions` | Initial number of shuffle partitions, not bytes |
| `spark.executor.cores` | Cores available per executor for concurrent task execution |
| `spark.executor.memory` | JVM heap allocated to each executor; excludes separate overhead and off-heap allocations |
| `maxOffsetsPerTrigger` | Kafka offsets consumed per micro-batch |
| Date-wise batching | Logical amount of input processed per batch |

If you have 1 TiB of data and only 16 GiB of RAM, Spark does not need to load the entire dataset into memory. It processes partitions in successive tasks, and memory-intensive operators may spill intermediate data to disk.

**Key takeaway:** Neither partition sizing nor task concurrency imposes a strict memory limit per task.
