# What are some examples of each?

Examples of Narrow and Wide Transformations in Apache Spark.

## 1. Narrow Transformations

Narrow transformations do not require shuffling data across partitions.

| Transformation | Description |
| --- | --- |
| `map()` | Applies a function to every element |
| `filter()` | Filters records based on a condition |
| `flatMap()` | Converts each element into zero or more elements |
| `mapPartitions()` | Processes an entire partition at once |
| `select()` | Selects specific columns from a DataFrame |
| `withColumn()` | Adds or modifies a column |
| `drop()` | Removes columns |
| `union()` | Combines two DataFrames without shuffling |
| `coalesce(n)` | Reduces partitions without shuffling by default |
| `sample()` | Randomly samples records within partitions |

### Example

```python
from pyspark.sql.functions import col, upper

df = spark.read.parquet("employees.parquet")

# Narrow transformations
df1 = df.filter(df.salary > 50000)
df2 = df1.select("name", "department")
df3 = df2.withColumn("department", upper(col("department")))
```

All these operations can be executed locally within existing partitions.

## 2. Wide Transformations

Wide transformations involve dependencies across multiple input partitions and generally require shuffling.

| Transformation | Description |
| --- | --- |
| `groupBy()` + aggregation | Groups records by key and aggregates values |
| `reduceByKey()` | Aggregates values by key across partitions |
| `groupByKey()` | Groups all values belonging to the same key |
| `distinct()` | Removes duplicate records across partitions |
| `dropDuplicates()` | Removes duplicate DataFrame records |
| `repartition()` | Redistributes data across partitions |
| `sortByKey()` | Globally sorts an RDD by key |
| `orderBy()` | Globally sorts DataFrame records |
| `join()` | Typically shuffles data for matching keys, depending on join strategy |
| `intersection()` | Finds common records across datasets, generally requiring a shuffle |

### Example

```python
df = spark.read.parquet("employees.parquet")

# Wide transformations
df1 = df.groupBy("department").count()
df2 = df.distinct()
df3 = df.repartition(10, "department")
df4 = df.orderBy("salary")
```

These operations generally require Spark to redistribute records across partitions.

## 3. Combined Example

```python
from pyspark.sql.functions import col, sum

df = spark.read.parquet("sales.parquet")

result = (
    df.filter(col("amount") > 1000)  # Narrow
      .select("region", "amount")    # Narrow
      .repartition("region")        # Wide
      .groupBy("region")            # Aggregation (wide in general)
      .agg(sum("amount").alias("total"))
)

result.show()
```

Important: Although `groupBy()` with aggregation is generally classified as wide, Spark may reuse compatible partitioning from `repartition("region")` and avoid an additional shuffle.

## 4. Easy Way to Remember

- Narrow: `map`, `filter`, `flatMap`, `select`, `withColumn`, `union`
- Wide: `groupByKey`, `reduceByKey`, `groupBy` with aggregation, `distinct`, `repartition`, `orderBy`

Interview tip: A transformation is classified based on its partition dependencies, not simply its method name. For example, a `join()` can use a shuffle-based strategy or a broadcast strategy, depending on the execution plan.