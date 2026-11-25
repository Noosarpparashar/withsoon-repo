# What is the difference between repartition and coalesce?

Both `repartition()` and `coalesce()` are Spark transformations used to change the number of partitions in an RDD or DataFrame.

The main difference is:

- `repartition()` performs a full shuffle, redistributing data across partitions.
- `coalesce()` generally avoids a full shuffle and combines existing partitions, making it cheaper but potentially producing unevenly sized partitions.

## 1. Key differences

| Feature             | `repartition()`                          | `coalesce()`                     |
| ------------------- | ---------------------------------------- | -------------------------------- |
| Primary purpose     | Increase or decrease partitions          | Usually decrease partitions      |
| Shuffle             | Yes, full shuffle                        | No, by default                   |
| Data redistribution | Redistributes data across partitions     | Combines existing partitions     |
| Partition balance   | Generally more balanced                  | Can produce uneven partitions    |
| Performance         | More expensive                           | Usually cheaper                  |
| Parallelism         | Can increase or decrease                 | Usually decreases                |
| Best use case       | Balancing data or increasing parallelism | Reducing partitions efficiently  |
| Narrow/Wide         | Wide transformation                      | Narrow transformation by default |

## 2. How `repartition()` works

Suppose we have 4 partitions and want to increase them to 8.

```python
df = df.repartition(8)
```

[spark-repartition-flow]

Internally:

1. Spark creates a shuffle dependency.
2. Records are redistributed across the target partitions.
3. Tasks read shuffled data and produce 8 partitions.
4. The resulting partitions are generally more balanced, especially with an even key distribution.

**Important:** A shuffle involves network transfer, serialization, and potentially disk I/O, making `repartition()` expensive.

## 3. How `coalesce()` works

Suppose we have 8 partitions and want to reduce them to 4.

```python
df = df.coalesce(4)
```

[spark-coalesce-flow]

Internally:

1. Spark identifies existing partitions that can be grouped.
2. Multiple original partitions are processed by fewer output tasks.
3. No full redistribution occurs by default.
4. Partition sizes may remain uneven.

Since no full shuffle is required, `coalesce()` is usually faster.

However, reducing 100 partitions to 1 can cause a single downstream task to process all the data, creating a performance bottleneck.

## 4. Practical example: Writing data to S3

Suppose your Spark DataFrame contains 10 GiB of data across 200 partitions, and you want to write approximately 20 output files.

### Using `coalesce()`

```python
df.coalesce(20) \
  .write \
  .mode("overwrite") \
  .parquet("s3://bucket/output/")
```

- Avoids a full shuffle.
- Reduces downstream write tasks.
- Can produce uneven file sizes.
- Good when the data is already reasonably balanced.

### Using `repartition()`

```python
df.repartition(20) \
  .write \
  .mode("overwrite") \
  .parquet("s3://bucket/output/")
```

- Performs a full shuffle.
- Generally distributes records more evenly.
- Can produce better-balanced output file sizes.
- More expensive because of shuffle overhead.

Neither operation guarantees exactly 20 files in every write configuration.

## 5. When should you use each?

| Scenario                                                     | Recommended                                     |
| ------------------------------------------------------------ | ----------------------------------------------- |
| Increase partitions from 20 to 100                           | `repartition(100)`                              |
| Reduce partitions from 200 to 50 without unnecessary shuffle | `coalesce(50)`                                  |
| Handle heavily uneven partitions                             | `repartition()`                                 |
| Reduce the number of small output files                      | `coalesce()` or `repartition()`                 |
| Improve parallelism when partitions are too few              | `repartition()`                                 |
| Distribute data by a specific column                         | `repartition(n, "column")`                      |
| Reduce 1,000 partitions to 1                                 | Usually avoid; assess data size and bottlenecks |

## 6. Important interview question: Can `coalesce()` increase partitions?

Generally, no.

```python
df = df.coalesce(100)
```

If the DataFrame has only 20 partitions, this will not increase the partition count to 100.

However, at the RDD API level:

```python
rdd.coalesce(100, shuffle=True)
```

Can increase partitions because shuffling is explicitly enabled.

For DataFrames, use:

```python
df.repartition(100)
```

One additional nuance: Spark's `repartition()` is always a shuffle-based operation conceptually, although the optimizer may eliminate a redundant shuffle in the final physical plan.

## 7. Interview-ready answer

> `repartition()` and `coalesce()` are used to change Spark partition counts. `repartition()` performs a full shuffle and can increase or decrease partitions while generally providing better data distribution. `coalesce()` typically reduces partitions without a full shuffle by combining existing partitions, making it faster but potentially causing uneven partition sizes. I use `repartition()` when I need better data distribution or more parallelism, and `coalesce()` when I want to reduce partitions efficiently, especially before writing output.

**Key takeaway:** `repartition()` prioritizes data redistribution and parallelism, while `coalesce()` prioritizes avoiding shuffle overhead.