# What causes out-of-memory errors in Spark executors?

An executor out-of-memory (OOM) error occurs when a Spark executor requires more memory than is available in its JVM heap or allocated container memory.

The most common causes are data skew, oversized partitions, large joins, expensive aggregations, excessive caching, Python worker memory usage, and incorrect executor memory configuration.

## 1. Common causes of executor OOM

| Cause                        | Why it causes OOM                                                                   | Possible solution                            |
| ---------------------------- | ----------------------------------------------------------------------------------- | -------------------------------------------- |
| Data skew                    | One task processes a disproportionately large partition                             | AQE skew optimization, salting               |
| Oversized partitions         | Individual tasks require too much memory                                            | Increase partition count                     |
| Large broadcast joins        | A large broadcast table consumes excessive executor memory                          | Use sort-merge join or reduce broadcast size |
| Expensive aggregations       | `groupBy`, `collect_list`, and distinct operations create large intermediate states | Optimize aggregations                        |
| Excessive caching            | Cached DataFrames occupy executor memory                                            | Unpersist unnecessary data                   |
| Too many concurrent tasks    | Multiple tasks compete for the same executor memory                                 | Reduce executor cores/task concurrency       |
| Python UDFs                  | Python worker processes consume additional memory                                   | Use built-in Spark SQL functions             |
| Large shuffle operations     | Joins, sorting, and aggregations require large intermediate structures              | Reduce shuffle volume, improve partitioning  |
| Insufficient memory overhead | Container exceeds its memory allocation despite JVM heap being within limits        | Increase memory overhead                     |
| Application memory leaks     | Long-lived objects, references, or custom code retain memory                        | Investigate heap usage and application code  |

## 2. Understanding executor memory

Spark executor memory consists of more than the JVM heap.

[spark-executor-memory-layout]

The two important configurations are:

```python
sc = spark.sparkContext
print(sc.getConf().get("spark.executor.memory", "not explicitly set"))
print(sc.getConf().get("spark.executor.memoryOverhead", "not explicitly set"))
```

These are normally configured through `spark-submit` or cluster settings rather than changed during an existing application.

For example:

```bash
spark-submit \
  --executor-memory 8g \
  --conf spark.executor.memoryOverhead=2g \
  job.py
```

Here:

- `executor-memory=8g` allocates 8 GiB of JVM heap.
- `memoryOverhead=2g` allocates additional container memory allowance for non-heap/native usage and other overhead.
- If off-heap or PySpark-specific memory is configured separately, it can increase the total container memory requirement.

**Important:** An executor can be killed for exceeding its container memory limit even when JVM heap usage appears normal.

## 3. Example: Data skew causing OOM

Suppose a Spark join has 200 shuffle partitions:

- 199 partitions contain approximately 200 MiB each.
- One partition contains 15 GiB.

The task processing the 15 GiB partition may require excessive memory for joins, sorting, or aggregation.

This can lead to OOM, although some Spark operators can spill intermediate data to disk.

Possible solutions include:

```python
spark.conf.set("spark.sql.adaptive.enabled", "true")
spark.conf.set("spark.sql.adaptive.skewJoin.enabled", "true")
```

AQE can split certain skewed shuffle partitions for supported joins.

Other options include salting skewed keys and redesigning the join.

## 4. Example: Too many concurrent tasks per executor

Suppose an executor has:

- 8 GiB JVM heap.
- 8 executor cores.
- 8 tasks executing concurrently.
- Each task requiring approximately 1.5 GiB of peak heap memory.

[spark-executor-memory-demand]

Even if each task works independently, their combined memory demands can exceed the executor heap.

Reducing concurrency—for example, running 4 tasks instead of 8—may prevent OOM if aggregate task memory is the cause.

However, this does not solve an individual task that exceeds available memory on its own.

## 5. How to identify the type of OOM

| Error or symptom                               | Likely issue                                                                    |
| ---------------------------------------------- | ------------------------------------------------------------------------------- |
| `java.lang.OutOfMemoryError: Java heap space`  | JVM heap exhausted                                                              |
| `GC overhead limit exceeded`                   | JVM spending excessive time collecting garbage                                  |
| `Direct buffer memory` OOM                     | Direct/native buffer memory exhausted                                           |
| `Container killed for exceeding memory limits` | Total container memory exceeded                                                 |
| `Python worker exited unexpectedly`            | Possible Python worker OOM or crash; investigate logs                           |
| Executor lost with exit code 137               | Often an OS/container SIGKILL, potentially memory-related; inspect cluster logs |

The exact error matters because increasing JVM heap does not necessarily fix a Python worker or container-memory problem.

## 6. How would you debug executor OOM?

I would follow this sequence:

1. Inspect executor logs: Identify JVM heap OOM, container memory kill, or Python worker failure.
2. Check the Spark UI: Compare failed task durations, shuffle sizes, spills, and GC time.
3. Check partition sizes: Determine whether a few tasks are processing unusually large partitions.
4. Review physical execution plan: Look for large joins, broadcast exchanges, aggregations, sorts, and shuffles.
5. Check executor configurations: Review heap size, memory overhead, executor cores, and task concurrency.
6. Investigate caching and UDFs: Check whether cached datasets or external processes consume excessive memory.
7. Apply a targeted fix: Improve partitioning, reduce intermediate state, optimize joins, or adjust memory allocation.

## 7. Interview-ready answer

> Executor OOM errors occur when the memory required by Spark tasks exceeds the available executor heap or container memory.
>
> Common causes include data skew, oversized partitions, large broadcast joins, memory-intensive aggregations, excessive caching, and too many concurrent tasks per executor.
>
> In PySpark, Python worker memory can also cause executor container memory issues.
>
> To debug the problem, I first inspect executor logs to identify whether it's a JVM heap OOM or a container memory limit violation.
>
> Then I check the Spark UI for failed tasks, garbage collection time, memory and disk spilling, shuffle sizes, and partition skew.
>
> I also examine the physical plan for expensive joins and aggregations and review executor memory, memory overhead, and core configurations.
>
> Depending on the root cause, I would increase partition counts, address skew, reduce task concurrency, optimize joins, remove unnecessary caching, or increase executor memory when justified.

**Key interview takeaway:** Increasing `spark.executor.memory` is not always the solution. If one task processes an exceptionally large partition, or the executor is exceeding its container memory due to Python or native processes, simply increasing JVM heap may not fix the problem.