# Which Spark operations cause a shuffle?

In Apache Spark, a shuffle occurs when data must be redistributed across partitions, typically to group records with the same key, join datasets, sort data, or change partitioning.

Shuffle operations are generally associated with wide transformations, where a partition's output depends on data from multiple input partitions.

## 1. Operations that cause a shuffle

| Operation                         | Shuffle? | Reason                                                |
| --------------------------------- | -------- | ----------------------------------------------------- |
| `groupBy().agg()`                 | Usually  | Groups records with the same key                      |
| `groupBy().count()`               | Usually  | Combines counts across partitions                     |
| `reduceByKey()`                   | Usually  | Aggregates records with the same key                  |
| `groupByKey()`                    | Usually  | Brings values with the same key together              |
| `join()`                          | Often    | Redistributes data by join keys                       |
| `distinct()`                      | Usually  | Removes duplicates across partitions                  |
| `dropDuplicates()`                | Usually  | Groups duplicate records                              |
| `orderBy()` / `sort()`            | Usually  | Requires global ordering                              |
| `repartition()`                   | Yes      | Explicitly redistributes records                      |
| `repartitionByRange()`            | Yes      | Redistributes records into range-based partitions     |
| `coalesce(n, shuffle=True)` (RDD) | Yes      | Redistributes data while changing partitions          |
| `intersection()`                  | Usually  | Identifies common records across partitions           |
| `subtract()`                      | Usually  | Identifies records absent from another RDD            |
| `window functions`                | Often    | Partitions and orders records for window calculations |

Important: Spark's optimizer may eliminate a shuffle if the data already satisfies the required distribution, or choose an alternative strategy such as a broadcast join.

## 2. Operations that generally do not cause a shuffle

| Operation                | Shuffle?        | Reason                                                         |
| ------------------------ | --------------- | -------------------------------------------------------------- |
| `filter()`               | No              | Processes records within existing partitions                   |
| `select()`               | No              | Selects columns locally                                        |
| `withColumn()`           | No, typically   | Computes expressions within partitions                         |
| `map()`                  | No              | Transforms records independently                               |
| `flatMap()`              | No              | Processes records within partitions                            |
| `mapPartitions()`        | No              | Processes each partition independently                         |
| `union()`                | No, typically   | Combines datasets without redistributing records               |
| `limit()`                | Not necessarily | May collect a limited number of records without a full shuffle |
| `coalesce(n)`            | Usually no      | Merges partitions without a full shuffle                       |
| `sortWithinPartitions()` | No              | Sorts locally within each partition                            |

## 3. Example: Shuffle during groupBy

```
df = spark.read.parquet("/data/employees")
result = df.groupBy("department").count()

result.show()
```

Conceptually, Spark executes:

[spark-groupby-shuffle]

## 4. How to identify a shuffle in Spark?

Use `explain()` to inspect the physical execution plan:

```
df.groupBy("department").count().explain("formatted")
```

Typical output:

```
HashAggregate
+- Exchange hashpartitioning(department, 200)
   +- HashAggregate
      +- FileScan parquet
```

`Exchange` is the key indicator of data redistribution in a Spark SQL physical execution plan. For example, `Exchange hashpartitioning(...)` indicates a shuffle. A `BroadcastExchange` distributes broadcast data and is not a normal shuffle.

The exact plan may differ depending on Spark configuration, Adaptive Query Execution (AQE), and existing partitioning.

## 5. Does every `groupBy()` or `join()` cause a shuffle?

No.

For example, a broadcast join can avoid shuffling both datasets:

```
from pyspark.sql.functions import broadcast

result = large_df.join(
    broadcast(small_df),
    "customer_id"
)
```

Spark broadcasts the smaller DataFrame to executors instead of shuffling both sides of the join.

Similarly, if both datasets already have compatible partitioning that Spark can recognize, a join may not require a new shuffle.

## Interview-ready answer

> Spark operations that commonly cause shuffle include `groupBy`, `reduceByKey`, `groupByKey`, `join`, `distinct`, `orderBy`, and `repartition`.
>
> Operations such as `filter`, `map`, `flatMap`, and `select` generally do not cause shuffle because they process records within existing partitions.
>
> However, whether a shuffle actually occurs depends on the physical execution plan, not just the transformation name. The most reliable way to identify a shuffle is to inspect `df.explain()` and look for shuffle-related `Exchange` operators.

Key takeaway: Wide transformations often require a shuffle, but not every wide-looking operation necessarily produces a new shuffle in the optimized physical plan.