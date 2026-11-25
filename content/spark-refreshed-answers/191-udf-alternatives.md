# What are the best alternatives to UDFs?

Start with built-in Spark SQL functions, native Column expressions, higher-order array/map functions, joins, windows, and built-in aggregates. Reusable Python helpers can also build these expressions without executing a Python function on every record.

Catalyst can see native expression structure and apply eligible optimizations. That does not guarantee every expression supports pushdown or code generation, or that joins/windows are free of shuffle and sorting costs. Choose the operation that preserves the required semantics and inspect the plan.

The examples below are independent patterns. Each input DataFrame is assumed to contain the columns used in that example.

## 1. Best alternatives

| Alternative | Best use | Examples |
| --- | --- | --- |
| Built-in functions | Strings, numbers, dates, JSON | upper, substring, round, datediff, from_json |
| Conditional expressions | Classification and rules | when, otherwise, CASE WHEN |
| SQL expressions | Composing native transformations | expr, CAST, COALESCE |
| Higher-order functions | Arrays and maps | transform, filter, aggregate, exists |
| Joins | Reference-data lookups | join; broadcast when appropriate |
| Windows | Ranking and comparisons across rows | row_number, lag, lead, rank |
| Built-in aggregates | Group-level calculations | sum, avg, count, percentile_approx |
| Expression/DataFrame helpers | Reusable native pipelines | Functions returning Column or DataFrame; DataFrame.transform |

## 2. Alternative 1: Built-in functions

### Python UDF illustration

```python
from pyspark.sql.functions import udf, col

@udf("string")
def convert_upper(name):
    return name.upper() if name is not None else None

udf_upper = df.withColumn(
    "name_upper",
    convert_upper(col("name"))
)
```

### Native expression

```python
from pyspark.sql.functions import upper, col

native_upper = df.withColumn(
    "name_upper",
    upper(col("name"))
)
```

The explicit None check preserves an empty string rather than converting it to NULL. Verify Unicode, locale/collation, and version-specific casing behavior if exact agreement with Python is part of the contract.

The native expression avoids Python worker execution and exposes its operation to Spark. Common string, date, numeric, and JSON tasks should begin with the built-in library.

## 3. Alternative 2: Conditional expressions

### Custom classifier

```python
@udf("string")
def classify_salary(salary):
    if salary is None:
        return "Unknown"
    if salary < 50000:
        return "Low"
    if salary < 100000:
        return "Medium"
    return "High"
```

### Native when/otherwise

```python
from pyspark.sql.functions import when, col

classified = df.withColumn(
    "salary_category",
    when(col("salary").isNull(), "Unknown")
    .when(col("salary") < 50000, "Low")
    .when(col("salary") < 100000, "Medium")
    .otherwise("High")
)

df.createOrReplaceTempView("employees")
```

For the illustrated integer/null salaries, SQL can express the same classification:

```sql
SELECT
    employee_id,
    CASE
        WHEN salary IS NULL THEN 'Unknown'
        WHEN salary < 50000 THEN 'Low'
        WHEN salary < 100000 THEN 'Medium'
        ELSE 'High'
    END AS salary_category
FROM employees;
```

Native conditions expose their structure to Catalyst. Preserve boundary values and null behavior when replacing custom code.

## 4. Alternative 3: Higher-order array/map functions

Suppose purchases contains:

| customer_id | purchases |
| --- | --- |
| 101 | [100, 200, 300] |
| 102 | [400, 500] |

A scalar Python implementation could be:

```python
@udf("array<double>")
def increase_prices(prices):
    if prices is None:
        return None
    return [
        None if price is None else price * 1.10
        for price in prices
    ]
```

Use native array transform instead:

```python
from pyspark.sql.functions import transform, col

purchases_df = spark.createDataFrame(
    [(101, [100.0, 200.0, 300.0]), (102, [400.0, 500.0])],
    "customer_id INT, purchases ARRAY<DOUBLE>"
)

updated_purchases = purchases_df.withColumn(
    "updated_purchases",
    transform(
        col("purchases"),
        lambda value: value * 1.10
    )
)
```

Output values, rounded for readability:

| customer_id | updated_purchases |
| --- | --- |
| 101 | [110.0, 220.0, 330.0] |
| 102 | [440.0, 550.0] |

Both illustrations preserve a null array and null elements for the stated numeric inputs. Floating-point results may display additional digits; use suitable decimal types and rounding policies when exact monetary precision is required.

| Higher-order function | Purpose |
| --- | --- |
| transform | Map each array element to a new value |
| filter | Retain array elements satisfying a predicate |
| exists | Test whether any array element matches |
| forall | Test whether every array element matches |
| aggregate | Reduce array elements into an accumulator/result |
| map_filter | Retain matching map entries |
| transform_values | Transform values in a map |

The Python lambda passed to functions.transform builds a Spark Column expression. It does not run as an ordinary Python UDF on every element. Python UDF calls are not supported inside this higher-order transform API.

## 5. Alternative 4: Joins for lookup logic

A dictionary UDF might look like this:

```python
department_map = {
    1: "IT",
    2: "HR",
    3: "Finance"
}

@udf("string")
def get_department(department_id):
    return department_map.get(department_id)
```

A small fixed map may be expressible with create_map and a native lookup. For governed or changing reference data, a reference-table join often fits better.

Assume employees has an INT department_id. For the small example:

```python
from pyspark.sql.functions import broadcast

departments = spark.createDataFrame(
    [(1, "IT"), (2, "HR"), (3, "Finance")],
    "department_id INT, department_name STRING"
)

enriched = employees.join(
    broadcast(departments),
    on="department_id",
    how="left"
)
```

