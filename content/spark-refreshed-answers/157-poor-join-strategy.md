# What if Spark chooses a poor join strategy despite CBO and AQE?

Even with Cost-Based Optimization (CBO) and Adaptive Query Execution (AQE) enabled, **Apache Spark can still select an inefficient join strategy due to inaccurate statistics, data skew, resource constraints, complex join conditions, or limitations in its optimization algorithms.**

In such cases, a Spark developer can manually influence execution through **join hints, query restructuring, statistics collection, partitioning, and configuration tuning**.

However, the correct approach is to first identify why Spark selected a poor strategy rather than immediately forcing a different join.

## 1. Why can CBO and AQE still choose a poor join strategy?

| Reason                         | Explanation                                                                                  |
| ------------------------------ | -------------------------------------------------------------------------------------------- |
| Missing or outdated statistics | CBO may incorrectly estimate table sizes or join cardinalities.                              |
| Data skew                      | A few join keys may contain disproportionately large amounts of data.                        |
| Broadcast threshold            | A table suitable for broadcasting may exceed the configured threshold.                       |
| Join conditions                | Non-equi joins or certain outer joins restrict which algorithms can be used.                 |
| AQE limitations                | AQE cannot undo previously completed work or optimize every possible join plan.              |
| Resource constraints           | A join strategy may be theoretically efficient but unsuitable for available executor memory. |
| Join hints                     | Existing hints can influence Spark toward an inefficient strategy.                           |

For example, Spark may select a sort-merge join even though broadcasting a relatively small dimension table would be faster.

Alternatively, it may choose a broadcast hash join based on an underestimated table size, causing excessive memory usage or broadcast timeouts.

## 2. First, inspect the selected join strategy

Before changing configurations, inspect the query execution plan.

```python
df.explain(mode="formatted")
```

Or:

```sql
EXPLAIN FORMATTED
SELECT *
FROM orders o
JOIN customers c
    ON o.customer_id = c.customer_id;
```

Look for these physical operators:

| Operator                  | Meaning                                                              |
| ------------------------- | -------------------------------------------------------------------- |
| `BroadcastHashJoin`       | One side is broadcast and joined using a hash table.                 |
| `SortMergeJoin`           | Both sides are arranged by join keys and merged.                     |
| `ShuffledHashJoin`        | Inputs are shuffled and local hash tables are constructed.           |
| `BroadcastNestedLoopJoin` | A broadcast nested-loop algorithm is used, often for non-equi joins. |
| `Exchange`                | Data is redistributed, typically introducing a shuffle.              |

Also inspect:

```python
df.explain(mode="cost")
```

This displays available estimated row counts and data sizes.

In the Spark UI, check the **final adaptive physical plan**, shuffle read/write, spill metrics, task duration, and skewed partitions. Comparing estimates with runtime metrics helps distinguish a planning problem from an execution problem.

## 3. Solution 1: Force a better join strategy using hints

Spark supports several join strategy hints that allow developers to influence physical planning.

### A. Force a broadcast hash join

Suppose:

| Table     | Size   |
| --------- | ------ |
| Orders    | 500 GB |
| Customers | 50 MB  |

If the effective automatic broadcast threshold is 10 MiB, Spark may choose a sort-merge join.

However, if the Customers table fits comfortably in executor memory, broadcasting it might be more efficient.

**Using SQL:**

```sql
SELECT /*+ BROADCAST(c) */
    o.order_id,
    c.customer_name
FROM orders o
JOIN customers c
    ON o.customer_id = c.customer_id;
```

**Using PySpark:**

```python
from pyspark.sql.functions import broadcast

orders = spark.table("orders")
customers = spark.table("customers")

result = orders.join(
    broadcast(customers),
    "customer_id"
)
```

This prioritizes broadcasting `customers`, even when its estimated size exceeds the configured automatic broadcast threshold.

### B. Force a sort-merge join

If Spark selects a broadcast join for a table that is too large to fit comfortably in executor memory, a sort-merge join may be more suitable.

```sql
SELECT /*+ MERGE(o, c) */
    o.order_id,
    c.customer_name
FROM orders o
JOIN customers c
    ON o.customer_id = c.customer_id;
```

A sort-merge join distributes processing across executors instead of broadcasting an entire input.

### C. Force a shuffled hash join

```sql
SELECT /*+ SHUFFLE_HASH(c) */
    o.order_id,
    c.customer_name
FROM orders o
JOIN customers c
    ON o.customer_id = c.customer_id;
```

A shuffled hash join can be useful when the hash-build side fits in memory within each shuffle partition.

**Important:** Join hints are strong preferences, not absolute guarantees. Spark can ignore a hint if the join type or condition does not support the requested strategy. Forcing a broadcast join can also increase memory pressure.

## 4. Solution 2: Refresh outdated statistics

If Spark has inaccurate information about table sizes or column distributions, refresh the relevant statistics.

```sql
ANALYZE TABLE orders COMPUTE STATISTICS;

ANALYZE TABLE customers COMPUTE STATISTICS;

ANALYZE TABLE customers
COMPUTE STATISTICS
FOR COLUMNS customer_id;
```

Then inspect the plan again:

```sql
EXPLAIN COST
SELECT *
FROM orders o
JOIN customers c
    ON o.customer_id = c.customer_id;
```

