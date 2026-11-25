# How does Spark handle nulls and missing data?

Spark uses SQL null semantics and native DataFrame APIs to detect, replace, remove, and process missing values. NULL represents an unknown or missing value, and SQL conditions can evaluate to TRUE, FALSE, or UNKNOWN (NULL).

Common tools include isNull, isNotNull, isnan, coalesce, fillna, and dropna. Choose them according to the data's meaning: NULL, floating-point NaN, empty strings, zero, and an absent schema column are different cases.

## 1. How is missing data represented?

Consider this employee dataset:

| employee_id | name | department | salary |
| --- | --- | --- | --- |
| 101 | Rahul | IT | 50000 |
| 102 | Priya | NULL | 60000 |
| 103 | Amit | HR | NULL |
| 104 | Neha | NULL | NULL |

Create the example and SQL view:

```python
df = spark.createDataFrame(
    [
        (101, "Rahul", "IT", 50000.0),
        (102, "Priya", None, 60000.0),
        (103, "Amit", "HR", None),
        (104, "Neha", None, None)
    ],
    "employee_id INT, name STRING, department STRING, salary DOUBLE"
)

df.createOrReplaceTempView("employees")
```

| Value/case | Meaning |
| --- | --- |
| NULL | Missing or unknown SQL value |
| NaN | Special floating-point Not-a-Number value; not NULL |
| Empty string "" | A present string with no characters |
| 0 | A present numeric value |
| Missing JSON field | Can yield NULL when the read schema includes that field |
| Missing DataFrame column | The schema has no such column; referencing it may fail |

These cases should not be normalized into one category unless the business contract explicitly requires it.

## 2. How do SQL conditions handle NULL?

```sql
SELECT *
FROM employees
WHERE salary > 50000;
```

For the original data:

| Employee | Salary | salary > 50000 |
| --- | --- | --- |
| Rahul | 50000 | FALSE |
| Priya | 60000 | TRUE |
| Amit | NULL | UNKNOWN |
| Neha | NULL | UNKNOWN |

Only Priya qualifies, because WHERE retains TRUE, not FALSE or UNKNOWN.

[spark-reference:null-three-valued-filter]

| Expression | Result |
| --- | --- |
| NULL = NULL | NULL |
| NULL != NULL | NULL |
| NULL > 100 | NULL |
| NULL < 100 | NULL |
| NULL IS NULL | TRUE |
| NULL IS NOT NULL | FALSE |
| NULL <=> NULL | TRUE |

The <=> operator is null-safe equality: two NULLs compare equal, and one NULL versus a non-null value compares false. Ordinary equality has different semantics.

## 3. How do you detect missing values?

### NULL checks

```python
from pyspark.sql.functions import col

missing_salary = df.filter(col("salary").isNull())
known_salary = df.filter(col("salary").isNotNull())
```

Equivalent SQL:

```sql
SELECT *
FROM employees
WHERE salary IS NULL;
```

This is not an IS NULL check:

```python
# Incorrect way to find NULL salaries:
df.filter(col("salary") == None)
```

It constructs ordinary equality with NULL, whose UNKNOWN result does not pass a filter. Use isNull instead.

### NaN checks

```python
from pyspark.sql.functions import isnan

nan_salary = df.filter(isnan(col("salary")))
```

Use isnan for floating-point NaN and isNull for SQL NULL. In Spark, NaN also has special equality/order semantics, including comparing equal to NaN. A string containing "NaN" is still a string until interpreted or converted.

## 4. How do you replace missing values?

These operations return new DataFrames. They do not change the original df or its temporary view in place.

### A. fillna

```python
filled_df = df.fillna({
    "department": "UNKNOWN",
    "salary": 0
})
```

Illustrative filled values:

| employee_id | department | salary |
| --- | --- | --- |
| 101 | IT | 50000 |
| 102 | UNKNOWN | 60000 |
| 103 | HR | 0 |
| 104 | UNKNOWN | 0 |

fillna also handles NaN for applicable floating-point columns. Use defaults compatible with each column type. Empty strings and ordinary zeros are not automatically considered missing.

Replacing a missing salary with zero can change averages and other metrics. Treat this as a semantic decision, not merely a convenient cleaning operation.

