# How can you reduce the number of stages?

The number of stages in Spark can be reduced primarily by minimizing unnecessary shuffle operations, since shuffle dependencies are the main reason Spark divides a job into multiple stages.

Spark groups compatible narrow transformations into the same stage, while shuffle dependencies generally create new stage boundaries.

Therefore, reducing unnecessary shuffles can reduce the number of stages and improve execution performance.

## 1. Techniques to Reduce the Number of Stages

### 1. Avoid Unnecessary Repartitioning

`repartition()` introduces a shuffle to redistribute data across partitions.

Repeated repartitioning can introduce additional shuffle boundaries.

Example:

```
# Potentially unnecessary shuffles
df1 = df.repartition(200, "customer_id")
df2 = df1.repartition(100, "region")
df2.write.parquet("output/")
```

If the intermediate repartitioning is unnecessary, we can simplify it:

```
# Only the required repartition
df1 = df.repartition(100, "region")
df1.write.parquet("output/")
```

This can eliminate an unnecessary shuffle stage.

Important: Catalyst may automatically eliminate redundant repartitions, so the physical plan must be checked to confirm the actual number of exchanges.

### 2. Use `coalesce()` Instead of `repartition()` When Appropriate

When reducing the number of partitions, `coalesce()` can avoid a full shuffle.

```
# Introduces a shuffle
df.repartition(10)
```

```
# Usually avoids a shuffle
df.coalesce(10)
```

By default, `coalesce()` uses a narrow dependency when reducing partitions.

This can eliminate a shuffle boundary compared with `repartition()`.

However, `coalesce()` does not guarantee balanced partitions and may reduce parallelism significantly.

### 3. Use Broadcast Joins

Large joins often require data shuffling, potentially creating multiple stages.

If one dataset is sufficiently small, a broadcast join can avoid shuffling the larger dataset.

Without a broadcast hint:

```
result = large_df.join(
    small_df,
    "customer_id"
)
```

Spark may choose a sort-merge join requiring shuffles on both sides.

With a broadcast hint:

```
from pyspark.sql.functions import broadcast

result = large_df.join(
    broadcast(small_df),
    "customer_id"
)
```

Spark can broadcast the smaller dataset to Executors and perform the join without repartitioning the larger dataset.

This may reduce shuffle stages.

Important: Broadcast joins still have a broadcast preparation step and may involve separate execution work. They do not guarantee a specific stage count.

### 4. Avoid Repeated Wide Transformations

Wide transformations such as `groupBy`, `distinct`, `orderBy`, and `repartition` can introduce shuffle dependencies.

Avoid unnecessary or repeated wide operations.

Example:

```
# Two separate aggregations
df1 = df.groupBy("department").sum("salary")
df2 = df1.groupBy("department").sum("sum(salary)")
```

If the requirement is simply total salary by department, one aggregation is sufficient.

```
from pyspark.sql import functions as F

result = df.groupBy("department").agg(
    F.sum("salary").alias("total_salary")
)
```

Eliminating the unnecessary second aggregation can reduce computation and potential shuffle stages.

Spark's optimizer may already simplify some redundant operations.

### 5. Preserve Existing Partitioning

If data is already partitioned by the required join or aggregation keys, Spark may avoid additional redistribution.

For example, two datasets with compatible partitioning on `customer_id` may be joined without repartitioning both sides.

This depends on their physical partitioning, Spark's ability to recognize that partitioning, and the selected join strategy.

### 6. Use Catalyst and Adaptive Query Execution (AQE)

Spark SQL automatically applies optimizations that can eliminate unnecessary operations or change how shuffles are performed.

Catalyst can remove redundant operations and select more efficient physical plans.

AQE uses runtime statistics to optimize the execution strategy, including converting eligible sort-merge joins into broadcast joins.

```
spark.conf.set(
    "spark.sql.adaptive.enabled",
    "true"
)
```

AQE can also coalesce post-shuffle partitions, reducing task counts and overhead. However, coalescing shuffle partitions does not necessarily reduce the number of stages.

## 2. Which Optimizations Actually Reduce Stages?

| Optimization                              | Can reduce stages? | Explanation                                                                |
| ----------------------------------------- | ------------------ | -------------------------------------------------------------------------- |
| Remove unnecessary `repartition()`        | Yes                | Eliminates potential shuffle boundaries                                    |
| Replace `repartition()` with `coalesce()` | Yes                | Can avoid a shuffle when reducing partitions                               |
| Use broadcast joins                       | Yes                | Can eliminate shuffle exchanges                                            |
| Remove unnecessary aggregations           | Yes                | Can eliminate shuffle dependencies                                         |
| Reuse compatible partitioning             | Yes                | Can avoid redundant redistribution                                         |
| Enable AQE                                | Sometimes          | May eliminate or change shuffle operations                                 |
| Filter data before shuffling              | Not necessarily    | Usually reduces data volume rather than stage count                        |
| Column pruning                            | Not necessarily    | Reduces columns processed                                                  |
| Increase Executor memory                  | No direct effect   | Improves resource availability but does not eliminate shuffle dependencies |
| Reduce `spark.sql.shuffle.partitions`     | No direct effect   | Changes partition/task counts, not necessarily stages                      |
| Cache DataFrames                          | Not necessarily    | Avoids recomputation but does not inherently eliminate shuffle boundaries  |

## 3. How to Verify Whether Stages Were Reduced

Use the Spark SQL physical execution plan:

```
df.explain("formatted")
```

Look for operators such as:

- `Exchange` — often indicates shuffle redistribution.
- `SortMergeJoin` — may require shuffled inputs.
- `BroadcastHashJoin` — may avoid shuffling the larger input.

You can also execute an action and inspect:

Spark UI → Jobs → Select Job → DAG Visualization

Compare the number of executed stages and shuffle operations before and after optimization.

## 4. Interview-ready Answer (60 seconds)

> In Apache Spark, stages are primarily created at shuffle boundaries. Therefore, the most effective way to reduce the number of stages is to minimize unnecessary shuffle operations.
>
> First, I avoid unnecessary repartitioning because repartition introduces a shuffle. When I only need to reduce partition counts, I consider coalesce, which can avoid a full shuffle.
>
> Second, I use broadcast joins when one dataset is sufficiently small, which can eliminate shuffle exchanges required by joins such as sort-merge joins.
>
> Third, I avoid redundant wide transformations such as repeated groupBy, distinct, or repartition operations.
>
> Fourth, I try to preserve existing data partitioning where possible so that Spark can avoid unnecessary redistribution.
>
> Finally, I use Catalyst optimization and Adaptive Query Execution to allow Spark to optimize the physical execution plan.
>
> I verify the improvements using `df.explain()` and the Spark UI to compare shuffle operations, stages, and execution time.

Key takeaway: Reduce unnecessary shuffles to reduce stages. However, fewer stages do not always mean faster execution. Sometimes an additional shuffle improves parallelism or data distribution enough to reduce overall execution time.