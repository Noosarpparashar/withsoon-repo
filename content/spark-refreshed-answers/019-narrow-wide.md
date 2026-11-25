# What are narrow and wide transformations?

In Apache Spark, transformations are classified as narrow or wide based on how data is distributed and exchanged between partitions.

The key difference is whether a transformation requires shuffling data across partitions.

## 1. Narrow Transformations

A narrow transformation is one where each output partition depends on at most one input partition.

- Data can be processed locally without network shuffling.
- Generally faster because there is no shuffle overhead.
- Multiple narrow transformations can be pipelined into a single Spark stage.
- Examples: `map()`, `filter()`, `flatMap()`, `mapPartitions()`, and `union()`.

Example:

```
df = spark.read.parquet("employees.parquet")
df_filtered = df.filter(df.salary > 50000)
df_selected = df_filtered.select("name", "salary")

df_selected.show()
```

Here:

- `filter()` processes records within existing partitions.
- `select()` processes columns locally.
- Neither transformation requires shuffling data.

[spark-narrow-transformation]

## 2. Wide Transformations

A wide transformation is one where at least one output partition depends on multiple input partitions.

- Usually requires a shuffle, redistributing data across executors.
- More expensive because of network I/O, serialization, and disk I/O.
- Shuffle boundaries generally create new Spark stages.
- Examples: `groupBy()`, `reduceByKey()`, `distinct()`, `repartition()`, and joins that require shuffling.

Example:

```
df = spark.read.parquet("employees.parquet")
df_grouped = df.groupBy("department").count()

df_grouped.show()
```

Here:

- Records belonging to the same department may exist in different partitions.
- Spark redistributes records by department so the groups can be aggregated.
- This introduces a shuffle.

[spark-wide-transformation]

## 3. Narrow vs Wide Transformations

| Feature              | Narrow                                   | Wide                                 |
| -------------------- | ---------------------------------------- | ------------------------------------ |
| Partition dependency | One input partition per output partition | Multiple input partitions possible   |
| Shuffle              | Not required                             | Usually required                     |
| Network transfer     | No data redistribution                   | Usually involves data redistribution |
| Performance          | Generally faster                         | Generally slower                     |
| Stage boundary       | No new stage required                    | Usually creates a new stage          |
| Examples             | `map`, `filter`, `select`                | `groupBy`, `distinct`, `repartition` |

## 4. How Narrow and Wide Transformations Affect Spark Stages

Consider this example:

```
df = spark.read.parquet("sales.parquet")

result = (
    df.filter(df.amount > 1000)      # Narrow
      .select("region", "amount")    # Narrow
      .groupBy("region")             # Wide
      .sum("amount")
)

result.show()
```

Execution flow (simplified):

[spark-narrow-wide-stages]

Spark pipelines narrow transformations within stages and separates stages at shuffle boundaries.

## 5. Important Interview Points

### Q: Does every wide transformation cause a shuffle?

Not necessarily. Some operations, such as joins, may avoid shuffling when Spark uses broadcast joins or when compatible partitioning already exists.

### Q: Does every wide transformation create a new stage?

Typically, shuffle boundaries create stages, but the exact number depends on Spark's physical execution plan and optimizations.

### Q: Is `coalesce()` narrow or wide?

- `coalesce(2)` without shuffle is narrow.
- RDD `coalesce(2, shuffle=True)` involves a shuffle; DataFrame `coalesce()` does not expose this argument.

### Q: Is `join()` narrow or wide?

It depends on the join strategy. A sort-merge join often requires shuffling, while a broadcast hash join can avoid shuffling the large side.

## Interview-ready Answer

> Narrow transformations are operations where each output partition depends on at most one input partition, allowing Spark to process data locally without shuffling. Examples include `map()`, `filter()`, and `select()`.
>
> Wide transformations are operations where an output partition may depend on multiple input partitions, generally requiring data shuffling across executors. Examples include `groupBy()`, `distinct()`, and `repartition()`.
>
> The most important distinction is that narrow transformations can be pipelined within a Spark stage, whereas shuffle dependencies introduced by wide transformations generally create new stage boundaries.
