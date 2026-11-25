# Does COUNT(*) include rows containing null values?

Yes. COUNT(*) counts every input row, including a row in which every column is NULL. COUNT(column) counts only rows where that column's value is non-null.

This distinction matters when measuring row counts, field completeness, and data quality. These counts describe the rows reaching the aggregation after any filters and joins.

## 1. Example

Consider this employee table, including a fifth row with all three fields NULL:

| employee_id | name | salary |
| --- | --- | --- |
| 101 | Rahul | 50000 |
| 102 | Priya | NULL |
| 103 | NULL | 70000 |
| 104 | NULL | NULL |
| NULL | NULL | NULL |

Create the same example in PySpark with an explicit schema:

```python
df = spark.createDataFrame(
    [
        (101, "Rahul", 50000.0),
        (102, "Priya", None),
        (103, None, 70000.0),
        (104, None, None),
        (None, None, None)
    ],
    "employee_id INT, name STRING, salary DOUBLE"
)

df.createOrReplaceTempView("employees")
```

Execute:

```sql
SELECT
    COUNT(*) AS total_rows,
    COUNT(employee_id) AS employee_count,
    COUNT(name) AS name_count,
    COUNT(salary) AS salary_count
FROM employees;
```

| Aggregation | Result |
| --- | --- |
| COUNT(*) | 5 |
| COUNT(employee_id) | 4 |
| COUNT(name) | 2 |
| COUNT(salary) | 2 |

- COUNT(*) = 5: Every row contributes, including the entirely NULL row.
- COUNT(employee_id) = 4: The NULL employee ID is excluded.
- COUNT(name) = 2: Only Rahul and Priya have non-null names.
- COUNT(salary) = 2: Only the salaries 50000 and 70000 are non-null.

[spark-reference:count-rows-vs-values]

## 2. COUNT(*) vs COUNT(column) vs COUNT(1)

| Expression | Behavior |
| --- | --- |
| COUNT(*) | Counts all input rows |
| COUNT(1) | Counts all input rows because the literal 1 is non-null |
| COUNT(column) | Counts non-null values in that column |
| COUNT(DISTINCT column) | Counts distinct non-null values |
| COUNT(NULL) | Returns zero because the expression is always NULL |

COUNT(*) and COUNT(1) are generally optimized equivalently in Spark. Choose the expression that communicates intent rather than expecting a meaningful performance improvement from switching between them.

COUNT(*) does not mean that Spark must read and materialize every column. Physical execution can prune unused columns or use other supported optimizations while preserving the row-count semantics.

For an ungrouped count over empty input, COUNT(*) and COUNT(column) both return zero. With GROUP BY, empty input produces no groups, so there are no grouped result rows to display.

## 3. PySpark examples

### Count rows and non-null salaries

```python
from pyspark.sql.functions import count, col

df.select(
    count("*").alias("total_rows"),
    count("salary").alias("non_null_salary")
).show()
```

Expected output:

```text
+----------+---------------+
|total_rows|non_null_salary|
+----------+---------------+
|         5|              2|
+----------+---------------+
```

DataFrame.count(), called as df.count(), also returns the total number of rows; it is an action that returns a number to the driver.

### Count NULL salaries

The indicator-sum approach counts one for each NULL salary:

```python
from pyspark.sql.functions import sum as spark_sum, when, coalesce, lit

df.select(
    coalesce(
        spark_sum(
            when(col("salary").isNull(), 1).otherwise(0)
        ),
        lit(0)
    ).alias("null_salary_count")
).show()
```

The coalesce fallback makes this return zero even for empty input, where SUM alone would return NULL.

A simpler equivalent SQL expression is:

```sql
SELECT
    COUNT(*) - COUNT(salary) AS null_salary_count
FROM employees;
```

For the sample:

```text
null_salary_count = 3
```

This difference counts SQL NULL values only. It does not count NaN or empty strings as missing.

## 4. What about NaN and empty strings?

COUNT(column) excludes SQL NULL and includes other non-null values:

| Value | Included in COUNT(column)? |
| --- | --- |
| NULL | No |
| Floating-point NaN | Yes |
| Empty string '' | Yes |
| Numeric zero 0 | Yes |
| String containing a space ' ' | Yes |

These cases belong to appropriate numeric or string columns; they are not all values of the same numeric type.

For example, a separate DOUBLE salary column containing 100, 0, NaN, and NULL has a non-null count of three:

```python
numeric_example = spark.createDataFrame(
    [(100.0,), (0.0,), (float("nan"),), (None,)],
    "salary DOUBLE"
)

numeric_example.select(
    count("salary").alias("non_null_salary")
).show()
# non_null_salary = 3
```

A non-null count is not a count of business-valid records. Add explicit NaN, blank-string, range, and mandatory-field checks when required. Also validate join cardinality: duplicated matches can increase COUNT(*) independently of null handling.

## 5. Interview-ready answer

> Yes, COUNT(*) counts all rows in Apache Spark, including rows with some or all columns NULL.
>
> COUNT(column) counts only rows where that expression is non-null. If 1,000 rows include 200 NULL salaries, COUNT(*) returns 1,000 while COUNT(salary) returns 800.
>
> COUNT(1) behaves like COUNT(*) because the literal 1 is always non-null, and Spark generally optimizes both equivalently.
>
> I can calculate the number of SQL NULL salaries with COUNT(*) - COUNT(salary). NaN, empty strings, and zero are included in COUNT(column), so non-null counts alone are not complete data-quality checks.

**Key takeaway:** COUNT(*) counts rows; COUNT(column) counts non-null values of that expression. An entirely NULL row is still a row.
