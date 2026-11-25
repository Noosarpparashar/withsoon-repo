# Does every Spark transformation create a new stage?

No. Every Spark transformation does not create a new stage.

Spark creates stages primarily based on shuffle dependencies (wide dependencies), not the number of transformations.

Multiple transformations with narrow dependencies can be combined into a single stage and executed together. A new stage is typically created when a shuffle is required to redistribute data across partitions.

## 1. How does Spark determine stage boundaries?

Spark transformations can be classified into two categories based on their dependencies.

| Narrow Transformations                                                     | Wide Transformations                                                     |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Each output partition depends on a small, fixed number of input partitions | Output partitions may depend on multiple input partitions                |
| Generally do not require a shuffle                                         | Generally require a shuffle                                              |
| Can be pipelined within the same stage                                     | Typically introduce a stage boundary                                     |
| Examples: `map()`, `filter()`, `select()`                                  | Examples: `repartition()`, `reduceByKey()`, `groupBy()` with aggregation |

Important: The actual physical execution plan determines whether a shuffle occurs. For example, a broadcast join can avoid shuffling the larger dataset.

## 2. Example 1: Multiple Transformations, Single Stage

```
rdd = sc.parallelize([1, 2, 3, 4, 5])

rdd1 = rdd.map(lambda x: x * 2)
rdd2 = rdd1.filter(lambda x: x > 5)
rdd3 = rdd2.map(lambda x: x + 10)

result = rdd3.collect()
```

Here, we have three transformations:

1. `map()`
2. `filter()`
3. `map()`

All three are narrow transformations.

[spark-reference:pipeline]

**No shuffle:** All three transformations can share a single pipelined stage.

Result: 3 transformations, 1 stage.

The transformations can be pipelined because no shuffle is required.

## 3. Example 2: Wide Transformation Creates a Stage Boundary

```
rdd = sc.parallelize([
    ("A", 10),
    ("B", 20),
    ("A", 30),
    ("B", 40)
])

rdd1 = rdd.map(lambda x: (x[0], x[1] * 2))
rdd2 = rdd1.filter(lambda x: x[1] > 30)
rdd3 = rdd2.reduceByKey(lambda a, b: a + b)

result = rdd3.collect()
```

[spark-reference:key-stages]

Result: 3 transformations, 2 stages.

The `reduceByKey()` operation introduces a shuffle dependency, creating a boundary between stages.

## 4. What happens internally?

When an action is triggered:

1. Spark determines the RDD dependencies required for the job.
2. The DAG Scheduler traverses the dependency graph.
3. Narrow dependencies are generally grouped into the same stage.
4. Shuffle dependencies introduce boundaries between stages.
5. The DAG Scheduler creates the necessary ShuffleMapStages and ResultStage.
6. The Task Scheduler schedules tasks from runnable stages on Executors.

Important: A transformation does not independently create a stage when it is defined. Stages are constructed during job scheduling.

For DataFrames, Catalyst and physical planning first determine the physical operators and required exchanges. Spark then schedules the resulting execution stages.

## 5. Important Interview Clarifications

| Question                                           | Answer                                                                                     |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Does every transformation create a stage?          | No                                                                                         |
| Does every action create exactly one stage?        | No                                                                                         |
| Can multiple transformations execute in one stage? | Yes                                                                                        |
| Can one transformation introduce multiple stages?  | Yes, depending on its physical execution plan                                              |
| Does every join create a shuffle?                  | No, broadcast and certain partition-compatible joins can avoid shuffling one or both sides |
| What primarily determines stage boundaries?        | Shuffle dependencies                                                                       |
| Who creates the stages?                            | DAG Scheduler                                                                              |

## 6. Interview-ready answer (45–60 seconds)

> No, every Spark transformation does not create a new stage. Spark creates stages primarily based on shuffle dependencies.
>
> Transformations such as map and filter have narrow dependencies and can generally be pipelined within a single stage.
>
> For example, if I apply map, filter, and another map transformation followed by collect, Spark can execute all three transformations within one stage because no shuffle is required.
>
> However, when a wide transformation such as reduceByKey or repartition introduces a shuffle, Spark creates a stage boundary.
>
> The DAG Scheduler analyzes the dependency graph, groups transformations with narrow dependencies, and creates separate stages at shuffle boundaries.
>
> Therefore, the number of stages depends on the dependency graph and physical execution requirements, not simply on the number of transformations.

Key takeaway: Narrow dependencies → Same stage where possible. Shuffle dependencies → New stage boundary.