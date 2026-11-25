# Which Spark UI metrics and execution-plan details would you inspect first?

When debugging a slow Spark job, I focus on identifying the slowest stage, understanding why its tasks are slow, and checking the physical execution plan.

I prioritize the following five areas.

## 1. Spark UI: Stages tab (first priority)

I start with the Stages tab because it helps identify where execution time is being spent.

| Metric                         | What I look for                                             | Possible problem                     |
| ------------------------------ | ----------------------------------------------------------- | ------------------------------------ |
| Stage duration                 | Which stage takes the most time?                            | Main bottleneck                      |
| Task duration (median vs. max) | Are a few tasks much slower?                                | Data skew or stragglers              |
| Shuffle read                   | Are tasks reading large amounts of shuffled data?           | Expensive joins or aggregations      |
| Shuffle write                  | Is the stage generating excessive intermediate data?        | Unnecessary redistribution           |
| Spill (memory/disk)            | Are tasks spilling substantial data?                        | Memory pressure or large partitions  |
| GC time                        | Is garbage collection consuming significant execution time? | Memory pressure                      |
| Input size / records           | Are partitions highly uneven?                               | Skew or inefficient partitioning     |
| Number of tasks                | Are there too few or too many tasks?                        | Insufficient parallelism or overhead |

Example:

Suppose a stage contains 500 tasks:

- 490 finish within 15 seconds.
- 9 finish within 30 seconds.
- 1 takes 12 minutes.

I would investigate the last task's shuffle-read size, spill, and input distribution before increasing the number of executors.

## 2. Spark UI: SQL tab

For DataFrame and Spark SQL workloads, the SQL tab is especially useful.

I inspect the SQL execution graph to identify which operators consume the most time or process the most data.

I pay particular attention to:

- `Exchange`: Check the exchange type; a shuffle exchange redistributes data, while `BroadcastExchange` distributes a broadcast relation.
- `SortMergeJoin`: Check whether Spark is unnecessarily shuffling and sorting a large dataset.
- `BroadcastHashJoin`: Check whether broadcasting is appropriate and whether the build side is small enough.
- `HashAggregate` / `SortAggregate`: Identify expensive groupings and high-cardinality aggregations.
- `Scan`: Check how many bytes and files are read and whether pruning works.
- `Sort`: Identify expensive sorting operations.

An expensive operator isn't automatically inefficient; I compare its metrics with the amount of data processed.

## 3. Spark UI: Executors tab

Here I investigate whether the problem is related to resource availability or executor instability.

| Metric                    | What it tells me                                         |
| ------------------------- | -------------------------------------------------------- |
| Active tasks / cores      | Whether available executor slots are being used          |
| Total tasks and task time | Whether work is distributed evenly across executors      |
| GC time                   | Whether garbage collection is consuming significant time |
| Failed tasks              | Whether tasks are repeatedly failing or retrying         |
| Executor losses           | Whether workers are being lost                           |
| Storage memory            | Whether cached data is consuming executor memory         |

I also inspect scheduler delay and shuffle fetch wait time in the stage details. High scheduler delay can indicate scheduling overhead or resource delays; high fetch wait time suggests tasks are blocked waiting for remote shuffle data.
## 4. Physical execution plan: What I inspect

I use:

```python
df.explain("formatted")
```

For optimizer statistics:

```python
df.explain("cost")
```

Consider this simplified physical plan:

```text
AdaptiveSparkPlan
  +- SortMergeJoin [customer_id]
      :- Sort
      :   +- Exchange hashpartitioning(customer_id, 200)
      :       +- Filter
      :           +- FileScan parquet [orders]
      +- Sort
          +- Exchange hashpartitioning(customer_id, 200)
              +- FileScan parquet [customers]
```

My investigation:

| Plan detail              | Question I ask                                      |
| ------------------------ | --------------------------------------------------- |
| `FileScan` / `BatchScan` | Are we scanning unnecessary files or columns?       |
| `PartitionFilters`       | Is partition pruning happening?                     |
| `PushedFilters`          | Are supported filters pushed into the data source?  |
| `Exchange`               | Why is data being shuffled?                         |
| `SortMergeJoin`          | Could a broadcast join be more efficient?           |
| `HashAggregate`          | Is grouping generating excessive intermediate data? |
| `BroadcastExchange`      | Is broadcast construction costly or oversized?      |
| `AdaptiveSparkPlan`      | Did AQE optimize the plan at runtime?               |

**Important:** I compare estimated row counts and sizes against actual runtime statistics. Incorrect statistics can cause Spark to select inefficient join strategies. I also inspect the final adaptive plan rather than relying only on the initial physical plan.
## 5. Map the metrics to the root cause

This is how I connect Spark UI observations to actual debugging actions.

| Symptom                                       | First investigation                            |
| --------------------------------------------- | ---------------------------------------------- |
| Max task duration much greater than median    | Skewed partitions, uneven input, or stragglers |
| High shuffle read and remote fetch wait       | Network/shuffle bottleneck                     |
| High spill and GC time                        | Memory pressure or oversized tasks             |
| Many small tasks with tiny input sizes        | Excessive partitioning or small-file overhead  |
| Very few tasks relative to available cores    | Insufficient parallelism                       |
| Large scans despite selective filters         | Missing pruning or ineffective pushdown        |
| Large sort-merge join involving a small table | Broadcast feasibility and statistics           |
| Increasing task failures and lost executors   | Logs, OOM, disk, or cluster instability        |

## Interview-ready answer

> I would first open the Spark UI and identify the slowest stage. Within that stage, I would compare median and maximum task duration, shuffle read/write, memory and disk spill, garbage collection time, and task counts.
>
> Then I would inspect the SQL physical plan, focusing on Exchange, SortMergeJoin, BroadcastHashJoin, aggregation, and scan operators.
>
> I would specifically check whether partition pruning and predicate pushdown are occurring, whether Spark has selected an appropriate join strategy, and whether Adaptive Query Execution has optimized skewed partitions.
>
> Finally, I would correlate these observations with executor metrics, scheduler delays, and cluster utilization to distinguish query inefficiency from resource bottlenecks.

**The five metrics I would prioritize first:** stage duration, task-duration distribution, shuffle read/write, spill, and GC time. They usually provide a strong starting point for identifying performance bottlenecks.