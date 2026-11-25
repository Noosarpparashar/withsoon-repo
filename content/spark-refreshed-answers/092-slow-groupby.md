# Why can a Spark job become extremely slow after a groupBy?

A Spark job can become extremely slow after a `groupBy` because groupBy typically involves a wide transformation that requires shuffling data across executors.

The main causes are:

1. Expensive network shuffle.
2. Data skew.
3. High-cardinality grouping keys.
4. Memory pressure and disk spilling.
5. Incorrect partitioning.
6. Expensive aggregation operations.

## 1. How groupBy works internally

Consider:

```python
from pyspark.sql import functions as F

result = df.groupBy("customer_id").agg(
    F.sum("amount").alias("total_amount")
)
```

For an aggregation such as `sum`, Spark generally performs the following operations:

[spark-reference:groupby-aggregation]

Spark performs local partial aggregation first, shuffles intermediate results by grouping key, and then performs final aggregation.

This reduces network traffic compared with shuffling every raw record, but the shuffle and aggregation can still be expensive.

## 2. Data skew: one of the biggest reasons

Suppose you group 100 million records by `country`.

| Country | Records    |
| ------- | ---------- |
| India   | 80 million |
| USA     | 10 million |
| UK      | 5 million  |
| Others  | 5 million  |

If one country contains 80% of the data, there is significant key skew.

However, there is an important distinction:

For simple aggregations such as `sum` and `count`, Spark performs partial aggregation before shuffling. Therefore, 80 million records with the same key do not necessarily mean that all 80 million raw records are shuffled to one executor.

Skew can still be expensive if local processing is highly uneven, there are many distinct keys, or the aggregation accumulates large intermediate state.

For example, `collect_list()` may require retaining a very large collection for one key, creating memory pressure that a simple `count()` would not.

## 3. High-cardinality grouping keys

Consider:

```python
df.groupBy("transaction_id").count()
```

If 100 million transactions have almost unique IDs, Spark may produce nearly 100 million groups.

This can cause:

- Large aggregation hash maps.
- High memory consumption.
- Disk spills.
- Large shuffle volumes.
- Large output datasets.

Compare:

| Grouping key     | Distinct keys | Typical behavior                                     |
| ---------------- | ------------- | ---------------------------------------------------- |
| `country`        | 200           | Few groups; partial aggregation often very effective |
| `customer_id`    | 10 million    | Many groups; potentially expensive                   |
| `transaction_id` | 100 million   | Minimal reduction if IDs are unique                  |

A groupBy on a high-cardinality column can be substantially more expensive than one on a low-cardinality column.

## 4. Memory pressure and spilling

During aggregation, Spark may maintain in-memory hash tables containing grouping keys and aggregation states.

If these structures become too large, Spark may spill intermediate data to disk.

The execution becomes slower due to disk I/O and additional merge work.

In the Spark UI, I inspect:

- Memory spill.
- Disk spill.
- Peak execution memory.
- Garbage collection time.
- Task-duration distribution.

## 5. Incorrect number of shuffle partitions

Spark uses `spark.sql.shuffle.partitions` to control the initial number of partitions for SQL shuffles.

```python
spark.conf.get("spark.sql.shuffle.partitions")
```

If there are too few partitions, individual aggregation tasks may process excessive data and spill.

If there are too many, scheduling overhead and numerous tiny tasks may reduce performance.

AQE can coalesce shuffle partitions when enabled, but appropriate initial sizing still matters.

## 6. Expensive aggregation functions

Not all aggregation functions have the same cost.

```python
# Usually efficient: fixed-size aggregation state
df.groupBy("customer_id").agg(
    F.sum("amount"),
    F.count("*")
)

# Potentially expensive: large per-group collection
df.groupBy("customer_id").agg(
    F.collect_list("transaction_id")
)
```

Functions such as `collect_list`, `collect_set`, and exact `countDistinct` can be more expensive than simple sums or counts, depending on group sizes and cardinality.

## 7. How would you optimize a slow groupBy?

| Problem                         | Potential optimization                                                                        |
| ------------------------------- | --------------------------------------------------------------------------------------------- |
| Excessive shuffle volume        | Filter early and remove unnecessary columns                                                   |
| High-cardinality grouping       | Aggregate at the required granularity; avoid unnecessary unique keys                          |
| Skewed keys                     | Inspect partial aggregation effectiveness; consider targeted salting or two-stage aggregation |
| Memory spills                   | Increase partitions, reduce per-task state, optimize aggregation                              |
| Too few/many shuffle partitions | Tune partitions and AQE                                                                       |
| Expensive distinct counts       | Consider `approx_count_distinct()` when approximation is acceptable                           |
| Large collected arrays          | Avoid unbounded `collect_list()` or redesign the aggregation                                  |

### How I would debug it

First, I inspect the physical plan:

```python
result.explain("formatted")
```

I expect a plan similar to:

```text
HashAggregate (Final)
  +- Exchange hashpartitioning(customer_id, 200)
       +- HashAggregate (Partial)
            +- FileScan parquet
```

I then compare the amount of data entering and leaving the partial aggregation and inspect the shuffle, spill, and task-duration metrics.

If the partial aggregation reduces hundreds of millions of input rows to a small number of intermediate groups, the shuffle may not be the primary bottleneck.

If it barely reduces the data, the shuffle and final aggregation can become significantly more expensive.

## Interview-ready answer

> A Spark job can become slow after a groupBy because grouping generally introduces a wide dependency and a shuffle.
>
> Spark first performs partial aggregation locally, redistributes intermediate results by the grouping key, and performs final aggregation.
>
> The main performance problems are high-cardinality keys, uneven data distribution, excessive shuffle volume, memory spilling, and inefficient partitioning.
>
> I would inspect the Spark UI for shuffle read/write, task-duration distribution, memory and disk spills, and the physical plan for HashAggregate and Exchange operators.
>
> Based on the findings, I would optimize the aggregation, adjust shuffle partitioning, filter early, or address skew. I would also verify whether partial aggregation is effectively reducing the amount of shuffled data.

**Key interview distinction:** A skewed `groupBy` is not automatically equivalent to a skewed join. Spark's partial aggregation makes simple `sum` and `count` operations much less sensitive to repeated keys than joins or aggregations that retain large per-group state.