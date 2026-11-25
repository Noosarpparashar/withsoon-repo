# Where is cached or persisted data stored?

In Apache Spark, **cached or persisted data is stored on the worker nodes, managed by the executors**, either in memory (RAM), on local disk, or both, depending on the storage level.

## 1. Where is cached data stored?

Spark uses the executors' **BlockManager** to manage cached data.

- **Executor memory:** Cached partitions are stored in the executor's storage memory.
- **Executor local disk:** Persisted partitions may be stored on the worker node's local disk, depending on the storage level.
- **Distributed across executors:** Each executor stores the partitions assigned to it. The entire DataFrame is not necessarily stored on one executor.
- **Not on the driver:** In a cluster deployment, the driver coordinates execution but does not normally store the cached dataset. Local mode runs execution within the local application process.

## 2. Storage levels

| Storage level | Where data is stored |
| --- | --- |
| `MEMORY_ONLY` | Executor RAM only |
| `MEMORY_AND_DISK` | Executor RAM, with partitions that cannot fit in memory stored on local disk |
| `DISK_ONLY` | Executor local disk |
| `MEMORY_ONLY_SER` | Serialized data in executor RAM (RDD storage level, where supported) |
| `MEMORY_AND_DISK_SER` | Serialized data in executor RAM and local disk (RDD storage level, where supported) |
| `OFF_HEAP` | Off-heap memory, when configured, with disk fallback for the standard storage level |

**Important:** In modern PySpark, `DataFrame.cache()` uses the default `MEMORY_AND_DISK_DESER` storage level. Available constants and internal representations depend on the Spark API; PySpark RDDs do not expose every JVM storage-level constant.

## 3. Example

```python
df = spark.read.parquet("s3://bucket/data/")
df.cache()
df.count()  # Triggers execution and populates cache
```

Suppose there are three executors and six partitions.

[spark-reference:cached-partition-location]

## 4. What happens if an executor runs out of memory?

It depends on the storage level.

- **MEMORY_ONLY:** Spark does not cache partitions that cannot fit. It recomputes them from lineage when needed.
- **MEMORY_AND_DISK:** Spark stores partitions that cannot fit in memory on local disk.
- **Executor failure:** Cached blocks on that executor may be lost. Spark can use surviving replicas, when configured, or recompute missing partitions using lineage, assuming the required source or upstream data remains accessible.

Disk fallback handles cache-storage pressure; it does not prevent every executor out-of-memory failure during processing.

## 5. Is cached data permanently stored?

**No.** Cached data is temporary.

It may disappear when:

- You call `df.unpersist()`.
- Spark evicts cached blocks to free memory.
- An executor terminates or fails.
- The Spark application ends.

## Interview-ready answer

> In Spark, cached or persisted data is stored across executors running on worker nodes. Each executor uses its BlockManager to store partitions in RAM, local disk, or both, depending on the storage level. Cached data is temporary, and Spark can recompute lost partitions using lineage when the required input remains available.
