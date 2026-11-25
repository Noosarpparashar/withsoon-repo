# What is lineage in Spark?

Lineage in Apache Spark refers to the sequence of transformations applied to an RDD or DataFrame to produce the final result.

Spark maintains this information as a dependency graph, allowing it to track how data was derived from its original source.

The primary purpose of lineage is fault tolerance. If a partition is lost, Spark can use its lineage information to recompute the missing partition instead of restarting the entire job.

## 1. Example of Spark Lineage

```
rdd = sc.parallelize([1, 2, 3, 4, 5])
rdd1 = rdd.map(lambda x: x * 2)
rdd2 = rdd1.filter(lambda x: x > 5)
rdd3 = rdd2.map(lambda x: x + 10)

print(rdd3.collect())
# Output: [16, 18, 20]
```

Spark maintains the following lineage:

[spark-lineage]

Spark knows how each RDD was derived from its parent RDD.

## 2. How Lineage Provides Fault Tolerance

Suppose Spark processes 100 partitions across multiple executors.

If an executor fails and 5 partitions are lost:

1. Spark identifies the lost partitions.
2. It examines their lineage to determine the required transformations.
3. It recomputes the missing partitions using available source or intermediate data.
4. It continues execution without recomputing every unaffected partition.

Example:

```
rdd1 = sc.textFile("sales.csv")
rdd2 = rdd1.filter(lambda x: "India" in x)
rdd3 = rdd2.map(lambda x: x.upper())

rdd3.cache()
rdd3.count()
```

If an executor loses a cached partition of `rdd3`, Spark can recompute it by reading the corresponding source partition and reapplying `filter()` and `map()`.

This is possible because Spark remembers the transformation dependencies.

## 3. How to View Lineage in Spark

For RDDs, use `toDebugString()`.

```
rdd = sc.parallelize([1, 2, 3, 4, 5])
rdd1 = rdd.map(lambda x: x * 2)
rdd2 = rdd1.filter(lambda x: x > 5)

print(rdd2.toDebugString().decode("utf-8"))
```

For DataFrames, use `explain()` to inspect the query execution plan:

```
df = spark.read.parquet("sales.parquet")
result = df.filter("amount > 1000").groupBy("region").count()

result.explain("formatted")
```

Note that `explain()` shows the optimized physical execution plan rather than an RDD lineage graph directly.

## 4. Lineage vs DAG

| Feature         | Lineage                                     | DAG                                                                    |
| --------------- | ------------------------------------------- | ---------------------------------------------------------------------- |
| Meaning         | Tracks how datasets depend on their parents | Directed acyclic graph representing dependencies                       |
| Main purpose    | Fault recovery and dependency tracking      | Represents computation and supports execution planning                 |
| Level           | RDD/dataset dependencies                    | Depends on context: RDD dependency graph, stage DAG, or operator graph |
| Fault tolerance | Used to recompute lost partitions           | Encodes dependencies that help determine recomputation                 |
| Visualization   | `toDebugString()` for RDDs                  | Spark UI DAG visualization                                             |

Important: Lineage and DAG are closely related. RDD lineage itself forms a DAG, but the stage DAG shown in Spark UI is a higher-level execution representation.

## 5. Does Lineage Keep Growing?

Yes. Every transformation may extend the lineage dependency chain.

For iterative processing with hundreds or thousands of transformations, an excessively long lineage can increase scheduling and recovery complexity.

Spark provides checkpointing to truncate lineage.

```
sc.setCheckpointDir("s3a://my-bucket/checkpoints/")
rdd = sc.parallelize(range(1000))

for i in range(100):
    rdd = rdd.map(lambda x: x + 1)

rdd.checkpoint()
rdd.count()
```

Once checkpointing completes successfully, Spark can recover the checkpointed RDD from reliable storage without traversing its original lineage.

Difference between caching and checkpointing:

- `cache()` stores computed data for reuse but retains lineage.
- `checkpoint()` materializes data to checkpoint storage and truncates the original lineage after successful checkpointing.

## Interview-ready Answer

> Lineage in Spark is the record of transformations and dependencies used to derive an RDD or DataFrame from its source.
>
> It provides fault tolerance through recomputation. If an executor fails and a partition is lost, Spark uses lineage to identify the transformations required to regenerate that partition instead of reprocessing the entire dataset.
>
> Lineage forms a DAG of dependencies, and it can be truncated through checkpointing.

Key takeaway: Spark achieves fault tolerance primarily through lineage-based recomputation rather than maintaining multiple copies of every intermediate dataset.