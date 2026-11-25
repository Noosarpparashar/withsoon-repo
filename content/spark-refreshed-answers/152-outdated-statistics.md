# What happens when table statistics are outdated?

When table statistics are outdated, Spark's Cost-Based Optimizer (CBO) may generate a suboptimal query execution plan because its decisions are based on inaccurate estimates of data size, row counts, and data distribution.

This can lead to incorrect join ordering, inefficient join strategies, unnecessary shuffling, increased memory consumption, and slower query execution.

However, outdated statistics generally affect query performance, not the correctness of query results. Statistics can also influence physical join selection when dedicated cost-based join reordering is disabled.

## 1. Why outdated statistics cause problems

Spark's CBO relies on statistics such as:

- Table size: Total data size in bytes.
- Row count: Number of records in a table.
- Distinct value count: Number of unique values in a column.
- Minimum and maximum values: Used to estimate filter selectivity.
- Null counts and histograms: Help estimate data distribution.

If these statistics no longer represent the actual data, the optimizer may make poor decisions.

### Example: Outdated table statistics

Suppose a table initially contains 100,000 records but grows significantly after daily ingestion.

| Statistic | Stored statistics | Actual data |
| --- | --- | --- |
| Row count | 100,000 | 50 million |
| Table size | 5 MB | 2 GB |

Spark may still estimate the table size as 5 MB if it relies on stale catalog statistics.

This can cause several performance problems.

## 2. Problems caused by outdated statistics

### A. Incorrect join strategy

Spark may choose a broadcast hash join because it estimates that one table is small.

For example:

```sql
SELECT *
FROM orders o
JOIN customers c
ON o.customer_id = c.customer_id;
```

Suppose Spark estimates that customers is only 5 MB, while its actual size is 2 GB.

Under the default 10 MB automatic broadcast threshold, the stale estimate could contribute to Spark initially selecting a broadcast hash join.

Consequences may include:

- Excessive executor memory consumption.
- Broadcast timeouts.
- Out-of-memory errors.
- Significant performance degradation.

A sort-merge join or another distributed join strategy might have been more appropriate.

Actual join selection also depends on the join type, data-source statistics, configuration, and optimizer hints.

### B. Incorrect join ordering

Suppose Spark joins three tables:

| Table | Stored row count | Actual row count |
| --- | --- | --- |
| Orders | 100 million | 100 million |
| Customers | 10,000 | 20 million |
| Countries | 200 | 200 |

Based on stale statistics, CBO might incorrectly estimate that joining Orders and Customers first would produce a small intermediate result.

In reality, this join may generate a large intermediate dataset, resulting in expensive shuffle and memory usage.

With accurate statistics, CBO may choose a different join order that processes fewer intermediate records.

### C. Incorrect cardinality estimation

Cardinality estimation predicts how many rows an operation will produce.

For example:

```sql
SELECT *
FROM orders
WHERE status = 'COMPLETED';
```

Suppose old column statistics indicate that only 5% of orders are completed, but the actual percentage has increased to 90%.

Spark may significantly underestimate the number of rows passing through the filter.

This inaccurate estimate can influence downstream join ordering and other planning decisions.

## 3. How to identify outdated statistics

Spark provides several ways to inspect statistics and query plans.

Check table statistics:

```sql
DESCRIBE EXTENDED orders;
```

Check column statistics:

```sql
DESCRIBE EXTENDED orders status;
```

Inspect estimated query costs:

```sql
EXPLAIN COST
SELECT *
FROM orders o
JOIN customers c
ON o.customer_id = c.customer_id;
```

Or using PySpark:

```python
df.explain(mode="cost")
```

Inspect the optimized logical plan for estimated row counts and sizes. Compare these estimates with known data volumes and, where available, runtime statistics in the Spark SQL UI.

## 4. How to fix outdated statistics

The standard solution is to refresh the statistics used by the optimizer.

### Step 1: Update table statistics

```sql
ANALYZE TABLE orders
COMPUTE STATISTICS;
```

This collects table statistics, including row count and size in bytes.

### Step 2: Update column statistics

```sql
ANALYZE TABLE orders
COMPUTE STATISTICS
FOR COLUMNS customer_id, status;
```

This updates relevant column statistics, such as distinct value counts and null counts.

### Step 3: Inspect the query plan again

```sql
EXPLAIN COST
SELECT *
FROM orders o
JOIN customers c
ON o.customer_id = c.customer_id;
```

Compare the estimated cardinalities and join strategies before and after collecting statistics.

Spark supports ANALYZE TABLE for collecting optimizer statistics, although the availability and behavior depend on the underlying catalog and table implementation.

## 5. Can Adaptive Query Execution (AQE) handle outdated statistics?

Yes, partially.

AQE uses actual runtime statistics to adjust certain physical execution decisions.

For example:

- It can convert a sort-merge join into a broadcast hash join when runtime statistics show that one side is sufficiently small.
- It can coalesce small shuffle partitions.
- It can optimize skewed shuffle partitions.

Enable AQE with:

```python
spark.conf.set("spark.sql.adaptive.enabled", "true")
```

However, AQE does not completely eliminate the need for accurate table statistics.

Some decisions, such as the initial logical join order, are made before execution and may not be fully reconsidered by AQE.

## 6. Best practices in production

| Practice | Benefit |
| --- | --- |
| Refresh statistics after major ingestion or updates | Keeps estimates aligned with actual data |
| Collect statistics on frequently filtered and joined columns | Improves cardinality estimation |
| Enable AQE | Allows runtime adjustment of supported physical plan decisions |
| Inspect EXPLAIN COST | Helps identify inaccurate estimates |
| Monitor Spark SQL UI | Helps compare estimated and actual execution behavior |
| Avoid unnecessary full-table analysis | Reduces statistics collection overhead |

For tables that change frequently, statistics maintenance should be incorporated into the data pipeline or table maintenance process. The required frequency depends on data growth, update patterns, and the capabilities of the table format and catalog.

## Interview-ready answer

> When table statistics are outdated, Spark's Cost-Based Optimizer may generate a suboptimal execution plan because it relies on inaccurate estimates of table size, row count, and data distribution.
>
> For example, if a table was originally 5 MB but has grown to 2 GB, Spark might still consider it small and select a broadcast hash join, potentially causing memory issues or broadcast timeouts.
>
> Outdated statistics can also lead to incorrect join ordering, poor cardinality estimation, excessive shuffling, and slower query execution.
>
> To resolve this, we can refresh table and column statistics using ANALYZE TABLE ... COMPUTE STATISTICS and inspect the resulting plan using EXPLAIN COST.
>
> Additionally, enabling Adaptive Query Execution allows Spark to make certain runtime optimizations based on actual data statistics, although AQE cannot correct every decision made using stale statistics.
>
> Outdated statistics generally do not affect query correctness, but they can significantly degrade performance by causing Spark to select inefficient execution plans.
