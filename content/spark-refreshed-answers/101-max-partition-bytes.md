# What does spark.sql.files.maxPartitionBytes do?

`spark.sql.files.maxPartitionBytes` controls the maximum amount of file data Spark aims to pack into a single input partition when reading file-based data sources such as Parquet, ORC, JSON, and CSV.

The default value is 128 MiB (134,217,728 bytes).

```python
spark.conf.set(
    "spark.sql.files.maxPartitionBytes",
    128 * 1024 * 1024
)
```

## 1. How does it work?

Suppose Spark needs to read 1 GiB of Parquet data.

| Configuration | Approximate input partitions |
| --- | --- |
| 64 MiB | 16 |
| 128 MiB | 8 |
| 256 MiB | 4 |
| 512 MiB | 2 |

These are simplified estimates, assuming files can be split appropriately and ignoring file-opening overhead.

Each input partition is typically processed by one Spark task.

[spark-file-partition-sizing]

## 2. How does it help with small files?

Suppose you have 1,000 files, each containing 1 MiB.

Spark can group multiple small files into a single input partition, reducing the number of scan tasks.

However, Spark also considers `spark.sql.files.openCostInBytes`, which represents the estimated cost of opening a file. Therefore, it does not necessarily group exactly 128 files of 1 MiB into one partition.

**Important:** The files remain physically separate in S3 or HDFS. Spark only groups their reads into tasks.

## 3. How does openCostInBytes affect the partition count?

Spark also considers the estimated file-opening cost:

```python
spark.conf.set(
    "spark.sql.files.openCostInBytes",
    4 * 1024 * 1024
)
```

Consider 1,000 files of 1 MiB each.

With a 4 MiB estimated opening cost, Spark accounts for roughly 5 MiB per file when packing them into scan partitions.

Therefore, each 128 MiB partition can hold approximately 25 such files, giving around 40 input partitions in this simplified example.

The actual partition count can differ because Spark also considers other partition-sizing rules and the details of its file-packing algorithm.

## 4. What happens when you increase or decrease it?

| Smaller value (64 MiB) | Larger value (256 MiB) |
| --- | --- |
| More input partitions | Fewer input partitions |
| More potential parallelism | Less potential parallelism |
| More task scheduling overhead | Less task scheduling overhead |
| Smaller individual scan workloads | Larger individual scan workloads |
| May help underutilized clusters | May help when task overhead is high |

A larger value is not always better. Too few scan tasks can leave CPU cores idle, while oversized tasks may increase memory pressure.

## 5. What does this configuration NOT do?

- It does not physically merge files.
- It does not directly control output file sizes.
- It does not control shuffle partitions.
- It does not guarantee an exact partition size or count.
- It does not impose a strict executor-memory limit.

## 6. Difference from spark.sql.shuffle.partitions

| Configuration | Controls |
| --- | --- |
| `spark.sql.files.maxPartitionBytes` | Input scan partition size when reading files |
| `spark.sql.shuffle.partitions` | Initial number of partitions for shuffle operations such as joins and aggregations |

## Interview-ready answer

> `spark.sql.files.maxPartitionBytes` controls the target maximum size of each input partition when Spark reads files such as Parquet, ORC, or JSON. Its default value is 128 MiB. Spark uses it to split large files where supported and group multiple small files into scan partitions. Increasing the value generally reduces scan tasks, while decreasing it increases potential parallelism. It affects read-side partition planning, not output files or shuffle partitions.

**Key takeaway:** `maxPartitionBytes` controls how Spark organizes file reads into tasks, not how large the physical files are.