# How do you fix executor out-of-memory errors?

To fix executor OOM errors, I first identify what is consuming memory and whether the failure is caused by JVM heap exhaustion, container memory limits, or an oversized task.

I don't immediately increase executor memory because many OOM problems are caused by inefficient partitioning, data skew, expensive joins, or excessive concurrency.

## 1. Identify the type of OOM

Different memory failures require different solutions.

| Error                                          | Likely cause                                  | Possible fix                                          |
| ---------------------------------------------- | --------------------------------------------- | ----------------------------------------------------- |
| `Java heap space`                              | JVM heap exhausted                            | Reduce per-task memory, optimize joins, increase heap |
| `GC overhead limit exceeded`                   | JVM spends excessive time collecting garbage  | Reduce memory pressure and object allocation          |
| `Container killed for exceeding memory limits` | Total container memory exceeded               | Increase memory overhead or reduce non-heap usage     |
| `Direct buffer memory`                         | Native/direct-buffer exhaustion               | Investigate direct memory usage and overhead          |
| `Python worker exited unexpectedly`            | Possible Python worker OOM or crash           | Inspect Python logs, reduce UDF memory                |
| Executor exit code `137`                       | Process received SIGKILL, possibly due to OOM | Check YARN/Kubernetes and node logs                   |

## 2. Fix oversized partitions

Suppose a Spark job processes 500 GB using only 50 partitions.

Each partition contains approximately 10 GB on average.

That can create excessive per-task memory demand.

Solution: Increase the number of partitions.

```python
df = df.repartition(2000)
```

This can reduce average partition size to approximately 250 MB using decimal units, assuming even distribution.

However, `repartition()` introduces a shuffle, so it should be applied strategically.

For shuffle-heavy SQL operations, I can also tune:

```python
spark.conf.set("spark.sql.shuffle.partitions", 1000)
```

The exact value depends on data volume, cluster resources, and AQE behavior.

## 3. Fix data skew

If one partition contains 20 GB while the others contain 200 MB, that single task may cause executor OOM.

I inspect task-level shuffle-read sizes, spills, and durations in the Spark UI.

Possible solutions include enabling AQE skew optimization:

```python
spark.conf.set("spark.sql.adaptive.enabled", "true")
spark.conf.set("spark.sql.adaptive.skewJoin.enabled", "true")
```

For supported skewed joins, AQE can split oversized shuffle partitions.

For severe skew, I may implement key salting or redesign the aggregation.

**Important:** Simply increasing `spark.sql.shuffle.partitions` does not necessarily resolve skew, because records with the same hash-partitioned key may still go to the same partition.

## 4. Optimize joins

Large joins can create significant memory pressure.

Consider:

```python
from pyspark.sql.functions import broadcast

result = large_df.join(broadcast(dim_df), "customer_id")
```

If `dim_df` grows from 20 MB to several gigabytes, forcing a broadcast can exhaust executor memory.

Possible fixes:

- Remove unnecessary broadcast hints.
- Use a sort-merge join when more appropriate.
- Filter both datasets before joining.
- Select only required columns.
- Check duplicate join keys to avoid many-to-many join explosions.

```python
projected_large = large_df.select("customer_id", "amount")
projected_dim = dim_df.select("customer_id", "category")
result = projected_large.join(projected_dim, "customer_id")
```

Reducing the data processed by a join can be more effective than increasing executor memory.

## 5. Reduce concurrent tasks per executor

Suppose an executor has 8 GiB heap and 8 cores.

If eight tasks each require approximately 1.5 GiB of heap simultaneously, the executor may run out of memory.

One possible fix is reducing executor cores:

```bash
spark-submit \
  --executor-memory 8g \
  --executor-cores 4 \
  job.py
```

This generally limits the executor to four single-core tasks running concurrently, instead of eight.

Fewer simultaneous tasks can reduce aggregate executor memory pressure.

However, reducing concurrency may also reduce throughput, so I would validate the performance impact.

## 6. Increase memory or memory overhead when appropriate

There are two configurations worth distinguishing.

| Configuration                   | Purpose                                                                            |
| ------------------------------- | ---------------------------------------------------------------------------------- |
| `spark.executor.memory`         | JVM heap memory                                                                    |
| `spark.executor.memoryOverhead` | Additional container memory allowance for non-heap/native usage and other overhead |

For example:

```bash
spark-submit \
  --executor-memory 12g \
  --executor-cores 4 \
  --conf spark.executor.memoryOverhead=3g \
  job.py
```

This provides 12 GiB JVM heap plus 3 GiB overhead. Separately configured off-heap or PySpark memory may increase the total container allocation.

Increasing heap may help with JVM memory pressure, while increasing memory overhead may help when native memory or Python workers are exceeding the container limit.

Do not increase executor memory blindly. Larger executors may reduce the number of executors that can fit on the cluster, and overly large heaps can increase garbage collection costs.

## 7. Avoid unnecessary caching

Caching large DataFrames can increase memory pressure.

```python
df.cache()
df.count()
```

After the cached data is no longer required:

```python
df.unpersist()
```

Although Spark can evict cached blocks to make room for execution memory, unnecessary caching still consumes resources and may cause recomputation or additional storage I/O.

I would cache only data that is reused enough to justify the cost.

## 8. Avoid memory-intensive operations and UDFs

Operations that retain very large state per group can cause OOM.

For example:

```python
from pyspark.sql import functions as F

df.groupBy("customer_id").agg(
    F.collect_list("transaction_id")
)
```

If a customer has millions of transactions, the resulting array can become extremely large.

Potential fixes include avoiding unbounded collection, using simpler aggregates, or redesigning downstream processing.

Similarly, Python UDFs can create additional Python worker memory demand. Where possible, I prefer built-in Spark SQL functions.

## 9. How I would debug and fix OOM in production

| Step | Investigation                            | Action                                            |
| ---- | ---------------------------------------- | ------------------------------------------------- |
| 1    | Check exact OOM message in executor logs | Distinguish heap vs. container failure            |
| 2    | Inspect failed tasks in Spark UI         | Identify large or skewed partitions               |
| 3    | Check shuffle, spill, and GC metrics     | Find memory-intensive stages                      |
| 4    | Examine physical execution plan          | Find expensive joins and aggregations             |
| 5    | Review executor memory and cores         | Check memory per concurrent task                  |
| 6    | Review caching, UDFs, and native usage   | Eliminate unnecessary memory consumption          |
| 7    | Apply one targeted change                | Fix skew, partitions, joins, or memory allocation |
| 8    | Rerun and compare                        | Validate stability, performance, and correctness  |

## Interview-ready answer

> To fix executor OOM errors, I first identify whether the failure is caused by JVM heap exhaustion or the executor exceeding its container memory limit.
>
> Then I inspect executor logs and the Spark UI to check failed tasks, partition sizes, shuffle volumes, memory spilling, and garbage collection.
>
> If the issue is caused by oversized partitions, I increase partitioning appropriately. If it's caused by data skew, I use AQE skew join optimization, salting, or a better partitioning strategy.
>
> For large joins, I review broadcast strategies and reduce unnecessary data before joining. I also check whether too many tasks are running concurrently on each executor or whether unnecessary caching is consuming memory.
>
> If the application genuinely requires more memory after these optimizations, I increase executor heap or memory overhead based on the type of failure.
>
> Finally, I rerun the job and verify that it completes successfully without excessive spilling, garbage collection, or infrastructure cost.

**Key interview point:** The goal is not simply to give Spark more memory. It is to reduce per-task memory demand, distribute work evenly, control executor concurrency, and allocate the correct type of memory.