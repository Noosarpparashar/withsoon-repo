# What happens when there are too few partitions?

When Spark has too few partitions, it suffers from underutilized CPU cores, larger tasks, increased memory pressure, reduced parallelism, and potentially slower execution.

Even if the cluster has powerful executors, Spark cannot fully utilize them without enough tasks.

## 1. Poor CPU utilization

Suppose your Spark cluster has:

- 10 executors
- 4 cores per executor
- Total CPU cores: 40
- Number of partitions: 8

Spark creates only 8 tasks for a stage with 8 partitions.

[spark-idle-slots]

The remaining 32 cores cannot process partitions that don't exist.

## 2. Larger partitions increase memory pressure

Suppose we have 100 GiB of data.

| Number of partitions | Average partition size |
| -------------------- | ---------------------- |
| 8                    | 12.5 GiB                |
| 40                   | 2.5 GiB                 |
| 400                  | 256 MiB                 |
| 800                  | 128 MiB                 |

With only 8 partitions, each task processes approximately 12.5 GiB.

This can cause:

- Excessive memory usage during joins and aggregations.
- More garbage collection.
- Memory and disk spilling.
- Out-of-memory errors.

However, large input partitions do not automatically cause OOM. Streaming and pipelined operations can process large amounts of input without holding everything in memory.

## 3. Increased execution time

Suppose:

- 100 GiB of data
- 40 available CPU cores
- Each task processes 100 MiB/s
- Ignore scheduling and I/O overhead

| Partitions | Concurrent tasks | Idealized execution time |
| ---------- | ---------------- | ------------------------ |
| 8          | 8                | 128 seconds              |
| 40         | 40               | 25.6 seconds               |
| 400        | 40               | 25.6 seconds               |

With 8 partitions, Spark cannot use all 40 cores.

With 40 partitions, all cores can participate.

With 400 partitions, Spark executes multiple waves, but the theoretical processing time remains similar.

This example assumes linear scaling and uniform tasks. Real execution times depend on resource contention, memory, I/O, and scheduling overhead.

## 4. Poor fault recovery

Spark provides fault tolerance through lineage and task re-execution.

If a task processing a very large partition fails, Spark may need to recompute a substantial amount of work.

With smaller partitions, the amount of work lost when an individual task fails is often lower.

For example:

- 8 partitions: a failed task may need to reprocess 12.5 GiB.
- 400 partitions: a failed task may need to reprocess only 256 MiB.

The actual recovery work depends on the stage, shuffle materialization, caching, and lineage.

## 5. Increased impact of data skew

Too few partitions can make imbalanced workloads harder to distribute.

Suppose one partition contains 60 GiB while the remaining seven together contain 40 GiB.

Even if seven tasks finish quickly, the stage must wait for the largest task.

This is called a straggler problem.

Increasing partition count can sometimes improve load balancing, but simply increasing partitions will not necessarily fix skew caused by a heavily concentrated join or aggregation key.

## How do you identify too few partitions in Spark UI?

| Spark UI observation                    | Possible interpretation             |
| --------------------------------------- | ----------------------------------- |
| Fewer active tasks than available cores | Insufficient parallelism            |
| Very large input per task               | Partitions may be too large         |
| High memory/disk spill                  | Memory-intensive tasks              |
| Very long task duration                 | Large partitions or slow operations |
| Several executors remain idle           | Work isn't sufficiently distributed |
| A few tasks dominate stage completion   | Data skew or oversized partitions   |

## Interview-ready answer

> When Spark has too few partitions, it cannot fully utilize the available CPU cores because each partition generally corresponds to one task per stage.

> For example, if my cluster has 40 cores but only 8 partitions, Spark can run only 8 tasks concurrently, leaving 32 cores without tasks from that stage.

> Additionally, each task processes more data, which can increase memory pressure, garbage collection, spilling, and execution time.

> Too few partitions can also make fault recovery more expensive because failed tasks may need to recompute larger amounts of data.

> To address this, I would increase partitions using `repartition()`, tune shuffle partitioning where appropriate, and monitor CPU utilization, task duration, and memory spill through Spark UI.

**Key takeaway:** Too few partitions limit parallelism and can create oversized tasks. However, increasing partitions beyond what the workload needs also introduces overhead, so the objective is balanced task sizes and sufficient parallelism—not simply maximizing partitions.