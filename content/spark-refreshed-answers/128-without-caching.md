# What happens when the data is not cached or persisted?

When a DataFrame or RDD is **not cached or persisted**, Spark generally recomputes its transformations whenever a new action needs the data.

Spark does not automatically retain the final computed dataset for reuse across separate actions.

## 1. Example without caching

```python
df = spark.read.parquet("s3://bucket/sales/")

filtered_df = (
    df.filter(df.amount > 1000)
      .groupBy("customer_id")
      .sum("amount")
)

filtered_df.count()
filtered_df.show()
filtered_df.write.parquet("s3://bucket/output/")
```

Here, three actions are executed: `count()`, `show()`, and the Parquet write.

**What happens internally?**

| Action | Spark execution |
| --- | --- |
| `count()` | Executes the required read, filter, and grouping work; the optimizer may prune unnecessary aggregate calculations. |
| `show()` | Re-executes the required transformations to display rows. |
| Parquet write | Re-executes the transformations and writes the output. |

Spark may optimize each action differently, and `show()` may process only enough data to return the requested rows. Upstream shuffles can still require substantial work. One action can trigger multiple jobs.

## 2. Without cache vs. with cache

[spark-reference:uncached-vs-cached-actions]

**Without caching:** Each action may repeat source reads and transformations.

**With caching:** Once materialized, cached partitions can be reused by subsequent actions while the blocks remain available.

## 3. Does Spark store anything temporarily without caching?

**Yes.** Even without explicit caching, Spark uses memory and disk during execution.

- **Task processing:** Executors hold rows, batches and other working data in memory.
- **Shuffle operations:** Spark can write intermediate shuffle blocks to local disk for joins, `groupBy` and repartitioning.
- **Aggregation and sorting:** Spark uses execution memory and may spill temporary data to disk.
- **Output:** Results are written to their specified destination, such as S3 or HDFS.

These temporary data structures are different from an explicitly cached DataFrame. Some shuffle files may survive across actions while Spark still needs them, but they are not a general-purpose cache of the final result.

## 4. Does Spark immediately delete the data after an action?

Not necessarily.

- Temporary task memory becomes available for reuse.
- Shuffle files may remain until Spark no longer needs them and cleanup occurs.
- The DataFrame definition and its logical plan remain available as long as they are referenced.
- The actual computed rows are generally not retained as a reusable dataset unless explicitly cached or otherwise materialized.

## 5. What if the data is too large to fit in memory?

Spark **does not need the complete dataset in memory** to process it.

It processes partitions through tasks, potentially in multiple waves, according to available executor resources.

For example, Spark can process a 1 TB dataset on a cluster with 32 GB of executor memory by reading and processing partitions incrementally, using disk spills where necessary. Success still depends on per-task working sets, skew, operator behavior, and sufficient disk space; spilling does not prevent every memory failure.

## Interview-ready answer

> When data is not cached or persisted, Spark generally recomputes the required transformations for each action using the execution plan and lineage. It uses executor memory and temporary disk storage during processing, especially for shuffles, sorting and aggregations, but it does not automatically retain the final computed dataset for reuse. Caching avoids repeated computations when the same data is accessed multiple times.
