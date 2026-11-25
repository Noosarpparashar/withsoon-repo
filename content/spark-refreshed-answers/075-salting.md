# What is salting in Spark joins?

Salting in Spark joins is a technique used to handle data skew by distributing records belonging to a heavily repeated join key across multiple partitions.

Normally, Spark partitions data using a hash of the join key. If one key appears millions of times, most records for that key end up in the same partition, creating a bottleneck.

Salting solves this by adding an additional artificial key, called a salt, to distribute the skewed records across multiple partitions.

## 1. Why is salting needed?

Suppose we have an orders table containing 100 million records:

| Customer ID | Number of orders |
| ----------- | ---------------- |
| C101        | 90,000,000       |
| C102        | 4,000,000        |
| C103        | 3,000,000        |
| C104        | 3,000,000        |

If we join this table with another table on `customer_id`, Spark hash-partitions the data using that key.

All 90 million records belonging to C101 can end up in the same shuffle partition.

[spark-before-salting]

One task processes most of the records while others finish quickly, increasing total join execution time.

This can cause:

- Long-running tasks (stragglers).
- Excessive memory consumption.
- Disk spilling.
- Executor OOM errors.
- Poor CPU utilization across the cluster.

## 2. How salting works

Instead of joining only on `customer_id`, we add a random salt value, for example between 0 and 9.

Before salting:

```text
customer_id
C101
C101
C101
C101
C101
```

After salting:

```text
customer_id    salt
C101           0
C101           3
C101           7
C101           1
C101           5
```

The effective join key becomes:

```text
(customer_id, salt)
```

Now records for C101 can be distributed across multiple shuffle partitions.

However, there's an important catch: the other side of the join must contain matching salt values.

If the other side has one matching customer record, we replicate it for every salt:

```text
customer_id    salt
C101           0
C101           1
C101           2
...
C101           9
```

Now each salted order can still match its customer record.

[spark-after-salting]

The 90 million C101 rows are spread across 10 salt buckets. Actual shuffle partition distribution depends on partition count, hash mapping, and other keys.

## 3. PySpark implementation

Suppose:

- `orders_df` is a large, skewed dataset.
- `customers_df` is a smaller dataset that is not being broadcast.
- `customer_id` is the join key.

### Step 1: Add random salt to the large table

```python
from pyspark.sql import functions as F

N = 10
salted_orders = orders_df.withColumn(
    "salt",
    F.floor(F.rand(seed=42) * N).cast("int")
)
```

Each order gets a random salt from 0 to 9.

### Step 2: Replicate the smaller table for all salt values

```python
salt_values = spark.range(N).select(
    F.col("id").cast("int").alias("salt")
)
salted_customers = customers_df.crossJoin(salt_values)
```

Each customer record is replicated 10 times, once per salt value.

### Step 3: Join using both keys

```python
result = (
    salted_orders.join(
        salted_customers,
        on=["customer_id", "salt"],
        how="inner"
    ).drop("salt")
)
```

Spark can now distribute records for a heavily repeated `customer_id` across multiple salted keys.

This preserves normal inner-join matching semantics because every record on the large side receives one salt, while every record on the replicated side is available at every salt. Avoid using a random salt independently on both sides, which would lose matches.

## 4. What are the disadvantages of salting?

| Disadvantage              | Explanation                                                  |
| ------------------------- | ------------------------------------------------------------ |
| Data duplication          | The replicated side grows by the number of salt buckets      |
| Additional processing     | Generating salt values and replicating records requires work |
| Increased shuffle         | Replicated records may increase shuffle volume               |
| Salt tuning               | Too few buckets may not fix skew; too many increase overhead |
| Implementation complexity | Requires careful handling of join keys and duplicate records |

For example, if the smaller table is 5 GiB and we use 10 salt values, the replicated dataset can become approximately 50 GiB before accounting for execution overhead.

Therefore, salting is most beneficial when the skewed side is very large and the replicated side is comparatively small.

In production, it is often better to salt only the heavily skewed keys rather than the entire dataset.

## 5. Salting vs AQE skew join optimization

Modern versions of Spark provide Adaptive Query Execution (AQE), which can automatically mitigate skew in Sort-Merge Joins and eligible shuffled joins.

```python
spark.conf.set("spark.sql.adaptive.enabled", "true")
spark.conf.set("spark.sql.adaptive.skewJoin.enabled", "true")
```

| Feature                    | Manual salting                        | AQE skew optimization                  |
| -------------------------- | ------------------------------------- | -------------------------------------- |
| Requires code changes      | Yes                                   | Usually no                             |
| Detects skew automatically | No                                    | Yes, using runtime statistics          |
| Technique                  | Adds artificial join keys             | Splits skewed shuffle partitions       |
| Data replication           | Explicitly replicates join-side data  | May replicate partition data as needed |
| Control                    | Developer selects keys and salt count | Spark controls partition handling      |
| Best suited for            | Known, persistent skew                | General runtime skew mitigation        |

Recommendation: Start with AQE and examine the Spark UI. Use manual salting when severe skew persists or you need more explicit control over hot keys.

## Interview-ready answer

> Salting is a technique used to handle data skew in Spark joins.

> When a join key appears very frequently, Spark may send a disproportionately large number of records to the same partition, causing long-running tasks and memory issues.

> To solve this, we add an artificial salt value to the skewed join key, distributing records across multiple partitions.

> We also replicate the corresponding records on the other side across all salt values so that the join still produces the correct results.

> For example, if 90 million records belong to the same customer, adding 10 salt values can distribute them across approximately 10 salted key groups instead of one.

> However, salting increases data replication and processing overhead, so it should primarily be used for heavily skewed joins. AQE's skew join optimization is often the first option to try.

**Key takeaway:** Salting improves join parallelism by splitting one heavily skewed join key into multiple artificial keys, reducing the workload concentrated in a single partition.