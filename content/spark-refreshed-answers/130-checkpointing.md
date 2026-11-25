# What is checkpointing in Spark?

**Checkpointing in Apache Spark is a fault-tolerance mechanism that saves the computed data of an RDD or DataFrame to reliable storage, such as HDFS or Amazon S3, and truncates its lineage or logical plan.**

This allows Spark to recover data from the checkpoint instead of recomputing all previous transformations if intermediate data is lost. The storage location must be accessible to the application and configured with the appropriate filesystem connector and permissions.

## 1. Why is checkpointing needed?

Spark uses **lineage** to track how data was created.

Consider:

```python
df1 = spark.read.parquet("s3://bucket/input/")
df2 = df1.filter("age > 25")
df3 = df2.groupBy("city").count()
df4 = df3.filter("count > 100")
df5 = df4.orderBy("count")
```

Without checkpointing, Spark maintains the dependencies connecting these transformations.

[spark-reference:lineage-before-checkpoint]

If the lineage becomes extremely long, recovery can become expensive because Spark may need to repeat many transformations.

Checkpointing solves this by saving the intermediate result and creating a new starting point. For DataFrames, truncating an increasingly complex logical plan can also reduce planning overhead.

## 2. How does checkpointing work?

```python
spark.sparkContext.setCheckpointDir("s3://bucket/checkpoints/")

df1 = spark.read.parquet("s3://bucket/input/")
df2 = df1.filter("age > 25")
df3 = df2.groupBy("city").count()

# Use the returned checkpointed DataFrame.
df3 = df3.checkpoint(eager=True)

df4 = df3.filter("count > 100")
df5 = df4.orderBy("count")
```

Internally:

1. Spark executes the transformations required to produce `df3`.
2. Spark writes the checkpointed data to the configured storage.
3. After successful materialization, Spark truncates the checkpointed DataFrame's logical plan and underlying lineage at the checkpoint boundary.
4. Subsequent transformations use the returned checkpointed result as their starting point.
5. If intermediate data is lost, Spark can read it from the checkpoint rather than recomputing the earlier transformations.

[spark-reference:lineage-after-checkpoint]

**API distinction:** DataFrame `checkpoint(eager=True)` materializes immediately and returns a new DataFrame. RDD `checkpoint()` marks an RDD for checkpointing; an action is needed to materialize it.

## 3. Checkpoint vs. Cache vs. Persist

| Feature | Cache / Persist | Reliable checkpoint |
| --- | --- | --- |
| Purpose | Improve performance by reusing computed data | Fault tolerance and lineage truncation |
| Storage | Executor memory and/or local disk, depending on level | Configured reliable storage |
| Removes lineage | No | Yes, after successful materialization |
| Cached/intermediate data lost | Can recompute from accessible lineage or use surviving copies | Can reload from the available checkpoint |
| Main use | Repeatedly accessed datasets | Long dependency chains, complex plans, and recovery |

## 4. Types of checkpointing

Spark supports two checkpointing approaches for RDDs and DataFrames.

### Reliable checkpointing

- Writes data to a configured reliable filesystem.
- Truncates lineage after successful checkpoint materialization.
- Supports recovery from executor failures.
- Introduces storage I/O overhead.

### Local checkpointing

```python
df = df.localCheckpoint(eager=True)
```

- Stores checkpoint data using the executors' caching subsystem.
- Truncates lineage without writing to a reliable checkpoint directory.
- Usually faster than reliable checkpointing.
- Not reliably fault-tolerant: losing the required executor data can cause job failure because the earlier lineage is no longer available for recomputation.

## 5. When should you use checkpointing?

Checkpointing is particularly useful when:

- A Spark application has a very long lineage.
- You perform iterative computations, such as graph algorithms or machine learning.
- Recomputing earlier transformations would be expensive.
- Spark's logical plan becomes excessively complex.
- You need a reliable recovery point for intermediate computations.

**Important:** Checkpointing is not required for every Spark application. It adds storage and computation overhead, so use it selectively. RDD/DataFrame checkpoints do not automatically restart a failed driver or resume arbitrary application code.

## Interview-ready answer

> Checkpointing in Spark is a fault-tolerance mechanism that materializes intermediate data to reliable storage and truncates its lineage. Unlike caching, which primarily improves performance while retaining lineage, checkpointing creates a new recovery point. It is particularly useful in iterative algorithms, long transformation pipelines, and applications with expensive recomputation.

**Note:** In Structured Streaming, checkpointing also stores progress and state information, such as processed offsets and state-store data, to support recovery after failures. This is different from DataFrame/RDD lineage checkpointing.
