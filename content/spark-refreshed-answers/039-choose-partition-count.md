# How do you decide the number of Spark partitions?

The optimal number of Spark partitions depends on data size, available CPU cores, memory, operation type, and data distribution.

The goal is to achieve maximum parallelism without creating too many small tasks or too few large tasks.

## 1. Calculate based on data size

A common starting point is to target approximately 128 MiB–256 MiB per partition for large datasets.

**Partitions = ceil(Total data size ? Target partition size)**

For example, suppose we have 100 GiB of data.

| Target partition size | Number of partitions |
| --------------------- | -------------------- |
| 64 MiB                 | 1,600                |
| 128 MiB                | 800                  |
| 256 MiB                | 400                  |
| 512 MiB                | 200                  |

For 100 GiB, I might initially choose 400–800 partitions and benchmark the performance.

These are tuning guidelines, not fixed Spark requirements.

## 2. Calculate based on available CPU cores

Ideally, we want enough partitions to keep all executor cores busy.

A common starting point is 2–4 partitions per available core, although Spark's own tuning documentation recommends approximately 2–3 tasks per core.

Suppose:

- Number of executors: 10
- Cores per executor: 4
- Total available cores: 40

[spark-partition-sizing]

This suggests starting with at least 80–160 partitions for sufficient task parallelism, assuming enough work exists.

For a 100 GiB dataset, however, 400 partitions of approximately 256 MiB may be more appropriate. Spark can execute these in multiple waves.

## 3. Consider the type of operation

Different Spark operations require different partitioning strategies.

| Operation          | Partitioning consideration                      |
| ------------------ | ----------------------------------------------- |
| Reading Parquet    | Input splits, file sizes and scan configuration |
| `filter`, `select` | Usually preserve existing partition count       |
| `groupBy`, `join`  | Shuffle partitions affect task sizes            |
| Writing Parquet    | Balance output file size and file count         |
| Skewed joins       | Handle uneven partitions, not just their count  |

Important configurations:

```python
# File scan partition sizing (128 MiB default)
spark.conf.set("spark.sql.files.maxPartitionBytes", 134217728)

# Initial shuffle partitions (200 default)
spark.conf.set("spark.sql.shuffle.partitions", 400)

# Enable Adaptive Query Execution
spark.conf.set("spark.sql.adaptive.enabled", "true")
```

These defaults are documented by Apache Spark.

## 4. Use Adaptive Query Execution (AQE)

With AQE, Spark can dynamically coalesce small post-shuffle partitions using runtime statistics.

For example:

[spark-aqe-partition-sizing]

Example only. AQE chooses the actual count based on runtime statistics and configuration.

AQE is enabled by default in modern Spark versions and reduces the need to manually tune every shuffle partition count.

## 5. Monitor performance and adjust

I would inspect the Spark UI and look for:

- Too few partitions: Idle CPU cores, long-running tasks and possible memory pressure.
- Too many partitions: Excessive scheduling overhead and numerous tiny tasks.
- Uneven partitions: Some tasks finishing quickly while others run significantly longer.
- Large spill: Tasks spilling data to disk because memory is insufficient.

If necessary:

```python
# Increase or redistribute partitions (shuffle)
df = df.repartition(400)

# Reduce partitions without a full shuffle
df = df.coalesce(100)

# Check partition count
print(df.rdd.getNumPartitions())
```

`repartition()` performs a shuffle, while `coalesce()` normally reduces partitions using a narrow dependency.

## Interview-ready answer

> I decide the number of Spark partitions based on data volume, available executor cores, and the type of workload.

> I generally start with a target partition size of 128–256 MiB and ensure enough partitions to utilize all available CPU cores, typically targeting at least 2–3 tasks per core.

> For example, with 100 GiB of data and a target of 256 MiB, I would start with approximately 400 partitions.

> For shuffle-heavy operations, I tune `spark.sql.shuffle.partitions` and enable AQE to dynamically optimize post-shuffle partitions.

> Finally, I validate my configuration using Spark UI metrics such as task duration, CPU utilization, shuffle spill, and data skew rather than relying on a fixed formula.

**Key takeaway:** The correct partition count is a balance between data size, cluster parallelism, task overhead, and memory usage.