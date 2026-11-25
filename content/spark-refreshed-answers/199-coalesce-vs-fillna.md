# What is the difference between coalesce() and fillna()?

functions.coalesce() returns the first non-NULL expression, so it can choose a fallback from another column. DataFrame.fillna() replaces missing values in selected columns with specified constants and returns a new DataFrame.

Both use native Spark operations. Their main difference is expression-based fallback versus fixed replacement values, with an important distinction for floating-point NaN.

## 1. Key differences

| Feature | functions.coalesce() | DataFrame.fillna() |
| --- | --- | --- |
| API | Spark SQL expression function | DataFrame method; alias of na.fill() |
| Purpose | Select the first non-NULL expression | Replace missing values with constants |
| Input | Columns/expressions, including literal fallbacks | A constant value or column-to-constant dictionary |
| Output | A Column expression | A new DataFrame |
| Dynamic fallback | Yes, including another column's value | No column-dependent replacement |
| Multiple fallback columns | Supported in one expression | Not supported as a fallback chain |
| Several output columns | Build an expression for each result | Can fill several columns in one call |
| SQL interface | COALESCE(...) | No direct fillna() SQL function |
| Floating-point NaN | Preserved because NaN is not NULL | Can replace NaN in FLOAT/DOUBLE columns |
| Typical use | Choose among current/legacy or preferred/backup fields | Apply approved literal defaults |

[spark-reference:coalesce-vs-fillna-values]

Both are lazy when used to build a DataFrame query. Neither call by itself materializes all the data. Assign or use the returned expression/DataFrame; these examples do not modify the original inputs in place.

## 2. coalesce(): fallback across expressions

Consider an email dataset:

| employee_id | primary_email | secondary_email |
| --- | --- | --- |
| 101 | a@gmail.com | a@yahoo.com |
| 102 | NULL | b@yahoo.com |
| 103 | NULL | NULL |
| 104 | d@gmail.com | NULL |

Define this input explicitly:

```python
from pyspark.sql import functions as F

email_df = spark.createDataFrame(
    [
        (101, "a@gmail.com", "a@yahoo.com"),
        (102, None, "b@yahoo.com"),
        (103, None, None),
        (104, "d@gmail.com", None)
    ],
    "employee_id INT, primary_email STRING, secondary_email STRING"
)

email_df.createOrReplaceTempView("employee_emails")
```

Prefer primary_email, then secondary_email, then a constant:

```python
email_result = email_df.withColumn(
    "email",
    F.coalesce(
        F.col("primary_email"),
        F.col("secondary_email"),
        F.lit("UNKNOWN")
    )
)
```

Selected output columns:

| employee_id | email |
| --- | --- |
| 101 | a@gmail.com |
| 102 | b@yahoo.com |
| 103 | UNKNOWN |
| 104 | d@gmail.com |

Equivalent SQL:

```sql
SELECT
    employee_id,
    COALESCE(
        primary_email,
        secondary_email,
        'UNKNOWN'
    ) AS email
FROM employee_emails;
```

The argument order defines fallback priority. If all expressions are NULL, the result is NULL; an appropriate non-null literal provides a final default. In PySpark, use lit("UNKNOWN") for a constant rather than treating UNKNOWN as a column name.

An empty string is non-null and therefore wins over a later email fallback. Normalize blanks explicitly first only if the business rule defines them as missing. The expressions must resolve to a compatible result type; inspect types and casts when combining different fields.

## 3. fillna(): fixed defaults across columns

Use a separate salary dataset:

| employee_id | department | salary |
| --- | --- | --- |
| 101 | IT | 50000 |
| 102 | NULL | 60000 |
| 103 | HR | NULL |
| 104 | NULL | NULL |

```python
salary_df = spark.createDataFrame(
    [
        (101, "IT", 50000.0),
        (102, None, 60000.0),
        (103, "HR", None),
        (104, None, None)
    ],
    "employee_id INT, department STRING, salary DOUBLE"
)

filled_df = salary_df.fillna({
    "department": "UNKNOWN",
    "salary": 0.0
})
```

| employee_id | department | salary |
| --- | --- | --- |
| 101 | IT | 50000 |
| 102 | UNKNOWN | 60000 |
| 103 | HR | 0 |
| 104 | UNKNOWN | 0 |

The dictionary assigns a fixed replacement for each named column. It cannot select that row's value from a different column.

### One default for several columns

Define bonus before including it in subset:

```python
bonus_df = salary_df.withColumn(
    "bonus",
    F.lit(None).cast("double")
)

filled_bonus_df = bonus_df.fillna(
    0.0,
    subset=["salary", "bonus"]
)
```

