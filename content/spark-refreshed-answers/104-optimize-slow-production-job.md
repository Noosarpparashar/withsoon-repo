# How do you optimize a slow Spark job in production?

When optimizing a slow Spark job in production, I follow a measure → identify bottleneck → optimize → validate approach.

The most important principle is: Don't start by increasing executors or memory. First identify why the job is slow using the Spark UI and execution plan.

## 1. Identify where the job is spending time

I first compare the current run with previous successful runs to check whether the input volume, data distribution, code, cluster resources, or execution plan has changed.

Then I inspect three areas in the Spark UI:

- SQL tab: Expensive operators, joins, aggregations, scans, and shuffle exchanges.
- Stages tab: Slow stages, task duration, shuffle read/write, spill, and task skew.
- Executors tab: CPU activity, garbage collection, memory usage, failed tasks, and executor losses.

## 2. Diagnose the bottleneck using Spark UI metrics

| Observation                 | Possible cause                                 | Optimization                                                      |
| --------------------------- | ---------------------------------------------- | ----------------------------------------------------------------- |
| High shuffle read/write     | Expensive joins or aggregations                | Broadcast joins, partial aggregation, reduce unnecessary shuffles |
| Few tasks running           | Too few partitions                             | Increase parallelism                                              |
| Thousands of tiny tasks     | Too many partitions or small files             | Compact files, coalesce partitions                                |
| One task takes much longer  | Data skew                                      | AQE skew handling, salting                                        |
| High memory/disk spill      | Partitions too large or memory pressure        | Adjust partitions, reduce working-set size                        |
| High GC time                | Excessive object allocation or memory pressure | Reduce memory usage, optimize serialization                       |
| Long task scheduling delays | Resource contention or insufficient task slots | Check cluster capacity and executor allocation                    |
| Slow input scans            | Too much data or excessive files               | Partition pruning, column pruning, file compaction                |
| Slow output stage           | Excessive files, skew, or storage bottleneck   | Optimize write parallelism and file sizes                         |

## 3. Inspect the physical execution plan

I use:

```python
df.explain("formatted")
```

I look for expensive operations such as:

- `Exchange`: Indicates data redistribution or shuffle.
- `SortMergeJoin`: May involve substantial shuffle and sorting.
- `BroadcastHashJoin`: Often preferable when one side is small.
- `Sort`: Expensive sorting operation.
- `HashAggregate`: Aggregation that may require substantial memory and shuffle.

I verify whether Spark is selecting the expected join strategy, pushing down filters, and pruning unnecessary columns and partitions.

## 4. Apply targeted optimizations

### A. Reduce unnecessary data processing

Apply filters and select only required columns before expensive operations, when doing so preserves the query's logic.

```python
df = (
    spark.read.parquet("s3://bucket/orders/")
    .filter("order_date >= '2026-11-01'")
    .select("customer_id", "amount", "order_date")
)
```

This reduces data processed downstream and may allow Spark to avoid reading unnecessary partitions or columns.

### B. Optimize joins

If joining a 1 TB fact table with a small dimension table, I consider broadcasting the dimension table.

```python
from pyspark.sql.functions import broadcast

result = fact_df.join(broadcast(dim_df), "customer_id")
```

This can eliminate a large shuffle when the dimension is sufficiently small to broadcast safely.

I also check whether poor table statistics are causing Spark to select an inefficient join strategy.

### C. Optimize shuffle partitions

For large shuffle stages, I evaluate:

```python
spark.conf.set("spark.sql.shuffle.partitions", "800")
```

This is an illustrative value, not a universal recommendation.

I choose the number using shuffle volume, partition sizes, available CPU cores, and observed spill. More partitions can improve parallelism and reduce per-task memory pressure, but too many add overhead.

### D. Enable Adaptive Query Execution

```python
spark.conf.set("spark.sql.adaptive.enabled", "true")
spark.conf.set("spark.sql.adaptive.skewJoin.enabled", "true")
spark.conf.set("spark.sql.adaptive.coalescePartitions.enabled", "true")
```

AQE can automatically coalesce small shuffle partitions, optimize certain skewed joins, and change join strategies using runtime statistics. These features are generally enabled by default in modern Spark versions, but I verify the actual job configuration.
### E. Handle data skew

If most tasks finish in 20 seconds but one task takes 10 minutes, I investigate key distribution.

Possible solutions include salting hot keys, filtering or handling special keys, AQE skew join optimization, and restructuring aggregations.

Simply increasing the number of partitions may not solve key-based skew.

### F. Optimize file sizes and storage

If the job reads millions of small files, file discovery and task overhead can become significant.

I would compact small files into reasonably sized files, use efficient columnar formats such as Parquet, and ensure partition pruning is effective.

I also distinguish between input split size (`spark.sql.files.maxPartitionBytes`) and shuffle partition sizing; they control different aspects of Spark execution.

### G. Optimize memory and resource allocation

I check executor heap, memory overhead, executor cores, GC time, and disk spilling.

I might increase parallelism to reduce per-task data, remove unnecessary caching, or adjust executor memory. I only increase cluster capacity after confirming resource saturation or contention.

## 5. Validate the improvement

After each meaningful change, I compare the optimized job against the baseline using equivalent workloads.

I measure total runtime, shuffle bytes, spilled bytes, task duration distribution, CPU utilization, memory consumption, infrastructure cost, and output correctness.

I avoid changing many configurations simultaneously because that makes it difficult to identify what actually improved performance.

## 6. Production example

Suppose a Spark ETL job that normally completes in 25 minutes starts taking 90 minutes.

On investigation, I find:

- A join stage has significant shuffle read.
- Most tasks finish quickly, but a few run much longer.
- A particular customer ID accounts for a disproportionately large number of records.
- Executors processing those partitions show substantial spill.

My approach would be to enable or verify AQE skew handling, inspect whether the smaller join side can be broadcast, and use targeted salting if the skew remains severe.

I would then rerun the same workload and verify that the straggler tasks, spills, and overall runtime have decreased without changing the output.

## Interview-ready answer

> When a Spark job becomes slow in production, I first establish a baseline and investigate the Spark UI rather than immediately increasing resources. I inspect the SQL plan, slow stages, shuffle metrics, task distribution, garbage collection, and memory spilling to identify the bottleneck.
>
> Based on the findings, I apply targeted optimizations such as partition pruning, broadcast joins, shuffle partition tuning, AQE, skew handling, and small-file compaction. I also verify whether the bottleneck is caused by executor resources, storage performance, or cluster contention.
>
> Finally, I benchmark the optimized job against the baseline, validate data correctness, and compare resource costs before rolling out the change to production.

**The strongest interview takeaway:** Spark optimization is not about memorizing configurations. It's about finding the most expensive stage, understanding its bottleneck, and making a measurable improvement.