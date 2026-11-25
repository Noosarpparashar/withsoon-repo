# What are broadcast join hints?

In Apache Spark, a Broadcast Join Hint is an optimization directive that tells the Catalyst Optimizer to prioritize broadcasting a particular DataFrame during a join, even if its estimated size exceeds the automatic broadcast threshold.

It is useful when you know that one DataFrame is small enough to broadcast efficiently, but Spark does not automatically choose a Broadcast Hash Join.

## 1. Why do we need broadcast hints?

Suppose we have two DataFrames:

| DataFrame | Size   |
| --------- | ------ |
| Orders    | 500 GiB |
| Customers | 50 MiB  |

Spark's commonly configured default broadcast threshold is 10 MiB (`spark.sql.autoBroadcastJoinThreshold`).

Because the customers table is estimated at 50 MiB, Spark might choose a Sort-Merge Join instead of a Broadcast Hash Join.

However, if you know the 50 MiB table can safely fit in executor memory, you can explicitly request broadcasting.

## 2. How to use broadcast hints

### A. Using `broadcast()` in PySpark

```python
from pyspark.sql.functions import broadcast

result = orders_df.join(
    broadcast(customers_df),
    "customer_id",
    "inner"
)
```

### B. Using `.hint("broadcast")`

```python
result = orders_df.join(
    customers_df.hint("broadcast"),
    "customer_id",
    "inner"
)
```

Both methods request the same optimization.

### C. Using SQL hints

```sql
SELECT /*+ BROADCAST(c) */
    o.order_id,
    c.customer_name
FROM orders o
JOIN customers c
    ON o.customer_id = c.customer_id;
```

Spark also supports the aliases `BROADCASTJOIN` and `MAPJOIN`.
## 3. How Spark executes a broadcast join hint

[spark-hinted-broadcast]

Internally:

1. Spark identifies the hinted DataFrame as the preferred broadcast side.
2. It prepares the broadcast relation and distributes it to executors.
3. Executors build or access a hash table for the broadcasted data.
4. Each executor probes the hash table using its partitions of the large table.
5. The join avoids shuffling the large table specifically for the join.

## 4. Does a broadcast hint override the threshold?

Yes. A broadcast hint takes priority over `spark.sql.autoBroadcastJoinThreshold`.

| Scenario                                   | Typical Spark behavior                                      |
| ------------------------------------------ | ----------------------------------------------------------- |
| Small table (5 MiB), no hint                | Automatically broadcasts if eligible                        |
| Table is 50 MiB, threshold 10 MiB, no hint   | Typically chooses another join strategy                     |
| Table is 50 MiB with broadcast hint         | Attempts broadcast regardless of threshold                  |
| Table is 5 GiB with broadcast hint          | May attempt broadcast, risking memory or execution failures |
| Broadcast hint incompatible with join type | May ignore hint and choose another strategy                 |

A hint is not an absolute guarantee. Spark must support the requested join strategy for the particular join type and condition.
## 5. What happens if both DataFrames have broadcast hints?

```python
result = df1.hint("broadcast").join(
    df2.hint("broadcast"),
    "id"
)
```

Spark generally selects the smaller side based on available statistics, subject to join-type restrictions.

If different join strategy hints conflict, Spark follows this priority:

**BROADCAST > MERGE > SHUFFLE_HASH > SHUFFLE_REPLICATE_NL**
## 6. When should you use a broadcast hint?

Use it when:

- One DataFrame is relatively small and fits comfortably in memory.
- Spark chooses Sort-Merge Join because table statistics are inaccurate or the small table exceeds the automatic threshold.
- You want to avoid an expensive shuffle of a large DataFrame.
- You have verified that broadcasting improves execution time.

Avoid forcing broadcast when the hinted DataFrame is large, since it can cause driver or executor OOM errors, broadcast timeouts, and excessive network overhead.

## 7. How do you verify that the hint worked?

```python
result.explain("formatted")
```

An example physical plan:

```text
BroadcastHashJoin [customer_id], [customer_id], Inner
:- Scan orders
+- BroadcastExchange
   +- Scan customers
```

Look for `BroadcastHashJoin` and `BroadcastExchange`.

For non-equality conditions, Spark may instead use a `BroadcastNestedLoopJoin`.

## Interview-ready answer

> A Broadcast Join Hint is a directive given to Spark's Catalyst Optimizer to prioritize broadcasting a specific DataFrame during a join.

> Normally, Spark automatically broadcasts tables below the configured threshold, which is commonly 10 MiB. However, using `broadcast()` or `.hint("broadcast")`, we can explicitly request broadcasting even when the estimated table size exceeds that threshold.

> This helps avoid expensive shuffle operations when joining a large dataset with a smaller dataset.

> However, broadcast hints are not guaranteed to be honored for every join type, and forcing a large dataset to broadcast can cause memory issues or job failures.

**Key takeaway:** A broadcast hint overrides Spark's automatic broadcast-size decision, but it does not override physical memory limitations or join-strategy compatibility.