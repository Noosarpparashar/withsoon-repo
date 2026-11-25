# How do you reduce or compact small output files?

You can reduce small output files in Apache Spark using `coalesce()`, `repartition()`, Adaptive Query Execution (AQE), optimized write configurations, and file compaction.

There are two approaches:

1. Prevent small files during writes: Control how many files Spark generates.
2. Compact existing small files: Merge previously written files into larger ones.

## 1. Use `coalesce()` before writing

`coalesce(n)` reduces the number of partitions without performing a full shuffle in the usual case.

```python
df = spark.read.parquet("s3://bucket/input/")

(df.coalesce(20).write
   .mode("overwrite")
   .parquet("s3://bucket/output/"))
```

If your DataFrame initially has 200 partitions, reducing it to 20 generally produces approximately 20 output files for an unpartitioned write.

When to use:

- Reducing the number of output files.
- Data is already reasonably balanced.
- You want to avoid expensive shuffling.

Limitation: `coalesce()` can produce uneven partition sizes and reduce parallelism.

## 2. Use `repartition()` before writing

`repartition(n)` performs a shuffle and redistributes the data across the requested number of partitions.

```python
(df.repartition(20).write
   .mode("overwrite")
   .parquet("s3://bucket/output/"))
```

When to use:

- Existing partitions are heavily imbalanced.
- You need more uniformly sized output files.
- You want to control output parallelism.

### `coalesce()` vs `repartition()`

| Feature              | `coalesce(20)`        | `repartition(20)`     |
| -------------------- | --------------------- | --------------------- |
| Full shuffle         | Usually no            | Yes                   |
| Cost                 | Lower                 | Higher                |
| Balances data        | Not necessarily       | Generally yes         |
| Reduces output files | Yes                   | Yes                   |
| Best for             | Already-balanced data | Skewed or uneven data |

Neither operation guarantees an exact number of files when writing partitioned tables, and empty partitions may not generate files.

## 3. Enable Adaptive Query Execution (AQE)

AQE can automatically merge small post-shuffle partitions into larger ones.

```python
spark.conf.set("spark.sql.adaptive.enabled", "true")
spark.conf.set("spark.sql.adaptive.coalescePartitions.enabled", "true")
spark.conf.set(
    "spark.sql.adaptive.advisoryPartitionSizeInBytes",
    128 * 1024 * 1024
)
spark.conf.set("spark.sql.adaptive.coalescePartitions.parallelismFirst", "false")
```

This helps when the write path follows a shuffle.

For example, Spark might initially have 1,000 small shuffle partitions. AQE can combine these into fewer, larger partitions at runtime.

**Important:** AQE does not guarantee 128 MiB output files. Its advisory size applies to shuffle partitions, not directly to final compressed Parquet file sizes.
## 4. Compact existing small files

Suppose you already have 10,000 Parquet files of approximately 1 MiB each.

You can rewrite them into fewer, larger files.

```python
df = spark.read.parquet("s3://bucket/raw/")

(df.repartition(40).write
   .mode("overwrite")
   .parquet("s3://bucket/compacted/"))
```

This generates up to approximately 40 files for a simple unpartitioned output.

[spark-reference:output-compaction]

Write to a separate location, validate the result, and only then switch downstream readers. Avoid directly overwriting the location being read.

## 5. Use Iceberg or Delta Lake compaction

For production data lakes, table-format compaction is usually preferable to manually rewriting whole tables.

Apache Iceberg:

```sql
CALL catalog.system.rewrite_data_files(
    table => 'db.orders',
    options => map(
        'target-file-size-bytes', '268435456'
    )
);
```

This targets 256 MiB output data files and rewrites eligible files within the managed table.
```sql
OPTIMIZE delta.`s3://bucket/orders`;
```
## 6. Avoid excessive partitioning during writes

Suppose you write data partitioned by `user_id`:

```python
(df.write
   .partitionBy("user_id")
   .parquet("s3://bucket/output/"))
```

If `user_id` has millions of distinct values, this can create many directories containing tiny files.

Instead, choose a lower-cardinality partition column when appropriate:

```python
(df.write
   .partitionBy("event_date")
   .parquet("s3://bucket/output/"))
```

Remember that `partitionBy()` controls the physical directory layout, while `repartition()` controls Spark's processing partitions.

Even `repartition(20)` can produce more than 20 output files if each task writes to multiple partition directories.

## 7. Reduce streaming write frequency

Frequent micro-batches often produce many small files.

For example:

```python
query = (
    df.writeStream
      .format("parquet")
      .option("path", "s3://bucket/events/")
      .option("checkpointLocation", "s3://bucket/checkpoints/events/")
      .trigger(processingTime="5 minutes")
      .start()
)
```

Increasing the trigger interval can allow more data to accumulate in each batch, resulting in larger files.

For continuously running pipelines, schedule periodic compaction when necessary.

### How do you decide the output file count?

A practical starting formula is:

**Output partitions = Estimated output data size / Target file size (approximate)**

For example, if your output is approximately 100 GiB and your target file size is 256 MiB, start with around 400 partitions.

This is only an estimate because serialization, compression, data skew, and partitioned writes affect actual file sizes.

## Interview-ready answer

> To reduce small output files in Spark, I would first control the number of output partitions using `coalesce()` or `repartition()`. If the data is already balanced, I prefer `coalesce()` because it avoids a full shuffle. For skewed data, I use `repartition()`. I would also enable AQE to merge small shuffle partitions, avoid excessive partitioning during writes, and optimize streaming micro-batch intervals. For existing small files, I would use Iceberg's `rewrite_data_files` or Delta Lake's `OPTIMIZE` rather than manually rewriting production tables.

**Key distinction:** `coalesce()` and `repartition()` help prevent small output files, while compaction combines small files that already exist.