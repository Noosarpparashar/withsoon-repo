# What happens when a Spark executor dies?

When a Spark executor dies, Spark detects the failure, identifies the tasks and data lost on that executor, and reschedules the necessary computation on surviving or replacement executors.

Spark uses task retries, lineage-based recomputation, and shuffle recovery to continue processing without restarting the entire application.

## 1. Step-by-Step Executor Failure Recovery

### Step 1: Executor Failure Detection

- Executors periodically send heartbeats to the driver.
- If an executor crashes, the driver may detect it through missed heartbeats, connection loss, or cluster manager notifications.
- The driver marks the executor as lost.

### Step 2: Identify Lost Tasks and Data

Spark identifies:

- Tasks that were running on the failed executor.
- Cached RDD/DataFrame partitions stored on that executor.
- Shuffle files that may no longer be accessible.
- Broadcast block replicas that might have been lost.

### Step 3: Reschedule Failed Tasks

- The TaskScheduler marks affected running tasks as failed.
- Spark reschedules the tasks on available executors.
- Depending on the cluster manager and configuration, a replacement executor may be launched.

### Step 4: Recover Lost Data

Recovery depends on the type of lost data.

| Lost data             | Recovery mechanism                                              |
| --------------------- | --------------------------------------------------------------- |
| Running tasks         | Retry on another executor                                       |
| Cached RDD partitions | Recompute using lineage                                         |
| Shuffle outputs       | Fetch surviving copies or recompute missing shuffle-map outputs |
| Broadcast blocks      | Retrieve from another available copy or source                  |
| Checkpointed data     | Read from reliable checkpoint storage                           |

### Step 5: Continue Execution

After required tasks and data are recovered, Spark continues the job.

If retries are exhausted or required source data is unavailable, the job may fail.

## 2. Example: Executor Failure

Suppose a Spark application has 3 executors processing 6 partitions.

[spark-executor-loss]

In this scenario, tasks associated with P3 and P4 can be rescheduled on other executors. Spark does not necessarily rerun P1, P2, P5, and P6.

## 3. What Happens If the Executor Holds Shuffle Data?

This is an important interview scenario.

Consider:

```
df = spark.read.parquet("sales.parquet")
result = df.groupBy("region").sum("amount")

result.show()
```

Spark might execute:

[spark-lost-shuffle]

Important: Losing an executor does not always mean its shuffle data is lost. An external shuffle service can keep serving local shuffle files after an executor process exits if the host and files remain available. Reliable shuffle storage can also preserve outputs, depending on the deployment. Shuffle tracking instead tries to keep executors holding needed shuffle data alive during dynamic allocation; it does not preserve their local files after a crash.

## 4. What Happens to Cached Data?

Suppose:

```
df = spark.read.parquet("sales.parquet")
cached_df = df.filter("amount > 1000").cache()

cached_df.count()
```

If the executor holding a cached partition dies:

1. Spark loses the cached copy stored on that executor.
2. When the partition is needed again, Spark checks whether another replica exists.
3. If no replica is available, Spark recomputes the partition using lineage.
4. The recomputed partition may be cached on another executor.

Caching improves performance but does not guarantee that cached data survives executor failures.

## 5. Does Spark Automatically Launch a New Executor?

Not always. It depends on the cluster manager and configuration.

| Deployment         | Possible behavior                                                         |
| ------------------ | ------------------------------------------------------------------------- |
| YARN               | Requests replacement executors when resources and configuration permit    |
| Kubernetes         | Can create replacement executor pods                                      |
| Standalone         | May launch replacement executors when workers and resources are available |
| Dynamic Allocation | Adjusts executor allocation according to workload and configuration       |

Spark may continue using surviving executors even if no immediate replacement is available.

## 6. Can an Executor Failure Cause the Entire Job to Fail?

Yes, under certain conditions:

- Task failures exceed `spark.task.maxFailures`.
- Stage attempts exceed their configured limit.
- Too many executors fail.
- Required source data cannot be recovered.
- The application loses essential non-recoverable state.
- Cluster resources are insufficient to continue.

An executor failure is therefore recoverable in many cases, but not guaranteed to be recoverable.

## Interview-ready Answer

> When a Spark executor dies, the driver detects the failure through heartbeat timeouts or cluster manager notifications.
>
> The TaskScheduler identifies running tasks that were lost and reschedules them on available executors. If cached partitions were lost, Spark uses lineage to recompute them.
>
> If the failed executor held shuffle data that is no longer accessible, the DAGScheduler may rerun the necessary upstream shuffle-map tasks and retry affected downstream stages.
>
> Depending on the cluster manager, Spark may also request a replacement executor.

Key takeaway: An executor failure generally causes partial recomputation and task rescheduling, not a complete Spark application restart.