# When should you use persist()?

In Apache Spark, use `persist()` **when a DataFrame, Dataset, or RDD is reused multiple times and you want explicit control over how and where Spark stores the computed data.**

Both `cache()` and `persist()` avoid repeated computation, but `persist()` allows you to specify a **storage level**, such as memory, disk, or both.

## 1. When should you use `persist()`?

| Scenario                                        | Recommended storage level          | Reason                                                          |
| ----------------------------------------------- | ---------------------------------- | --------------------------------------------------------------- |
| Dataset fits comfortably in memory              | `MEMORY_ONLY`                      | Fast access without disk I/O                                    |
| Dataset is larger than available memory         | `MEMORY_AND_DISK`                  | Stores partitions in memory or spills cached partitions to disk |
| Limited executor memory                         | `DISK_ONLY`                        | Avoids using executor RAM for cached blocks                     |
| Expensive transformations reused multiple times | `MEMORY_AND_DISK`                  | Avoids costly recomputation                                     |
| Large RDD with expensive-to-store objects       | `MEMORY_ONLY_SER` (JVM RDDs, where supported)                  | Reduces memory usage through serialization                      |
| Iterative algorithms                            | `MEMORY_ONLY` or `MEMORY_AND_DISK` | Reuses intermediate results across iterations                   |

The best storage level depends on dataset size, available resources, and recomputation cost. PySpark does not expose every JVM RDD storage-level constant; Python RDD data is serialized regardless of the chosen level.

## 2. Example: Using persist()

```python
from pyspark import StorageLevel

df = spark.read.parquet("s3://bucket/sales")
result = df.groupBy("country").sum("revenue")

result.persist(StorageLevel.MEMORY_AND_DISK)
result.count()  # Materializes the cache
result.show()   # Reuses persisted data
result.write.parquet("s3://bucket/output")

result.unpersist()
```

Internally:

1. `persist()` registers the DataFrame for caching with the specified storage level.
2. The first action computes the required partitions.
3. Executors store computed partitions using their `BlockManager`.
4. Subsequent actions reuse available persisted partitions.
5. Missing partitions are recomputed using lineage when the required source or upstream data remains accessible.

## 3. When should you choose different storage levels?

The examples below are alternatives. To change the storage level of an already persisted dataset, call `unpersist()` before persisting it with the new level.

### A. MEMORY_ONLY

Use when the dataset fits comfortably in executor memory.

```python
rdd.persist(StorageLevel.MEMORY_ONLY)
```

- Fast retrieval.
- No disk fallback.
- Partitions that cannot be cached must be recomputed when needed.

### B. MEMORY_AND_DISK

Use when the dataset may not fit entirely in memory.

```python
df.persist(StorageLevel.MEMORY_AND_DISK)
```

- Keeps partitions in memory when possible.
- Stores partitions on local disk when they cannot fit in memory.
- Helps avoid expensive recomputation.

### C. DISK_ONLY

Use when executor memory is limited but recomputing the dataset is expensive.

```python
df.persist(StorageLevel.DISK_ONLY)
```

- Stores cached partitions on local disks.
- Reduces memory pressure.
- Slower than memory caching because disk reads are required.

## 4. Difference between cache() and persist()

| Feature              | `cache()`             | `persist()`                |
| -------------------- | --------------------- | -------------------------- |
| Purpose              | Reuse computed data   | Reuse computed data        |
| Storage level        | Default storage level | Configurable storage level |
| Memory storage       | Yes                   | Yes, depending on level    |
| Disk storage         | Depends on default    | Configurable               |
| Lazy execution       | Yes                   | Yes                        |
| Avoids recomputation | Yes                   | Yes                        |
| Manual cleanup       | `unpersist()`         | `unpersist()`              |

**Important:** For modern PySpark DataFrames, `cache()` and `persist()` without arguments both use `MEMORY_AND_DISK_DESER` by default. There is no inherent performance advantage to `persist()` when both use the same storage level.

## 5. When should you NOT use persist()?

Avoid persistence when:

- The dataset is used only once.
- Transformations are inexpensive to recompute.
- The persisted dataset consumes too many resources.
- The dataset is rarely accessed again.
- Persistence introduces more overhead than the recomputation it avoids.

## Interview-ready answer

Use `persist()` when a dataset is reused across multiple operations and you need control over its storage level. Unlike `cache()`, which uses Spark's default storage level, `persist()` allows you to explicitly choose memory, disk, or a combination. For example, use `MEMORY_ONLY` when the dataset fits in memory, `MEMORY_AND_DISK` when it may exceed available memory, and `DISK_ONLY` when memory is constrained. This helps reduce recomputation while managing executor resources efficiently.