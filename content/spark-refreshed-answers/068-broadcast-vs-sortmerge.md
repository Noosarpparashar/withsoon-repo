# What is the difference between a broadcast hash join and a sort-merge join?

In Apache Spark, Broadcast Hash Join (BHJ) and Sort-Merge Join (SMJ) are two physical join strategies used to combine datasets.

The main difference is:

- Broadcast Hash Join: Broadcasts a small table to all executors and performs joins locally using a hash table, avoiding a join shuffle of the large table.
- Sort-Merge Join: Typically shuffles both tables by their join keys, sorts the partitions, and merges matching rows.

## 1. Key differences

| Feature          | Broadcast Hash Join                                           | Sort-Merge Join                                            |
| ---------------- | ------------------------------------------------------------- | ---------------------------------------------------------- |
| Best suited for  | One small and one large table                                 | Two large tables                                           |
| Shuffle          | Usually avoids join shuffle                                   | Usually shuffles both sides                                |
| Sorting          | Not required                                                  | Required unless inputs are already sorted                  |
| Memory usage     | Requires memory for the broadcast and hash table on executors | Uses streaming merge with sorting and potential disk spill |
| Network overhead | Broadcasts smaller table                                      | Transfers data between executors during shuffle            |
| Join algorithm   | Hash-based lookup                                             | Sorting followed by merging                                |
| Performance      | Usually faster when one side is small                         | Often preferable for large datasets                        |
| Main limitation  | Large broadcasts can cause memory issues                      | Sorting and shuffle can be expensive                       |

## 2. How Broadcast Hash Join works

Consider joining a large orders table (500 GiB) with a small customers table (5 MiB).

[spark-orders-broadcast]

Execution steps:

1. Spark collects the small input on the driver for broadcasting.
2. Spark distributes the broadcast relation to executors.
3. Executors construct or access the hash table for the broadcast side.
4. Each executor probes the hash table using rows from its large-table partitions.
5. The join executes without shuffling the large table specifically for the join.

Example:

```python
from pyspark.sql.functions import broadcast

result = orders_df.join(
    broadcast(customers_df),
    "customer_id",
    "inner"
)
```

Why is it faster? It avoids the expensive shuffle and sorting operations required by a typical Sort-Merge Join.

## 3. How Sort-Merge Join works

Consider joining two large tables:

- Orders: 500 GiB
- Transactions: 300 GiB

[spark-orders-sort-merge]

Execution steps:

1. Spark shuffles both tables using the join key, unless their existing partitioning is compatible.
2. Each partition is sorted by the join key if not already sorted.
3. Spark processes the two sorted inputs together.
4. Matching keys are combined to produce the joined output.

Example:

```python
result = orders_df.join(
    transactions_df,
    "order_id",
    "inner"
)
```

Spark may generate:

```text
SortMergeJoin
  :- Sort
  :   +- Exchange hashpartitioning(order_id)
  :       +- Scan orders
  +- Sort
      +- Exchange hashpartitioning(order_id)
          +- Scan transactions
```

Why is it preferred for large tables? Spark does not need to construct an in-memory hash table containing an entire large dataset. Sorting can spill to disk when necessary, making this approach suitable for large joins.

## 4. When should you choose each one?

| Scenario                                       | Recommended strategy              |
| ---------------------------------------------- | --------------------------------- |
| 500 GiB table + 5 MiB table                      | Broadcast Hash Join               |
| 500 GiB table + 300 GiB table                    | Sort-Merge Join                   |
| 100 GiB table + 2 MiB lookup table               | Broadcast Hash Join               |
| 1 TiB table + 800 GiB table                      | Sort-Merge Join                   |
| One table fits comfortably in broadcast memory | Broadcast Hash Join               |
| Neither table can safely be broadcast          | Sort-Merge Join is often suitable |

These are typical choices, not guarantees. Spark also considers join type, statistics, partitioning, configuration, and other join strategies.

## 5. How Spark chooses between them

Spark's Catalyst Optimizer uses table statistics and configuration settings to choose a join strategy.

The default automatic broadcast threshold is commonly:

```python
spark.conf.get("spark.sql.autoBroadcastJoinThreshold")
```

Typical default:

```text
10485760   # 10 MiB
```

If a table is within the eligible broadcast threshold, Spark may choose Broadcast Hash Join.

You can explicitly request a broadcast join:

```python
from pyspark.sql.functions import broadcast

df1.join(broadcast(df2), "id")
```

Or hint a Sort-Merge Join:

```python
df1.hint("merge").join(
    df2.hint("merge"),
    "id"
)
```

Hints are not absolute guarantees: Spark must still support the requested strategy for that join.

With Adaptive Query Execution (AQE), Spark can also convert a planned Sort-Merge Join into a Broadcast Hash Join at runtime when statistics show that broadcasting would be beneficial.

## Interview-ready answer

> A Broadcast Hash Join is used when one dataset is small enough to be broadcast to executors. Spark builds a hash table from the smaller dataset, and executors perform local joins without shuffling the larger dataset. This generally makes it faster for large-to-small joins.

> A Sort-Merge Join is typically used when both datasets are large. Spark shuffles the datasets by their join keys, sorts corresponding partitions, and merges matching records. It is generally more scalable for large-to-large joins because it does not require an entire large input to be stored in a hash table.

> The biggest difference is that Broadcast Hash Join trades memory for reduced network shuffling, whereas Sort-Merge Join handles large datasets through partitioning, sorting, and merging.
