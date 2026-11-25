# What happens internally when a dataset is cached or persisted?

When a dataset is cached or persisted in Apache Spark, **Spark marks it for caching, and when an action executes, the computed partitions are stored in executor memory or disk for reuse.**

## 1. Step-by-step internal process

Suppose we execute:

```python
df = spark.read.parquet("s3://bucket/sales/")
df = df.filter(df.amount > 1000)
df.cache()
df.count()
```

### Step 1: Spark registers the dataset for caching

When `df.cache()` is called:

- Spark registers the DataFrame's logical plan with the `CacheManager`.
- Spark prepares an `InMemoryRelation` to represent the cached result.
- The dataset is not immediately computed or loaded into memory.
- Spark records that the dataset should be cached when evaluated.

**Important:** `cache()` itself does not trigger a Spark job. CacheManager and InMemoryRelation describe the DataFrame/SQL path; RDD persistence uses RDD storage levels and cached partition blocks directly.

### Step 2: An action triggers execution

```python
df.count()
```

- Spark creates the execution plan.
- The DAG Scheduler divides the required jobs into stages.
- Tasks are distributed across executors.
- Executors read source partitions and apply transformations.

### Step 3: Executors compute and cache partitions

Each executor processes its assigned partitions.

For each partition:

1. Read data from the source.
2. Apply transformations such as `filter()`.
3. Convert the resulting rows into Spark's internal cached representation.
4. Store the computed partition through the executor's `BlockManager`.

For Spark SQL DataFrames, Spark typically caches data in an optimized in-memory columnar format.

### Step 4: BlockManager stores cached blocks

Spark's `BlockManager` manages the cached partitions.

| Storage level | Internal behavior |
| --- | --- |
| `MEMORY_ONLY` | Stores partitions in executor memory |
| `MEMORY_AND_DISK` | Stores partitions in memory, using local disk when they cannot fit |
| `DISK_ONLY` | Stores partitions on executor local disks |
| `OFF_HEAP` | Uses configured off-heap memory, with disk fallback for the standard storage level |

Spark also tracks block locations so that tasks can locate cached partitions.

## 2. What happens during subsequent actions?

Suppose we execute:

```python
df.count()  # First action: populate cache
df.show()   # Second action: reuse required cached blocks
```

[spark-reference:cache-population-reuse]

During the second action:

- Spark checks whether the required cached blocks are available.
- It reads existing blocks directly from memory or disk.
- It avoids rereading the original source and recomputing transformations for those blocks.
- If a block is missing, Spark recomputes it using lineage, provided the required source or upstream data remains accessible.

**Note:** The first action does not necessarily populate every partition. Actions such as `show()`, or an action on a limited DataFrame, may access only part of the dataset. `limit()` itself is a transformation, not an action. The `count()` used here normally traverses all partitions.

## 3. What happens if the cache exceeds available memory?

- With `MEMORY_ONLY`, partitions that cannot be stored are recomputed when needed.
- With `MEMORY_AND_DISK`, partitions that cannot fit in memory can be stored on local disk.
- Spark may evict existing cached blocks to make memory available.
- If an executor fails, Spark can use surviving replicas or reconstruct missing partitions using lineage when the required input remains available.

## 4. How can you verify caching?

```python
df.cache()
df.count()
df.explain(True)
```

The plan output may include operators such as:

```text
InMemoryTableScan
   +- InMemoryRelation
```

This is a simplified excerpt; placement and details depend on the plan.

You can also inspect the **Storage tab in Spark UI** to see cached partitions, memory usage, disk usage, and storage levels.

## Interview-ready answer

> When `cache()` or `persist()` is called, Spark registers the dataset for caching without immediately materializing it. When an action triggers execution, executors compute the required partitions and store them through their BlockManagers in memory or disk according to the storage level. Spark tracks the locations of cached blocks, and subsequent actions reuse them instead of recomputing transformations. If cached blocks are lost or unavailable, Spark recomputes them using lineage when the required input remains accessible.
