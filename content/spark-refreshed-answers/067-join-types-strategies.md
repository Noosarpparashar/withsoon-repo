# What join types and join strategies are available in Spark?

Apache Spark supports different join types and physical join strategies.

- Join types define which rows are returned when combining datasets.
- Join strategies define how Spark physically executes the join across executors.

## 1. Join types in Spark

Spark supports the following logical join types:

| Join type        | Description                                                                                       |
| ---------------- | ------------------------------------------------------------------------------------------------- |
| Inner Join       | Returns only matching rows from both tables                                                       |
| Left Outer Join  | Returns all left rows and matching right rows; unmatched right columns are null                   |
| Right Outer Join | Returns all right rows and matching left rows                                                     |
| Full Outer Join  | Returns all rows from both tables, filling unmatched columns with null                            |
| Left Semi Join   | Returns rows from the left table that have a match in the right table, without right-side columns |
| Left Anti Join   | Returns rows from the left table that have no match in the right table                            |
| Cross Join       | Returns every possible combination of rows from both tables                                       |

### Example

Suppose we have two tables:

Employees

| ID | Name    |
| -- | ------- |
| 1  | Alice   |
| 2  | Bob     |
| 3  | Charlie |

Departments

| ID | Dept  |
| -- | ----- |
| 1  | IT    |
| 2  | HR    |
| 4  | Sales |

[spark-join-explorer]

PySpark examples:

```python
df1.join(df2, "id", "inner")
df1.join(df2, "id", "left")
df1.join(df2, "id", "right")
df1.join(df2, "id", "full")
df1.join(df2, "id", "left_semi")
df1.join(df2, "id", "left_anti")
df1.crossJoin(df2)
```

## 2. Physical join strategies in Spark

Spark has five major physical join strategies.

| Strategy                          | Best use case                                             | Shuffle                 | Sorting |
| --------------------------------- | --------------------------------------------------------- | ----------------------- | ------- |
| Broadcast Hash Join (BHJ)         | One small, one large table                                | Usually no join shuffle | No      |
| Sort Merge Join (SMJ)             | Two large tables                                          | Usually yes             | Yes     |
| Shuffle Hash Join (SHJ)           | Partitioned datasets with a sufficiently small build side | Usually yes             | No      |
| Broadcast Nested Loop Join (BNLJ) | Non-equi joins, certain outer joins                       | Usually no join shuffle | No      |
| Cartesian Product                 | Cross joins                                               | Not necessarily         | No      |

### A. Broadcast Hash Join

- Spark broadcasts the smaller dataset to executors.
- Each executor builds or accesses an in-memory hash table and probes it using partitions of the larger dataset.
- Avoids shuffling the large dataset.
- Common default auto-broadcast threshold: 10 MiB, configurable using `spark.sql.autoBroadcastJoinThreshold`.

```python
from pyspark.sql.functions import broadcast

large_df.join(broadcast(small_df), "customer_id")
```

Best when: One table is small enough to broadcast safely.

### B. Sort Merge Join

- Both inputs are typically shuffled by the join key.
- Each input is sorted by the join key.
- Spark merges corresponding sorted partitions.
- Commonly used for two large datasets.

```text
SortMergeJoin
   ├── Sort
   │    └── Exchange (Shuffle Left)
   └── Sort
        └── Exchange (Shuffle Right)
```

Best when: Both datasets are large and an equi-join is required.

### C. Shuffle Hash Join

- Spark shuffles both datasets by the join key if necessary.
- Builds a hash table for the smaller side of each partition pair.
- Probes it using the other side.
- Avoids sorting but requires sufficient memory.

Best when: The build side of each partition pair is small enough for an efficient hash join.

### D. Broadcast Nested Loop Join

- Spark broadcasts one side.
- Compares rows against the other side using the join condition.
- May be used for non-equality joins (`>`, `<`, `!=`) and certain join types that other strategies cannot support.
- Can become very expensive.

```python
df1.join(
    broadcast(df2),
    df1.salary > df2.min_salary
)
```

### E. Cartesian Product

- Produces every possible combination between rows.
- If the left dataset has 1,000 rows and the right dataset has 500 rows, the result contains 500,000 rows.
- Potentially extremely expensive.

```python
df1.crossJoin(df2)
```

Spark may use a Cartesian Product operator for eligible inner joins without equality join keys, while other cases may use a nested-loop strategy.

## 3. How Spark selects a join strategy

Spark's Catalyst Optimizer considers table sizes, statistics, join conditions, join types, and configuration settings.

[spark-join-selection]

With Adaptive Query Execution (AQE) enabled, Spark can change the physical join strategy at runtime, such as converting a planned Sort Merge Join to a Broadcast Hash Join after discovering that one input is sufficiently small.

## 4. How to check which strategy Spark selected

```python
result = df1.join(df2, "customer_id")
result.explain("formatted")
```

Look for:

```text
BroadcastHashJoin
SortMergeJoin
ShuffledHashJoin
BroadcastNestedLoopJoin
CartesianProduct
```

You can also inspect the SQL tab in the Spark UI.

## Interview-ready answer

> Spark supports seven major logical join types: Inner, Left Outer, Right Outer, Full Outer, Left Semi, Left Anti, and Cross Join.

> For physical execution, Spark primarily uses five strategies: Broadcast Hash Join, Sort Merge Join, Shuffle Hash Join, Broadcast Nested Loop Join, and Cartesian Product.

> A Broadcast Hash Join is generally efficient when one dataset is small because it avoids shuffling the larger dataset. Sort Merge Join is commonly used when both datasets are large, whereas Shuffle Hash Join avoids sorting but requires memory for hash tables.

> Spark's Catalyst Optimizer selects the strategy based on join conditions, data sizes, statistics, and configurations. AQE can further optimize the strategy at runtime.

**Important interview distinction:** A Left Outer Join is a logical join type, whereas a Sort Merge Join is a physical execution strategy. A single logical join type can be executed using different physical strategies.