### B. SQL coalesce

coalesce returns the first non-null expression:

```python
from pyspark.sql.functions import coalesce, lit

salary_fallback = df.withColumn(
    "salary",
    coalesce(col("salary"), lit(0))
)
```

```sql
SELECT
    employee_id,
    COALESCE(salary, 0) AS salary
FROM employees;
```

It can also choose among multiple columns. Define both candidate columns before referencing them:

```python
name_df = spark.createDataFrame(
    [(None, "Rahul"), ("Priya Sharma", "Priya"), (None, None)],
    "full_name STRING, name STRING"
)

named_df = name_df.withColumn(
    "customer_name",
    coalesce(
        col("full_name"),
        col("name"),
        lit("UNKNOWN")
    )
)
```

An empty string or NaN is non-null, so coalesce does not automatically replace either. The SQL function is also distinct from DataFrame.coalesce(n), which changes partition count.

### C. Conditional handling

```python
from pyspark.sql.functions import when

salary_status = df.withColumn(
    "salary_status",
    when(col("salary").isNull(), "Missing")
    .otherwise("Available")
)
```

This checks NULL only. Include a separate NaN rule if the business definition of missing salary includes NaN.

## 5. How do you remove missing-value rows?

### Drop rows with any NULL/NaN

```python
complete_rows = df.dropna()
```

By default, this considers all columns. In the original sample, only Rahul's row remains.

### Drop rows only when all considered values are missing

```python
not_all_missing = df.dropna(how="all")
```

None of the original rows is entirely missing because every row has an employee ID and name. Use subset if only selected fields define completeness.

### Require selected columns

```python
required_fields = df.dropna(
    subset=["employee_id", "salary"]
)
```

This retains the original Rahul and Priya rows.

### Keep at least two present values

```python
at_least_two = df.dropna(thresh=2)
```

thresh counts non-null/non-NaN values among the considered columns and takes precedence over how. The original sample keeps all four rows because ID and name already meet that threshold. Empty strings and zero count as present values.

## 6. How do aggregations handle NULL?

Use a separate aggregation example, where Neha's salary is 90000:

| Employee | Salary |
| --- | --- |
| Rahul | 50000 |
| Priya | 60000 |
| Amit | NULL |
| Neha | 90000 |

```python
aggregate_df = spark.createDataFrame(
    [("Rahul", 50000.0), ("Priya", 60000.0),
     ("Amit", None), ("Neha", 90000.0)],
    "name STRING, salary DOUBLE"
)

aggregate_df.createOrReplaceTempView("aggregation_employees")
```

```sql
SELECT
    COUNT(*) AS total_rows,
    COUNT(salary) AS salary_count,
    SUM(salary) AS total_salary,
    AVG(salary) AS avg_salary
FROM aggregation_employees;
```

| Aggregation | Result |
| --- | --- |
| COUNT(*) | 4 |
| COUNT(salary) | 3 |
| SUM(salary) | 200000 |
| AVG(salary) | Approximately 66666.67 |

COUNT(*) counts rows. COUNT(column) counts non-null values. SUM, AVG, MIN, and MAX ignore NULL inputs; when all inputs are NULL, those aggregates return NULL and COUNT(column) returns zero.

AVG divides by the number of non-null values, not every row. Filling null salaries with zero before averaging changes the denominator and the result.

NaN is not skipped merely because NULL is skipped. COUNT(column) includes NaN, and NaN can affect numeric aggregate results.

## 7. How do joins handle NULL keys?

Use separate join inputs:

| employee_id | department_id |
| --- | --- |
| 101 | 1 |
| 102 | NULL |

| department_id | department_name |
| --- | --- |
| 1 | IT |
| NULL | Unknown |

```python
join_employees = spark.createDataFrame(
    [(101, 1), (102, None)],
    "employee_id INT, department_id INT"
)
join_departments = spark.createDataFrame(
    [(1, "IT"), (None, "Unknown")],
    "department_id INT, department_name STRING"
)

join_employees.createOrReplaceTempView("employees_for_join")
join_departments.createOrReplaceTempView("departments_for_join")
```

### Ordinary equality

```python
normal_join = join_employees.join(
    join_departments,
    join_employees.department_id == join_departments.department_id,
    "inner"
)
```

