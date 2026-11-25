# Why are roughly 100–200 MB partitions commonly targeted?

Spark partitions of approximately 100–200 MiB are commonly used as a starting point because they provide a reasonable balance between task scheduling overhead, memory consumption, and parallelism.

However, this is a tuning heuristic, not a Spark-enforced limit. Some workloads perform better with much smaller or larger partitions.

## 1. Avoid excessive task scheduling overhead

Every Spark task introduces overhead, including:

- Task scheduling and dispatching
- Task initialization and serialization
- Executor coordination
- Task completion and metrics reporting

Suppose we process 100 GiB of data.

| Partition size | Approx. tasks |
| -------------- | ------------- |
| 1 MiB           | 102,400       |
| 10 MiB          | 10,240        |
| 128 MiB         | 800           |
| 256 MiB         | 400           |
| 1 GiB           | 100           |

With 1 MiB partitions, Spark creates an enormous number of tiny tasks.

Even if individual tasks execute quickly, scheduling overhead can become significant.

Partitions around 100–200 MiB often contain enough work to amortize task startup costs.

## 2. Avoid excessive memory consumption

Larger partitions mean each task may process more data.

For example, consider an executor with 8 GiB heap memory and 4 concurrent tasks.

A 1 GiB partition per task might seem reasonable, but joins, aggregations, decompression, and intermediate objects can require several times the input data size.

If all four tasks have large working sets, they can compete for memory, causing:

- Garbage collection overhead
- Memory spilling to disk
- Out-of-memory errors
- Slower task execution

Partitions around 100–200 MiB often help keep per-task working sets manageable, although they do not guarantee safety.

## 3. Maintain sufficient parallelism

Smaller partitions create more tasks, allowing Spark to distribute work across CPU cores.

For example, consider 100 GiB of data with 40 available executor cores.

[spark-partition-parallelism]

At 4 GiB per partition, only 25 tasks exist, so a 40-core cluster cannot fully utilize all its cores during that stage.

This is another reason moderately sized partitions are useful: they create enough independent tasks to utilize the cluster without creating too many.

## 4. Why approximately 128 MiB became a common starting point

Apache Spark uses 128 MiB as the default maximum file-scan partition size through:

```python
spark.conf.get("spark.sql.files.maxPartitionBytes")
# 134217728 bytes = 128 MiB
```

This setting applies to file-based sources such as Parquet, ORC and JSON. It is a file-scan planning setting, not a universal size limit for Spark partitions.

There is an important distinction:

| Partition type                | Default or common target             |
| ----------------------------- | ------------------------------------ |
| File-scan partitions          | 128 MiB default maximum              |
| Shuffle partitions            | 200 initial partitions by default    |
| AQE advisory partition size   | 64 MiB default                       |
| Manually tuned ETL partitions | Often 128–256 MiB as a starting point |

AQE can also coalesce smaller shuffle partitions dynamically.

## 5. Why isn't 128 MiB always optimal?

Because task efficiency depends more on execution time and memory usage than on partition size alone.

A 128 MiB partition performing a complex join may be slower and consume more memory than a 1 GiB partition performing a simple filter.

Also, the on-disk size of compressed data isn't necessarily the amount of memory it requires during processing.

A practical approach is to start near 128 MiB and compare:

- Median and maximum task duration
- Scheduling overhead
- Memory and disk spill
- Garbage collection time
- CPU utilization and data skew

## Interview-ready answer

> Partitions around 100–200 MiB are commonly targeted because they balance three competing concerns: task scheduling overhead, memory consumption, and parallelism.

> If partitions are too small, Spark creates excessive tasks, increasing scheduling overhead. If they're too large, tasks can become memory-intensive, run longer, and reduce parallelism.

> Spark itself uses a default maximum file-scan partition size of 128 MiB, which is one reason this value is a common starting point.

> However, 128 MiB isn't a universal optimum. I tune partition sizes based on task duration, workload complexity, available cores, memory spill, and Spark UI metrics.

**Key takeaway:** The purpose of the 100–200 MiB guideline is not to achieve a particular partition size. It is to create tasks that are large enough to perform meaningful work but small enough to execute efficiently and safely.