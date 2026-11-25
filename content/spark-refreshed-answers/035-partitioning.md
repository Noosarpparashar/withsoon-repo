# What is partitioning in Spark?

Partitioning in Apache Spark is the process of dividing a large dataset into smaller, logical chunks called partitions, which can be processed independently and in parallel across executors.

Each partition is typically processed by one Spark task at a time.

## 1. How partitioning works

Suppose you have a dataset containing 100 million records, divided into 4 partitions.

[spark-partitioning]

Spark processes these partitions in parallel, improving performance and distributing the workload.

## 2. Types of partitioning in Spark

| Type | Description | Example |
| --- | --- | --- |
| Hash partitioning | Distributes records based on the hash of a key | `repartition(4, "customer_id")` |
| Range partitioning | Distributes records according to ordered value ranges | `repartitionByRange(4, "salary")` |
| Round-robin partitioning | Distributes rows across partitions without a partitioning key | `repartition(4)` |
| File partitioning | Creates input partitions based on file sizes, splits, and scan settings | Reading Parquet files |

## 3. How to control partitions

### Check the number of partitions

```python
df.rdd.getNumPartitions()
```

### Increase or redistribute partitions

```python
df2 = df.repartition(10)
```

- Creates 10 partitions.
- Typically involves a shuffle.
- Redistributes data across the cluster.

### Reduce partitions

```python
df2 = df.coalesce(4)
```

- Reduces the number of partitions.
- Typically avoids a shuffle.
- May produce unevenly sized partitions.

### Partition by a column

```python
df2 = df.repartition(10, "customer_id")
```

Records with the same `customer_id` are assigned to the same partition using hash partitioning.

## 4. Why is partitioning important?

- **Parallelism:** More partitions allow more tasks to execute concurrently, up to the cluster's available task slots.
- **Performance:** Properly sized partitions distribute workload efficiently.
- **Memory management:** Smaller partitions can reduce per-task memory pressure.
- **Data locality:** Spark attempts to schedule tasks close to their input data.
- **Shuffle optimization:** Appropriate partitioning can reduce unnecessary redistribution in certain operations.

## 5. What happens with too many or too few partitions?

| Too few partitions | Too many partitions |
| --- | --- |
| Low parallelism | Excessive task scheduling overhead |
| Underutilized CPU cores | Many tiny tasks |
| Large per-task memory requirements | Increased task and metadata overhead |
| Slow execution | Potential performance degradation |

## 6. Partitioning vs partitionBy()

This is an important interview distinction.

`repartition()` controls how data is distributed across Spark's execution partitions.

`partitionBy()` controls how data is organized into directories when writing files.

```python
# Execution partitioning
df = df.repartition(10, "country")

# Storage partitioning
df.write \
    .partitionBy("country") \
    .mode("overwrite") \
    .parquet("/data/sales")
```

The output directory might look like:

```text
/data/sales/
    country=India/
    country=USA/
    country=UK/
```

Storage partitioning can enable partition pruning, allowing Spark to skip irrelevant directories when filtering on partition columns.

## Interview-ready answer

> Partitioning in Spark is the mechanism of dividing a distributed dataset into smaller logical units that can be processed independently by tasks across executors. It controls parallelism, workload distribution, and memory usage. Spark supports different partitioning strategies, including hash and range partitioning. We can adjust execution partitions using `repartition()` and `coalesce()`. Choosing an appropriate partition count helps improve resource utilization and reduce execution time.

**Key point:** One partition is processed by one task per stage, but a partition is not permanently tied to a specific executor.