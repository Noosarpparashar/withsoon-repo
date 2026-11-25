# Why is 128 MB a common value?

128 MiB is commonly used because it provides a practical balance between parallelism, task scheduling overhead, memory consumption, and I/O efficiency.

It is also the default value of `spark.sql.files.maxPartitionBytes`: 134,217,728 bytes.

## 1. Why 128 MiB?

There are four major reasons.

### 1. Reduces task scheduling overhead

Spark creates tasks to process partitions. Very small partitions mean more tasks, which increases scheduling overhead.

For example, reading 100 GiB of data:

| Partition size | Approximate tasks |
| --- | --- |
| 16 MiB | 6,400 |
| 32 MiB | 3,200 |
| 64 MiB | 1,600 |
| 128 MiB | 800 |
| 256 MiB | 400 |
| 512 MiB | 200 |

[spark-common-partition-size]

128 MiB provides reasonable task sizes without generating an excessive number of tasks for this example.

### 2. Provides enough parallelism

Suppose your Spark cluster has 100 CPU cores.

- With 128 MiB partitions, approximately 800 tasks are available.
- Spark can execute about 100 single-core tasks concurrently.
- The workload can be processed across approximately eight waves, assuming similar task durations and all slots available.

If you increase partition size to 1 GiB, you get only about 100 tasks, reducing opportunities for load balancing and keeping cores busy when tasks finish at different times.

### 3. Keeps memory requirements manageable

A 128 MiB input partition is relatively modest compared with a 1 GiB partition.

However, 128 MiB on disk does not mean 128 MiB in executor memory.

Parquet compression, decompression, joins, aggregations, and intermediate structures can significantly change memory consumption.

### 4. Historical relationship with HDFS

Hadoop commonly uses 128 MiB HDFS blocks, and distributed processing systems historically benefited from processing large sequential blocks rather than many tiny files.

Spark's 128 MiB default fits that general design philosophy, although Spark input partitions are not required to match HDFS block boundaries.

## 2. Why not always use 256 MiB or 512 MiB?

Larger partitions can actually be faster when:

- You have very large datasets.
- Your workload is primarily sequential scanning.
- Task scheduling overhead is significant.
- Your cluster has adequate memory.
- You still have enough partitions to utilize all CPU cores.

Smaller partitions can be preferable when you need more parallelism, shorter tasks, or better balancing of irregular workloads.

## 3. Is 128 MiB always optimal?

No. It is a starting point, not a universal optimum.

| Workload | Reasonable starting point |
| --- | --- |
| Many small input files | 128–256 MiB scan partitions |
| Large Parquet scans | 128–512 MiB scan partitions |
| Memory-intensive transformations | 64–128 MiB, then benchmark |
| Very large analytical workloads | 256–512 MiB if sufficient parallelism remains |

These are tuning guidelines rather than fixed rules.

## 4. Interview-ready answer

> 128 MiB is a common Spark file-scan partition setting because it balances parallelism, task scheduling overhead, and memory utilization. Very small partitions create too many tasks, increasing scheduling overhead, while very large partitions reduce potential parallelism and may increase memory pressure. The value is also consistent with historical HDFS block-size conventions, although input partitions need not match those blocks. It is not universally optimal, and I would tune it based on dataset size, cluster cores, task duration, and memory usage.

**Key distinction:** The 128 MiB default for `spark.sql.files.maxPartitionBytes` applies to file-scan partition planning. It is not a universal target for shuffle partitions, in-memory data size, or physical output file size.