# How do you decide spark.sql.shuffle.partitions?

The best way to decide `spark.sql.shuffle.partitions` is to consider three factors:

1. Shuffle data size: How much data needs to be redistributed?
2. Cluster CPU cores: How many tasks can execute simultaneously?
3. Target partition size: How much data should each task process?

The objective is to create enough partitions to maximize parallelism without producing excessively small tasks or overloading executor memory.

## 1. Calculate based on shuffle data size

A common starting formula is:

**Shuffle partitions = ceil(Estimated shuffle data size ? Target partition size)**

For many workloads, 100–200 MiB per partition is a reasonable initial target, not a universal optimal value.

Suppose your shuffle produces 100 GiB of data.

| Target partition size | Number of partitions |
| --------------------- | -------------------- |
| 100 MiB               | 1,024                |
| 128 MiB               | 800                  |
| 200 MiB               | 512                  |
| 256 MiB               | 400                  |

With a 128 MiB target:

**(100 ? 1024 MiB) ? 128 MiB = 800 partitions**

```python
spark.conf.set("spark.sql.shuffle.partitions", 800)
```

**Important:** Use the estimated shuffle output size, not necessarily the original input size. A `groupBy()` aggregation may reduce 100 GiB of input into only 5 GiB of shuffle data.

## 2. Consider the total CPU cores

Suppose your cluster has:

- 10 executors
- 4 CPU cores per executor
- Total = 40 available task slots, assuming one CPU per task

With 800 shuffle partitions:

**Approximate task waves = 800 ? 40 = 20**

Spark processes approximately 40 tasks concurrently, completing the 800 tasks in at least 20 waves.

Having 800 partitions on a 40-core cluster is not inherently inefficient. Each task may process a manageable amount of data, and tasks run in multiple waves.

However, if you create 10,000 partitions for just 1 GiB of shuffle data, scheduling overhead can dominate useful computation.

## 3. Reconcile the CPU-core rule with the partition-size rule

A common heuristic is to have at least 2–4 tasks per available CPU core, provided there is enough data to keep those tasks reasonably sized.

For 40 CPU cores:

**40 ? (2?4) = 80?160 partitions**

But suppose the shuffle contains 100 GiB:

| Method                           | Suggested partitions |
| -------------------------------- | -------------------- |
| CPU-core heuristic               | 80–160               |
| 128 MiB partition-size heuristic | 800                  |

Which should you choose?

Start closer to 800 because using only 160 partitions would produce approximately 640 MiB of shuffle data per task, potentially increasing memory pressure, spilling, and task duration.

The CPU-core heuristic helps ensure parallelism. The partition-size heuristic helps control the workload per task.

Neither is a hard rule.

## 4. Use Adaptive Query Execution (AQE)

In modern Spark, AQE can automatically merge small shuffle partitions using runtime statistics. It is enabled by default in Apache Spark 3.2 and later.
For example:

```python
spark.conf.set("spark.sql.shuffle.partitions", 800)
spark.conf.set("spark.sql.adaptive.enabled", "true")
spark.conf.set("spark.sql.adaptive.coalescePartitions.enabled", "true")
spark.conf.set("spark.sql.adaptive.advisoryPartitionSizeInBytes", 128 * 1024 * 1024)
spark.conf.set("spark.sql.adaptive.coalescePartitions.parallelismFirst", "false")
```

Here:

- 800 is the initial shuffle partition count.
- AQE can coalesce partitions if the actual shuffle output is smaller than expected.
- 128 MiB is the advisory target size.
- `parallelismFirst=false` makes the advisory partition size influence coalescing more directly.
AQE does not guarantee perfectly equal-sized partitions, and coalescing alone does not solve data skew.

## 5. Validate using Spark UI

After running the job, inspect the shuffle stage in Spark UI.

| Metric                     | What to look for                                                |
| -------------------------- | --------------------------------------------------------------- |
| Shuffle read size          | Are individual tasks reading excessively large amounts of data? |
| Task duration              | Are tasks too short or unusually long?                          |
| Spill (memory/disk)        | Are tasks spilling heavily?                                     |
| Task count                 | Is scheduling overhead significant?                             |
| Task duration distribution | Is data skew causing straggler tasks?                           |

Tune the configuration based on the actual execution results, not just a formula.

## Interview-ready answer

> I decide `spark.sql.shuffle.partitions` based primarily on the estimated shuffle data size, target partition size, and available cluster cores. I typically start with a target of around 100–200 MiB per partition and ensure there are enough tasks to utilize the cluster efficiently. For example, a 100 GiB shuffle with a 128 MiB target would require approximately 800 partitions. With AQE enabled, Spark can automatically coalesce smaller partitions using runtime statistics. Finally, I validate the configuration using Spark UI metrics such as shuffle read size, task duration, and disk spilling.

**Key takeaway:** Size-based partitioning determines how much work each task performs, while CPU cores determine how much of that work can execute concurrently.