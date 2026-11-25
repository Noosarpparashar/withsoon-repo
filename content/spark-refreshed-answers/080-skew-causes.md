# What causes data skew in Spark?

Data skew in Apache Spark occurs when data is unevenly distributed across partitions, causing some tasks to process significantly more data than others.

As a result, a few tasks take much longer to complete, while other executors remain idle, reducing overall job performance.

Data skew is especially common during joins, aggregations, and shuffle operations.

## 1. What causes data skew?

### A. Uneven distribution of join keys

This is one of the most common causes.

Suppose an orders table contains 100 million records:

| Customer ID | Number of records |
| ----------- | ----------------- |
| C101        | 90 million        |
| C102        | 5 million         |
| C103        | 3 million         |
| C104        | 2 million         |

When Spark joins on `customer_id`, records with the same key must generally be placed in the same shuffle partition.

Because C101 represents 90% of the records, the partition containing C101 becomes disproportionately large.

[spark-skew-distribution]

Partition 1 has considerably more work than the other partitions, creating a straggler task.

### B. NULL values in partitioning keys

If a large percentage of records contain NULL in the partitioning key, they may be assigned to the same hash partition.

For example:

```python
df.repartition(200, "customer_id")
```

If 60% of `customer_id` values are NULL, those records can be concentrated in one partition.

**Important distinction:** In an ordinary inner equi-join, Spark can filter NULL join keys before shuffling. However, NULL-heavy data can still cause skew in aggregations, repartitioning, outer joins, and other operations.

### C. Low-cardinality columns

Partitioning by a column containing very few distinct values can produce skew or underutilization.

For example:

```python
df.repartition(200, "country")
```

If the dataset contains only five distinct countries, hash partitioning by `country` can populate at most five partitions, regardless of the requested 200 partitions.

If India represents 80% of the records, one partition may contain most of the data.

### D. Uneven file sizes or input partitions

Spark can also experience skew before any shuffle.

For example:

```text
File 1 → 10 MiB
File 2 → 20 MiB
File 3 → 15 MiB
File 4 → 8 GiB
```

If one task receives considerably more data than others, it may take longer to process.

Spark's file scan partitioning can combine small files and split large splittable files, so the actual task distribution depends on file format, compression, and scan settings.

### E. Many-to-many joins

Suppose one join key appears:

- 1 million times in the left table.
- 500,000 times in the right table.

The inner join produces:

**1,000,000 x 500,000 = 500 billion rows**

This can create extremely expensive join tasks.

Even if the input partition sizes appear manageable, the output cardinality can become enormous.

### F. GroupBy and aggregations

Consider:

```python
df.groupBy("country").count()
```

If most records belong to one country, that key is disproportionately represented.

Spark can perform partial aggregation before the shuffle for operations such as `count()`, which greatly reduces the impact of skew. But aggregations that retain or process large per-key collections, such as `collect_list()`, may still suffer significantly.

## 2. How do you identify data skew?

Open the Spark UI → Stages → Tasks and compare task metrics.

| Metric               | Normal execution                       | Skewed execution                 |
| -------------------- | -------------------------------------- | -------------------------------- |
| Task duration        | Relatively balanced                    | A few tasks take much longer     |
| Shuffle read size    | Similar across tasks                   | Some tasks read much more data   |
| Spill (memory/disk)  | Limited                                | High for certain tasks           |
| Task completion      | Most tasks finish around the same time | A few stragglers delay the stage |
| Executor utilization | Relatively balanced                    | Some executors become idle       |

For example, if 199 tasks finish in 20 seconds but one takes 15 minutes, investigate skew, spills, GC, and other causes of slow tasks.

You can also inspect key frequencies:

```python
from pyspark.sql import functions as F

(df.groupBy("customer_id")
   .agg(F.count("*").alias("count"))
   .orderBy(F.desc("count"))
   .show(20))
```

This helps identify frequently repeated keys.

## 3. How do you fix data skew?

| Technique                      | When to use                                                  |
| ------------------------------ | ------------------------------------------------------------ |
| Adaptive Query Execution (AQE) | Automatically mitigate skewed shuffle partitions             |
| Salting                        | Distribute heavily repeated keys across more partitions      |
| Broadcast Join                 | Avoid shuffling a large dataset when the other side is small |
| Filter unnecessary data        | Reduce volume before expensive operations                    |
| Pre-aggregation                | Reduce rows per key before joining or shuffling              |
| Handle NULL keys               | Remove or isolate NULL-heavy data where semantics permit     |
| Better partitioning keys       | Avoid extremely low-cardinality or skewed keys               |
| Skew-aware processing          | Process hot keys separately from normal keys                 |

### Example: Enable AQE skew optimization

```python
spark.conf.set("spark.sql.adaptive.enabled", "true")
spark.conf.set("spark.sql.adaptive.skewJoin.enabled", "true")
```

AQE can identify skewed shuffle partitions and split them into smaller tasks for supported joins.

### Example: Salting skewed keys

```python
from pyspark.sql import functions as F

salted_df = df.withColumn(
    "salt",
    F.floor(F.rand(seed=42) * 10).cast("int")
)
salted_df = salted_df.repartition(200, "customer_id", "salt")
```

This can distribute records for a hot customer across multiple partitions.

For joins, the other side must also be salted consistently—often by replicating matching records across all salt values—to preserve correct join results.

## 4. Data skew vs too few partitions

These are related but different problems.

| Data skew                                    | Too few partitions                               |
| -------------------------------------------- | ------------------------------------------------ |
| Some partitions are much larger than others  | There are too few partitions to use all cores    |
| Some tasks run much longer than others       | Most tasks may have similarly large workloads    |
| Caused by uneven key or input distribution   | Caused by insufficient parallelism               |
| Increasing partitions alone may not solve it | Increasing partitions often improves parallelism |

For example, increasing `spark.sql.shuffle.partitions` from 200 to 2,000 does not necessarily fix skew, because all records for a particular hash key may still be assigned to one partition.

## Interview-ready answer

> Data skew in Spark occurs when records are unevenly distributed across partitions, causing a few tasks to process much more data than others.

> The most common causes are skewed join keys, low-cardinality partitioning columns, NULL-heavy data, uneven input partition sizes, and many-to-many joins.

> For example, if 90% of records contain the same customer ID, hash partitioning by customer ID can send all those records to one partition, creating a long-running task while other executors remain idle.

> To identify skew, I would inspect the Spark UI for unusually long tasks, disproportionate shuffle read sizes, and excessive disk spilling.

> To resolve it, I would first consider AQE skew-join optimization, followed by techniques such as salting, broadcast joins, pre-aggregation, selective filtering, and improved partitioning.

**Key takeaway:** Data skew is primarily a workload imbalance problem. Increasing cluster resources or the number of partitions alone may not solve it unless the skewed data is distributed more effectively.