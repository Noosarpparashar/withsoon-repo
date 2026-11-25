# How does Spark handle fault tolerance?

Apache Spark handles fault tolerance primarily through lineage-based recomputation, task retries, stage retries, checkpointing, and recovery mechanisms for executor and driver failures.

Spark is designed to recover from failures without restarting the entire application whenever possible.

## 1. Fault Tolerance Mechanisms in Spark

| Mechanism                               | Purpose                                                           |
| --------------------------------------- | ----------------------------------------------------------------- |
| Lineage                                 | Recomputes lost RDD partitions using transformation dependencies  |
| Task Retry                              | Re-executes failed tasks on available executors                   |
| Stage Retry                             | Re-executes necessary stages when shuffle data is lost            |
| Checkpointing                           | Stores data in reliable storage and truncates lineage             |
| Persistence / Replication               | Stores intermediate data for reuse and can replicate partitions   |
| Executor Recovery                       | Reschedules tasks when executors fail                             |
| Driver Recovery                         | Can restart an application with appropriate cluster configuration |
| Write-Ahead Log / Streaming Checkpoints | Helps recover streaming state and processing progress             |

## 2. How Spark Recovers from Different Failures

### A. Task Failure

Suppose a Spark stage contains 100 tasks, and Task 45 fails.

Spark generally retries only the failed task rather than restarting all 100 tasks.

[spark-task-retry]

Spark's `spark.task.maxFailures` configuration controls how many failures of a particular task are allowed before the job is aborted.

The default value is typically 4.

```
spark.conf.get("spark.task.maxFailures")
```

This setting is usually configured through `spark-submit` or `SparkConf`, rather than changed dynamically during execution.

### B. Executor Failure

Suppose Spark runs on four executors and Executor 2 crashes.

[spark-executor-recovery]

When an executor fails:

1. Spark detects the executor failure.
2. Tasks running on that executor are marked as failed.
3. Cached partitions on the failed executor may be lost.
4. Spark uses lineage to recompute required partitions.
5. Necessary tasks are scheduled on other available executors or replacement executors.

Important: Spark may need to recompute lost shuffle outputs even if some upstream tasks previously completed successfully.

### C. Shuffle Failure

Shuffle failures are particularly important because wide transformations redistribute data across executors.

Consider:

```
df = spark.read.parquet("sales.parquet")

result = (
    df.groupBy("region")
      .sum("amount")
)

result.show()
```

A simplified execution plan:

[spark-shuffle-recovery]

If an executor containing shuffle outputs crashes, downstream tasks may encounter missing shuffle blocks.

Spark can then:

1. Detect a shuffle fetch failure.
2. Identify missing shuffle-map outputs.
3. Resubmit the necessary shuffle-map stage tasks.
4. Retry the affected downstream stage.

This is one reason wide transformations can be more expensive to recover than narrow transformations.

### D. Driver Failure

Driver failure is different from executor failure.

The driver maintains critical application state, including task scheduling and job coordination.

If the driver fails, the Spark application generally terminates unless an external recovery or restart mechanism is configured.

Depending on the deployment environment, recovery options include:

- Spark Standalone cluster deploy mode with driver supervision.
- Kubernetes application restart mechanisms.
- YARN application retry mechanisms.
- Structured Streaming checkpoint recovery after restarting the application.

Driver recovery is not the same as lineage recovery. Restarting the driver does not automatically restore the full in-memory state of the previous driver process.

## 3. Checkpointing for Fault Tolerance

Checkpointing writes intermediate data to reliable storage so Spark does not need to recompute the entire lineage chain.

```
sc.setCheckpointDir(
    "s3a://my-bucket/spark-checkpoints/"
)

rdd = sc.parallelize(range(1000))
rdd2 = rdd.map(lambda x: x * 2)
rdd2.checkpoint()
rdd2.count()
```

After successful checkpointing, Spark can recover the checkpointed data without recomputing its earlier lineage.

For Structured Streaming, checkpointing also stores information such as progress and state needed for recovery.

```
query = (
    df.writeStream
      .format("parquet")
      .option("path", "s3a://bucket/output/")
      .option(
          "checkpointLocation",
          "s3a://bucket/checkpoints/"
      )
      .start()
)
```

A restarted streaming query can use its checkpoint to resume processing, subject to source, sink, and configuration compatibility.

## 4. Fault Tolerance vs Data Replication

| Lineage-based recovery                        | Replication-based recovery                      |
| --------------------------------------------- | ----------------------------------------------- |
| Recomputes lost partitions                    | Uses existing replicated copies                 |
| Generally saves storage resources             | Requires additional storage                     |
| Recovery consumes computation                 | Recovery may be faster                          |
| Used extensively in Spark RDD processing      | Available through replicated persistence levels |
| Requires accessible source or checkpoint data | Requires surviving replicas                     |

Spark primarily relies on recomputation for lost intermediate data, although it can also replicate cached data.

For example:

```
from pyspark import StorageLevel

rdd.persist(StorageLevel.MEMORY_ONLY_2)
```

This stores two replicas of each cached partition, subject to available resources.

## 5. Important Interview Scenario

Question: A Spark job has 10 stages. Stage 8 fails because one executor crashes. Will Spark restart from Stage 1?

Answer: Not necessarily.

Spark examines the failure and determines what must be recomputed.

- If only a task fails, Spark typically retries that task.
- If required shuffle data is lost, Spark may rerun tasks from an earlier shuffle-map stage.
- If cached data is lost, Spark can regenerate it through lineage.
- If source data is unavailable or retries are exhausted, the job may fail.

Spark does not automatically restart every stage from the beginning.

## Interview-ready Answer

> Apache Spark provides fault tolerance through lineage, task retries, stage retries, checkpointing, and executor failure recovery.
>
> When a task fails, Spark reschedules it on an available executor. When an executor fails, Spark identifies lost tasks and intermediate partitions, then uses lineage to recompute the necessary data.
>
> For shuffle failures, Spark may rerun upstream shuffle-map tasks and retry downstream stages.
>
> Checkpointing helps recover data without recomputing long lineage chains, while driver recovery depends on the deployment environment and restart configuration.
>
> The key distinction is that Spark can automatically recover from many task and executor failures, but driver failures generally require an application restart mechanism.
