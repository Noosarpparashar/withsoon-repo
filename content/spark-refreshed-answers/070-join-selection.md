# How does Spark decide which join strategy to use?

Apache Spark uses the Catalyst Optimizer to decide which physical join strategy to use based on table sizes, join conditions, join types, statistics, configuration settings, and join hints.

Spark typically chooses among:

1. Broadcast Hash Join (BHJ)
2. Sort-Merge Join (SMJ)
3. Shuffle Hash Join (SHJ)
4. Broadcast Nested Loop Join (BNLJ)
5. Cartesian Product / Nested Loop strategies

## 1. How Spark selects a join strategy

[spark-join-selection]

## 2. Factors influencing join selection

| Factor           | How it influences Spark                                  |
| ---------------- | -------------------------------------------------------- |
| Table size       | Small inputs can be broadcast                            |
| Join condition   | Equality joins support hash and sort-merge strategies    |
| Join type        | Some algorithms cannot execute certain outer joins       |
| Table statistics | Help estimate input sizes and choose build sides         |
| Join hints       | Allow developers to request specific strategies          |
| Configuration    | Controls thresholds and join preferences                 |
| AQE              | Can change strategies based on actual runtime statistics |

### A. Table sizes

Suppose Spark needs to execute three joins:

| Left table | Right table | Likely strategy                                                            |
| ---------- | ----------- | -------------------------------------------------------------------------- |
| 500 GiB     | 5 MiB        | Broadcast Hash Join                                                        |
| 500 GiB     | 300 GiB      | Sort-Merge Join                                                            |
| 100 GiB     | 500 MiB      | Sort-Merge or Shuffle Hash Join, depending on settings and partition sizes |

Spark's standard automatic broadcast threshold is:

```python
spark.conf.get("spark.sql.autoBroadcastJoinThreshold")
```

Common default:

```text
10485760  # 10 MiB
```

A suitable side estimated below this threshold may be broadcast automatically.
### B. Join condition and join type

Consider an equality join:

```python
df1.join(df2, df1.id == df2.id)
```

Spark can consider Broadcast Hash Join, Sort-Merge Join, or Shuffle Hash Join.

Now consider a non-equality join:

```python
df1.join(df2, df1.salary > df2.salary)
```

Standard hash joins and sort-merge equi-joins are not suitable for this condition. Spark may use a Broadcast Nested Loop Join or another nested-loop strategy.

The join type also matters. For example, broadcasting the right side is supported for a left outer hash join, whereas broadcasting the left side is not.

### C. Table statistics

Catalyst uses available statistics, including estimated table sizes and row counts.

For supported catalog tables, statistics can be collected using:

```sql
ANALYZE TABLE customers
COMPUTE STATISTICS;
```

You can inspect estimated statistics through:

```python
df1.join(df2, "id").explain("cost")
```

Inaccurate or missing statistics can lead Spark to select a less efficient join strategy.

### D. Join hints

Developers can influence the strategy using hints.

```python
# Request broadcasting (hash join for eligible equi-joins)
df1.join(df2.hint("broadcast"), "id")

# Request Sort-Merge Join
df1.hint("merge").join(df2, "id")

# Request Shuffle Hash Join
df1.join(df2.hint("shuffle_hash"), "id")
```

When conflicting hints are present, Spark prioritizes them in this order:

BROADCAST > MERGE > SHUFFLE_HASH > SHUFFLE_REPLICATE_NL

However, Spark can ignore a hint if the requested strategy is incompatible with the join.
## 3. How AQE changes join strategies at runtime

Adaptive Query Execution (AQE) allows Spark to adjust the physical plan using actual runtime statistics.

For example:

[spark-adaptive-join]

Enable AQE:

```python
spark.conf.set("spark.sql.adaptive.enabled", "true")
```

AQE can:

- Convert Sort-Merge Join to Broadcast Hash Join.
- Convert Sort-Merge Join to Shuffle Hash Join under suitable configuration and partition-size conditions.
- Optimize skewed shuffle partitions.
- Coalesce small shuffle partitions.

These capabilities and their configuration settings are documented in Spark's performance tuning guide.
## 4. How to verify which join Spark selected

```python
result = orders_df.join(customers_df, "customer_id")
result.explain("formatted")
```

Example physical plan:

```text
AdaptiveSparkPlan
+- BroadcastHashJoin
   :- Scan orders
   +- BroadcastExchange
      +- Scan customers
```

You can inspect the final adaptive plan in the Spark UI's SQL tab after execution.

## Interview-ready answer

> Spark uses the Catalyst Optimizer to choose a join strategy based on table size, join conditions, join types, statistics, hints, and configuration.

> For equality joins, Spark generally prefers a Broadcast Hash Join when one side is sufficiently small because it avoids shuffling the larger dataset.

> When both datasets are large, Spark commonly chooses a Sort-Merge Join. A Shuffle Hash Join may be selected when partition-level hash tables are suitable.

> For non-equality joins, Spark may use a Broadcast Nested Loop Join or another nested-loop strategy.

> Additionally, Adaptive Query Execution can change the initially selected strategy based on actual runtime statistics.

**Key point:** Spark's join selection is based on optimizer rules, estimated costs and statistics, and runtime adaptation—not simply the number of rows in each table.