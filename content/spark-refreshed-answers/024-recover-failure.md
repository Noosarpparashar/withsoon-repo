# How does Spark recover from a failure?

Apache Spark recovers from failures using task retries, lineage-based recomputation, stage retries, and checkpointing.

When a task or executor fails, Spark identifies the affected computation and reschedules the necessary tasks rather than restarting the entire job.

## 1. Step-by-Step Failure Recovery Process

### Step 1: Failure Detection

- The driver detects task or executor failures through status updates, heartbeat timeouts, or lost executor notifications.
- The TaskScheduler and DAGScheduler coordinate recovery depending on the type of failure.

### Step 2: Identify the Failed Tasks

- Spark determines which tasks failed or were running on the failed executor.
- It also identifies any lost cached partitions or shuffle outputs.

### Step 3: Examine Lineage

- Spark uses the RDD lineage graph to identify dependencies between partitions.
- It determines which upstream data and transformations are required for recomputation.

### Step 4: Reschedule Tasks

- The TaskScheduler schedules replacement tasks on available executors.
- If shuffle outputs are missing, the DAGScheduler may resubmit upstream shuffle-map tasks.

### Step 5: Recompute Lost Data

- Spark executes the necessary transformations using available source or intermediate data.
- Unaffected completed work generally does not need to be repeated.

### Step 6: Resume Execution

- Once the missing data is regenerated, Spark continues processing dependent tasks.
- If recovery attempts exceed configured limits, the job fails.

## 2. Example: Executor Failure

Suppose a Spark application has three executors, each processing different partitions.

```python
rdd = sc.parallelize(range(1, 13), 3)
rdd2 = rdd.map(lambda x: x * 2)
rdd3 = rdd2.filter(lambda x: x > 10)

rdd3.collect()
```

Assume Executor 2 fails while processing Partition 2.

[spark-failure-recovery]

In this example, Spark can recompute the affected partition without reprocessing the other two partitions, provided their results are still available and valid.

## 3. Recovery Depends on the Failure Type

| Failure type | Spark recovery mechanism |
| --- | --- |
| Task failure | Retries the failed task |
| Executor failure | Reschedules tasks and recomputes lost partitions |
| Cached partition loss | Recomputes the partition using lineage |
| Shuffle data loss | Reruns necessary shuffle-map tasks and downstream tasks |
| Long lineage | Uses checkpointed data, if available |
| Driver failure | Usually requires an externally managed application restart |
| Structured Streaming failure | Restarts using checkpointed progress/state when configured |

## 4. Important Spark Configurations

```ini
# Maximum task failures before aborting a task set
spark.task.maxFailures=4

# Maximum consecutive stage attempts
spark.stage.maxConsecutiveAttempts=4

# Executor heartbeat interval
spark.executor.heartbeatInterval=10s

# Network timeout used for detecting communication failures
spark.network.timeout=120s
```

These values are common defaults; actual behavior depends on Spark version and deployment configuration.

## 5. Important Interview Point

### Does Spark always restart a failed stage?

No. Spark distinguishes between task failures and failures involving missing intermediate data.

- A normal task failure generally triggers a retry of that task.
- A shuffle fetch failure may require rerunning tasks from an upstream shuffle-map stage.
- An executor failure can cause several tasks to be rescheduled.

Recovery is dependency-aware, meaning Spark tries to redo only the work necessary to produce valid results.

## Interview-ready Answer

> Apache Spark recovers from failures by detecting failed tasks or executors, identifying affected partitions, and rescheduling the necessary computation.
>
> Spark uses lineage to determine how lost partitions can be regenerated from source or intermediate data. Failed tasks are retried on available executors, while missing shuffle data may require upstream stages to be partially re-executed.
>
> Checkpointing can reduce recomputation by providing a reliable recovery point.

Key takeaway: Spark generally recovers by recomputing and retrying only the affected work, rather than restarting the entire application.