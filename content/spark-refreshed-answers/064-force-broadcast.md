# When should you force a broadcast join?

You should force a broadcast join when one side of the join is small enough to fit comfortably in executor memory, but Spark's optimizer does not automatically select a broadcast join.

This is particularly useful when joining a very large fact table with a small dimension or lookup table.

## 1. When should you force a broadcast join?

| Scenario                                              | Why force broadcasting?                                                      |
| ----------------------------------------------------- | ---------------------------------------------------------------------------- |
| Small table exceeds the automatic broadcast threshold | Spark may otherwise choose a shuffle-based join                              |
| Missing or outdated table statistics                  | Spark may incorrectly estimate the small table's size                        |
| Large fact table + small dimension table              | Avoid shuffling the large fact table                                         |
| Significant data skew                                 | A broadcast hash join can avoid shuffling the large side on skewed join keys |
| AQE does not choose broadcast early enough            | An explicit hint may avoid an initial shuffle                                |

Spark's documented default `spark.sql.autoBroadcastJoinThreshold` is 10 MiB, though it is configurable. A `BROADCAST` hint can prioritize broadcasting a table even when its estimated size exceeds that threshold.
## 2. Example

Suppose you have two tables:

- `transactions_df`: 500 GiB, containing 1 billion transactions.
- `countries_df`: 25 MiB, containing country reference information.

Spark might choose a sort-merge join because the smaller table exceeds the default 10 MiB threshold.

Without forcing broadcast:

```python
result = transactions_df.join(
    countries_df,
    "country_id"
)
```

Spark may shuffle both tables to perform the join.

With forced broadcast:

```python
from pyspark.sql.functions import broadcast

result = transactions_df.join(
    broadcast(countries_df),
    "country_id"
)
```

Spark can broadcast the 25 MiB table to executors and perform local joins without shuffling the 500 GiB fact table.

[spark-join-shuffle-comparison]

## 3. When should you NOT force a broadcast join?

Avoid forcing broadcasts when:

- The smaller table is too large for available executor memory.
- Broadcasting could cause excessive garbage collection or OOM errors.
- The cost of distributing the table to every executor outweighs the shuffle savings.
- The query uses a join type that does not support the requested broadcast build side.
- The join has no equality condition and broadcasting could result in an expensive broadcast nested-loop join.

There is no universal safe broadcast size. A 100 MiB table might be perfectly reasonable on one cluster and problematic on another.

## 4. How do you verify that Spark is using broadcast join?

Use `explain()`:

```python
result.explain("formatted")
```

For an equi-join, look for:

```text
BroadcastHashJoin
:- Scan ...
+- BroadcastExchange
   +- Scan ...
```

This indicates that Spark plans to broadcast one side and perform a broadcast hash join.

You can also examine the Spark UI to compare shuffle read/write, execution time, and memory usage.

## 5. What about Adaptive Query Execution (AQE)?

Spark AQE can automatically convert a sort-merge join into a broadcast hash join when runtime statistics show that one side is sufficiently small.
Therefore, you should not force broadcasting by default. First check the execution plan and runtime metrics. Force it when you have evidence that the optimizer's choice is suboptimal.

## Interview-ready answer

> We should force a broadcast join when one table is relatively small and fits comfortably in executor memory, but Spark does not automatically choose a broadcast join because of its configured threshold or inaccurate statistics.

> For example, when joining a 500 GiB fact table with a 25 MiB dimension table, forcing a broadcast can avoid shuffling the large fact table and improve performance significantly.

> However, broadcasting large datasets can create memory pressure or OOM errors. Therefore, we should consider actual data size, executor memory, AQE behavior, and the physical execution plan before forcing a broadcast join.

**Key takeaway:** Force a broadcast join when the cost of broadcasting the small table is substantially lower than the cost of shuffling the large table—and Spark is not already making that choice.