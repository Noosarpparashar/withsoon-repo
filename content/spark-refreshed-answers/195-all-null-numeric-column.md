# What happens when every value in a numeric column is null?

When a numeric column contains only NULL values, SUM, AVG, MIN, and MAX return NULL. COUNT(column) returns zero, while COUNT(*) still counts the input rows.

These aggregates skip NULL inputs. With no known numeric values, their result is unknown rather than a measured zero. Keep all-NULL data, an empty input, and real zero values distinct.

## 1. Example: all salaries are NULL

| employee_id | salary |
| --- | --- |
| 101 | NULL |
| 102 | NULL |
| 103 | NULL |
| 104 | NULL |

Create the dataset and SQL view:

```python
from pyspark.sql import functions as F

df = spark.createDataFrame(
    [(101, None), (102, None), (103, None), (104, None)],
    "employee_id INT, salary DOUBLE"
)

df.createOrReplaceTempView("employees")
```

The explicit schema matters: when constructing a DataFrame from local rows whose salary values are all None, Spark cannot infer the intended numeric type from those values alone.

```sql
SELECT
    COUNT(*) AS total_rows,
    COUNT(salary) AS salary_count,
    SUM(salary) AS total_salary,
    AVG(salary) AS average_salary,
    MIN(salary) AS min_salary,
    MAX(salary) AS max_salary,
    COUNT(DISTINCT salary) AS distinct_salary_count
FROM employees;
```

| Aggregation | Result | Explanation |
| --- | --- | --- |
| COUNT(*) | 4 | Counts every row |
| COUNT(salary) | 0 | No non-null salaries |
| SUM(salary) | NULL | No known values to sum |
| AVG(salary) | NULL | No known values to average |
| MIN(salary) | NULL | No minimum available |
| MAX(salary) | NULL | No maximum available |
| COUNT(DISTINCT salary) | 0 | No distinct non-null values |

SUM(salary) is NULL, not zero. Four unknown salaries do not establish a total salary of zero.

[spark-reference:all-null-zero-empty]

## 2. PySpark aggregation

Using the same df:

```python
result = df.agg(
    F.count("*").alias("total_rows"),
    F.count("salary").alias("salary_count"),
    F.sum("salary").alias("total_salary"),
    F.avg("salary").alias("average_salary"),
    F.min("salary").alias("min_salary"),
    F.max("salary").alias("max_salary")
)

result.show()
```

Expected output:

```text
+----------+------------+------------+--------------+----------+----------+
|total_rows|salary_count|total_salary|average_salary|min_salary|max_salary|
+----------+------------+------------+--------------+----------+----------+
|         4|           0|        NULL|          NULL|      NULL|      NULL|
+----------+------------+------------+--------------+----------+----------+
```

COUNT(salary) measures non-null values, not all aspects of salary validity. NaN is non-null, so an all-NULL check does not detect floating-point NaN values.

## 3. Arithmetic and filtering

Ordinary arithmetic propagates NULL:

```sql
SELECT
    employee_id,
    salary + 1000 AS increased_salary,
    salary * 0.10 AS bonus
FROM employees;
```

All four rows remain, but both calculated columns are NULL. An explicit expression such as COALESCE can change that behavior.

Filtering is different:

```sql
SELECT *
FROM employees
WHERE salary > 50000;
```

This returns no rows. NULL > 50000 evaluates to UNKNOWN, and WHERE retains only TRUE. Use salary IS NULL when the intention is to select missing salaries.

## 4. How can you handle an all-NULL numeric column?

### Approach 1: default the aggregate result

If the requirement is to display zero when there are no known salary values:

```sql
SELECT
    COUNT(*) AS total_rows,
    COUNT(salary) AS known_salaries,
    COALESCE(SUM(salary), 0.0) AS total_salary,
    COALESCE(AVG(salary), 0.0) AS average_salary
FROM employees;
```

| total_rows | known_salaries | total_salary | average_salary |
| --- | --- | --- | --- |
| 4 | 0 | 0 | 0 |

This defaults the aggregate output without changing the source values. Retaining the counts makes the absence of known salaries visible even if a report displays zero.

### Approach 2: replace NULL before aggregating

```sql
SELECT
    SUM(COALESCE(salary, 0.0)) AS total_salary,
    AVG(COALESCE(salary, 0.0)) AS average_salary
FROM employees;
```

For this non-empty four-row dataset, both results are zero. But this treats each missing salary as a known zero before calculating the metric.

The difference becomes clear with a separate mixed dataset:

| salary |
| --- |
| 10000 |
| 20000 |
| NULL |

