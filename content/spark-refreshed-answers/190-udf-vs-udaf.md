# What is the difference between a UDF and a UDAF?

Here, **UDF means a scalar user-defined function**: it maps each evaluated row's input values to an output value. A **UDAF is a user-defined aggregate function**: it combines multiple rows into an aggregate result.

- **Scalar UDF:** Calculate a 10% bonus for each employee.
- **UDAF:** Implement a custom statistic across employees in each department.

In a grouped aggregation, a UDAF produces one result per group. Without grouping keys, an aggregate can produce one result for the whole input. Supported aggregate functions can also be used in windows, which have a different output shape.

## 1. Key differences

| Feature | Scalar UDF | UDAF |
| --- | --- | --- |
| Full form | User-Defined Function | User-Defined Aggregate Function |
| Purpose | Custom row-level computation | Custom aggregation |
| Operates on | One row's arguments at a time, even with a batched scalar interface | Multiple rows contributing to a group/aggregate |
| Grouped-query output | One value per evaluated row | One aggregate value per group |
| Typical use | Classification, formatting, specialized calculations | Custom statistics, mergeable summaries |
| SQL usage | SELECT, WHERE, other supported expressions | Aggregate queries and GROUP BY; windows where supported |
| Aggregation state | Does not combine rows through an aggregate buffer | May maintain/merge a buffer or process group values through another interface |
| Distributed execution | Evaluated through tasks on partitions | Partial aggregation/merging when the implementation supports it |
| Built-in alternatives | when, upper, substring, arithmetic | sum, avg, count, max, and compositions of built-in aggregates |
| Catalyst visibility | Generally limited inside opaque custom logic | Generally limited inside opaque custom aggregate logic |

## 2. Example: A scalar UDF

Employee data:

| employee_id | department | salary |
| --- | --- | --- |
| 101 | IT | 50,000 |
| 102 | IT | 70,000 |
| 103 | HR | 40,000 |
| 104 | HR | 60,000 |

Create the sample:

```python
df = spark.createDataFrame(
    [
        (101, "IT", 50000.0),
        (102, "IT", 70000.0),
        (103, "HR", 40000.0),
        (104, "HR", 60000.0)
    ],
    "employee_id INT, department STRING, salary DOUBLE"
)
```

Calculate a bonus for each row:

```python
from pyspark.sql.functions import udf, col

@udf("double")
def calculate_bonus(salary):
    return salary * 0.10 if salary is not None else None

bonus_result = df.withColumn(
    "bonus",
    calculate_bonus(col("salary"))
)
```

Output values:

| employee_id | salary | bonus |
| --- | --- | --- |
| 101 | 50,000 | 5,000 |
| 102 | 70,000 | 7,000 |
| 103 | 40,000 | 4,000 |
| 104 | 60,000 | 6,000 |

The function does not combine employees' salaries. A native salary * 0.10 expression is preferable for this simple calculation; the UDF demonstrates row-level semantics.

## 3. Example: A grouped custom aggregate

Consider weighted average salary:

**Weighted average = sum(salary × weight) / sum(weight)**

| Department | Salary | Weight |
| --- | --- | --- |
| IT | 50,000 | 1 |
| IT | 70,000 | 3 |
| HR | 40,000 | 2 |
| HR | 60,000 | 2 |

Expected values:

| Department | Weighted average salary |
| --- | --- |
| IT | 65,000 |
| HR | 50,000 |

Create the weighted input separately:

```python
weighted_df = spark.createDataFrame(
    [
        ("IT", 50000.0, 1.0),
        ("IT", 70000.0, 3.0),
        ("HR", 40000.0, 2.0),
        ("HR", 60000.0, 2.0)
    ],
    "department STRING, salary DOUBLE, weight DOUBLE"
)
```

### Grouped aggregate Pandas UDF

In PySpark, a Series-to-scalar Pandas UDF can implement this aggregate:

```python
import pandas as pd
from pyspark.sql.functions import pandas_udf, col

@pandas_udf("double")
def weighted_avg_salary(
    salary: pd.Series,
    weight: pd.Series
) -> float:
    total_weight = weight.sum()
    if total_weight == 0:
        return float("nan")
    return float((salary * weight).sum() / total_weight)

pandas_result = weighted_df.groupBy("department").agg(
    weighted_avg_salary(
        col("salary"),
        col("weight")
    ).alias("weighted_avg_salary")
)

pandas_result.show()
```

