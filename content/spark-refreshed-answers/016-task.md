# What is a Spark task?

A Spark Task is the smallest unit of execution in Apache Spark. It represents the computation performed on a single partition of data within a stage.

Spark divides each stage into multiple tasks, which execute in parallel across available executor cores.

Key concept: Generally, one partition in a stage corresponds to one task.

## 1. How are Spark Tasks created?

When a Spark action is triggered:

1. The DAG Scheduler divides the job into stages based on shuffle dependencies.
2. Each stage is divided into tasks based on the number of partitions.
3. The Task Scheduler schedules those tasks on available executors.
4. Executors execute the tasks using their available CPU cores.
5. Task results or shuffle outputs are passed to subsequent stages or returned to the driver, depending on the operation.

## 2. Example: Spark Tasks in Action

```
df = spark.read.parquet("s3://bucket/sales/")
df = df.repartition(4)
df = df.filter(df.amount > 1000)

df.count()
```

After `repartition(4)`, the downstream DataFrame has four partitions.

The stage processing those four partitions will typically contain 4 tasks.

[spark-task-execution]

## 3. What determines the number of tasks?

The number of tasks in a stage is generally equal to the number of partitions processed by that stage.

| Partitions | Tasks in stage | Available task slots | Execution waves |
| ---------- | -------------- | -------------------- | --------------- |
| 4          | 4              | 4                    | 1               |
| 10         | 10             | 5                    | 2               |
| 100        | 100            | 20                   | 5               |
| 1,000      | 1,000          | 100                  | 10              |

These are idealized examples assuming equal task durations, no retries, and one core per task.

Important: More tasks do not necessarily mean faster execution. Too many tasks can increase scheduling overhead, while too few can underutilize the cluster.

## 4. Types of Spark Tasks

Spark has two primary task types:

| Task type      | Responsibility                                                                      |
| -------------- | ----------------------------------------------------------------------------------- |
| ShuffleMapTask | Processes a partition and produces intermediate shuffle data for downstream stages. |
| ResultTask     | Processes a partition and produces results for the final stage of an RDD job.       |

In Spark SQL, execution often uses shuffle-map tasks, including for writing final outputs.

## 5. What happens if a Spark Task fails?

Spark provides fault tolerance at the task level.

For example:

1. A task fails due to an executor error.
2. Spark attempts to execute the failed task again, usually on an available executor.
3. If the failure persists beyond the configured retry limit, Spark may fail the stage and job.
4. Successful tasks generally do not need to be recomputed, unless their outputs are lost or dependencies must be recomputed.

Spark also supports speculative execution, which can launch a duplicate attempt of a slow-running task when enabled.

## 6. Difference Between Job, Stage, and Task

| Component   | Job                              | Stage                                   | Task                                  |
| ----------- | -------------------------------- | --------------------------------------- | ------------------------------------- |
| Trigger     | Action                           | Stage dependencies / shuffle boundaries | Partitions                            |
| Scheduling  | Spark execution engine           | DAG Scheduler                           | Task Scheduler                        |
| Execution   | One or more stages               | Multiple tasks                          | Runs on an executor                   |
| Parallelism | Across tasks and eligible stages | Tasks execute in parallel               | One task attempt uses allocated cores |
| Granularity | Highest                          | Intermediate                            | Smallest                              |

## 7. Interview-ready Answer

> A Spark Task is the smallest unit of execution in Spark. Each task processes one partition of data within a stage and runs on an executor. The DAG Scheduler creates stages and their tasks, while the Task Scheduler assigns tasks to executors based on available resources and scheduling constraints. The number of tasks in a stage is generally determined by the number of partitions, and tasks execute in parallel subject to the available executor cores.

Key points to remember:

- 1 partition → 1 task per stage (generally).
- A task executes on an executor.
- A task can perform multiple pipelined transformations.
- Executor cores and `spark.task.cpus` determine task concurrency.
- Failed tasks can be retried.
- A task is an execution unit, not a separate process.

Common interview trap: If you have 100 partitions but only 10 available task slots, Spark still creates approximately 100 tasks for that stage. Only 10 can execute simultaneously, so the tasks run in multiple waves.
