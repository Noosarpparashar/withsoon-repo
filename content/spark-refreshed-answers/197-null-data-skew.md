# Can null values cause data skew?

Yes. NULL keys can cause skew when a shuffle concentrates a large amount of data or work in one partition. The impact depends on the operation and its physical execution plan; a high NULL percentage alone does not prove a performance problem.

Grouping puts NULL keys in one logical group. Ordinary inner equality joins leave NULL keys unmatched and can often filter them out. Null-safe joins can match NULLs and create large many-to-many results. Hash repartitioning by a single nullable key sends its NULL-key rows to the same destination bucket.

## 1. Example: a hot NULL key

Assume a transaction DataFrame df has ten million rows with this customer_id distribution:

| customer_id | Records |
| --- | --- |
| NULL | 7,000,000 |
| 101 | 1,000,000 |
| 102 | 1,000,000 |
| 103 | 1,000,000 |

```python
from pyspark.sql import functions as F

by_customer = df.repartition(4, "customer_id")
```

This requests a hash shuffle on customer_id. The seven million NULL keys all map to one bucket. Other keys can collide with that bucket or each other, so the actual distribution is not guaranteed to be 7M/1M/1M/1M.

[spark-reference:null-hot-partition]

The hot bucket contains at least seven million rows in this example. Merely increasing the number of hash partitions does not split one identical key across destinations. For composite partition keys, the full key determines distribution: a NULL in one component does not force all rows into one bucket when other components differ.

Potential symptoms include a long-running task, execution-memory pressure, garbage collection, disk spill, and executor OOM failures. The severity depends on row sizes, the operator, and available resources; processing a partition does not necessarily require loading it all into memory.

Calling repartition is lazy. The requested redistribution occurs when an action executes the relevant shuffle.

## 2. How does the operation change the outcome?

| Operation | Can NULL contribute to skew? | Reason |
| --- | --- | --- |
| GROUP BY on one nullable key | Yes | NULL keys form one group; the aggregate's partial-combination behavior matters |
| repartition by one key | Yes | All NULL instances of that key hash to one destination bucket |
| INNER JOIN using ordinary = | Often avoidable for NULL keys | NULL keys cannot match, and Catalyst can often remove them before joining |
| LEFT/RIGHT/FULL OUTER JOIN | Possible | Preserved NULL-key rows can concentrate in a shuffle-based plan |
| Null-safe JOIN using <=> | Potentially severe | NULL keys can match many-to-many |
| DISTINCT on a nullable key | Possible | NULLs deduplicate together; local partial aggregation can reduce shuffle volume |

DISTINCT over multiple columns uses the whole row or selected tuple. A NULL in customer_id alone does not make records with different other values duplicates.

### GROUP BY: logical skew versus actual shuffle work

```python
result = df.groupBy("customer_id").count()
```

All seven million NULL-key records belong to one logical group. But COUNT normally supports partial aggregation: each upstream task can send a small count state instead of every original row for that group. The final task merges those partial counts.

Consequently, this COUNT may perform well despite the NULL-heavy input. Inspect actual shuffle bytes, records, and task durations before adding a workaround. Whole-group operations, including Series/DataFrame-based grouped Pandas UDF paths that load a full group, can be much more vulnerable.

### Null-safe joins: skew and output growth

For two input DataFrames df1 and df2:

```python
result = df1.alias("l").join(
    df2.alias("r"),
    F.col("l.customer_id").eqNullSafe(F.col("r.customer_id")),
    "inner"
)
```

If df1 has 100,000 NULL customer IDs and df2 has 10,000, the single null-safe key condition produces 100,000 × 10,000 = 1,000,000,000 matching rows from NULL keys alone. Additional predicates can restrict that result.

[spark-reference:null-key-billion-pairs]

This is both a possible workload-distribution problem and a result-cardinality problem. A broadcast plan may avoid a join-key shuffle but still has to produce the required matches. Changing the join strategy does not remove those logical pairs.

## 3. How do you detect NULL-related skew?

### Step 1: profile missing keys

Compute total and NULL counts in one aggregation, and handle empty input explicitly:

```python
metrics = df.agg(
    F.count("*").alias("total_rows"),
    (F.count("*") - F.count("customer_id")).alias("null_rows")
).first()

null_percentage = (
    100.0 * metrics["null_rows"] / metrics["total_rows"]
    if metrics["total_rows"] > 0
    else None
)

print("NULL percentage:", null_percentage)
# For the stated non-empty dataset: 70.0
```

The None result distinguishes no input rows from a measured zero-percent NULL rate. This counts SQL NULLs; floating-point NaN and sentinel values require their own checks.

### Step 2: inspect key frequencies

```python
df.groupBy("customer_id") \
  .count() \
  .orderBy(F.col("count").desc()) \
  .show(10)
```

This identifies NULL and other hot keys. Profiling itself executes work, so use it deliberately on large production datasets.

