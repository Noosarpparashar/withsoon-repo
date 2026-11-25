# If salting only adds a column, how does it fix skew without an explicit repartition call?

Salting alone does not fix data skew. The redistribution happens when Spark performs a shuffle using the salted key, typically during a join or aggregation.

You don't necessarily need an explicit `repartition()` because Spark automatically introduces a shuffle when the physical execution plan requires it.

## 1. What happens internally?

Consider:

```python
from pyspark.sql import functions as F

df_salted = df.withColumn(
    "salt",
    (F.rand(seed=42) * 10).cast("int")
)
```

At this point:

- Spark defines a `salt` column with values from 0 to 9.
- The records remain in their existing partitions.
- No shuffle occurs simply because you added the salt column.
- The original skew hasn't been fixed.

Now consider a salted join:

```python
result = transactions_salted.join(
    customers_salted,
    ["customer_id", "salt"],
    "inner"
)
```

The matching customer records must be available at every relevant salt, typically by replicating them across salt values. Randomly salting both sides independently would lose matches.

If Spark chooses a shuffle-based join, such as sort-merge join, it requires compatible distribution using the composite join key. Conceptually:

```text
hash(customer_id, salt) -> target shuffle partition
```

Spark automatically introduces the required `Exchange` operations when compatible partitioning is not already available.

## 2. Before and after salting

[spark-salt-shuffle]

The crucial distinction is that the salt column creates additional distinct keys, while the shuffle distributes records based on those keys.

## 3. How to verify Spark is actually shuffling

Run:

```python
result.explain("formatted")
```

For a shuffle-based join, you should see a physical plan resembling:

```text
SortMergeJoin
:- Sort
:  +- Exchange hashpartitioning(customer_id, salt, 200)
:     +- Project
:        +- Scan transactions
+- Sort
   +- Exchange hashpartitioning(customer_id, salt, 200)
      +- Project
         +- Scan customers
```

The `Exchange` operator is where Spark redistributes records. The `200` represents the configured shuffle partition count in this example. Spark may modify the plan through AQE.

## 4. When is explicit repartitioning necessary?

| Scenario | Explicit repartition() needed? |
| --- | --- |
| Adding a salt column only | Yes, if you want to redistribute the data immediately rather than relying on a later shuffle |
| Salted sort-merge join | Usually no; the join introduces the necessary shuffle |
| Salted shuffle-hash join | Usually no |
| Broadcast join | Not needed for the join; the large side is not shuffled |
| Salted aggregation using groupBy | Usually no; aggregation introduces a shuffle for grouping |

Like other transformations, `repartition()` is lazy: an action must trigger execution before redistribution actually occurs.

One important exception: if Spark selects a broadcast join, salting generally provides no benefit for fixing join-key shuffle skew, because the large side is not shuffled by the join key in the first place.

## Interview-ready answer

> Adding a salt column does not itself redistribute data. It changes the partitioning key that a subsequent shuffle operation uses. During a shuffle-based join on the original key plus salt, Spark automatically inserts Exchange operators that hash-partition the data using both columns when required. Therefore, an explicit repartition call is generally unnecessary. However, if no subsequent shuffle occurs, adding salt alone does not fix skew.

**Remember:** Salting creates multiple keys; shuffling distributes those keys.