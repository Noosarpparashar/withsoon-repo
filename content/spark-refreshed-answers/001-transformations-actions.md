# What are transformations and actions in Spark?

In Apache Spark, operations are broadly classified into Transformations and Actions.
- Transformations: Operations that create a new RDD, DataFrame, or Dataset from an existing one without immediately executing the computation.
- Actions: Operations that trigger Spark execution and either return results to the Driver, display results, or write data to external storage.
The fundamental difference is that transformations are lazy, whereas actions trigger actual computation.

## 1. What are Transformations?
A transformation is an operation that defines how data should be processed and produces a new distributed dataset.

Transformations follow lazy evaluation, meaning Spark records the required computation instead of immediately executing it.
### Common Transformations

| Transformation | Description |
| --- | --- |
| map() | Applies a function to every RDD element |
| flatMap() | Maps each element to zero or more output elements |
| filter() | Selects records based on a condition |
| select() | Selects specified DataFrame columns |
| withColumn() | Adds or replaces a DataFrame column |
| distinct() | Removes duplicate records |
| union() | Combines two compatible datasets |
| join() | Combines datasets based on join conditions |
| groupBy() | Defines a grouped aggregation |
| reduceByKey() | Aggregates values for each key in a pair RDD |
| repartition() | Redistributes data into a specified number of partitions |
| coalesce() | Changes the number of partitions, commonly reducing them |

### Example

```python
df = spark.read.parquet("s3://bucket/sales/")
df1 = df.filter("amount > 1000")
df2 = df1.select("customer_id", "amount")
df3 = df2.groupBy("customer_id").sum("amount")
```

In this example:
- filter() defines a filtering transformation.
- select() defines a projection.
- groupBy().sum() defines an aggregation.
No distributed processing of the complete dataset has been triggered yet. Spark constructs the necessary execution plan.

Some metadata inspection and planning may still occur before an action.
## 2. What are Actions?
An action is an operation that triggers Spark to execute the computation described by previous transformations.

Actions typically return results to the Driver or write results to an external system.
### Common Actions

| Action | Description |
| --- | --- |
| count() | Returns the number of records |
| collect() | Returns all records to the Driver |
| show() | Displays a specified number of DataFrame rows |
| first() | Returns the first record |
| take(n) | Returns up to n records |
| head(n) | Returns the first n records |
| reduce() | Aggregates RDD elements into a single result |
| foreach() | Applies a function to each RDD element during execution |
| saveAsTextFile() | Writes an RDD to storage |
| write.parquet() | Executes a DataFrame write to Parquet |
| write.save() | Executes a DataFrame write to a supported destination |

### Example

```python
df3.show()
```

When show() is executed, Spark triggers computation.

Conceptually:
1. Spark finalizes the required execution plan.
2. Spark creates the necessary jobs and stages.
3. Tasks are scheduled on Executors.
4. Executors process the required partitions.
5. Results are returned for display.
An action can trigger one or more Spark jobs, depending on the execution plan.

## 3. Transformation vs Action — Example

```python
rdd = sc.parallelize([1, 2, 3, 4, 5])
rdd2 = rdd.map(lambda x: x * 2)     # Transformation
rdd3 = rdd2.filter(lambda x: x > 5) # Transformation

result = rdd3.collect()             # Action
print(result)
```

Output:

```python
[6, 8, 10]
```

[spark-reference:transformations]

Although the transformations are defined first, Spark actually processes their data when collect() is invoked.
## 4. Difference Between Transformations and Actions

| Feature | Transformations | Actions |
| --- | --- | --- |
| Purpose | Define data processing operations | Trigger computation |
| Execution | Lazy | Triggers execution |
| Output | New RDD, DataFrame, or Dataset | Result, output, or side effect |
| Job creation | Usually does not trigger a job | Can trigger one or more jobs |
| Examples | map, filter, select, join | count, collect, show, write |
| Data processing | Generally deferred | Executes required transformations |
| Return to Driver | Usually returns a distributed dataset reference | May return values or records to the Driver |

## 5. Important Interview Points
### A. Why are transformations lazy?
Lazy evaluation allows Spark to understand the entire computation before executing it.

For DataFrames, this enables Catalyst to apply optimizations such as predicate pushdown, column pruning, and join optimization.

For RDDs, Spark can pipeline compatible transformations and organize their execution using dependency information.
### B. Does every action trigger a separate Spark job?
An action triggers computation, but one action does not necessarily equal exactly one Spark job.

A single action may trigger multiple jobs depending on implementation and execution requirements.

Also, when multiple actions operate on an uncached RDD or DataFrame, Spark may recompute the required transformations for each action.

```python
df = spark.read.parquet("sales/")
filtered = df.filter("amount > 1000")

filtered.count()  # Action
filtered.show()   # Another action
```

Spark may execute the filtering computation again for the second action unless reusable results are cached or otherwise available.
### C. Are all transformations shuffle operations?
No. Transformations can involve different dependency patterns.
- Narrow transformations: Operations such as map() and filter() generally do not require data redistribution.
- Wide transformations: Operations such as groupByKey(), reduceByKey(), and repartition() generally require shuffle.
A wide transformation is still a transformation, not an action.
### D. Why is reduceByKey() a transformation but reduce() an action?
This is a common interview trap.

reduceByKey() produces another distributed RDD containing aggregated values for each key.

reduce() computes and returns a single aggregated result to the Driver.

```python
rdd = sc.parallelize([
    ("A", 10),
    ("A", 20),
    ("B", 30)
])

aggregated = rdd.reduceByKey(lambda a, b: a + b)  # Transformation
result = aggregated.collect()                   # Action
```

## 6. Interview-ready answer (60 seconds)

> In Apache Spark, transformations and actions are the two main categories of operations.
>
> Transformations are lazy operations that create new RDDs, DataFrames, or Datasets from existing ones. Examples include map, filter, select, join, and groupBy. Spark does not immediately execute these operations; instead, it records the required computation and builds an execution plan.
>
> Actions are operations that trigger actual computation. Examples include count, collect, show, and write operations. When an action is invoked, Spark executes the required transformations by scheduling distributed tasks across Executors.
>
> Lazy evaluation improves efficiency because Spark can optimize the computation before execution. Additionally, transformations can be classified as narrow or wide depending on whether they require data shuffling.
>
> One important point is that multiple actions on an uncached dataset can cause the same transformations to be recomputed. We can use caching when intermediate results need to be reused efficiently.

Key takeaway: Transformations define what computation to perform, while Actions trigger the actual execution.