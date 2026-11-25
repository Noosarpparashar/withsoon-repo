# How do you read many small files efficiently?

To read many small files efficiently in Apache Spark, you should combine multiple small files into fewer input partitions, optimize file discovery, reduce unnecessary reads, and compact files when possible.

The goal is to reduce file-management and task-scheduling overhead while maintaining enough parallelism to utilize the cluster.

## 1. Combine small files into fewer input partitions

Spark can automatically group multiple small files into a single scan partition.

Two important configurations are:

```python
spark.conf.set("spark.sql.files.maxPartitionBytes", 128 * 1024 * 1024)
spark.conf.set("spark.sql.files.openCostInBytes", 4 * 1024 * 1024)
```

| Configuration       | Purpose                                                                                   |
| ------------------- | ----------------------------------------------------------------------------------------- |
| `maxPartitionBytes` | Target maximum size of a file-scan partition, accounting for estimated file-opening costs |
| `openCostInBytes`   | Estimated overhead of opening a file, expressed as equivalent bytes                       |

For example, if you have 10,000 files of 1 MB each, Spark can group multiple files into one task instead of creating 10,000 separate tasks.

[spark-small-file-scan]

**Important:** Spark still opens each physical file. Grouping files reduces task overhead but does not eliminate file-opening or object-storage request costs.

## 2. Limit the number of input partitions

Spark 3.5+ supports a suggested maximum number of file-scan partitions:

```python
spark.conf.set("spark.sql.files.maxPartitionNum", 500)
```

If Spark initially plans more than 500 file-scan partitions, it attempts to rescale them toward this value.

This is a suggested limit, not a strict maximum. Setting it too low can reduce parallelism and create long-running tasks.
## 3. Enable parallel file discovery

When files are spread across many directories, listing them can become expensive, particularly on S3.

```python
spark.conf.set(
    "spark.sql.sources.parallelPartitionDiscovery.threshold", 32
)
spark.conf.set(
    "spark.sql.sources.parallelPartitionDiscovery.parallelism", 1000
)
```

When the number of input paths exceeds the configured threshold, Spark can distribute file listing across tasks rather than relying on sequential discovery.

This improves directory discovery in suitable workloads, but it does not mean every file in a single input directory is automatically listed using a separate task.
## 4. Read files together instead of using loops

Avoid reading each file independently and triggering a separate job.

```python
# Avoid separate reads and actions for every file
for path in file_paths:
    df = spark.read.parquet(path)
    df.count()
```

Instead, read the dataset together:

```python
df = spark.read.parquet("s3://bucket/events/")
```

Spark can then optimize file discovery, scan partitioning, and task execution across the dataset.

## 5. Use partition pruning and column pruning

If data is partitioned by date, only read the required dates and columns.

```python
df = (
    spark.read.parquet("s3://bucket/events/")
    .filter("event_date = '2026-11-05'")
    .select("user_id", "amount")
)
```

This can reduce the number of files or bytes Spark needs to process.

Partition pruning is particularly effective when `event_date` is a physical partition column. Column pruning reduces data read from columnar formats such as Parquet.

## 6. Compact files for a permanent solution

Read-side tuning improves how Spark schedules and scans existing files. However, compaction physically reduces the number of files.

For example:

```python
df = spark.read.parquet("s3://bucket/raw/")

(df.repartition(100)
   .write
   .mode("overwrite")
   .parquet("s3://bucket/compacted/"))
```

This writes approximately 100 output files, subject to the write layout and data.

Use a separate destination when compacting raw Parquet files. For managed table formats such as Iceberg, prefer native compaction operations.

## 7. How would you optimize this in production?

| Situation                             | Preferred approach                               |
| ------------------------------------- | ------------------------------------------------ |
| Millions of small Parquet files       | Compact files                                    |
| Too many input scan tasks             | Tune `maxPartitionBytes` and `maxPartitionNum`   |
| Slow file discovery                   | Optimize directory layout and parallel listing   |
| Reading unnecessary historical data   | Partition pruning                                |
| Reading unnecessary columns           | Column pruning                                   |
| Many small files generated every hour | Optimize upstream writes and schedule compaction |

One important distinction: `df.coalesce(100)` after reading a dataset reduces downstream partitions but does not remove the overhead of reading the original small files.

## Interview-ready answer

> To read many small files efficiently in Spark, I would first optimize scan partitioning using `spark.sql.files.maxPartitionBytes` and `spark.sql.files.openCostInBytes`, allowing Spark to group small files into fewer tasks. I would also tune parallel file discovery if metadata listing is a bottleneck, apply partition and column pruning, and avoid reading files individually in loops. For a permanent solution, I would compact small files into larger Parquet files, generally targeting a few hundred megabytes depending on the workload.

**Key takeaway:** File grouping improves read-task efficiency; compaction eliminates much of the underlying small-file overhead.