This fills salary/bonus while leaving department unchanged. With a scalar replacement and subset, columns of incompatible types are ignored. With a dictionary, subset is ignored: the dictionary's keys specify the target columns. Use compatible defaults and review the resulting schema and values.

Neither fillna nor coalesce treats ordinary zeros or empty strings as missing automatically. These are present values unless an explicit rule says otherwise.

## 4. When do they produce the same values?

For this DOUBLE salary column containing NULL but no NaN, these produce the same salary values:

```python
coalesced_salary = salary_df.withColumn(
    "salary",
    F.coalesce(F.col("salary"), F.lit(0.0))
)
```

```python
filled_salary = salary_df.fillna({"salary": 0.0})
```

Both use a type-compatible zero for the NULL salaries. Do not assume identical behavior for arbitrary input types, NaN values, or metadata just because these example values agree.

### Dynamic fallback needs an expression

Define a salary-history input with both candidate columns:

```python
salary_history_df = spark.createDataFrame(
    [
        (101, 50000.0, 45000.0),
        (102, None, 60000.0),
        (103, None, None)
    ],
    "employee_id INT, salary DOUBLE, previous_salary DOUBLE"
)

salary_fallback = salary_history_df.withColumn(
    "resolved_salary",
    F.coalesce(
        F.col("salary"),
        F.col("previous_salary"),
        F.lit(0.0)
    )
)
```

The resolved salaries are 50000, 60000, and 0 for employees 101, 102, and 103. fillna cannot implement this row-dependent fallback using previous_salary.

## 5. NULL and NaN are handled differently

For a FLOAT/DOUBLE column:

| Input value | coalesce(value, 0.0) | fillna on that column with 0.0 |
| --- | --- | --- |
| NULL | 0 | 0 |
| NaN | NaN | 0 |
| 100 | 100 | 100 |
| 0 | 0 | 0 |

NaN is a non-null floating-point value. coalesce chooses it instead of the fallback; fillna can replace it along with NULL in floating-point columns.

A standalone comparison:

```python
numeric_df = spark.createDataFrame(
    [(1, None), (2, float("nan")), (3, 100.0), (4, 0.0)],
    "id INT, value DOUBLE"
)

numeric_coalesced = numeric_df.withColumn(
    "value",
    F.coalesce(F.col("value"), F.lit(0.0))
)
numeric_filled = numeric_df.fillna({"value": 0.0})
```

If the requirement is to replace only NULL while retaining NaN for separate validation, a NULL-only expression is more appropriate. If both should receive a default, use the applicable filling operation deliberately.

Replacing a missing salary with zero is a semantic decision: AVG will then include that zero. Preserve missing-value indicators or quality metrics when defaults could hide incomplete source data.

## 6. Two different operations named coalesce

### Spark SQL expression function

```python
salary_result = salary_df.withColumn(
    "salary",
    F.coalesce(F.col("salary"), F.lit(0.0))
)
```

This computes a value for each row; it does not request repartitioning.

### DataFrame partition method

```python
fewer_partitions = salary_df.coalesce(4)
```

This requests fewer execution partitions through a narrow operation without introducing a full shuffle of its own. If the DataFrame already has fewer than four partitions, it does not increase the count to four. Drastic reductions can reduce parallelism; choose the count according to the workload.

| Operation | Purpose | Result |
| --- | --- | --- |
| functions.coalesce(...) | First non-NULL expression | Column expression |
| DataFrame.fillna(...) | Missing-value replacement using constants | New DataFrame |
| DataFrame.coalesce(n) | Reduce execution partitions | New DataFrame |

## 7. Interview-ready answer

> coalesce and fillna both support missing-value handling, but at different API levels. functions.coalesce returns the first non-NULL expression and can choose dynamically among several columns. fillna returns a DataFrame with approved constant replacements applied to one or more columns.
>
> For example, coalesce(primary_email, secondary_email, 'UNKNOWN') chooses an available email, while fillna with a dictionary can set missing departments to UNKNOWN and missing salaries to zero.
>
> Floating-point fillna can replace NaN as well as NULL; coalesce preserves NaN because it is non-null. Neither automatically replaces empty strings.
>
> Finally, DataFrame.coalesce(n) is a separate operation that reduces partitions. I keep that distinct from the SQL coalesce expression and choose defaults according to business meaning.

**Key takeaway:** Use functions.coalesce for expression-based fallback and fillna for fixed missing-value replacements across DataFrame columns.
