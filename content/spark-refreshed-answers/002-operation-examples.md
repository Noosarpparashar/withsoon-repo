# What are some examples of transformations and actions?

In Apache Spark, Transformations are lazy operations that create new RDDs, DataFrames, or Datasets, whereas Actions trigger execution and return results or write data to external storage.

## 1. Examples of Transformations

Transformations are broadly classified into Narrow Transformations and Wide Transformations.

### A. Narrow Transformations

Narrow transformations do not require a shuffle because each output partition depends on at most a small, fixed number of input partitions (typically one).

| Transformation    | Description                                               | Example                                   |
| ----------------- | --------------------------------------------------------- | ----------------------------------------- |
| `map()`           | Applies a function to each RDD element                    | `rdd.map(lambda x: x * 2)`                |
| `flatMap()`       | Maps each element to zero or more elements                | `rdd.flatMap(lambda x: x.split())`        |
| `filter()`        | Selects records matching a condition                      | `df.filter(df.age > 25)`                  |
| `select()`        | Selects specified columns                                 | `df.select("name", "age")`                |
| `withColumn()`    | Adds or replaces a column                                 | `df.withColumn("bonus", df.salary * 0.1)` |
| `mapPartitions()` | Processes partition iterators                             | `rdd.mapPartitions(func)`                 |
| `coalesce()`      | Reduces partition count without a full shuffle by default | `df.coalesce(4)`                          |
| `union()`         | Combines datasets without normally requiring a shuffle    | `df1.union(df2)`                          |

### B. Wide Transformations

Wide transformations involve dependencies where output partitions may require data from multiple input partitions. They generally require a shuffle.

| Transformation        | Description                            | Example                            |
| --------------------- | -------------------------------------- | ---------------------------------- |
| `groupBy()` + `agg()` | Performs grouped aggregation           | `df.groupBy("city").count()`       |
| `reduceByKey()`       | Aggregates values by key               | `rdd.reduceByKey(lambda a,b: a+b)` |
| `groupByKey()`        | Groups values associated with each key | `rdd.groupByKey()`                 |
| `repartition()`       | Redistributes data across partitions   | `df.repartition(10)`               |
| `distinct()`          | Removes duplicate records              | `df.distinct()`                    |
| `orderBy()`           | Globally sorts data                    | `df.orderBy("salary")`             |
| `join()`              | Combines datasets                      | `df1.join(df2, "id")`              |

Important: Not every join requires a shuffle. A broadcast join, for example, can avoid shuffling the larger dataset.

## 2. Examples of Actions

Actions trigger the execution of Spark computations.

### A. RDD Actions

| Action             | Description                           | Example                         |
| ------------------ | ------------------------------------- | ------------------------------- |
| `collect()`        | Returns all elements to the Driver    | `rdd.collect()`                 |
| `count()`          | Returns number of elements            | `rdd.count()`                   |
| `first()`          | Returns first element                 | `rdd.first()`                   |
| `take(n)`          | Returns up to `n` elements            | `rdd.take(5)`                   |
| `reduce()`         | Aggregates all elements to one result | `rdd.reduce(lambda a,b: a+b)`   |
| `takeOrdered(n)`   | Returns the smallest `n` elements     | `rdd.takeOrdered(5)`            |
| `foreach()`        | Executes a function on each element   | `rdd.foreach(func)`             |
| `saveAsTextFile()` | Writes RDD data to storage            | `rdd.saveAsTextFile("output/")` |

### B. DataFrame Actions

| Action            | Description                            | Example                       |
| ----------------- | -------------------------------------- | ----------------------------- |
| `show()`          | Displays DataFrame rows                | `df.show()`                   |
| `count()`         | Returns total number of rows           | `df.count()`                  |
| `collect()`       | Returns all rows to the Driver         | `df.collect()`                |
| `first()`         | Returns the first row                  | `df.first()`                  |
| `head(n)`         | Returns the first `n` rows             | `df.head(5)`                  |
| `take(n)`         | Returns up to `n` rows                 | `df.take(10)`                 |
| `foreach()`       | Applies a function to each row         | `df.foreach(func)`            |
| `write.parquet()` | Writes data in Parquet format          | `df.write.parquet("output/")` |
| `write.save()`    | Writes data to a supported destination | `df.write.save("output/")`    |

