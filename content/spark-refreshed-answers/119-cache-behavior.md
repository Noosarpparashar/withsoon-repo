# What does cache() do?

`cache()` stores intermediate Spark data so that it can be reused across multiple actions without recomputing the entire lineage every time.

It improves performance when the same DataFrame or RDD is accessed repeatedly.

## 1. How does cache() work?

Suppose you have a large dataset:

```python
df = spark.read.parquet("s3://bucket/sales/")
filtered_df = df.filter("amount > 1000")
```

You perform multiple operations:

```python
filtered_df.count()
filtered_df.groupBy("region").count().show()
filtered_df.groupBy("category").count().show()
```

**Without caching:** Spark may repeatedly read the original data and execute the filter for each action.

**With caching:**

```python
filtered_df.cache()
filtered_df.count()  # Triggers computation and caching
filtered_df.groupBy("region").count().show()
filtered_df.groupBy("category").count().show()
```

Spark can reuse the cached intermediate results instead of repeatedly reading and filtering the source data.

## 2. How caching works internally

1. `cache()` marks the dataset for caching.
2. An action triggers computation of the required partitions.
3. Spark stores computed partitions in its executors.
4. Subsequent actions read available cached partitions.
5. If a cached partition is unavailable, Spark can recompute it using lineage, provided the required source or upstream data remains accessible.

## 3. Is cache() a transformation or an action?

`cache()` is neither a typical transformation nor an action. It is a lazy persistence operation.

```python
df.cache()   # Marks for caching
df.count()   # Triggers computation
```

Calling `cache()` alone does not execute a Spark job. An action may materialize only the partitions it needs; an action such as `count()` normally traverses all partitions.

## 4. Where does cache() store data?

The default depends on the Spark API.

| API | Default storage level |
| --- | --- |
| RDD | `MEMORY_ONLY` |
| DataFrame (Spark 3.x+) | `MEMORY_AND_DISK_DESER` |

For DataFrames, Spark stores data in its optimized cached representation, keeping partitions in memory where possible and using disk when needed.

## 5. When should you use cache()?

Use caching when:

- The same DataFrame is used by multiple actions.
- Expensive transformations would otherwise execute repeatedly.
- You are running iterative algorithms.
- Intermediate data is reused across multiple queries.

Avoid unnecessary caching when a DataFrame is used only once, the cached dataset is too large, or caching creates excessive memory pressure.

To remove cached data:

```python
df.unpersist()
```

## Interview-ready answer

> `cache()` in Apache Spark is used to persist intermediate RDD or DataFrame results so they can be reused across multiple actions without recomputing their lineage.
>
> It is lazy, meaning the actual caching happens when an action triggers computation. Cached partitions are stored across executors according to the default storage level.
>
> Caching improves performance by reducing repeated computation and data reads, especially when the same dataset is accessed multiple times.

**Key takeaway:** `cache()` trades storage resources for reduced recomputation.