A supported broadcast join can avoid shuffling the large side for this join. Broadcast only when the reference side fits comfortably in the relevant memory budgets; otherwise let Spark choose a suitable strategy or use an ordinary join.

To preserve dictionary-style lookup semantics, enforce one reference row per key and compatible key types. Duplicate lookup keys can multiply employee rows, and null/unmatched-key behavior must match the intended contract. Version reference data when replay needs stable results.

## 6. Alternative 5: Window functions

For salary positions within a department:

```python
from pyspark.sql import Window
from pyspark.sql.functions import row_number, col

window_spec = (
    Window.partitionBy("department")
          .orderBy(
              col("salary").desc_nulls_last(),
              col("employee_id").asc()
          )
)

ranked = df.withColumn(
    "salary_rank",
    row_number().over(window_spec)
)
```

For an input with the following department/salary combinations, the positions are:

| Department | Salary | Salary rank |
| --- | --- | --- |
| IT | 90,000 | 1 |
| IT | 70,000 | 2 |
| IT | 50,000 | 3 |
| HR | 80,000 | 1 |
| HR | 60,000 | 2 |

row_number assigns distinct positions. Use rank or dense_rank when equal salaries should share a rank. The tie-breaker assumes employee_id is unique within the department; define a stable ordering when repeatable tie resolution matters.

Windows also support running totals, lag/lead comparisons, and deduplication patterns. They may require sorting and redistribution, but avoid custom Python group materialization for supported operations.

## 7. Alternative 6: Compose built-in aggregates

Weighted average can use native sums. For this example, validate finite, non-null salaries and nonnegative weights first:

```python
from pyspark.sql import functions as F

totals = df.groupBy("department").agg(
    F.sum(F.col("salary") * F.col("weight")).alias("weighted_sum"),
    F.sum("weight").alias("total_weight")
)

weighted_result = totals.select(
    "department",
    F.when(
        F.col("total_weight") > 0,
        F.col("weighted_sum") / F.col("total_weight")
    ).alias("weighted_avg_salary")
)
```

This version returns NULL when total weight is zero. If null inputs or negative weights are allowed, define which pairs contribute and how the denominator is computed. Do not divide by zero or silently choose a policy during a rewrite.

Native sums can partially aggregate across partitions before merging, which can reduce data movement compared with a whole-group Pandas implementation. The exact plan and memory use still depend on the aggregate and data distribution.

## 8. Alternative 7: Reusable native expressions and pipelines

### Compose SQL expressions with expr

```python
from pyspark.sql.functions import expr

net_salary_result = df.withColumn(
    "net_salary",
    expr("""
        CASE
            WHEN salary > 100000 THEN salary * 0.75
            WHEN salary > 50000 THEN salary * 0.85
            ELSE salary * 0.95
        END
    """)
)
```

This is a native CASE expression. For null salary, the ELSE arithmetic also yields NULL.

### Write a Python helper that returns a Column

```python
from pyspark.sql.functions import when, col

def calculate_bonus(salary_col):
    return (
        when(salary_col > 100000, salary_col * 0.20)
        .otherwise(salary_col * 0.10)
    )

bonus_result = df.withColumn(
    "bonus",
    calculate_bonus(col("salary"))
)
```

This Python function builds the expression while constructing the query. It does not compute one salary value at a time in a Python worker.

### Package a DataFrame transformation

```python
def add_bonus(frame):
    return frame.withColumn(
        "bonus",
        calculate_bonus(col("salary"))
    )

pipeline_result = df.transform(add_bonus)
```

DataFrame.transform applies a helper to a DataFrame during plan construction. It is different from functions.transform, which expresses a higher-order operation over array elements. Neither requires a Python UDF when the helper builds only native operations.

[spark-reference:native-expression-helpers]

## 9. Which alternative should you choose?

| Requirement | Starting point |
| --- | --- |
| Simple scalar transformation | Built-in functions |
| Conditional rules | when / CASE WHEN |
| String patterns | regexp_extract / regexp_replace |
| Nested array/map processing | Higher-order functions |
| Reference lookup | Native map for small fixed rules; join for reference tables |
| Ranking or previous/next-row logic | Windows with explicit ordering |
| Calculation from standard aggregates | Compose built-in aggregates |
| Reusable business transformations | Column/DataFrame-building helpers |
| Specialized external library | Appropriate JVM/Python/Pandas/Arrow UDF when genuinely needed |

Pandas UDFs remain UDFs: batch execution can improve suitable workloads but does not generally expose the custom body to Catalyst. Preserve nulls, empty values, cardinality, ordering, types, and error behavior when replacing custom code.

## 10. Interview-ready answer

> I first consider native Spark functions, conditional/SQL expressions, higher-order array/map functions, joins, windows, and built-in aggregates.
>
> For example, salary classification can use when, array element updates can use transform, reference lookups can use a join, and weighted average can use sums. A Python helper can return a Column or DataFrame to provide reuse without Python row execution.
>
> These approaches expose more structure to Catalyst and avoid unnecessary custom execution. I still validate semantic equivalence and inspect costs such as join shuffles, window sorting, and memory use.
>
> If a specialized algorithm or library remains necessary, I choose and benchmark an appropriate UDF interface rather than forcing an impractical native rewrite.

**Key takeaway:** Match the requirement to a native expression or relational operation first, and preserve the behavior that matters when replacing a UDF.
