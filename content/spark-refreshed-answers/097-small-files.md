# What is the small-files problem?

The small-files problem occurs when a data lake or distributed storage system contains a very large number of tiny files instead of a smaller number of appropriately sized files.

In Apache Spark, this causes slow reads, excessive metadata operations, task scheduling overhead, and inefficient resource utilization.

## 1. Example

Suppose you have 100 GiB of data stored in S3.

[spark-small-files]

Both layouts store roughly the same data, but the first introduces much more file-handling overhead.

## 2. Why do small files slow down Spark?

| Problem                  | Explanation                                                                                      |
| ------------------------ | ------------------------------------------------------------------------------------------------ |
| Metadata overhead        | Spark must discover files and inspect metadata, increasing listing and planning costs.           |
| Task scheduling overhead | Many tiny files can result in excessive tasks or file-open work.                                 |
| S3 request overhead      | More object operations and requests increase latency and potentially cost.                       |
| Inefficient processing   | Tasks may finish very quickly, making scheduling overhead large relative to actual processing.   |
| Memory pressure          | Tracking large numbers of files, partitions, and task metadata can increase driver memory usage. |

**Important:** Spark does not necessarily create one task per file. For file-based DataFrame reads, Spark can combine multiple small files into one scan partition using configurations such as `spark.sql.files.maxPartitionBytes` and `spark.sql.files.openCostInBytes`.

## 3. What causes the small-files problem?

Common causes include:

- Streaming micro-batches: Frequent writes create small output files.
- Overpartitioning: Writing with too many Spark partitions produces numerous output files.
- Partitioned tables: Partitioning by high-cardinality columns such as `user_id` creates many small directories and files.
- Frequent incremental loads: Small CDC batches repeatedly append small files.
- Poor file management: No periodic compaction or file-size optimization.

## 4. How do you fix the small-files problem?

### Solution 1: Compact files using Spark

```python
df = spark.read.parquet("s3://bucket/input/")

(df.coalesce(100)
   .write
   .mode("overwrite")
   .parquet("s3://bucket/compacted/"))
```

This reduces the number of output partitions and generally produces fewer files.

`coalesce()` avoids a full shuffle when reducing partitions, but it can create uneven workloads. Use `repartition()` when better balancing is needed.

### Solution 2: Use table-format compaction

For Apache Iceberg, use maintenance procedures such as:

```sql
CALL catalog.system.rewrite_data_files(
  table => 'db.orders'
);
```

This rewrites small data files into larger files without manually rebuilding the whole table.

Other formats, such as Delta Lake and Hudi, offer their own compaction mechanisms.

### Solution 3: Configure file sizes

```python
spark.conf.set("spark.sql.files.maxPartitionBytes", 134217728)
```

This targets approximately 128 MiB per input scan partition. It can improve read-side task grouping, but does not physically merge files.

For output, control the number of partitions before writing, tune batch frequency, and use compaction when appropriate.

## 5. What is the ideal file size?

There is no universal ideal, but these are useful starting points for analytical workloads:

| File size  | General guidance                                  |
| ---------- | ------------------------------------------------- |
| Under 1 MiB | Usually problematic at scale                      |
| 1–16 MiB    | Often too small                                   |
| 32–64 MiB   | Acceptable for some workloads                     |
| 128–512 MiB | Common practical target                           |
| Over 1 GiB | May be fine for splittable formats; assess input splits, compression, and scan parallelism |

Actual choices depend on the table format, compression, workload, and cluster size.

## 6. Interview-ready answer

> The small-files problem occurs when a large dataset is stored as thousands or millions of tiny files. In Spark, this increases file-listing overhead, task scheduling overhead, S3 requests, and driver metadata pressure. It is commonly caused by streaming micro-batches, overpartitioning, and frequent incremental writes. We solve it using file compaction, controlling output partitions, adjusting write frequency, and using maintenance features in table formats like Apache Iceberg or Delta Lake. We typically aim for files in the hundreds of megabytes, depending on workload.

**Key distinction:** Increasing `spark.sql.files.maxPartitionBytes` can improve how Spark reads small files, whereas compaction actually reduces the physical number of files.