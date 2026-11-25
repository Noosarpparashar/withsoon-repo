# How does Spark determine the default number of partitions?

Spark determines the default number of partitions based on the data source, input data size, available cluster resources, and the type of operation being performed.

There is no single default partition count for every Spark operation.

## 1. Default partitions for different operations

| Operation                  | How Spark determines partitions                                        |
| -------------------------- | ---------------------------------------------------------------------- |
| `sc.parallelize()`         | Based on `spark.default.parallelism` or cluster resources              |
| `sc.textFile()`            | Based on Hadoop input splits and minimum partition settings            |
| `spark.read.parquet()`     | Based on file sizes, split planning, and file scan settings            |
| `spark.read.csv()`         | Based on file sizes, input format splittability, and scan settings     |
| DataFrame `groupBy()`      | Uses `spark.sql.shuffle.partitions`, default 200                       |
| DataFrame shuffle `join()` | Typically uses `spark.sql.shuffle.partitions`, default 200             |
| RDD `reduceByKey()`        | Typically inherits parent RDD partitioning unless configured otherwise |

## 2. Default partitions while reading files

For file-based DataFrame reads, an important configuration is:

```ini
spark.sql.files.maxPartitionBytes = 134217728  # 128 MiB
```

The default is 128 MiB.

For example, suppose Spark reads 10 GiB of splittable Parquet data.

An approximate calculation is:

**Partitions ? Input size ? Target partition size**

**(10 ? 1024 MiB) ? 128 MiB = 80 partitions**

Spark might create approximately 80 input partitions.

However, the actual number can differ because of file boundaries, Parquet row groups, small-file packing, file-opening costs, and minimum or maximum partition settings.

## 3. Default partitions for RDDs

Spark uses `spark.default.parallelism` for certain RDD operations.

When it isn't explicitly configured, the default depends on the cluster manager and available cores.

For example:

- 5 executors
- 4 cores each
- Total = 20 cores

The default parallelism could be 20 in a typical distributed setup.

```python
sc = spark.sparkContext
print(sc.defaultParallelism)
```

For a new RDD:

```python
rdd = sc.parallelize(range(1000))
print(rdd.getNumPartitions())
```

Without an explicit partition count, `parallelize()` uses Spark's default parallelism.

## 4. Default partitions during shuffle

For DataFrame and Spark SQL shuffle operations, the standard default configuration is:

```ini
spark.sql.shuffle.partitions = 200
```

Consider:

```python
df = spark.read.parquet("/data/sales")
result = df.groupBy("country").count()
```

[spark-default-partitions]

Important: With Adaptive Query Execution (AQE), enabled by default in modern Spark versions, Spark can coalesce smaller shuffle partitions at runtime. Therefore, the final number of tasks may be less than 200.

## 5. How to check and change default partitions

```python
# Check default RDD parallelism
print(spark.sparkContext.defaultParallelism)

# Check configured SQL shuffle partitions
print(spark.conf.get("spark.sql.shuffle.partitions"))

# Check current DataFrame partitions
print(df.rdd.getNumPartitions())
```

To configure partition counts:

```python
# Set shuffle partitions
spark.conf.set("spark.sql.shuffle.partitions", 100)

# Set input split target to 256 MiB
spark.conf.set("spark.sql.files.maxPartitionBytes", 256 * 1024 * 1024)

# Explicitly repartition a DataFrame
df = df.repartition(50)
```

## Interview-ready answer

> Spark determines the default number of partitions differently depending on the operation. For RDDs, it generally uses `spark.default.parallelism`, which depends on available cluster cores and the cluster manager, although some transformations inherit the partition count from their parent RDDs. For file-based DataFrame reads, Spark considers input size, file splits, and `spark.sql.files.maxPartitionBytes`, which defaults to 128 MiB. For DataFrame shuffle operations such as joins and aggregations, Spark uses `spark.sql.shuffle.partitions`, which defaults to 200. Adaptive Query Execution can further adjust shuffle partition counts at runtime.

Key distinction to remember:

- RDD parallelism: Cluster resources and existing RDD partitions.
- File-read partitions: File sizes and split configuration.
- Shuffle partitions: `spark.sql.shuffle.partitions` (default 200), potentially adjusted by AQE.