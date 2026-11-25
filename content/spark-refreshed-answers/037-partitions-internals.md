# How does Spark use partitions internally?

Spark uses partitions as the fundamental units of parallel data processing. Internally, Spark divides datasets into partitions, creates tasks for those partitions, schedules tasks on executors, and processes them concurrently.

A key principle is:

**1 partition = 1 task per stage**, although the same partition may be processed again if a task is retried or recomputed.

## 1. How partitions are processed internally

[spark-partition-scheduling]

## 2. Internal execution step by step

Consider this PySpark code:

```python
df = spark.read.parquet("/data/sales")
result = (
    df.filter("amount > 1000")
      .groupBy("country")
      .count()
)
result.show()
```

### Step 1: Spark determines input partitions

When reading Parquet files, Spark determines how to split file data into input partitions, considering factors such as file sizes, splittability, and scan configuration.

### Step 2: Spark builds the execution plan

The Driver constructs and optimizes the logical and physical plans. When `show()` triggers execution, Spark schedules jobs and stages.

### Step 3: Tasks process partitions

For the scan stage, Spark creates tasks corresponding to input partitions. Each task reads its assigned partition and applies the filter.

### Step 4: Shuffle redistributes data

The `groupBy("country")` generally requires a shuffle. Records are distributed into shuffle partitions based on the grouping key.

### Step 5: Reduce-side tasks process shuffle partitions

Each downstream task fetches the required shuffle blocks and aggregates records belonging to its partition.

### Step 6: Results are returned

Spark executes the necessary tasks to return the rows requested by `show()`.

## 3. How narrow and wide transformations use partitions

| Transformation  | Internal partition behavior                                     |
| --------------- | --------------------------------------------------------------- |
| `filter()`      | Processes existing partitions independently                     |
| `map()`         | Processes each partition independently                          |
| `select()`      | Typically preserves partition distribution                      |
| `groupBy()`     | Generally redistributes data across shuffle partitions          |
| `join()`        | May require shuffling both datasets, depending on join strategy |
| `repartition()` | Redistributes data, generally through a shuffle                 |
| `coalesce()`    | Usually combines existing partitions without a shuffle          |

Narrow transformations can often be pipelined within the same stage. Shuffle boundaries generally separate stages.

## 4. What happens to partitions during a shuffle?

Suppose Stage 1 has 4 partitions and Stage 2 has 3 shuffle partitions.

[spark-partition-shuffle]

Internally:

1. Map tasks process their input partitions.
2. Records are assigned to target shuffle partitions.
3. Map tasks write shuffle data, often spilling to disk when necessary.
4. Reduce-side tasks fetch shuffle blocks, potentially over the network.
5. Each reduce-side task processes one shuffle partition.

This is why shuffling is usually more expensive than narrow transformations.

## 5. How Spark uses partitions for fault tolerance

Suppose an executor fails while processing Partition 3.

Spark does not necessarily restart the entire job.

For an RDD-based computation, Spark can use lineage to recompute the lost partition from its dependencies. For shuffled data, lost map outputs may need to be regenerated, potentially rerunning tasks from an earlier stage.

Other successfully completed partitions may remain reusable.

## 6. Are partitions stored in memory?

Not necessarily.

A partition is a logical unit of data processing, not a dedicated block permanently stored in RAM.

Depending on the workload, partition data may be:

- Read from external storage such as S3 or HDFS.
- Processed as an iterator or streamed through operators.
- Materialized during caching.
- Spilled to disk during memory-intensive operations.
- Stored as shuffle output for downstream stages.

Spark does not need to load every record of a partition into memory simultaneously.

## 7. How partition count influences task scheduling

Suppose a stage has 200 partitions and the cluster has 40 available task slots.

Spark can run approximately 40 partition tasks concurrently, assuming resource availability.

That means tasks execute in roughly 5 waves:

**Task waves ? ceil(200 / 40) = 5**

Actual execution depends on resource availability, task durations, skew, retries, and scheduler behavior.

## Interview-ready answer

> Spark internally represents distributed datasets as partitions and schedules one task per partition within each stage. The Driver coordinates task scheduling, while executors process partitions in parallel. Narrow transformations operate independently on partitions and can be pipelined, whereas wide transformations often redistribute data through shuffle partitions. Spark also uses partition lineage and shuffle metadata for fault recovery. The number and distribution of partitions directly affect parallelism, memory usage, task scheduling, and overall execution performance.

**Key point:** Spark does not execute a DataFrame as one large unit. It executes a distributed physical plan through stages, with tasks processing partitions independently wherever possible.