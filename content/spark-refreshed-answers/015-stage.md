# What is a Spark stage?

A Spark Stage is a group of tasks that can execute in parallel without requiring a shuffle between them.

When a Spark job is triggered, the DAG Scheduler divides the job into stages based on shuffle dependencies.

Each stage consists of multiple tasks, typically one task per partition, which execute in parallel across Spark executors.

## 1. How are Spark Stages created?

Spark divides a job into stages based on two types of dependencies:

- Narrow Dependency: Data required by a child partition comes from a small, fixed number of parent partitions. These transformations can generally be pipelined into the same stage.
- Wide Dependency: Data from multiple parent partitions needs to be redistributed across partitions. This typically requires a shuffle and creates a stage boundary.

### Example

```python
df = spark.read.parquet("s3://bucket/sales/")
df2 = df.filter(df.amount > 1000)          # Narrow
df3 = df2.select("region", "amount")       # Narrow
df4 = df3.groupBy("region").sum("amount")  # Wide

df4.show()  # Action
```

## 2. Spark Stage Execution Flow

[spark-stage-execution]

## 3. Types of Spark Stages

Spark primarily has two types of stages:

| Stage type | Description |
| --- | --- |
| ShuffleMapStage | Executes tasks that produce intermediate shuffle data consumed by downstream stages. |
| ResultStage | Executes the final tasks needed to produce the result of an action. |

For Spark SQL queries, stage structure can be more complex due to optimizations and Adaptive Query Execution (AQE).

## 4. How many tasks are created in a stage?

The number of tasks in a stage generally depends on the number of partitions processed by that stage.

### Example

- Stage 1 processes 100 input partitions → approximately 100 tasks.
- A shuffle produces 200 downstream partitions.
- Stage 2 processes 200 shuffle partitions → approximately 200 tasks.

Thus, two stages can have different numbers of tasks.

The actual number may change because of partition pruning, AQE coalescing, and other optimizations.

## 5. Does every transformation create a new stage?

No. Multiple narrow transformations can execute within the same stage.

For example:

```python
from pyspark.sql.functions import col

result = (
    df.filter("age > 25")
      .select("name", "salary")
      .withColumn("bonus", col("salary") * 0.1)
)
```

These transformations can be pipelined together without introducing shuffle boundaries.

However, operations such as `groupBy()`, `distinct()`, `repartition()`, and joins requiring data redistribution can introduce shuffle boundaries and therefore additional stages.

## 6. Interview-ready Answer

> A Spark Stage is a collection of parallel tasks that can execute without requiring a shuffle between them. Spark's DAG Scheduler divides a job into stages based on shuffle dependencies. Narrow transformations are generally pipelined into the same stage, while wide transformations that require shuffling introduce stage boundaries. Each stage contains tasks that process individual partitions, and Spark schedules stages according to their dependencies.

### Key points to remember

- Job: Triggered by an action.
- Stage: Created based on shuffle boundaries.
- Task: Executes computation on a partition.
- Narrow transformations: Generally stay within the same stage.
- Shuffle dependencies: Introduce new stages.

Interview tip: A wide transformation does not always cause a shuffle. For example, if data is already partitioned appropriately for an operation, Spark may avoid redistribution.
