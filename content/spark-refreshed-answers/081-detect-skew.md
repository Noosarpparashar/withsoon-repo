# How do you detect skew in the Spark UI and in key distributions?

Data skew in Spark occurs when data is unevenly distributed across partitions, causing some tasks to process significantly more records than others.

You can detect skew in two main ways:

1. Spark UI: Identify tasks taking disproportionately longer or processing much more data.
2. Key distribution analysis: Identify join or aggregation keys containing disproportionately large numbers of records.

## 1. Detecting skew in the Spark UI

Open the Spark UI → Jobs → Stages → Select the slow stage → Tasks.

Look for these indicators:

| Metric               | Normal behavior                   | Skewed behavior                           |
| -------------------- | --------------------------------- | ----------------------------------------- |
| Task duration        | Tasks finish in similar times     | A few tasks take 10–20× longer            |
| Shuffle read size    | Relatively balanced               | Some tasks read much more data            |
| Shuffle read records | Similar record counts             | A few tasks process millions more records |
| Spill (memory/disk)  | Little or no spilling             | Large spills concentrated in a few tasks  |
| GC time              | Relatively consistent             | Certain tasks experience excessive GC     |
| Task completion      | Tasks finish around the same time | Most finish, but a few remain running     |

### Example: Task duration

[spark-skew-task-durations]

If seven tasks finish in approximately 10 seconds but one takes 120 seconds, that is a strong indicator of skew.

**Important:** A slow task alone does not prove data skew. Check shuffle records and bytes to distinguish skew from executor resource contention, slow disks, garbage collection, or network issues.

## 2. Detecting skew using key distribution

Suppose you're joining two DataFrames using `customer_id`.

Check the distribution of that key:

```python
from pyspark.sql import functions as F

(df.groupBy("customer_id")
   .count()
   .orderBy(F.desc("count"))
   .show(20))
```

Example output:

| customer_id | Record count |
| ----------- | ------------ |
| C101        | 8,000,000    |
| C102        | 15,000       |
| C103        | 12,000       |
| C104        | 11,000       |
| C105        | 9,000        |

Customer `C101` has vastly more records than the other customers.

When Spark redistributes data using a hash of `customer_id`, all records belonging to `C101` normally go to the same shuffle partition.

That partition can become significantly larger than the others, causing a slow task or memory spill.

For joins, examine the key distribution on both sides. Duplicate keys on both sides can also cause a large join-output explosion.

## 3. Detecting skew at the partition level

You can inspect the number of records in each partition:

```python
partition_counts = (
    df.rdd
      .mapPartitionsWithIndex(
          lambda idx, rows: [(idx, sum(1 for _ in rows))]
      )
      .collect()
)
print(sorted(
    partition_counts,
    key=lambda x: x[1],
    reverse=True
)[:10])
```

Example output:

```text
Partition 0: 100,000 records
Partition 1: 110,000 records
Partition 2: 95,000 records
Partition 3: 8,000,000 records
```

Partition 3 is significantly larger, confirming uneven record distribution.

To inspect join shuffle skew, perform this check on a DataFrame that has been repartitioned by the actual join key, rather than relying only on the original input partitions. Note that `collect()` here returns just one count per partition, but counting all records still incurs a distributed scan.

## 4. Check for null-key skew

Null keys can also create skew, particularly in aggregations and shuffles.

```python
df.filter(F.col("customer_id").isNull()).count()
```

If millions of rows contain null join keys, they may concentrate in the same shuffle partition.

For ordinary inner equality joins, Spark can filter out null join keys before shuffling. Null-heavy data can still cause skew in other operations, including grouping, repartitioning, and outer joins that preserve those rows.

## 5. What to do after detecting skew?

| Solution                       | When to use                                                           |
| ------------------------------ | --------------------------------------------------------------------- |
| Broadcast join                 | One side of the join is sufficiently small                            |
| Salting                        | A few frequently occurring keys dominate a shuffle                    |
| Adaptive Query Execution (AQE) | Allow Spark to split skewed shuffle partitions during supported joins |
| Filter early                   | Unnecessary records contribute to skew                                |
| Pre-aggregation                | Reduce repeated keys before a join or aggregation                     |
| Repartitioning                 | Partition count or distribution is poorly configured                  |

For supported skewed joins, enable AQE and skew-join optimization:

```python
spark.conf.set("spark.sql.adaptive.enabled", "true")
spark.conf.set("spark.sql.adaptive.skewJoin.enabled", "true")
```

AQE can split skewed shuffle partitions into smaller tasks, although its effectiveness depends on the physical join strategy and Spark version.

## Interview-ready answer

> I detect data skew at two levels. First, in the Spark UI, I inspect the stage's task-duration distribution, shuffle read bytes, shuffle records, and spill metrics. If most tasks finish quickly but a few process significantly more data and run much longer, I suspect skew.

> Second, I analyze the join-key distribution using `groupBy().count()` to identify hot keys. I also inspect partition-level record counts to confirm uneven distribution.

> Once confirmed, I choose an optimization such as broadcast joins, salting, pre-aggregation, or AQE skew-join handling, depending on the root cause.

**Key takeaway:** Spark UI reveals which tasks are suffering, while key-distribution analysis helps explain why they are suffering.