# What are shuffle partitions?

Shuffle partitions are the partitions Spark creates to redistribute data across executors during shuffle operations, such as `groupBy()`, `join()`, `distinct()`, and `orderBy()`.

They determine how many tasks process the shuffled data in the next stage.

## 1. Example

Suppose you have a DataFrame containing 100 million transaction records distributed across 10 input partitions.

```python
df = spark.read.parquet("s3://bucket/transactions/")
result = df.groupBy("customer_id").count()
result.show()
```

When `groupBy()` executes:

1. Spark reads the data from the original 10 partitions.
2. It redistributes records so that rows with the same `customer_id` reach the same shuffle partition.
3. Spark creates shuffle partitions according to its shuffle partition configuration.
4. The next stage processes those shuffle partitions in parallel.

[spark-shuffle-partitions]

## 2. How many shuffle partitions does Spark create?

For Spark SQL and DataFrame operations, the initial number of shuffle partitions is generally controlled by:

```text
spark.sql.shuffle.partitions
```

The default value is 200.

You can check it using:

```python
spark.conf.get("spark.sql.shuffle.partitions")
```

And change it:

```python
spark.conf.set("spark.sql.shuffle.partitions", 400)
```

This means Spark will initially plan 400 partitions for supported shuffle operations.

**Important:** With Adaptive Query Execution (AQE), Spark can dynamically coalesce shuffle partitions or change the partitioning strategy based on runtime statistics. Therefore, the final number of tasks may differ.

## 3. Input partitions vs. shuffle partitions

| Feature | Input partitions | Shuffle partitions |
| --- | --- | --- |
| Created | While reading or partitioning data | During data redistribution |
| Controlled by | File splits, read configuration, repartitioning | `spark.sql.shuffle.partitions`, AQE, operation-specific settings |
| Purpose | Parallelize initial data processing | Parallelize processing after a shuffle |
| Example | 50 Parquet input splits | 200 planned shuffle partitions |

## 4. What happens if the number of shuffle partitions is too high or too low?

| Too few partitions | Too many partitions |
| --- | --- |
| Each task processes more data | Each task processes less data |
| Greater risk of memory pressure | Higher task scheduling overhead |
| Insufficient parallelism | Excessive small shuffle blocks |
| Long-running tasks | Potentially inefficient execution |

## 5. How should you choose shuffle partitions?

A useful starting point is:

**Shuffle partitions ≈ Estimated shuffle data size ÷ Target partition size**

Example:

Suppose a shuffle processes 100 GiB of data, and you want partitions around 200 MiB.

**(100 × 1024 MiB) ÷ 200 MiB = 512 partitions**

You could start with:

```python
spark.conf.set("spark.sql.shuffle.partitions", 512)
```

However, you should also consider available CPU cores, task overhead, data skew, and whether AQE is enabled.

For modern Spark SQL workloads, AQE often makes it practical to start with a sufficiently large shuffle partition count and let Spark coalesce small partitions at runtime.

## 6. Interview-ready answer

> Shuffle partitions are the partitions created when Spark redistributes data across executors during wide transformations such as joins and aggregations. They determine the number of reduce-side tasks in the subsequent stage. By default, Spark SQL plans 200 shuffle partitions, controlled by `spark.sql.shuffle.partitions`. Too few partitions can cause large tasks and memory pressure, while too many can increase scheduling overhead. Adaptive Query Execution can optimize the number of shuffle partitions dynamically.

**Key distinction:** Input partitions determine parallelism before a shuffle, while shuffle partitions determine parallelism after data redistribution.