```sql
WITH mixed_salaries AS (
    SELECT * FROM VALUES
        (CAST(10000 AS DOUBLE)),
        (CAST(20000 AS DOUBLE)),
        (CAST(NULL AS DOUBLE))
    AS t(salary)
)
SELECT
    AVG(salary) AS average_known_salary,
    AVG(COALESCE(salary, 0.0)) AS average_with_zero_inputs,
    COALESCE(AVG(salary), 0.0) AS average_with_output_default
FROM mixed_salaries;
```

| Expression | Result |
| --- | --- |
| AVG(salary) | 15000 |
| AVG(COALESCE(salary, 0.0)) | 10000 |
| COALESCE(AVG(salary), 0.0) | 15000 |

Replacing NULL before AVG changes its denominator from two known values to three values. Defaulting the final AVG leaves an existing non-null average unchanged.

### Empty input is a separate case

For an ungrouped aggregation:

| Input | SUM(COALESCE(salary, 0.0)) | COALESCE(SUM(salary), 0.0) |
| --- | --- | --- |
| Four NULL salaries | 0 | 0 |
| Four zero salaries | 0 | 0 |
| No rows | NULL | 0 |

An inner COALESCE has no rows to transform on empty input. SUM still returns NULL; only a default applied to the aggregate result changes that output to zero. AVG has the same distinction for empty input.

## 5. How does this affect GROUP BY?

Use a separate employee dataset containing departments:

| department | salary |
| --- | --- |
| IT | NULL |
| IT | NULL |
| HR | 50000 |
| HR | NULL |

```python
department_df = spark.createDataFrame(
    [("IT", None), ("IT", None), ("HR", 50000.0), ("HR", None)],
    "department STRING, salary DOUBLE"
)
department_df.createOrReplaceTempView("department_employees")
```

```sql
SELECT
    department,
    COUNT(*) AS total_employees,
    COUNT(salary) AS non_null_salaries,
    SUM(salary) AS total_salary,
    AVG(salary) AS average_salary
FROM department_employees
GROUP BY department;
```

| department | total_employees | non_null_salaries | total_salary | average_salary |
| --- | --- | --- | --- | --- |
| IT | 2 | 0 | NULL | NULL |
| HR | 2 | 1 | 50000 | 50000 |

Spark evaluates each group separately. IT has two employees but no known salaries, so its sum and average are NULL. Result order is not guaranteed without ORDER BY.

An empty input with GROUP BY produces no groups and no result rows. An ungrouped aggregation over empty input instead produces one summary row with zero counts and NULL SUM/AVG/MIN/MAX results.

## 6. Why does this matter in production?

An unexpectedly all-NULL numeric field may indicate:

- A source field is absent after schema evolution.
- A conversion returned NULL, for example through try_cast.
- An outer join found no matching source records.
- A mapping or transformation populated the wrong field.
- The source data is missing or incomplete.

These are possibilities to investigate, not proof of a specific cause. Some invalid conversions raise an error instead of returning NULL.

If transaction amounts unexpectedly become all NULL, substituting zero can hide an ingestion problem behind a zero-revenue report.

A quality gate for the original salary DataFrame is:

```python
metrics = df.agg(
    F.count("*").alias("total_rows"),
    F.count("salary").alias("non_null_rows")
).first()

if metrics["total_rows"] > 0 and metrics["non_null_rows"] == 0:
    raise ValueError(
        "Data quality failure: salary column is entirely NULL"
    )
```

This distinguishes a non-empty all-NULL column from empty input. Define a separate empty-input policy, and add NaN, range, and other business checks when required. Apply the same completeness checks per group when a global count could hide an all-NULL subgroup.

## 7. Interview-ready answer

> When a numeric column contains only NULL values, Spark's SUM, AVG, MIN, and MAX return NULL because there are no known values to aggregate. COUNT(column) returns zero, while COUNT(*) counts all rows.
>
> Ordinary arithmetic propagates NULL, and comparisons such as salary > 50000 evaluate to UNKNOWN, so those rows do not pass the filter.
>
> If the business requires a display default, I can use COALESCE(SUM(column), 0). Replacing NULL with zero before aggregation has different semantics, especially for AVG, because it changes which values enter the calculation.
>
> I keep row counts and non-null counts alongside the metrics and investigate unexpected all-NULL fields before applying defaults. Missing data, empty input, and genuine zeros are different states.

**Key takeaway:** No known numeric values produce NULL SUM/AVG/MIN/MAX results. Zero is a known numeric value, so do not use it to hide missing observations.
