# How would you optimize a join between a huge table and a small table?

The most effective optimization is generally to use a Broadcast Hash Join, where Spark broadcasts the smaller table to all executors, allowing each executor to join it locally with partitions of the larger table.

This avoids expensive shuffling of the huge table across the cluster, provided the join supports the strategy and the smaller table fits comfortably in executor memory.

## 1. Example scenario

Suppose we have:

| Table | Size | Records |
| --- | --- | --- |
| Transactions (Fact) | 1 TiB | 5 billion |
| Countries (Dimension) | 5 MiB | 250 |

We want to join them on `country_id`.

## 2. Use a broadcast join

Without an explicit hint:

```python
result = transactions.join(
    countries,
    "country_id",
    "inner"
)
```

Depending on statistics and configuration, Spark may automatically select a broadcast join or select a Sort-Merge Join, which generally requires shuffling both datasets when compatible partitioning is not already available.

With broadcast optimization:

```python
from pyspark.sql.functions import broadcast

result = transactions.join(
    broadcast(countries),
    "country_id",
    "inner"
)
```

Spark broadcasts the 5 MiB Countries table to executors, avoiding the need to shuffle the 1 TiB Transactions table for this join.

## 3. Additional optimizations

Beyond broadcasting, I would apply the following techniques:

| Optimization | Benefit |
| --- | --- |
| Filter early | Reduces rows processed before joining |
| Select required columns | Reduces data volume and memory usage |
| Broadcast smaller table | Avoids large-table shuffle |
| Use matching join-key types | Avoids unnecessary casting and improves correctness |
| Enable AQE | Allows runtime join optimization |
| Check execution plan | Confirms Spark uses the intended strategy |
| Avoid unnecessary repartitioning | Prevents additional shuffle overhead |

## 4. Optimized PySpark example

```python
from pyspark.sql.functions import broadcast, col

# Filter large table early
fact = (
    transactions
    .filter(col("transaction_date") >= "2026-01-01")
    .select("transaction_id", "country_id", "amount")
)

# Select only necessary columns
dim = countries.select("country_id", "country_name")

# Broadcast small dimension table
result = fact.join(
    broadcast(dim),
    on="country_id",
    how="inner"
)

# Verify physical plan
result.explain("formatted")
```

Expected relevant operators:

```text
BroadcastHashJoin
:- ... Fact Table Scan
+- BroadcastExchange
   +- ... Dimension Table Scan
```

## 5. Enable Adaptive Query Execution

```python
spark.conf.set("spark.sql.adaptive.enabled", "true")
```

AQE can dynamically change join strategies based on runtime statistics, including converting certain sort-merge joins into broadcast hash joins.

However, explicitly broadcasting the small table can avoid an initial join shuffle that AQE might otherwise perform before converting the join.

## 6. What if the small table is too large to broadcast?

If broadcasting creates memory pressure, I would consider:

- Using a Sort-Merge Join for large datasets.
- Reducing the dimension table through filtering and column pruning.
- Using AQE to handle skew and adjust shuffle partitions.
- Using bucketing or compatible storage partitioning when repeated joins justify the additional complexity.

I would also inspect Spark UI metrics such as shuffle read/write, spill, task duration, and executor memory consumption.

## Interview-ready answer

> If I need to join a huge table with a small table, I would first consider a broadcast hash join. Spark broadcasts the small table to all executors so that each executor can perform the join locally without shuffling the huge table. I would also apply predicate pushdown, filter unnecessary rows, select only required columns, ensure join-key data types match, and enable AQE. Finally, I would inspect the physical execution plan using `explain()` and verify performance through the Spark UI. If the smaller table cannot fit comfortably in executor memory, I would consider a sort-merge join instead.

**Important:** If I am already using a broadcast join, I would generally avoid repartitioning the huge table by the join key because that would introduce the very shuffle I am trying to eliminate.