Accurate statistics improve join cardinality estimates and help Spark make better planning decisions.

## 5. Solution 3: Tune broadcast thresholds

Sometimes Spark does not broadcast a table because the configured threshold is too low.

The standard default automatic broadcast threshold is 10 MiB.

For example:

```python
# Allow larger tables to be considered
# for automatic broadcasting (100 MiB).
spark.conf.set(
    "spark.sql.autoBroadcastJoinThreshold",
    100 * 1024 * 1024
)
```

AQE has a separate adaptive threshold:

```python
spark.conf.set(
    "spark.sql.adaptive.autoBroadcastJoinThreshold",
    100 * 1024 * 1024
)
```

The adaptive threshold controls broadcast conversion decisions during AQE, while the regular threshold influences initial planning. If the adaptive threshold is unset, Spark uses the regular automatic broadcast threshold for this purpose.

**Do not blindly increase these values.** Broadcasting a large table to many executors can cause memory pressure and out-of-memory failures.

## 6. Solution 4: Handle data skew

Sometimes the selected join algorithm is appropriate, but a few partitions contain disproportionately large amounts of data.

For example, suppose most `customer_id` values occur 100 times, but one customer ID occurs 20 million times.

A join partition containing that customer can become a bottleneck even when the overall execution strategy is reasonable.

First verify AQE skew handling:

```python
spark.conf.set("spark.sql.adaptive.enabled", "true")
spark.conf.set("spark.sql.adaptive.skewJoin.enabled", "true")
```

AQE can split qualifying skewed shuffle partitions and replicate necessary data from the other join side to balance execution.

If AQE does not adequately resolve the problem, consider:

- Salting heavily skewed join keys.
- Isolating hot keys and processing them separately.
- Broadcasting a sufficiently small join side.
- Repartitioning appropriately, recognizing that repartitioning by the same skewed key alone does not remove key skew.

AQE skew optimization depends on specific thresholds and supported join operations.

## 7. Solution 5: Reduce data before joining

Sometimes the most effective solution is to reduce the input datasets rather than changing the join algorithm.

For example:

```python
from pyspark.sql.functions import col, broadcast

orders = (
    spark.table("orders")
    .filter(col("order_status") == "COMPLETED")
    .select("order_id", "customer_id", "amount")
)

customers = (
    spark.table("customers")
    .select("customer_id", "customer_name")
)

result = orders.join(
    broadcast(customers),
    "customer_id"
)
```

This can improve performance by:

- Filtering unnecessary records before the join.
- Removing unused columns.
- Reducing the amount of data shuffled or broadcast.

Catalyst already performs predicate pushdown and column pruning where possible, so verify whether these optimizations are missing before manually restructuring the query.

## 8. Production troubleshooting checklist

| Observed problem                       | What to investigate                      | Potential solution                                       |
| -------------------------------------- | ---------------------------------------- | -------------------------------------------------------- |
| Sort-merge join when one side is small | Broadcast threshold, table estimates     | Broadcast hint or threshold tuning                       |
| Broadcast join causes OOM              | Actual build-side size, executor memory  | Use merge hint or reduce broadcast input                 |
| Join takes much longer than expected   | Skewed tasks, shuffle sizes              | AQE skew handling, salting                               |
| CBO chooses poor join order            | Row counts and column statistics         | Refresh statistics, rewrite query                        |
| Excessive shuffle                      | Physical plan and partitioning           | Filter earlier, reduce data, optimize partitioning       |
| AQE does not change join strategy      | Final plan, thresholds, join eligibility | Check AQE settings and supported transformations         |
| Many tasks spill to disk               | Partition sizes, available memory        | Adjust partitioning or use a more suitable join strategy |

## 9. How to confirm your optimization worked

After applying a change, compare the original and modified query under comparable conditions.

Measure:

1. Total query execution time.
2. Shuffle read/write volume.
3. Memory bytes spilled (estimated in-memory size) and disk bytes spilled.
4. Peak execution memory and task durations.
5. Final physical plan after AQE.

A different join strategy does not automatically mean better performance. The optimization should produce a measurable improvement without compromising reliability.

## Interview-ready answer

> Even with CBO and AQE enabled, Spark can sometimes select a poor join strategy due to inaccurate statistics, data skew, memory constraints, or limitations in the optimizer.
>
> My first step would be to inspect the execution plan using `EXPLAIN FORMATTED` and `EXPLAIN COST`, then analyze the Spark SQL UI to identify expensive joins, large shuffles, spills, and skewed tasks.
>
> If Spark chooses a sort-merge join when one side is sufficiently small, I may use a broadcast hint or tune the broadcast threshold.
>
> If Spark chooses an inappropriate broadcast join, I may use a merge join hint to avoid excessive memory consumption.
>
> If the problem is caused by data skew, I would examine AQE skew handling and consider techniques such as salting or processing heavily skewed keys separately.
>
> I would also refresh outdated statistics using `ANALYZE TABLE` and reduce unnecessary input data through filtering and column pruning.
>
> Finally, I would compare the execution plans and runtime metrics before and after optimization to verify the improvement.
>
> **CBO and AQE automate many optimization decisions, but when they select an inefficient join strategy, we can intervene using accurate statistics, join hints, configuration tuning, query restructuring, and skew-handling techniques. The key is to diagnose the actual bottleneck before overriding Spark's optimizer.**
