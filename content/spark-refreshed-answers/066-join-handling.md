# How does Spark handle joins?

Apache Spark handles joins by combining rows from two DataFrames, Datasets, or RDDs based on a join condition. For DataFrame, Dataset, and SQL joins, Spark uses Catalyst analysis, optimization, and physical planning to choose an execution strategy based on factors such as table size, join keys, join type, available statistics, and configuration. RDD joins use the RDD API and partition dependencies rather than Catalyst query planning.

The most important concept is that Spark supports multiple join types and multiple physical join strategies.

## 1. Types of joins supported by Spark

| Join type        | Description                                             |
| ---------------- | ------------------------------------------------------- |
| Inner Join       | Returns rows with matching keys in both tables          |
| Left Outer Join  | Returns all left rows and matching right rows           |
| Right Outer Join | Returns all right rows and matching left rows           |
| Full Outer Join  | Returns all rows from both tables                       |
| Left Semi Join   | Returns left rows that have a match in the right table  |
| Left Anti Join   | Returns left rows that have no match in the right table |
| Cross Join       | Returns the Cartesian product of both tables            |

## 2. Physical join strategies in Spark

Spark chooses a physical join algorithm based on the data and join condition.

| Strategy                   | Best suited for                                                | Shuffle required?         |
| -------------------------- | -------------------------------------------------------------- | ------------------------- |
| Broadcast Hash Join        | One small table, one large table                               | No join shuffle normally  |
| Sort Merge Join            | Two large tables with equi-join keys                           | Usually yes               |
| Shuffle Hash Join          | Hash join with partitioned inputs                              | Usually yes               |
| Broadcast Nested Loop Join | Non-equi joins or conditions not supported by hash/merge joins | No join shuffle normally  |
| Cartesian Product          | Cross joins                                                    | Depends on execution plan |

### A. Broadcast Hash Join

When one table is sufficiently small, Spark can broadcast that table to every executor.

[spark-broadcast-join]

The diagram illustrates the same mechanism using Transactions and Countries as the two inputs.

How it works:

1. Spark builds a hash table from the smaller input.
2. The smaller input is broadcast to executors.
3. Each executor probes the hash table using its partitions of the larger input.
4. Rows are joined locally without reshuffling the large table.

Example:

```python
from pyspark.sql.functions import broadcast

result = large_df.join(
    broadcast(small_df),
    "customer_id",
    "inner"
)
```

By default, `spark.sql.autoBroadcastJoinThreshold` is typically 10 MiB, although this is configurable.

Advantage: Avoids the expensive network shuffle of the large table.

### B. Sort Merge Join

Spark commonly uses Sort Merge Join when both tables are large and the join condition uses equality.

How it works:

1. Spark repartitions both tables using their join keys, unless they already have compatible partitioning.
2. Each join task reads the corresponding partition from both inputs, fetching shuffle blocks as needed.
3. Spark sorts both sides by the join key.
4. It merges the sorted streams and matches corresponding keys.

Example:

```python
result = orders_df.join(
    customers_df,
    "customer_id",
    "inner"
)
```

For two large DataFrames, Spark may choose:

```text
SortMergeJoin
  :- Sort
  :   +- Exchange hashpartitioning(customer_id)
  :       +- Scan orders
  +- Sort
      +- Exchange hashpartitioning(customer_id)
          +- Scan customers
```

Advantage: Suitable for joining large datasets without loading an entire table into memory.

Disadvantage: Shuffling and sorting can be expensive.

### C. Shuffle Hash Join

Spark repartitions both datasets by the join key and builds an in-memory hash table from one side of each corresponding partition pair.

Unlike Sort Merge Join, it does not require sorting.

Spark may select it when partition sizes and optimizer settings make it preferable to Sort Merge Join.

Advantage: Avoids sorting overhead.

Disadvantage: Hash-table construction requires memory, potentially causing memory pressure or out-of-memory errors.

### D. Broadcast Nested Loop Join

Spark can use a Broadcast Nested Loop Join for conditions that cannot use standard hash or sort-merge joins, such as certain non-equality conditions.

```python
result = df1.join(
    broadcast(df2),
    df1.salary > df2.salary_limit
)
```

Spark broadcasts one side and evaluates the condition against rows from the other side.

This can be expensive because it may require many row comparisons.

## 3. How Spark decides which join strategy to use

Spark's Catalyst Optimizer considers:

- Table sizes: Small tables may be broadcast.
- Join condition: Equality joins can use hash or sort-merge algorithms; non-equality joins have fewer options.
- Join type: Some strategies are not supported for certain outer, semi, or anti joins.
- Statistics: Spark uses estimated row counts and data sizes.
- Configuration: Broadcast thresholds, join preferences, and Adaptive Query Execution settings influence decisions.

Spark can also use Adaptive Query Execution (AQE) to change join strategies at runtime.

For example, Spark might initially plan a Sort Merge Join but switch to a Broadcast Hash Join after discovering that one input is small enough.

## 4. How to identify the join strategy

Use `explain()` to inspect the physical execution plan.

```python
result = orders_df.join(
    customers_df,
    "customer_id",
    "inner"
)
result.explain("formatted")
```

Look for operators such as:

```text
BroadcastHashJoin
SortMergeJoin
ShuffledHashJoin
BroadcastNestedLoopJoin
```

You can also inspect the SQL tab in the Spark UI to understand shuffle activity, execution time, and runtime metrics.

## 5. How to optimize Spark joins

| Technique                     | Benefit                                        |
| ----------------------------- | ---------------------------------------------- |
| Broadcast small tables        | Avoids shuffling large tables                  |
| Filter data before joining    | Reduces the number of rows processed           |
| Select only required columns  | Reduces shuffle size and memory usage          |
| Handle skewed join keys       | Prevents a few tasks from becoming bottlenecks |
| Enable AQE                    | Allows runtime join optimization               |
| Reuse compatible partitioning | Can eliminate unnecessary exchanges            |
| Collect accurate statistics   | Improves Catalyst's join decisions             |

## Interview-ready answer

> Spark handles joins using different physical execution strategies, primarily Broadcast Hash Join, Sort Merge Join, and Shuffle Hash Join.

> For a large table joined with a small table, Spark generally prefers a Broadcast Hash Join because it avoids shuffling the large table.

> For two large tables, Spark commonly uses a Sort Merge Join, where both datasets are partitioned by the join key, sorted, and merged.

> Spark's Catalyst Optimizer chooses the execution plan based on table sizes, join conditions, statistics, and configuration. Adaptive Query Execution can further optimize the join strategy at runtime.

**Key takeaway:** Join performance in Spark is largely determined by how much data must be shuffled across the cluster, whether sorting is required, and how much memory the join algorithm consumes.