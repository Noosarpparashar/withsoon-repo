# When should you use a broadcast join?

You should use a broadcast join when one table is significantly smaller than the other and can comfortably fit into each executor's memory.

Broadcast joins are particularly useful for avoiding expensive shuffle operations when joining a large fact table with a small dimension or lookup table.

## 1. When to use broadcast join

| Scenario | Use broadcast join? | Reason |
| --- | --- | --- |
| 500 GiB fact table + 5 MiB dimension table | Yes | Small table can easily be broadcast |
| 1 TiB transactions + 20 MiB country lookup | Yes, typically | Avoids shuffling a huge fact table; may require a hint or a higher automatic threshold |
| 100 GiB table + 100 GiB table | No | Neither table is small |
| 10 GiB table + 2 GiB table | Usually no | Broadcasting 2 GiB creates memory pressure |
| 50 GiB table + 1 MiB lookup table | Yes | Ideal broadcast scenario |
| Small table reused in multiple joins | Often | Can reduce shuffle costs, subject to memory availability |

## 2. Why is broadcast join faster?

Suppose you have:

- Transactions table: 500 GiB
- Customers lookup table: 10 MiB
- Cluster: 10 executors

### Without broadcast join

Spark generally shuffles both datasets based on the join key when compatible partitioning is not already available, involving significant network transfer and possible disk I/O.

### With broadcast join

Spark broadcasts the 10 MiB lookup table to each executor.

Only a small amount of reference data needs to be distributed instead of repartitioning hundreds of gibibytes by join key.

## 3. Important conditions

### Condition 1: Smaller table must fit in memory

A 100 MiB table does not necessarily consume only 100 MiB of memory after being converted into a hash table.

Its in-memory representation may be considerably larger.

### Condition 2: Consider the number of executors

Broadcasting a 50 MiB table to 20 executors can require approximately 1,000 MiB of aggregate broadcast data storage, excluding additional overhead. The actual memory usage depends on how Spark stores and processes the broadcast data.

### Condition 3: Join type must support broadcasting the small side

For example:

- **Inner join:** Either side can be broadcast.
- **Left outer join:** Right side can be broadcast for a broadcast hash join.
- **Right outer join:** Left side can be broadcast for a broadcast hash join.
- **Full outer join:** Broadcast hash join is not supported.

These broadcast hash join choices assume a suitable equi-join condition. Other conditions may use a different strategy, such as broadcast nested-loop join.

## 4. PySpark example

```python
from pyspark.sql.functions import broadcast

result = transactions.join(
    broadcast(countries),
    "country_id",
    "inner"
)
```

To check whether Spark selected a broadcast join:

```python
result.explain("formatted")
```

Look for `BroadcastHashJoin` in the physical execution plan.

## 5. What is the maximum table size for broadcast join?

Spark commonly uses the following default:

```ini
spark.sql.autoBroadcastJoinThreshold = 10485760
# 10 MiB
```

However, 10 MiB is an automatic-selection threshold, not an absolute broadcasting limit.

You can configure a larger threshold or explicitly request broadcasting using a hint, provided the operation is supported and memory resources are sufficient.

A table that is 100 MiB might be suitable in one cluster but problematic in another.

## Interview-ready answer

> A broadcast join should be used when one dataset is significantly smaller than the other and can fit comfortably in executor memory. It is especially useful for joining large fact tables with small dimension tables because Spark broadcasts the smaller table to executors and performs local joins, avoiding the expensive shuffle of the larger dataset. However, broadcasting large datasets can cause executor memory pressure, so we should consider table size, available memory, and join type before using it.

**Key principle:** Use broadcast joins when the cost of broadcasting the small table is substantially lower than the cost of shuffling the datasets.