Only employee 101 matches: NULL = NULL is UNKNOWN.

### Null-safe equality

```python
null_safe_join = join_employees.join(
    join_departments,
    join_employees.department_id.eqNullSafe(
        join_departments.department_id
    ),
    "inner"
)
```

Equivalent SQL:

```sql
SELECT *
FROM employees_for_join e
JOIN departments_for_join d
ON e.department_id <=> d.department_id;
```

Both employees now match. Use this only when matching missing keys is logically correct. If each side has multiple NULL keys, null-safe matching can produce many-to-many combinations and increase row counts.

## 8. How do grouping and sorting handle NULL?

### Grouping

```sql
SELECT department, COUNT(*) AS count
FROM employees
GROUP BY department;
```

For the original dataset:

| department | count |
| --- | --- |
| IT | 1 |
| HR | 1 |
| NULL | 2 |

NULL grouping keys belong to the same group even though ordinary NULL = NULL is UNKNOWN. Group output order is not guaranteed.

### Sorting

```sql
SELECT *
FROM employees
ORDER BY salary ASC NULLS LAST;
```

| SQL sort direction | Default NULL placement |
| --- | --- |
| ASC | NULLS FIRST |
| DESC | NULLS LAST |

Specify NULLS FIRST/LAST when the required ordering should be explicit. Add stable tie-breakers when equal values need reproducible row order.

## 9. Missing data in JSON and Parquet

| Scenario | Behavior |
| --- | --- |
| JSON field missing | Can become NULL when the read schema includes that field |
| Parquet file lacks a requested compatible column | Reader can return NULL for that field |
| Mixed compatible Parquet schemas | Schema merging can reconcile their fields |
| Optional field contains NULL | Processing can continue if the contract permits |
| Required DataFrame column absent | A reference may raise UNRESOLVED_COLUMN |
| Invalid conversion | May return NULL or raise an error, depending on operation/configuration |

For example:

```json
{
  "employee_id": 101,
  "name": "Rahul"
}
```

A read schema including nullable salary can expose NULL for the missing field. An inferred schema may omit salary instead. NULL in an existing column and absence of the column are different conditions; nullable=True is not a complete business-quality validation rule.

## 10. Production practices

| Field/requirement | Handling approach |
| --- | --- |
| Business/primary key | Reject or quarantine NULL when invalid |
| Optional description | Preserve NULL or apply a documented default |
| Monetary amount | Validate meaning; do not blindly substitute zero |
| Join key | Define unmatched and null-safe matching behavior |
| Date/timestamp | Validate before using in time-based logic |
| Aggregation input | Monitor missing values and null-skipping effects |
| Newly added optional field | Permit historical NULLs only with consumer support |

For a separate transaction DataFrame whose amount is DOUBLE, an illustrative missing/NaN check is:

```python
from pyspark.sql.functions import col, isnan

invalid_condition = (
    col("transaction_id").isNull()
    | col("amount").isNull()
    | isnan(col("amount"))
)

invalid_df = transactions.filter(invalid_condition)
valid_df = transactions.filter(~invalid_condition)
```

This is not complete transaction validation; add applicable range, infinity, format, and business checks. Retain raw values and reasons for quarantine. Monitor null percentages, missing keys, excluded records, and changes in aggregate completeness.

## 11. Interview-ready answer

> Spark follows SQL three-valued logic: conditions can be TRUE, FALSE, or UNKNOWN. WHERE keeps only TRUE, so ordinary comparisons with NULL do not behave like IS NULL.
>
> I use isNull/isNotNull to detect NULL, isnan for floating-point NaN, fillna for applicable replacements, coalesce for a first non-null fallback, and dropna with explicit subset/threshold rules.
>
> Aggregations typically skip NULL inputs except COUNT(*). Ordinary equality joins do not match NULL keys; null-safe equality does. GROUP BY groups NULL keys together, and sorting supports explicit null placement.
>
> I distinguish missing values from absent columns and avoid automatic defaults that change business meaning. Critical missing data is validated and quarantined, with null rates and aggregate completeness monitored.

**Key takeaway:** Choose handling based on the exact missing-data case and its effect on filtering, joins, aggregates, and business meaning.
