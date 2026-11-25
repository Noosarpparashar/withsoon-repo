# How do salting, Adaptive Query Execution, broadcast joins, and custom partitioning help fix skew?

Data skew occurs when some Spark partitions contain significantly more data than others, causing a few tasks to run much longer than the rest.

Spark provides several techniques to handle skew, but each solves the problem differently.

| Technique                      | How it fixes skew                                                | Best use case                                              |
| ------------------------------ | ---------------------------------------------------------------- | ---------------------------------------------------------- |
| Salting                        | Splits records belonging to a hot key across multiple partitions | A few join keys contain millions of records                |
| Adaptive Query Execution (AQE) | Automatically splits large skewed shuffle partitions at runtime  | Skewed shuffle joins                                       |
| Broadcast join                 | Avoids shuffling the large DataFrame                             | Large fact table joined with a small dimension table       |
| Custom partitioning            | Controls how records are distributed across partitions           | Known, predictable skew requiring specialized distribution |

## 1. Salting

Salting fixes skew by adding an artificial value to frequently occurring keys so that records sharing the same original key can be distributed across multiple partitions.

### Example

Suppose you have 10 million transactions belonging to customer `C101`.

[spark-skew-salting-solution]

### PySpark example

For a large transactions table joined with a relatively small customer table:

```python
from pyspark.sql import functions as F

salt_buckets = 10

# Assign one salt to each transaction
transactions_salted = transactions.withColumn(
    "salt",
    (F.rand(seed=42) * salt_buckets).cast("int")
)

# Replicate customer records for every salt
salts = spark.range(salt_buckets).select(
    F.col("id").cast("int").alias("salt")
)
customers_salted = customers.crossJoin(salts)

result = transactions_salted.join(
    customers_salted,
    ["customer_id", "salt"],
    "inner"
)
```

How it works:

- Each transaction gets one salt value from 0–9.
- Every customer record is replicated for all 10 salt values.
- The join distributes transactions based on `(customer_id, salt)` rather than `customer_id` alone.

This allows a frequently occurring customer to be processed in multiple partitions.

Trade-off: The replicated side grows by the number of salt buckets. It is often better to salt only known hot keys. For simple equijoins with a genuinely small dimension table, a broadcast join is usually preferable.

## 2. Adaptive Query Execution (AQE)

AQE automatically detects and mitigates skew during query execution using actual shuffle statistics.

Unlike salting, AQE generally doesn't require you to modify join keys or rewrite your application logic.

### How AQE works internally

1. Spark executes the shuffle-map stage.
2. AQE collects the sizes of shuffle partitions.
3. It identifies partitions that are significantly larger than others.
4. Spark divides eligible skewed partitions into smaller pieces.
5. When necessary, Spark replicates the corresponding partition from the other join side.
6. Multiple tasks process the pieces in parallel.

[spark-skew-aqe-solution]

### Configuration

```python
spark.conf.set("spark.sql.adaptive.enabled", "true")
spark.conf.set("spark.sql.adaptive.skewJoin.enabled", "true")
```

Default skew-detection thresholds commonly used in Spark:

| Configuration                     | Default |
| --------------------------------- | ------- |
| `skewedPartitionFactor`           | 5       |
| `skewedPartitionThresholdInBytes` | 256 MiB  |
| `advisoryPartitionSizeInBytes`    | 64 MiB   |

A partition is considered skewed for this optimization when it exceeds both five times the median partition size and 256 MiB, using the defaults.
Limitation: AQE skew-join handling applies to supported physical join plans, especially sort-merge joins. It does not eliminate skew from every operation, and extremely large join outputs can still be expensive.

## 3. Broadcast joins

Broadcast joins eliminate the need to shuffle the large side of a join by copying a small table to each executor.

Suppose:

- Transactions: 500 GiB, containing heavily skewed `customer_id` values.
- Customers: 20 MiB, containing customer details.

A normal sort-merge join usually shuffles both datasets by the join key.

A broadcast hash join instead distributes the customer table to executors and processes the large transactions dataset locally.

```python
from pyspark.sql.functions import broadcast

result = transactions.join(
    broadcast(customers),
    "customer_id",
    "inner"
)
```

### Why this solves join skew

Because the large table does not need to be repartitioned by `customer_id`, all records belonging to a popular customer do not have to accumulate in a single join shuffle partition.

Advantages: Avoids the large join shuffle, can remove join-key shuffle skew, and is often faster for a large–small equijoin.

Limitations: Broadcasting a large table can cause memory pressure, broadcast timeouts, or failures. It also doesn't fix an already skewed input partition distribution or excessive output from many-to-many joins. Spark's default automatic broadcast threshold is 10 MiB, but a broadcast hint can override that threshold when the join type supports it.
## 4. Custom partitioning

Custom partitioning gives you explicit control over how records are distributed across Spark partitions.

This is useful when you know which keys cause skew and want to handle them differently.

### Example

Suppose customer `C101` accounts for 60% of the data.

Simply calling:

```python
df.repartition(200, "customer_id")
```

does not solve this hot-key skew.

All records with `customer_id = C101` still hash to the same partition.

Instead, create additional buckets for that customer:

```python
from pyspark.sql import functions as F

df_partitioned = (
    df.withColumn(
        "bucket",
        F.when(
            F.col("customer_id") == "C101",
            F.pmod(F.xxhash64("transaction_id"), F.lit(20))
        ).otherwise(F.lit(0))
    )
    .repartition(200, "customer_id", "bucket")
)
```

Now `C101` has up to 20 different composite partition keys, allowing its records to be distributed across multiple tasks.

For aggregations, you can perform partial aggregations on `(customer_id, bucket)` and then combine results by `customer_id`. For joins, the matching side must be arranged consistently, such as by replicating the relevant hot-key rows across buckets.

Other custom strategies include range partitioning for suitably distributed ordered keys, and application-specific RDD partitioners.

**Important:** Custom partitioning is not automatically preserved by subsequent operations. Spark may introduce another shuffle depending on the physical plan. Also, range partitioning by the original key alone cannot reliably fix a single extremely frequent key.

## 5. Which technique should you choose?

[spark-skew-scenario]

## Interview-ready answer

> Spark provides four major approaches to handle data skew.

> Salting distributes hot keys across multiple partitions by introducing additional join-key values. AQE detects skewed shuffle partitions at runtime and splits them into smaller tasks. Broadcast joins avoid shuffling the large table by distributing the smaller table to each executor. Custom partitioning allows us to distribute records based on application-specific data characteristics.

> I generally prefer broadcast joins for large–small joins and enable AQE for supported large–large joins. When severe hot-key skew remains, I consider selective salting or custom partitioning. I validate the improvement using Spark UI task duration, shuffle read size, spilling, and the physical execution plan.

**Important distinction:** Salting changes the distribution of keys, AQE changes how skewed shuffle partitions are processed, broadcast joins avoid the large-side join shuffle, and custom partitioning lets you explicitly control data distribution.