### Step 3: inspect the affected stage and physical plan

| Evidence | What to investigate |
| --- | --- |
| Maximum task duration far above the median | A small number of stragglers |
| Uneven shuffle read bytes/records | Unequal partition workloads |
| High memory/disk spill on slow tasks | Operator memory pressure |
| High GC time on particular executors | Object pressure or resource contention |
| Large join output relative to input | Many-to-many key matches |
| AQE skew-partition information | Whether the final plan split an eligible skewed join partition |

```python
result.explain("formatted")
```

Look for exchanges, partial/final aggregates, join strategies, and the final adaptive plan in Spark UI after execution. A slow task alone does not establish skew: correlate task time with data volumes and executor conditions.

## 4. How do you fix it while preserving meaning?

### A. Filter NULL keys when they are not required

For an ordinary inner equality join, removing NULL keys does not remove any equality matches:

```python
left_filtered = df1.filter(F.col("customer_id").isNotNull())
right_filtered = df2.filter(F.col("customer_id").isNotNull())

result = left_filtered.join(
    right_filtered,
    "customer_id",
    "inner"
)
```

Catalyst often applies equivalent null filtering automatically, so explicit filters may not improve performance. Do not apply this rewrite to a null-safe join or remove rows required by an outer join/report without changing the business specification.

### B. Handle NULL-key records separately

```python
null_df = df.filter(F.col("customer_id").isNull())
non_null_df = df.filter(F.col("customer_id").isNotNull())
```

These are lazy branches; creating them alone does not redistribute or process data. Process each branch according to its meaning. For an aggregate, this may mean computing one missing-customer summary separately and combining compatible summary results afterward.

For outer-join semantics, any separate NULL branch must retain the required unmatched rows and align the output schema before union. An inner join on non-null keys plus an arbitrary union is not automatically equivalent to an outer join.

### C. Salt only computations with a correct recombination rule

Salting creates several subkeys for a hot key; a downstream shuffle must use those subkeys to distribute work. Adding a salt column alone moves no rows.

For a mergeable count, an illustrative two-phase computation is:

```python
salted = df.withColumn(
    "_salt",
    F.when(
        F.col("customer_id").isNull(),
        F.floor(F.rand(seed=42) * 16).cast("int")
    ).otherwise(F.lit(0))
)

partial_counts = salted.groupBy("customer_id", "_salt").agg(
    F.count("*").alias("partial_count")
)

final_counts = partial_counts.groupBy("customer_id").agg(
    F.sum("partial_count").alias("count")
)
```

The final NULL-key count remains seven million for the stated input. Salt buckets may collide in physical partitions; sixteen salt values do not guarantee sixteen separate tasks.

This is a correctness illustration, not the first optimization for COUNT, whose native partial aggregation may already be sufficient. Extra grouping can cost more than it saves. SUM can be combined with SUM, and AVG needs both partial sums and counts; averaging partial averages is generally incorrect.

An arbitrary whole-group UDF cannot be split this way unless its result has a valid merge rule. Join salting likewise needs coordinated salt assignment/replication on the other side so valid pairs are preserved. It cannot eliminate a logically required billion-row output.

### D. Use AQE for eligible skewed joins

```python
spark.conf.set("spark.sql.adaptive.enabled", "true")
spark.conf.set("spark.sql.adaptive.skewJoin.enabled", "true")
```

These are enabled by default in modern Spark releases; verify the effective configuration for the application. AQE skew-join optimization can split eligible skewed sort-merge-join partitions and replicate the necessary counterpart data.

AQE eligibility depends on the plan, join type, partition statistics, and thresholds. It does not universally split every hot aggregate group or repair unintended join cardinality. Check the final plan and measured results.

Finally, replacing every NULL key with UNKNOWN, -1, or another shared sentinel preserves one hot key and can create unintended matches. It is a data-value change, not a distribution fix.

## 5. Interview-ready answer

> Yes. NULL values can cause skew when hash partitioning or grouping concentrates many records under one key. If 70% of records have a NULL customer ID, repartitioning by that column sends those NULLs to one bucket.
>
> The operation matters. Ordinary inner equality joins can often discard NULL keys before joining. Null-safe equality matches them and can create a large many-to-many result. GROUP BY forms one NULL group, but mergeable aggregates such as COUNT can reduce shuffle work through local partial aggregation.
>
> I diagnose the problem with key frequencies, NULL percentages, shuffle sizes, task-duration differences, spill, and the execution plan. I then remove unnecessary keys, handle required NULL records separately, salt only when recombination preserves correctness, or use AQE for eligible skewed joins.
>
> I preserve the business meaning and distinguish uneven work from a genuinely huge output; additional partitions or a shared default key do not automatically fix either problem.

**Key takeaway:** NULL-heavy data can create a hot key, but its performance impact depends on what the operator must actually shuffle, retain, or produce.