This example assumes validated, finite, non-null salaries and nonnegative weights. It deliberately returns NaN for zero total weight; NaN is not SQL NULL. Choose and enforce the required undefined-result policy before publishing output. If nulls are allowed, define which salary/weight pairs contribute to both numerator and denominator.

The function receives the group's input Series and returns one scalar. A scalar Pandas UDF instead returns a Series with the corresponding number of row outputs. Compatible pandas/PyArrow dependencies are required.

### This weighted average also has a native implementation

Custom aggregation semantics do not necessarily require a custom UDAF. Two built-in sums can express this example and support partial aggregation:

```python
from pyspark.sql import functions as F

totals = weighted_df.groupBy("department").agg(
    F.sum(F.col("salary") * F.col("weight")).alias("weighted_sum"),
    F.sum("weight").alias("total_weight")
)

native_result = totals.select(
    "department",
    F.when(
        F.col("total_weight") > 0,
        F.col("weighted_sum") / F.col("total_weight")
    ).otherwise(F.lit(float("nan"))).alias("weighted_avg_salary")
)
```

Under the same validated-input and zero-weight policy, this produces the illustrated results. Prefer it for this particular computation. Compare floating-point results with appropriate tolerance; use suitable numeric types when exact precision is required. Output row order is not guaranteed without ordering.

## 4. How does a mergeable UDAF work internally?

A mergeable aggregate keeps a summary buffer rather than requiring its custom function to see all raw rows simultaneously. Spark can compute partial summaries and combine them:

[spark-reference:mergeable-weighted-aggregate]

For weighted average, the summary is a pair: weighted_sum and total_weight. Merge by adding each component, then divide in the final step. Averaging partition averages without accounting for weights would give incorrect results.

For Spark's Scala/Java Aggregator[IN, BUF, OUT] API:

| Method | Responsibility |
| --- | --- |
| zero | Supply the initial aggregation buffer |
| reduce | Add an input record to the buffer |
| merge | Combine two partial buffers |
| finish | Convert the completed buffer into the output |

Implementations also supply buffer/output encoders. The merging logic must preserve the intended aggregate across partitioning and evaluation order; bounded buffers are important for memory use. Aggregator is the preferred modern API over the deprecated UserDefinedAggregateFunction class where applicable.

### Grouped Pandas execution is different

The Series-to-scalar grouped aggregate Pandas UDF above does not supply Spark with a native partial-buffer merge operation. Group values must be brought together, generally through a shuffle, and the group is materialized for Python. Compatible existing distribution may avoid an additional exchange.

Large or skewed groups can therefore cause OOM. A scalar Arrow batch-row cap does not bound the entire group for this interface. Newer supported iterator aggregation interfaces can process group batches differently, but do not automatically provide native distributed partial aggregation; check the exact API/version and algorithm.

Do not mix grouped aggregate Pandas UDFs and built-in aggregates in one GroupedData.agg call where the API forbids that combination. The native example above is a separate aggregation.

## 5. When should you choose each?

| Requirement | Starting point |
| --- | --- |
| Per-employee bonus | Native expression; scalar UDF only if needed |
| Customer ID formatting | Built-in functions where suitable |
| Custom row-level classification | Scalar UDF when native expressions are insufficient |
| Salary total by department | Built-in sum |
| Average salary | Built-in avg |
| Specialized custom aggregate | UDAF if built-ins or their composition cannot express it adequately |
| Mergeable custom JVM summary | Scala/Java Aggregator |
| Custom pandas group statistic | Appropriate grouped aggregate Pandas interface, with memory constraints understood |

Built-ins often offer efficient partial aggregation and native execution, but not every aggregate has a small bounded state. Inspect the actual implementation and plan rather than assuming all aggregation is equally cheap.

## 6. Interview-ready answer

> A scalar UDF transforms each evaluated row's values. A UDAF combines multiple rows into an aggregate result, usually one per group in a grouped query.
>
> A per-employee bonus is row-level; a department statistic is an aggregation. Mergeable UDAFs can maintain intermediate buffers and combine partial results across Spark partitions. Aggregator exposes zero, reduce, merge, and finish for custom JVM aggregation.
>
> PySpark grouped aggregate Pandas UDFs offer a different interface: a Series-to-scalar function receives group values and returns an aggregate, without the same native partial-buffer merging. Large groups can create memory pressure.
>
> I prefer built-in expressions and aggregates where they express the requirement. Even weighted average can be implemented using sums; custom UDAFs are useful when genuinely specialized aggregation remains necessary.

**Key takeaway:** Distinguish row-level output from aggregation, then distinguish mergeable buffer-based aggregation from whole-group custom execution. These choices have different distribution and memory costs.
