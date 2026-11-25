# What does persist() do?

`persist()` stores intermediate Spark data in memory, on disk, or both so that it can be reused across multiple actions without recomputing the entire lineage.

Unlike `cache()`, `persist()` allows you to explicitly choose the storage level.

## 1. How does persist() work?

Suppose you have a large dataset:

```python
df = spark.read.parquet("s3://bucket/sales/")
filtered_df = df.filter("amount > 1000")
```

You want to use the filtered data multiple times.

```python
from pyspark import StorageLevel

filtered_df.persist(StorageLevel.MEMORY_AND_DISK)
filtered_df.count()
filtered_df.groupBy("region").count().show()
filtered_df.groupBy("category").count().show()
```

**What happens internally?**

1. `persist()` marks the DataFrame for storage using the specified storage level.
2. The first action triggers computation and caching of the required partitions.
3. Spark stores the computed partitions across executors.
4. Subsequent actions reuse available stored partitions instead of recomputing them.
5. If a stored partition is lost, Spark can recompute it using lineage, provided the required source or upstream data remains accessible.

## 2. Storage levels in persist()

The main advantage of `persist()` is its flexibility.

| Storage level | Behavior |
| --- | --- |
| `MEMORY_ONLY` | Stores partitions in memory. Missing partitions are recomputed when needed. |
| `MEMORY_AND_DISK` | Stores partitions in memory and uses disk for partitions that do not fit. |
| `DISK_ONLY` | Stores partitions on disk. |
| `MEMORY_AND_DISK_DESER` | Stores partitions in deserialized form in memory, with disk fallback. |
| `OFF_HEAP` | Uses off-heap storage when properly configured. |

PySpark RDDs and DataFrames have different internal storage representations, so serialized/deserialized behavior depends on the API.

## 3. Example: MEMORY_ONLY vs. MEMORY_AND_DISK

Suppose your dataset requires approximately **100 GB in its cached representation**, but only **60 GB** of memory is available for caching.

[spark-reference:persist-storage-comparison]

This makes `MEMORY_AND_DISK` useful when the intermediate dataset is larger than the available cache memory.

## 4. Is persist() lazy?

Yes. Like `cache()`, `persist()` is lazy.

```python
df.persist(StorageLevel.MEMORY_AND_DISK)
```

This does not immediately execute a Spark job.

An action triggers computation:

```python
df.count()
```

Spark then materializes the partitions needed by the action and stores them according to the selected level.

## 5. How do you remove persisted data?

```python
df.unpersist()
```

To wait until the blocks are removed:

```python
df.unpersist(blocking=True)
```

**Important:** Spark does not necessarily keep persisted data forever. Cached blocks can be evicted or lost, and Spark can recompute missing partitions when required.

## 6. cache() vs. persist()

| `cache()` | `persist()` |
| --- | --- |
| Uses the default storage level | Allows custom storage levels |
| Simpler to use | More control over storage |
| `df.cache()` | `df.persist(StorageLevel.DISK_ONLY)` |
| Lazy | Lazy |
| Removed with `unpersist()` | Removed with `unpersist()` |

Calling `persist()` without specifying a storage level generally uses the same default as `cache()` for the same API.

To change the storage level of an already persisted dataset, unpersist it before persisting it with the new level. The examples above are independent illustrations.

## Interview-ready answer

> `persist()` in Apache Spark is used to store intermediate RDD or DataFrame results in memory, on disk, or both, allowing them to be reused across multiple actions without repeated computation.
>
> Unlike `cache()`, it lets us explicitly select a storage level such as `MEMORY_ONLY`, `MEMORY_AND_DISK`, or `DISK_ONLY`.
>
> It is a lazy operation, meaning actual computation and storage occur when an action is executed. Persisted data can be released using `unpersist()`.

**Key takeaway:** Use `persist()` when you need control over how Spark stores reusable intermediate data, especially when memory is limited or the dataset is too large to fit entirely in memory.
