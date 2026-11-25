# What is the difference among the persistence storage levels?

In Apache Spark, **persistence storage levels determine where cached data is stored, whether it is serialized or deserialized, and whether copies are maintained across executors.**

The main trade-offs are **memory consumption, CPU overhead, disk I/O, and fault recovery speed**.

## 1. Different persistence storage levels

| Storage level         | Storage location | Behavior                                                                     |
| --------------------- | ---------------- | ---------------------------------------------------------------------------- |
| `MEMORY_ONLY`         | RAM              | Stores partitions in memory. Missing partitions must be recomputed.          |
| `MEMORY_AND_DISK`     | RAM + disk       | Stores partitions in memory and uses disk for partitions that do not fit.    |
| `DISK_ONLY`           | Disk             | Stores partitions only on executor local disks.                              |
| `MEMORY_ONLY_SER`     | RAM              | Stores serialized data to reduce memory usage, with additional CPU overhead. |
| `MEMORY_AND_DISK_SER` | RAM + disk       | Stores serialized data in memory, with disk fallback.                        |
| `MEMORY_ONLY_2`       | RAM              | Requests two copies of each partition on different executors; host diversity depends on available placement.                           |
| `MEMORY_AND_DISK_2`   | RAM + disk       | Uses memory/disk storage with two replicas per partition.                    |
| `OFF_HEAP`            | Off-heap memory  | Uses configured off-heap memory, with disk fallback for the standard level.                            |

`MEMORY_ONLY_SER` and `MEMORY_AND_DISK_SER` are Java/Scala RDD storage levels. Python RDD data is already serialized.

## 2. What happens when memory is insufficient?

Suppose a dataset requires 100 GB of cache storage but only 60 GB is available.

[spark-reference:storage-level-capacity]

## 3. Serialized vs. deserialized storage

This distinction is especially important for interviews involving memory optimization. The table below describes JVM object RDDs; Spark SQL DataFrames use their own optimized cached representation.

| Feature            | Deserialized                       | Serialized                    |
| ------------------ | ---------------------------------- | ----------------------------- |
| Representation     | JVM objects                        | Compact byte representation   |
| Memory usage       | Generally higher                   | Generally lower               |
| CPU overhead       | Lower for repeated access          | Higher due to deserialization |
| Garbage collection | Can be higher                      | Often lower                   |
| Best suited for    | Frequent access with enough memory | Memory-constrained workloads  |

For example, an RDD occupying 10 GB as deserialized objects might occupy considerably less when serialized, depending on its data and serializer.

## 4. PySpark examples

```python
from pyspark import StorageLevel

# Choose ONE storage level for an uncached DataFrame:

# Memory only
df.persist(StorageLevel.MEMORY_ONLY)

# OR memory and disk
# df.persist(StorageLevel.MEMORY_AND_DISK)

# OR disk only
# df.persist(StorageLevel.DISK_ONLY)

# OR two replicas across executors
# df.persist(StorageLevel.MEMORY_AND_DISK_2)

# OR default DataFrame storage level
# df.persist(StorageLevel.MEMORY_AND_DISK_DESER)
```

These examples are alternatives, not operations to run sequentially on the same cached DataFrame. Call `unpersist()` before changing an already assigned storage level.

**Important PySpark distinction:** DataFrames use Spark SQL's optimized cache representation, and the default for `DataFrame.cache()` and `DataFrame.persist()` is `MEMORY_AND_DISK_DESER`. PySpark RDD storage follows Python's serialized-data behavior.

## 5. Which storage level should you choose?

| Situation                                      | Recommended choice                        |
| ---------------------------------------------- | ----------------------------------------- |
| Data fits comfortably in memory                | `MEMORY_ONLY` for RDDs                    |
| Data may exceed available RAM                  | `MEMORY_AND_DISK`                         |
| Very limited executor RAM                      | `DISK_ONLY`                               |
| Large Java/Scala RDD with high object overhead | `MEMORY_ONLY_SER`                         |
| Need faster recovery from executor failures    | Replicated levels such as `MEMORY_ONLY_2` |
| Normal PySpark DataFrame reuse                 | Default `MEMORY_AND_DISK_DESER`           |

One nuance: reading a missing partition from disk is not always faster than recomputing it. For inexpensive transformations, `MEMORY_ONLY` can sometimes outperform `MEMORY_AND_DISK`.

## Interview-ready answer

Spark provides multiple persistence storage levels that control how cached partitions are stored. `MEMORY_ONLY` stores data in RAM and recomputes partitions that cannot be cached. `MEMORY_AND_DISK` uses RAM with disk fallback, while `DISK_ONLY` stores everything on disk. Serialized storage levels reduce memory consumption at the cost of additional CPU overhead, and replicated levels maintain multiple copies for faster recovery. The appropriate level depends on available memory, recomputation cost, data size, and access frequency.