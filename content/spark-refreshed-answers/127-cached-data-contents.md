# What exactly is stored?

When Spark caches or persists a DataFrame or RDD, it stores the **computed data partitions**, not the original input files, SQL query, or DAG.

## 1. What is stored for a DataFrame?

Suppose you execute:

```python
df = spark.read.parquet("s3://bucket/sales/")

filtered_df = (
    df.filter(df.amount > 1000)
      .select("customer_id", "amount")
)

filtered_df.cache()
filtered_df.count()
```

Spark performs the following operations:

1. Reads the original Parquet data from S3, subject to applicable scan optimizations.
2. Filters rows where `amount > 1000`.
3. Selects only `customer_id` and `amount`.
4. Produces the resulting data in distributed partitions.
5. **Stores the computed partitions of `filtered_df` in executor storage.**

Filtering and selecting columns do not necessarily change the number of partitions.

## 2. What does a stored partition contain?

Imagine the original dataset has **1 million rows and 10 columns**.

After filtering and selecting, only **200,000 rows and 2 columns** remain.

[spark-reference:cached-result-partitions]

Each cached partition contains actual column values, for example:

| customer_id | amount |
| --- | --- |
| C101 | 1500 |
| C102 | 2200 |
| C103 | 1800 |

For Spark SQL DataFrames, cached partitions are generally represented using Spark's optimized, compressed, columnar in-memory format rather than ordinary Python Row objects. The exact representation and compression depend on configuration and the cache serializer.

## 3. What else is stored?

Besides the computed data, Spark maintains metadata required to locate and reuse cached partitions.

| Component | What is stored |
| --- | --- |
| Executors | Actual cached data partitions |
| BlockManager | Cached block identifiers and storage information |
| Driver | Cache-related metadata and block-location tracking |
| DAG/lineage | Information needed to recompute lost partitions |

The lineage is retained for fault tolerance, but **lineage is not the cached data itself**. Recomputation requires the relevant source or upstream data to remain accessible.

## 4. Does Spark store intermediate transformations?

Consider:

```python
df1 = df.filter("amount > 1000")
df2 = df1.groupBy("customer_id").sum("amount")
df3 = df2.filter("sum(amount) > 5000")

df3.cache()
df3.count()
```

Spark caches the **final computed partitions of `df3`**, not the separate results of `df1` and `df2`, unless those datasets are separately persisted.

However, Spark may still materialize intermediate shuffle data on disk during execution. That is separate from caching.

## Interview-ready answer

> When Spark caches or persists a dataset, it stores the actual computed data in partitioned form across executors. For DataFrames, this is generally an optimized columnar representation containing the resulting rows and columns. For JVM RDDs, it stores partition records as deserialized or serialized data depending on the storage level; Python RDD records are serialized. Spark also maintains metadata to locate cached partitions and retains lineage to recompute partitions if needed.
