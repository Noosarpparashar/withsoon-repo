# What is a shuffle in Spark?

A shuffle in Apache Spark is the process of redistributing data across partitions, often between different executors, so that records with the same key are brought together for operations such as `groupBy()`, `join()`, `distinct()`, and `reduceByKey()`.

Shuffle is one of the most expensive operations in Spark because it involves network communication, disk I/O, serialization, and memory usage.

## 1. Why is shuffle required?

Suppose we have employee data distributed across three partitions.

[spark-shuffle-departments]

If Spark needs to count employees by department, it must bring records with the same department together so they can be aggregated.

## 2. Example in PySpark

```python
df = spark.read.parquet("/data/employees")
result = df.groupBy("department").count()

result.show()
```

### What happens internally?

1. Spark reads data from the existing partitions.
2. Each executor performs partial aggregation locally.
3. Spark uses a partitioning function, typically a hash, to determine the destination partition for each department.
4. Shuffle data is written and transferred across executors as needed.
5. Reduce-side tasks fetch the required shuffle data and produce the final counts.

## 3. Operations that may cause shuffle

| Operation | Shuffle? |
| --- | --- |
| `filter()` | No |
| `select()` | No |
| `map()` | No |
| `groupBy()` + aggregation | Usually |
| `distinct()` | Usually |
| `join()` | Often, except strategies like broadcast join |
| `orderBy()` | Usually |
| `repartition()` | Yes |
| `coalesce()` | Not usually; RDD `shuffle=False` is the default, and DataFrame coalesce uses a narrow dependency |

## 4. How does shuffle affect stages?

Shuffle boundaries generally divide a Spark job into different stages.

For example:

```python
(
    df.filter("salary > 50000")
      .groupBy("department")
      .count()
      .show()
)
```

Typical execution:

[spark-shuffle-stages]

## 5. Why is shuffle expensive?

- Network I/O: Data may be transferred between executors on different machines.
- Disk I/O: Intermediate shuffle data is commonly written to disk.
- Serialization: Data must be encoded and decoded during transfer.
- Memory consumption: Shuffle operations use memory for sorting, aggregation, and buffering.
- Data skew: Some partitions may receive much more data than others, causing slow tasks.

## 6. How to reduce shuffle?

- Use broadcast joins when one side of the join is sufficiently small.
- Filter unnecessary records early.
- Avoid unnecessary `repartition()` operations.
- Use partial aggregation operations such as `reduceByKey()` instead of `groupByKey()` when appropriate.
- Reuse compatible partitioning where possible.
- Enable Adaptive Query Execution (AQE) to help optimize shuffle partition sizes and skewed joins.

## Interview-ready answer

> A shuffle in Spark is the redistribution of data across partitions to bring records with the same key together. It occurs during wide transformations such as aggregations, joins, and repartitioning. Shuffle typically involves disk I/O, network transfer, and serialization, making it one of the costliest operations in Spark. It also creates stage boundaries in the execution DAG.

Key takeaway: A shuffle changes how data is distributed across partitions, while a narrow transformation processes data without requiring redistribution across partitions.