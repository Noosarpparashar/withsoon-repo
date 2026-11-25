# How does Spark manage memory?

Apache Spark manages memory using a **Unified Memory Management (UMM)** model, which dynamically shares available memory between computation and data storage.

The main goal is to **process large datasets efficiently, minimize disk I/O, and prevent out-of-memory errors.**

## 1. Main types of memory in Spark

Spark primarily divides executor JVM heap memory into three categories:

| Memory type          | Purpose                             | Examples                                                   |
| -------------------- | ----------------------------------- | ---------------------------------------------------------- |
| **Execution Memory** | Performing computations             | Joins, sorting, aggregations, shuffle processing           |
| **Storage Memory**   | Storing reusable data               | Cached DataFrames, persisted RDDs, broadcast blocks        |
| **User Memory**      | Other application and Spark objects | User-defined objects, internal metadata, temporary objects |

### Spark executor memory structure

[spark-reference:unified-memory-layout]

## 2. How Unified Memory Management works

Earlier versions of Spark used relatively fixed memory allocations. Modern Spark uses a unified memory pool that enables execution and storage to share memory dynamically.

For example:

Suppose an executor has **6 GiB of unified memory**.

- If execution needs 5 GiB and storage uses 1 GiB, Spark can accommodate both.
- If execution needs additional space, Spark may evict cached blocks from storage.
- If execution is using only 1 GiB, storage may use much of the remaining memory.
- Storage cannot forcibly evict memory currently being used by execution tasks.

An important detail: Spark protects a configurable minimum region of cached data from execution-driven eviction. This is controlled by `spark.memory.storageFraction`.

## 3. How Spark calculates available memory

Two important configurations determine the managed memory structure:

| Configuration                  | Default | Meaning                                                                          |
| ------------------------------ | ------- | -------------------------------------------------------------------------------- |
| `spark.memory.fraction`        | `0.6`   | Fraction of available heap, after a 300 MiB reservation, used for unified memory |
| `spark.memory.storageFraction` | `0.5`   | Fraction of unified memory protected from execution-driven cache eviction        |

For a **10 GiB heap**, the approximate calculation is:

`M = (10 GiB - 300 MiB) x 0.6 = 5.824 GiB`

`Protected storage threshold R = M x 0.5 = 2.912 GiB`

The remaining heap outside the unified pool is approximately 3.883 GiB, in addition to the 300 MiB reservation.

**Important:** Execution and storage are not fixed at 2.912 GiB each. They share the 5.824 GiB pool dynamically; the protected storage threshold applies to cached blocks already using that space, not to a permanently preallocated cache.

## 4. What happens when Spark runs out of memory?

Spark handles memory pressure differently depending on the operation.

| Situation                                          | Spark's behavior                                                                    |
| -------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Execution memory is insufficient                   | Spills supported intermediate data to local disk                                    |
| Cached data consumes too much memory               | Evicts cached blocks according to storage rules                                     |
| Cached block is evicted                            | Recomputes it from lineage when needed, or reads it from disk if a disk copy exists |
| Memory cannot be freed or spilling is insufficient | Task or executor may encounter an OOM error                                         |
| Too many temporary JVM objects                     | JVM garbage collection attempts to reclaim memory                                   |

For example, during a large `groupBy`, Spark builds aggregation structures in execution memory. If the structures become too large, Spark's spill-capable operators can write intermediate data to disk and continue processing.

However, **spilling is not a guarantee against OOM**, especially when individual records or in-memory structures become too large.

## 5. On-heap vs off-heap memory

Spark can use both JVM heap memory and off-heap memory.

| Feature            | On-heap                                | Off-heap                                                    |
| ------------------ | -------------------------------------- | ----------------------------------------------------------- |
| Location           | JVM heap                               | Native memory outside JVM heap                              |
| Garbage collection | Managed by JVM GC                      | Not directly managed by JVM GC                              |
| Purpose            | General Spark objects and managed data | Supported operations and memory-efficient representations   |
| Configuration      | `spark.executor.memory`                | `spark.memory.offHeap.enabled`, `spark.memory.offHeap.size` |

In PySpark, Python worker processes also consume memory outside the executor JVM heap. This is one reason an executor can exceed its container memory limit even when JVM heap usage appears acceptable.

Spark uses additional memory overhead allowances for such non-heap consumption.

## 6. What happens to memory when data is not cached?

Consider:

```python
df = spark.read.parquet("/data/sales")
result = df.groupBy("region").count()
result.show()
```

Spark does not automatically keep the entire `df` in memory.

Instead:

1. Executor tasks read partitions of the input.
2. The data is processed using memory needed by the execution operators.
3. Intermediate shuffle data may be stored in memory or spilled to disk.
4. Once the computation completes, temporary objects and buffers become eligible for reuse or garbage collection.
5. The original DataFrame is not retained in Spark's storage cache.

If you run another action, Spark may need to read and process the data again.

By contrast:

```python
df.cache()
df.count()
```

Spark materializes and retains cached partitions for reuse, subject to available storage memory.

## 7. How to monitor and optimize Spark memory

Use the Spark UI to inspect executor memory utilization, storage usage, disk spilling, garbage collection time, and task execution metrics.

Common optimizations include reducing unnecessary caching, increasing parallelism when partitions are too large, handling data skew, using broadcast joins appropriately, and choosing suitable executor heap and overhead sizes.

## Interview-ready answer

Spark uses Unified Memory Management to dynamically share executor memory between execution and storage. Execution memory supports joins, aggregations, sorting, and shuffles, while storage memory holds cached data and broadcast blocks. By default, 60% of the JVM heap after a 300 MiB reservation is assigned to the unified memory pool. Spark dynamically reallocates available capacity, evicts eligible cached blocks, and spills supported intermediate computations to disk under memory pressure. It also supports off-heap memory and relies on JVM garbage collection to reclaim unused heap objects.