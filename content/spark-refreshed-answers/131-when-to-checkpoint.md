# When should you use checkpointing?

You should use **checkpointing when a Spark application has long lineage, expensive transformations, iterative computations, or benefits from a reliable intermediate recovery point.**

## 1. When the lineage becomes too long

Transformations add dependencies or logical-plan nodes. Optimizers may simplify them, but iterative construction can still create a very large plan.

```python
from pyspark.sql.functions import col

spark.sparkContext.setCheckpointDir("s3://bucket/checkpoints/")
df = spark.read.parquet("s3://bucket/data")

for i in range(100):
    df = df.withColumn("value", col("value") + 1)

    # Checkpoint after each group of 20 iterations.
    if (i + 1) % 20 == 0:
        df = df.checkpoint(eager=True)
```

After many transformations, the dependency chain can become very long.

**Problem:**

- Spark must maintain a complex execution plan.
- Query planning can become slow.
- Recovering lost partitions may require expensive recomputation.

**Solution:** Periodic checkpointing truncates lineage and the returned DataFrame's logical plan. This is an illustration of placement, not a recommendation to checkpoint every 20 simple column updates; choose the interval from measured planning and recovery costs.

## 2. During iterative computations

Checkpointing is particularly useful for iterative algorithms such as:

- Graph processing (PageRank).
- Machine learning algorithms.
- Repeated data transformations.
- Iterative ETL pipelines.

For example, after configuring the checkpoint directory:

```python
for i in range(100):
    df = perform_transformation(df)

    if (i + 1) % 10 == 0:
        df = df.checkpoint(eager=True)
```

Here, `perform_transformation` represents your application-specific transformation.

Without checkpointing, each iteration can extend the lineage. With checkpointing, Spark periodically creates a new starting point.

## 3. When recomputation is expensive

Suppose a Spark pipeline contains:

[spark-reference:expensive-pipeline-checkpoint]

If an executor fails after the checkpoint has been successfully materialized, Spark can reload checkpointed partitions instead of recomputing the expensive joins and aggregations.

This is valuable when earlier transformations are costly. However, checkpointing itself introduces additional execution and storage I/O. RDD/DataFrame checkpointing does not automatically restart a failed driver or resume arbitrary application code.

## 4. When Spark's execution plan becomes excessively complex

Very long transformation chains, especially those involving repeated joins, unions, or iterative DataFrame operations, can produce extremely large logical plans.

This can lead to:

- Slow query optimization.
- High driver memory usage.
- Increased planning overhead.
- Stack overflow errors in extreme cases.

Checkpointing truncates the logical plan and can reduce planning overhead for subsequent operations.

## 5. In Structured Streaming applications

Structured Streaming uses checkpointing to recover query progress and state after failures.

For example, with `df` representing a streaming DataFrame:

```python
query = (
    df.writeStream
      .format("parquet")
      .option("path", "s3://bucket/output/")
      .option(
          "checkpointLocation",
          "s3://bucket/streaming-checkpoints/orders/"
      )
      .start()
)
```

Spark uses the checkpoint directory to persist information such as:

- Processed offsets and batch progress.
- State-store data for stateful operations.
- Query metadata needed for recovery.

If the streaming application restarts, Spark can use this information to resume processing, subject to source, sink, and query-change compatibility. Give each streaming query a dedicated checkpoint location; do not share it with batch RDD/DataFrame checkpoints.

**Important:** Structured Streaming checkpointing is different from RDD/DataFrame checkpointing. It is especially important for production streaming queries requiring reliable recovery.

## 6. When should you NOT use checkpointing?

Avoid unnecessary checkpointing when:

- Your pipeline contains only a few transformations.
- The lineage is short and recomputation is inexpensive.
- You only want to reuse the same DataFrame multiple times (prefer `cache()` or `persist()`).
- Checkpoint storage overhead exceeds the recovery or planning benefits.
- You do not need to truncate lineage.

## Cache vs. checkpoint: When to choose?

| Situation | Recommended |
| --- | --- |
| Reuse a DataFrame multiple times | Cache / Persist |
| Very long lineage | Checkpoint |
| Iterative algorithms with growing lineage | Periodic checkpoint |
| Expensive transformations with high recovery cost | Consider reliable checkpointing |
| Short ETL pipeline without reuse | Usually neither |
| Recover production streaming query progress | Streaming checkpoint |
| Improve repeated query performance | Cache / Persist |

## Interview-ready answer

> Use checkpointing in Spark when the lineage becomes too long, recomputation is expensive, or iterative transformations produce complex execution plans. Checkpointing materializes intermediate results to reliable storage and truncates lineage, improving recovery efficiency and reducing planning complexity.
>
> In Structured Streaming, checkpointing is used to preserve offsets, progress, and state so that queries can recover after failures.

**Key distinction:** Caching is primarily for performance optimization, while checkpointing is primarily for fault tolerance and lineage management.