Note that `df.groupBy("city").count()` defines a transformation, whereas `df.count()` is an action.

## 3. Practical Example Using PySpark

```
from pyspark.sql import functions as F

data = [
    (1, "Alice", "IT", 5000),
    (2, "Bob", "HR", 3000),
    (3, "Charlie", "IT", 7000),
    (4, "David", "HR", 4000)
]

df = spark.createDataFrame(
    data,
    ["id", "name", "department", "salary"]
)

# TRANSFORMATION 1: Filter
df1 = df.filter(F.col("salary") > 3500)

# TRANSFORMATION 2: Select
df2 = df1.select("department", "salary")

# TRANSFORMATION 3: Group and aggregate
df3 = df2.groupBy("department").agg(
    F.sum("salary").alias("total_salary")
)

# ACTION: Execute the computation
df3.show()
```

Output:

```
+----------+------------+
|department|total_salary|
+----------+------------+
|        IT|       12000|
|        HR|        4000|
+----------+------------+
```

### What happens during execution?

1. `filter()` and `select()` are narrow transformations.
2. `groupBy().agg()` requires aggregation and typically a shuffle.
3. Spark records the transformations without immediately processing all rows.
4. `show()` triggers execution.
5. Spark creates the required execution stages and schedules tasks across Executors.
6. Results are displayed on the Driver.

## 4. Common Interview Traps

| Operation                    | Transformation or Action?                                    | Explanation                                                       |
| ---------------------------- | ------------------------------------------------------------ | ----------------------------------------------------------------- |
| `rdd.map()`                  | Transformation                                               | Creates a new RDD                                                 |
| `rdd.reduce()`               | Action                                                       | Returns one aggregated value                                      |
| `rdd.reduceByKey()`          | Transformation                                               | Creates a new pair RDD                                            |
| `df.groupBy("id")`           | Transformation-building operation                            | Returns a `GroupedData` object                                    |
| `df.groupBy("id").count()`   | Transformation                                               | Returns a DataFrame                                               |
| `df.count()`                 | Action                                                       | Returns a row count                                               |
| `df.distinct()`              | Transformation                                               | Returns a new DataFrame                                           |
| `df.orderBy()`               | Transformation                                               | Defines a sorted DataFrame                                        |
| `df.limit(10)`               | Transformation                                               | Defines a DataFrame limited to ten rows                           |
| `df.show(10)`                | Action                                                       | Triggers execution to display rows                                |
| `df.cache()`                 | Persistence declaration                                      | Marks data for caching; does not immediately materialize it       |
| `df.explain()`               | Neither a normal transformation nor a data-processing action | Displays the execution plan; generally does not execute the query |
| `df.write.mode("overwrite")` | Writer configuration                                         | Does not execute the write                                        |
| `df.write.parquet("path")`   | Action                                                       | Executes the write                                                |

## 5. Interview-ready answer (45–60 seconds)

> In Apache Spark, transformations and actions are the two main types of operations.
>
> Common examples of transformations include map, flatMap, filter, select, withColumn, groupBy, reduceByKey, join, distinct, and repartition.
>
> Transformations are lazy and create new distributed datasets. They can be classified as narrow transformations, such as map and filter, or wide transformations, such as groupBy and repartition, depending on their partition dependencies and shuffle requirements.
>
> Common examples of actions include collect, count, show, first, take, reduce, and write operations.
>
> Actions trigger the execution of the transformations defined earlier.
>
> For example, if I read a DataFrame, apply filter, select, and groupBy operations, Spark builds the execution plan. When I call show or count, Spark executes the necessary computation across Executors.

Key takeaway: `map`, `filter`, `select`, `groupBy`, `join` = Transformations. `collect`, `count`, `show`, `take`, `write` = Actions.