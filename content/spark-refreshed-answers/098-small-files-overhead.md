# Why are many small files bad for Spark?

Many small files are bad for Apache Spark because they introduce excessive metadata processing, file-opening overhead, task scheduling overhead, and inefficient resource utilization.

Even when the total data size is small, processing thousands or millions of files can make a Spark job significantly slower.

## 1. Major performance problems

| Problem | Why it affects Spark |
| --- | --- |
| Metadata overhead | Spark must discover files, inspect metadata, and plan which files to read. |
| Task scheduling overhead | Many small input files can lead to many small tasks, increasing scheduling costs. |
| File-opening overhead | Opening a file requires operations independent of how much data it contains. |
| S3 API overhead | More objects can mean more requests, latency, and API costs. |
| Driver memory pressure | Spark must maintain information about files, partitions, and scheduled tasks. |
| Poor CPU utilization | Executors spend proportionally more time on overhead instead of processing data. |
| Inefficient columnar reads | Tiny Parquet files often have small row groups and limited opportunities for efficient sequential reads. |

## 2. Example: Reading approximately 100 GiB of data

Consider two datasets containing approximately 100 GiB.

[spark-small-files]

In Scenario A, Spark must handle 100,000 file objects. In Scenario B, it handles only about 400.

Both contain roughly the same amount of data, but Scenario B generally requires less metadata processing and fewer file-open operations.

## 3. Does Spark create one task per small file?

No. This is an important interview distinction.

Spark can group multiple small files into a single input partition.

For example:

```python
spark.conf.set(
    "spark.sql.files.maxPartitionBytes",
    128 * 1024 * 1024
)
spark.conf.set(
    "spark.sql.files.openCostInBytes",
    4 * 1024 * 1024
)
```

- `maxPartitionBytes`: Controls the target maximum size of an input scan partition.
- `openCostInBytes`: Represents the estimated cost of opening a file, expressed as equivalent bytes.

Spark uses both values when packing files into scan partitions.

However, grouping files into one task does not eliminate the overhead of opening and reading each individual file.

## 4. Why can file-opening overhead become significant?

Consider an illustrative example:

- 100,000 files
- 10 ms overhead per file
- Total aggregate overhead = 1,000 seconds

This is not necessarily 1,000 seconds of additional job wall-clock time because Spark processes files concurrently. However, the overhead consumes resources across executors and can slow execution considerably.

The same overhead for 400 files would total only 4 seconds.

## 5. How do you solve it?

1. **Compaction:** Merge small files into larger files.
2. **Control output partitions:** Use `coalesce()` or `repartition()` appropriately before writing.
3. **Avoid excessive partitioning:** Do not partition storage by high-cardinality columns unnecessarily.
4. **Optimize streaming writes:** Adjust micro-batch frequency and periodically compact output.
5. **Use Iceberg/Delta maintenance:** Run file-rewrite or compaction operations.

For example, in Apache Iceberg:

```sql
CALL catalog.system.rewrite_data_files(
    table => 'db.orders'
);
```

This combines smaller data files into larger ones.

## Interview-ready answer

> Many small files degrade Spark performance because each file introduces metadata, file-opening, and scheduling overhead. Spark may spend significant time discovering and opening files instead of processing the actual data. Although Spark can combine multiple small files into a single scan task, it still needs to open those files individually. Small files can also increase driver memory pressure and S3 request overhead. The preferred solution is file compaction, combined with proper partitioning and output-file-size management.

**Key takeaway:** Spark performs best when the workload has enough partitions for parallelism, but not so many tiny files that file-management overhead dominates useful processing.