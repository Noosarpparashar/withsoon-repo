# Where does Spark actually repartition salted data?

Spark actually repartitions salted data at the `Exchange` operator in the physical execution plan, usually introduced automatically during a shuffle-based join or aggregation.

## 1. Example: Salted join

```python
from pyspark.sql import functions as F

transactions_salted = transactions.withColumn(
    "salt",
    (F.rand(seed=42) * 10).cast("int")
)

salt_values = spark.range(10).select(
    F.col("id").cast("int").alias("salt")
)
customers_salted = customers.crossJoin(salt_values)

result = transactions_salted.join(
    customers_salted,
    ["customer_id", "salt"],
    "inner"
)
```

Notice that we never explicitly called `repartition()`.

However, if Spark chooses a sort-merge join and the inputs do not already have compatible partitioning, it automatically adds shuffle exchanges to distribute both datasets by the composite join key.

## 2. What happens internally?

[spark-salt-exchange]

## 3. Verify it in the physical plan

```python
result.explain("formatted")
```

Example physical plan (simplified):

```text
AdaptiveSparkPlan
+- SortMergeJoin
   :- Sort
   :  +- Exchange hashpartitioning(customer_id, salt, 200)
   :     +- Project [customer_id, ..., salt]
   :        +- Scan transactions
   +- Sort
      +- Exchange hashpartitioning(customer_id, salt, 200)
         +- ... replicated customers with salt values
```

The `Exchange hashpartitioning(...)` is the critical step.

Under the hood, Spark's shuffle writer assigns records to shuffle buckets based on the hash of `(customer_id, salt)`. Shuffle readers then fetch the relevant blocks to process the join.

The exact operators used to replicate customers depend on how the salt values are generated and the physical plan Spark selects.

## 4. What if Spark doesn't introduce an Exchange?

For example:

```python
salted_df = df.withColumn(
    "salt",
    (F.rand(seed=42) * 10).cast("int")
)
salted_df.show()
```

No repartitioning is required just to display these rows, so Spark does not shuffle them merely because a salt column exists.

If you want to force redistribution:

```python
salted_df = salted_df.repartition(
    200,
    "customer_id",
    "salt"
)
```

This explicitly requests hash repartitioning using both columns. Like other transformations, it remains lazy until an action requires execution.

One nuance: if Spark chooses a broadcast hash join instead of a sort-merge join, there may be no join-induced shuffle `Exchange` on the large salted side. A `BroadcastExchange` on the small side serves a different purpose. AQE can also change the final physical plan.

## Interview-ready answer

> Spark repartitions salted data at the Exchange operator in the physical plan. When a shuffle-based join uses both the original key and salt, Spark automatically introduces an Exchange with hash partitioning on those columns when required. The salt column itself doesn't move records; it is the Exchange operator that physically redistributes them. We can verify this through `explain('formatted')` and the Spark UI.