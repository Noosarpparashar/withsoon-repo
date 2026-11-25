# What is lazy evaluation in Spark?

Lazy evaluation in Apache Spark is an execution strategy where transformations are not executed immediately. Instead, Spark records the transformations and builds a computation plan, which is executed only when an action is triggered.

This allows Spark to optimize the execution plan, combine compatible operations, and avoid unnecessary computation.

## 1. How does Lazy Evaluation work?

Consider the following PySpark example:

```
df = spark.read.parquet("s3://bucket/sales/")
df1 = df.filter("amount > 1000")               # Transformation
df2 = df1.select("customer_id", "amount")      # Transformation
df3 = df2.groupBy("customer_id").sum("amount") # Transformation

df3.show()  # Action
```

### Step-by-step explanation

**Step 1: Read the data**

`spark.read.parquet()` creates a DataFrame and obtains the metadata needed for planning. It does not normally read and process the entire dataset at this point.

**Step 2: Define transformations**

Operations such as `filter()`, `select()`, and `groupBy().sum()` describe how Spark should process the data.

The actual distributed computation is deferred.

**Step 3: Build the execution plan**

Spark constructs a logical representation of the transformations and their dependencies.

**Step 4: Trigger an action**

When `show()` is called, Spark prepares the optimized execution plan and triggers the required computation.

**Step 5: Execute distributed tasks**

Spark divides the computation into jobs, stages, and tasks, which are scheduled across Executors.

## 2. Lazy Evaluation Execution Flow

[spark-reference:lazy]

## 3. Why does Spark use Lazy Evaluation?

### A. Query Optimization

Lazy evaluation allows Spark to examine the complete sequence of operations before execution.

For DataFrames and Spark SQL, Catalyst can apply optimizations such as:

- Predicate pushdown.
- Column pruning.
- Constant folding.
- Join reordering.
- Appropriate physical operator selection.

Example:

```
df = spark.read.parquet("sales/")

result = (
    df.select("customer_id", "amount", "region")
      .filter("amount > 1000")
      .select("customer_id")
)

result.show()
```

Spark may optimize this query to read only the columns required for the final computation.

Since `region` is not needed, Spark can eliminate it from the required columns. Because `amount` is needed for filtering, it cannot simply be removed from the scan.

### B. Avoiding Unnecessary Computation

Spark does not need to execute transformations whose results are never requested.

```
df1 = df.filter("amount > 1000")
df2 = df.filter("amount > 5000")

df2.count()
```

Here, `df1` is not used by the action.

Therefore, Spark does not execute the computation represented by `df1`.

### C. Pipelining Transformations

Spark can combine compatible transformations into a single execution stage.

For example:

```
rdd = sc.parallelize([1, 2, 3, 4])

result = (
    rdd.map(lambda x: x * 2)
       .filter(lambda x: x > 4)
       .collect()
)
```

The `map()` and `filter()` transformations can be pipelined within the same stage rather than requiring separate distributed jobs.

This reduces unnecessary intermediate materialization and scheduling overhead.

### D. Efficient Resource Utilization

By deferring execution, Spark can organize operations into an execution plan and schedule tasks according to available resources.

This helps reduce unnecessary work and can improve performance for complex processing pipelines.

### E. Fault Tolerance

RDD transformations establish dependency information called lineage.

Spark uses these dependencies to determine how partitions can be recomputed after certain failures.

Lazy evaluation and lineage are related concepts, but they serve different purposes:

- Lazy evaluation determines when computation executes.
- Lineage records how data is derived and can be recomputed.

## 4. Lazy Evaluation in RDD vs DataFrame

Both RDDs and DataFrames follow lazy evaluation, but their optimization capabilities differ.

| RDD                                                            | DataFrame                                                  |
| -------------------------------------------------------------- | ---------------------------------------------------------- |
| Transformations are lazy                                       | Transformations are lazy                                   |
| Tracks RDD lineage and dependencies                            | Builds logical and physical query plans                    |
| Supports pipelining of compatible transformations              | Uses Catalyst for query optimization                       |
| Does not automatically optimize arbitrary transformation logic | Can optimize filters, projections, joins, and aggregations |
| Executes when an action is triggered                           | Executes when an action is triggered                       |

Important: Lazy evaluation does not mean every RDD transformation receives Catalyst optimization. Catalyst primarily optimizes Spark SQL and DataFrame/Dataset operations.

## 5. Does every Action execute all previous transformations?

Not necessarily.

Spark executes only the computation required to satisfy the action, subject to the chosen execution plan.

Example:

```
df = spark.read.parquet("sales/")
df1 = df.filter("amount > 1000")
df2 = df1.select("customer_id")

df2.count()
```

Spark needs the filter condition to determine how many records qualify.

However, it does not necessarily need to materialize the `customer_id` column because the action only requires a count.

The optimizer can eliminate unnecessary work.

Also, repeated actions on uncached datasets may cause repeated computation.

```
df1.count()  # First action
df1.show()   # Second action
```

Unless Spark can reuse cached or materialized results, it may recompute the required transformations.

## 6. Interview-ready answer (60 seconds)

> Lazy evaluation in Apache Spark means that transformations are not executed immediately when they are defined. Instead, Spark records the transformations and their dependencies and defers computation until an action is triggered.
>
> For example, if I apply filter, select, and groupBy operations on a DataFrame, Spark builds the required computation plan but does not immediately process the entire dataset. When I call an action such as count, show, or write, Spark executes the necessary operations.
>
> The main advantage of lazy evaluation is optimization. Since Spark can examine the complete computation before execution, Catalyst can apply techniques such as predicate pushdown, column pruning, and join optimization.
>
> Lazy evaluation also enables Spark to pipeline compatible transformations, avoid unnecessary computations, and efficiently organize distributed execution.
>
> One important distinction is that lazy evaluation controls when computation happens, whereas lineage tracks dependencies and supports fault recovery.

Key takeaway: Lazy Evaluation = Define transformations now, optimize the computation, and execute when an action is triggered.