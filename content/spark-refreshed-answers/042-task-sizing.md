# How large should each task be to avoid out-of-memory errors and slow execution?

As a starting point, I generally target 128–256 MiB of input data per partition, but the optimal size depends on executor memory, concurrent tasks, transformations, and data distribution.

**Important:** A 256 MiB partition does not mean the task consumes only 256 MiB of RAM. Its memory usage can be much higher because of decompression, aggregation, sorting, joins, and intermediate objects.

## 1. Recommended partition sizes

| Workload                                | Starting partition size           |
| --------------------------------------- | --------------------------------- |
| Memory-intensive joins and aggregations | 64–128 MiB                         |
| General ETL transformations             | 128–256 MiB                        |
| Simple scans and filtering              | 128–256 MiB, potentially larger    |
| CPU-intensive transformations           | Benchmark 64–256 MiB               |
| Highly skewed data                      | Smaller, more balanced partitions |

These are practical starting ranges, not hard limits. Spark's default `spark.sql.files.maxPartitionBytes` is 128 MiB for file-based reads.

## 2. Understand how executor memory affects tasks

Suppose you have:

- 1 executor
- 4 CPU cores
- 8 GiB executor heap
- 4 concurrent tasks

[spark-shared-task-memory]

A simplified capacity calculation is:

**8 GiB ? 4 tasks = 2 GiB per task (arithmetic average only)**

However, 2 GiB is only an arithmetic average, not the actual usable memory allowance per task. The JVM, cached data, Spark internal structures, and execution overhead also require memory.

## 3. Why can a 256 MiB partition cause OOM?

Consider a task processing 256 MiB of compressed Parquet data.

| Processing step                     | Illustrative memory |
| ----------------------------------- | ------------------- |
| Compressed input                    | 256 MiB              |
| Decoded data and objects | 0.8 GiB |
| Aggregation or hash structures      | 1.2 GiB              |
| Additional intermediate allocations | 0.4 GiB |
| Total potential working set         | 2.4 GiB              |

These figures are illustrative, not fixed multipliers. The 2.4 GiB total assumes the decoded data, aggregation structures, and additional allocations are simultaneously resident; it excludes the compressed input size. Actual memory usage depends heavily on the query plan and data.

If four such tasks execute simultaneously on an 8 GiB executor, memory pressure could become severe.

This is why partition size alone cannot guarantee that a task will avoid OOM.

## 4. How do you find the right size?

I would test partition sizes and inspect Spark UI metrics.

| Spark UI metric           | What it tells you                                             |
| ------------------------- | ------------------------------------------------------------- |
| Task duration             | Whether tasks are unusually short or long                     |
| Input size / shuffle read | How much data each task processes                             |
| Memory spill              | Whether execution data spills due to insufficient memory      |
| Disk spill                | How much data is written to disk during processing            |
| Peak execution memory     | Peak tracked execution-memory usage                           |
| GC time                   | Whether excessive garbage collection is affecting performance |

If tasks have excessive memory spill or OOM errors, I would investigate skew and memory-intensive operators, then consider increasing the partition count to reduce per-task data.

If thousands of tiny tasks are spending more time on scheduling overhead than processing, I would consider reducing partition count.

Spark's tuning guide also recommends increasing parallelism when reduce tasks have overly large working sets.

## 5. Practical example: 100 GiB on 40 cores

| Partition size | Partitions | Approx. task waves |
| -------------- | ---------- | ------------------ |
| 64 MiB          | 1,600      | 40                 |
| 128 MiB         | 800        | 20                 |
| 256 MiB         | 400        | 10                 |
| 512 MiB         | 200        | 5                  |

These wave counts assume 40 task slots are consistently available.

I would generally start with 128 or 256 MiB, benchmark the execution time and memory behavior, and adjust accordingly.

## Interview-ready answer

> I generally start with 128–256 MiB of data per partition for Spark ETL workloads.

> However, partition size and actual task memory consumption are different. A 256 MiB partition can consume significantly more memory during joins, aggregations, or sorting.

> I consider executor heap memory, the number of concurrent tasks, data skew, and transformation complexity.

> For memory-intensive workloads, I may reduce partition sizes to 64–128 MiB. For simpler transformations, larger partitions may work efficiently.

> Finally, I use Spark UI metrics such as task duration, memory spill, disk spill, and garbage collection time to identify the optimal partition size.

> My objective is to keep tasks large enough to avoid excessive scheduling overhead, but small enough to prevent memory pressure and long-running tasks.

**Key takeaway:** A task's memory requirement depends on its working set, not just its input partition size. Partition sizing, execution parallelism, and memory usage must be tuned together.