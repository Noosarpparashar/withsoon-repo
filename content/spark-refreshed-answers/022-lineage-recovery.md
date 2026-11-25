# How does lineage provide fault tolerance?

Lineage provides fault tolerance in Spark by allowing lost partitions to be recomputed using the sequence of transformations that originally created them.

Instead of storing multiple copies of every intermediate result, Spark maintains a dependency graph (lineage) that describes how each RDD was derived from its parent RDDs.

If an executor fails and some partitions are lost, Spark uses this lineage to reconstruct the missing data.

## 1. Example

```python
rdd1 = sc.parallelize([1, 2, 3, 4, 5, 6], 3)
rdd2 = rdd1.map(lambda x: x * 2)
rdd3 = rdd2.filter(lambda x: x > 5)

rdd3.collect()
# [6, 8, 10, 12]
```

Assume Spark distributes the data across three partitions:

[spark-lineage-recovery]

## 2. What Happens Internally When an Executor Fails?

1. Executor failure detected: The driver identifies an executor failure through cluster manager or executor communication.
2. Lost data identified: Spark determines which cached partitions or shuffle outputs were lost.
3. Lineage examined: Spark identifies the parent RDD partitions and transformations needed to regenerate missing data.
4. Tasks rescheduled: The scheduler launches replacement tasks on available executors.
5. Data recomputed: Spark re-executes the necessary transformations.
6. Processing continues: Once the required data is recovered, dependent computations proceed.

## 3. Narrow vs Wide Dependencies During Recovery

| Narrow dependency | Wide dependency |
| --- | --- |
| Typically recomputes only the required parent partition chain | May need to regenerate lost shuffle-map outputs used by multiple downstream partitions |
| Recovery is usually simpler | Recovery may require rerunning tasks in an earlier stage |
| Example: `map()`, `filter()` | Example: `groupByKey()`, `reduceByKey()` |

Important: Spark cannot always recover every failure using lineage alone. The original source or checkpoint data must remain accessible. For example, if a non-recoverable source is permanently lost, lineage cannot recreate its contents.

## 4. Why Doesn't Spark Simply Replicate Every Intermediate Result?

Replicating every intermediate dataset would increase memory, storage, and network overhead significantly.

Instead, Spark relies on:

- Lineage: Recomputes lost data when necessary.
- Caching/Persistence: Reuses computed data, with optional replication depending on the storage level.
- Checkpointing: Saves data to reliable storage and truncates lineage.
- Task retry: Reruns failed tasks on available executors.

## Interview-ready Answer

> Spark provides fault tolerance through lineage by maintaining the dependency graph of transformations used to create each RDD.
>
> When an executor fails and a partition is lost, Spark identifies the missing partition, traces its dependencies through lineage, and reschedules the necessary tasks to recompute it from available source or intermediate data.
>
> For narrow transformations, Spark can usually recompute only the affected partition chain. For wide transformations, recovering lost shuffle data may require rerunning upstream tasks.

Key takeaway: Spark's lineage-based fault tolerance allows it to recover lost intermediate data through recomputation without replicating every intermediate result.