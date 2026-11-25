# What is a broadcast join?

A broadcast join is a join optimization technique in Apache Spark where a small dataset is copied (broadcast) to all executors so that it can be joined with a large dataset without shuffling the large dataset across the network.

Instead of moving data from both tables, Spark sends the smaller table to each executor, allowing joins to happen locally.

## 1. Example

Suppose we have two tables:

| Table        | Size   | Records   |
| ------------ | ------ | --------- |
| Transactions | 500 GiB | 2 billion |
| Countries    | 5 MiB   | 250       |

We want to join these tables using `country_id`.

### Without Broadcast Join (Sort-Merge Join)

- Spark generally shuffles both tables based on `country_id` when compatible partitioning is not already available.
- Records with matching keys are moved to the same partitions.
- This involves significant network I/O, sorting, and potentially disk spilling.

### With Broadcast Join

- Spark broadcasts the 5 MiB Countries table to every executor.
- Each executor processes its local partitions of the Transactions table.
- Joins are performed locally using the broadcasted table.
- No shuffle is required for the large table specifically for this join.

## 2. How Broadcast Join Works Internally

[spark-broadcast-join]

Internally:

1. Spark identifies the smaller side of the join.
2. It collects and prepares the smaller dataset for broadcasting.
3. The broadcast data is distributed to executors.
4. Each executor builds or accesses a local hash table.
5. Tasks probe this hash table using rows from the large dataset.
6. Matching records are returned.

## 3. How to Implement Broadcast Join

### PySpark

```python
from pyspark.sql.functions import broadcast

result = transactions.join(
    broadcast(countries),
    on="country_id",
    how="inner"
)
```

### Spark SQL

```sql
SELECT /*+ BROADCAST(c) */
    t.transaction_id,
    c.country_name
FROM transactions t
JOIN countries c
    ON t.country_id = c.country_id;
```

## 4. Automatic Broadcast Join

Spark can automatically choose a broadcast join when the estimated size of a join side is below the configured threshold.

```python
spark.conf.get("spark.sql.autoBroadcastJoinThreshold")
```

The commonly documented default threshold is 10 MiB.

You can increase it:

```python
spark.conf.set("spark.sql.autoBroadcastJoinThreshold", 50 * 1024 * 1024)
```

This allows Spark to consider broadcasting eligible tables estimated at up to 50 MiB.

With Adaptive Query Execution (AQE), Spark can also convert certain shuffle-based joins into broadcast hash joins at runtime.

## 5. Broadcast Join vs Sort-Merge Join

| Feature             | Broadcast Join                     | Sort-Merge Join                |
| ------------------- | ---------------------------------- | ------------------------------ |
| Data movement       | Small table broadcast              | Both sides generally shuffled  |
| Shuffle required    | No join-key shuffle                | Usually yes                    |
| Sorting required    | No                                 | Yes                            |
| Best suited for     | Large + small table                | Two large tables               |
| Memory requirement  | Broadcast side stored on executors | Memory for sorting and merging |
| Typical performance | Faster when broadcast is practical | Better for large-large joins   |

## 6. When Should You Avoid Broadcast Join?

Broadcast join is not always better.

- Both tables are large: Broadcasting a large table can cause memory pressure.
- Limited executor memory: Each executor needs sufficient memory for the broadcast data and its join structures.
- Too many concurrent broadcasts: Multiple broadcast joins can increase memory consumption.
- Broadcast timeout: Building or distributing the broadcast table can exceed `spark.sql.broadcastTimeout`.

Also, using the `broadcast()` hint does not guarantee that Spark will use broadcast hash join for every join type or condition.

## 7. How to Verify That Spark Is Using Broadcast Join

```python
result.explain("formatted")
```

Look for:

```text
BroadcastHashJoin
:- Scan ...
+- BroadcastExchange
   +- Scan ...
```

`BroadcastHashJoin` indicates that Spark is using a broadcast hash join, while `BroadcastExchange` represents the broadcast preparation and distribution step.

## Interview-ready answer

> A broadcast join is a Spark optimization where the smaller dataset is broadcast to all executors so that each executor can join it locally with its partitions of the larger dataset. This avoids expensive shuffling of the large dataset and typically improves performance. Spark can automatically select broadcast joins based on the `spark.sql.autoBroadcastJoinThreshold` configuration, or we can explicitly request one using the `broadcast()` hint. Broadcast joins are particularly useful for joining large fact tables with small dimension tables in star-schema data models.