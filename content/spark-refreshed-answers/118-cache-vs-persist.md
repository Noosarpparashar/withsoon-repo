# What is the difference between cache and persist?

Both `cache()` and `persist()` store intermediate Spark data so it can be reused across multiple actions without recomputing it every time.

The main difference is:

- `cache()` uses Spark's default storage level.
- `persist()` allows you to explicitly choose a storage level, such as memory, disk, or both.

## 1. Cache vs. Persist

| Feature            | `cache()`                | `persist()`              |
| ------------------ | ------------------------ | ------------------------ |
| Purpose            | Reuse intermediate data  | Reuse intermediate data  |
| Storage level      | Default only             | Customizable             |
| Memory storage     | Yes                      | Yes                      |
| Disk storage       | Depends on default       | Configurable             |
| Serialized storage | Depends on API           | Configurable             |
| Lazy evaluation    | Yes                      | Yes                      |
| Performance        | Depends on storage level | Depends on storage level |
| Remove cached data | `unpersist()`            | `unpersist()`            |

Important: In Spark 3.x and later, DataFrame `cache()` defaults to `MEMORY_AND_DISK_DESER`, whereas RDD `cache()` defaults to `MEMORY_ONLY`.

## 2. Example: Why do we need caching?

Suppose you have a DataFrame containing 100 million records.

```python
df = spark.read.parquet("s3://bucket/sales/")
filtered_df = df.filter("amount > 1000")
```

You perform three operations:

```python
filtered_df.count()
filtered_df.groupBy("region").count().show()
filtered_df.groupBy("category").count().show()
```

Without caching, Spark may read and filter the source data repeatedly.

[spark-cache-reuse-comparison]

To cache:

```python
filtered_df.cache()
filtered_df.count()  # Materializes the cache
```

Spark caching is lazy: calling `cache()` or `persist()` does not immediately materialize the dataset. An action triggers computation and storage.

## 3. Using persist() with different storage levels

```python
from pyspark import StorageLevel

# Choose ONE of these alternatives for an uncached DataFrame:

# Memory only
df.persist(StorageLevel.MEMORY_ONLY)

# OR memory and disk
# df.persist(StorageLevel.MEMORY_AND_DISK)

# OR disk only
# df.persist(StorageLevel.DISK_ONLY)
```

### Common storage levels

| Storage level           | Behavior                                                                      |
| ----------------------- | ----------------------------------------------------------------------------- |
| `MEMORY_ONLY`           | Stores data in memory; partitions that cannot fit are recomputed when needed. |
| `MEMORY_AND_DISK`       | Stores data in memory and stores partitions that do not fit on disk.          |
| `DISK_ONLY`             | Stores data on disk.                                                          |
| `MEMORY_AND_DISK_DESER` | Uses memory and disk, with deserialized in-memory storage.                    |
| `OFF_HEAP`              | Uses off-heap storage when properly configured.                               |

To change an existing storage level, unpersist the dataset before persisting it with a new level.

The exact binary and deserialized representations vary between RDDs, DataFrames, and language APIs.

## 4. When should you use cache vs. persist?

Use `cache()` when:

- You need to reuse a DataFrame multiple times.
- Spark's default storage level is appropriate.
- You want simpler code.

Use `persist()` when:

- You want explicit control over storage.
- Your executor memory is limited.
- You want to use disk-only storage.
- You want to choose a different storage level for a particular workload.

## 5. How do you remove cached data?

Both use:

```python
df.unpersist()
```

To wait until the unpersist operation finishes:

```python
df.unpersist(blocking=True)
```

Spark can evict cached blocks under memory pressure and recompute missing partitions when necessary. Caching also consumes executor storage resources, so avoid caching datasets that are used only once.

## 6. Interview-ready answer

In Apache Spark, both `cache()` and `persist()` are used to store intermediate datasets for reuse, reducing repeated computations.

The primary difference is that `cache()` uses the default storage level, while `persist()` allows us to explicitly specify where and how data should be stored, such as in memory, on disk, or both.

For RDDs, the default cache storage level is `MEMORY_ONLY`, whereas DataFrames in modern Spark versions default to `MEMORY_AND_DISK_DESER`.

Both operations are lazy, and the data is materialized when an action executes. Cached data can be removed using `unpersist()`.

Key takeaway: `cache()` is essentially a convenient shorthand for `persist()` with the default storage level.