# When should you use each one?

The choice between `repartition()` and `coalesce()` depends on whether you need better data distribution or simply want to reduce the number of partitions efficiently.

## 1. Use repartition() when

### A. You want to increase parallelism

Suppose your DataFrame has 10 partitions, but your cluster has 100 CPU cores.

```python
df = df.repartition(200)
```

- Increases the number of partitions from 10 to 200.
- Allows more tasks to execute concurrently.
- Helps utilize available CPU cores.

However, additional partitions don't guarantee better performance because repartitioning incurs shuffle overhead.

### B. Your partitions are highly skewed

Suppose your partitions contain:

| Partition | Size |
| --- | --- |
| P1 | 50 MiB |
| P2 | 100 MiB |
| P3 | 2 GiB |
| P4 | 30 MiB |

One task processing 2 GiB could become a bottleneck.

```python
df = df.repartition(20)
```

Spark redistributes records, potentially producing more balanced partitions.

Note that `repartition(20, "customer_id")` may still produce skew if certain customer IDs dominate the data.

### C. You want to distribute data by a specific column

```python
df = df.repartition(100, "customer_id")
```

Records with the same `customer_id` are assigned to the same hash partition.

This can be useful before operations such as joins or aggregations, although Spark's optimizer may already handle the necessary partitioning.

### D. You want more evenly sized output files

```python
(df.repartition(50)
   .write.parquet("s3://bucket/output/"))
```

Useful when existing partitions are uneven and you want approximately balanced output files. Balanced record counts do not guarantee equal file sizes.

## 2. Use coalesce() when

### A. You want to reduce the number of partitions without a full shuffle

Suppose you have 1,000 small partitions and want to reduce them to 100.

```python
df = df.coalesce(100)
```

- Avoids an additional full shuffle.
- Reduces the number of downstream tasks.
- Can decrease scheduling overhead.

### B. You want to reduce small output files

Suppose a Spark job generates hundreds of small Parquet files.

```python
(df.coalesce(20)
   .write.parquet("s3://bucket/output/"))
```

Useful when the existing data distribution is reasonably balanced.

### C. Your data volume has decreased after filtering

For example:

```python
df = spark.read.parquet("s3://bucket/input/")
filtered_df = df.filter("country = 'India'")

(filtered_df.coalesce(20)
    .write.parquet("s3://bucket/india/"))
```

If filtering significantly reduces data volume, you may not need the original number of partitions.

## 3. Quick decision table

| Situation | Preferred |
| --- | --- |
| Increase partitions | `repartition()` |
| Decrease partitions cheaply | `coalesce()` |
| Fix uneven partition sizes | `repartition()` |
| Improve parallelism | `repartition()` |
| Reduce small files | `coalesce()` initially |
| Need balanced output files | `repartition()` |
| Partition by a specific key | `repartition()` |
| Reduce partitions after filtering | `coalesce()` |
| Reduce 1,000 partitions to 1 | Be cautious with both |

## 4. Real-world example

Suppose you're processing 100 GiB on a Spark cluster with 50 CPU cores.

After filtering, only 5 GiB remains, but the DataFrame still has 800 partitions.

You have two options:

```python
# Option 1: Avoid full shuffle
compact_df = filtered_df.coalesce(40)

# Option 2: Redistribute data
balanced_df = filtered_df.repartition(40)
```

### Which should you choose?

- If the remaining data is reasonably distributed, use `coalesce(40)` to avoid an unnecessary shuffle.
- If most of the remaining data is concentrated in a few partitions, use `repartition(40)` to balance the work.

You can confirm the effect using Spark UI task metrics, especially task duration, shuffle read/write, and input size.

## 5. Interview-ready answer

> I use `repartition()` when I need to increase parallelism, redistribute skewed data, or achieve more balanced partitions. Since it involves a full shuffle, I use it only when the redistribution benefits justify the cost.

> I use `coalesce()` when I need to decrease the number of partitions without introducing an unnecessary shuffle, especially after filtering or before writing output files. However, if the partitions are highly uneven, `repartition()` may perform better despite its shuffle overhead.

**Rule of thumb:** Use `coalesce()` to reduce partitions cheaply; use `repartition()` when redistribution is necessary.