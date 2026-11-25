# When should you use cache()?

In Apache Spark, use `cache()` **when the same DataFrame, Dataset, or RDD is reused multiple times and recomputing it would be expensive.**

Caching improves performance by storing computed partitions in executor memory or disk, according to the storage level, so that subsequent actions can reuse them instead of repeating expensive transformations.

## 1. When should you use cache()?

| Scenario | Why caching helps |
| --- | --- |
| Same DataFrame used multiple times | Avoids repeated computation |
| Expensive transformations | Avoids repeating joins, aggregations, or filters |
| Iterative algorithms | Reuses data across iterations |
| Machine learning workloads | Reuses training data across iterations |
| Multiple actions on the same dataset | Avoids rereading and recomputing data |
| Interactive data analysis | Speeds up repeated queries |

## 2. Example: Reusing an expensive DataFrame

Without caching:

```python
df = spark.read.parquet("s3://bucket/sales")
result = df.groupBy("country").sum("revenue")

result.count()
result.show()
result.write.parquet("s3://bucket/output")
```

Spark may repeat the expensive aggregation because each action triggers execution. An action can produce one or more jobs, and optimizations may change the work performed for each action.

With caching:

```python
df = spark.read.parquet("s3://bucket/sales")
result = df.groupBy("country").sum("revenue")

result.cache()
result.count()  # Materializes the cache
result.show()   # Reuses cached data
result.write.parquet("s3://bucket/output")

result.unpersist()
```

**Benefit:** The expensive aggregation is computed for the cached partitions and reused by subsequent actions while those blocks remain available. Lost or evicted blocks may need recomputation.

## 3. When should you NOT use cache()?

| Scenario | Reason |
| --- | --- |
| Dataset used only once | Caching adds overhead without reuse |
| Very large dataset with insufficient memory | Can cause eviction, recomputation, memory pressure, or substantial disk use |
| Cheap transformations | Recomputing may be faster than caching |
| Underlying source changes frequently | Cached results may become stale or require refreshing, depending on the source and update path |
| One-time ETL pipeline | Often provides no benefit |
| Heavy memory pressure | Caching competes with execution memory |

A dataset larger than RAM is not automatically unsuitable for caching: disk-backed persistence can still help when reuse saves enough computation. Measure the trade-off.

## 4. Where should you place cache()?

**Cache after expensive transformations and before multiple branches reuse the same result.**

Example:

```python
df = spark.read.parquet("s3://bucket/data")
filtered = df.filter("status = 'ACTIVE'")
aggregated = filtered.groupBy("country").count()

aggregated.cache()
aggregated.count()
aggregated.write.parquet("s3://bucket/output1")
aggregated.filter("count > 100").show()

aggregated.unpersist()
```

Here, caching `aggregated` is more useful than caching the entire raw dataset because the smaller aggregated result is reused.

However, if multiple downstream computations need different aggregations of `filtered`, caching `filtered` may be more beneficial.

## 5. Important considerations

- **Lazy execution:** `cache()` does not immediately compute or store the dataset. An action triggers cache population.
- **Memory consumption:** Caching uses executor storage memory and potentially local disk.
- **Storage level:** DataFrame `cache()` uses `MEMORY_AND_DISK_DESER` by default in modern Spark.
- **Cache eviction:** Spark may evict cached partitions under memory pressure.
- **Cleanup:** Use `unpersist()` when the dataset is no longer needed.

## Interview-ready answer

> Use `cache()` when a DataFrame or RDD is reused across multiple actions or iterative computations, especially if it involves expensive transformations such as joins, aggregations, or reading large datasets. Caching avoids recomputation by storing partitions in executor memory or disk according to the storage level. However, caching should be avoided for one-time operations, inexpensive transformations, or datasets that create excessive memory pressure.
