# How does ANSI mode affect null handling?

ANSI mode makes Spark stricter about invalid casts, arithmetic errors, and certain other operations. An invalid operation that returns NULL or wraps a value with ANSI disabled can raise an exception with ANSI enabled.

It does not redefine ordinary SQL NULL semantics. A missing value still propagates through ordinary arithmetic, COUNT(column) still excludes NULL, and null-safe equality still compares two NULLs as equal. The distinction is legitimate missing data versus an invalid operation.

## 1. ANSI enabled versus disabled

| Expression/scenario | ANSI enabled | ANSI disabled |
| --- | --- | --- |
| CAST('abc' AS INT) | Error | NULL |
| 100 / 0 | Error | NULL |
| INT expression 2147483647 + 1 | Overflow error | Wraps to -2147483648 |
| CAST('not-a-date' AS DATE) | Error | NULL |
| element_at(array(10, 20), 3) | Out-of-bounds error | NULL |
| NULL + 10 | NULL | NULL |
| NULL = NULL | NULL (UNKNOWN) | NULL (UNKNOWN) |
| NULL <=> NULL | TRUE | TRUE |
| COALESCE(NULL, 100) | 100 | 100 |
| COUNT(column) | Excludes NULL | Excludes NULL |

These are specific Spark SQL examples, not a promise that every function has identical error behavior. Function, data type, Spark version, and other parser options can matter. Disabling ANSI does not make every invalid operation return NULL: integral arithmetic can wrap, while decimal overflow can return NULL.

ANSI mode can also change type-coercion rules. NULL semantics remain the same for otherwise equivalent, successfully resolved expressions; expressions that introduce incompatible types or invalid implicit casts can behave differently.

## 2. Invalid STRING-to-INT conversion

| employee_id | salary STRING |
| --- | --- |
| 101 | "50000" |
| 102 | "60000" |
| 103 | "INVALID" |

Define the input and view:

```python
from pyspark.sql import functions as F

df = spark.createDataFrame(
    [(101, "50000"), (102, "60000"), (103, "INVALID")],
    "employee_id INT, salary STRING"
)
df.createOrReplaceTempView("employees")
```

### ANSI disabled

```python
spark.conf.set("spark.sql.ansi.enabled", "false")

df.selectExpr(
    "employee_id",
    "CAST(salary AS INT) AS salary_int"
).orderBy("employee_id").show()
```

| employee_id | salary_int |
| --- | --- |
| 101 | 50000 |
| 102 | 60000 |
| 103 | NULL |

The malformed salary becomes NULL. If the pipeline treats that like ordinary missing data, it may hide a conversion failure.

### ANSI enabled

```python
spark.conf.set("spark.sql.ansi.enabled", "true")

df.selectExpr(
    "employee_id",
    "CAST(salary AS INT) AS salary_int"
).show()
```

An illustrative error is:

```text
SparkNumberFormatException: [CAST_INVALID_INPUT]
The value 'INVALID' cannot be cast from STRING to INT.
```

Exact exception formatting can vary. Build a new query after changing a configuration when comparing modes; do not assume that changing a session setting rewrites an already analyzed plan.

Errors can surface during planning/optimization or execution, depending on the expression. A constant expression may be evaluated before task execution, so an ANSI error is not necessarily first detected on an executor.

[spark-reference:ansi-cast-outcomes]

## 3. Division by zero

```sql
SELECT 100 / 0;
```

With ANSI disabled, this returns NULL. With ANSI enabled, it raises a division-by-zero error, for example:

```text
SparkArithmeticException: [DIVIDE_BY_ZERO]
Division by zero.
```

This is an invalid calculation, separate from ordinary NULL propagation.

## 4. Normal NULL behavior remains intact

```sql
SELECT
    NULL + 10 AS result1,
    NULL = NULL AS result2,
    NULL <=> NULL AS result3,
    COALESCE(NULL, 100) AS result4;
```

| Expression | Result in either mode |
| --- | --- |
| NULL + 10 | NULL |
| NULL = NULL | NULL |
| NULL <=> NULL | TRUE |
| COALESCE(NULL, 100) | 100 |

Likewise, COUNT(*) counts rows containing NULL; COUNT(column) excludes NULL; and SUM/AVG skip NULL inputs. An ordinary equality join does not match NULL keys, while null-safe equality can match them.

ANSI mode is not a NOT NULL constraint or a complete data-quality validator. A source containing legitimate NULL values does not become invalid merely because ANSI is enabled.

## 5. Handle expected errors with targeted try functions

### A. TRY_CAST

```sql
SELECT
    employee_id,
    salary,
    TRY_CAST(salary AS INT) AS salary_int
FROM employees
ORDER BY employee_id;
```

| employee_id | salary | salary_int |
| --- | --- | --- |
| 101 | "50000" | 50000 |
| 102 | "60000" | 60000 |
| 103 | "INVALID" | NULL |

TRY_CAST tolerates malformed values and supported conversion overflows while keeping ANSI enabled. It is not a universal exception handler: unsupported source/target type combinations can still raise analysis errors. An original NULL also produces NULL, so preserve the source value to distinguish missing input from failed conversion.

### B. TRY_DIVIDE

```sql
SELECT TRY_DIVIDE(100, 0) AS quotient;
-- NULL
```

Other targeted functions include:

| Function | Intended tolerant behavior |
| --- | --- |
| try_cast | NULL for failed values in supported conversions |
| try_divide | NULL for division by zero |
| try_add | NULL for supported arithmetic overflow |
| try_multiply | NULL for supported arithmetic overflow |
| try_sum | NULL for supported aggregate overflow |
| try_element_at | NULL for an out-of-range array position |

The try prefix does not mean all invalid arguments are accepted. In particular, try_element_at uses one-based array positions: index zero still raises an error. Negative positions count from the end; out-of-range nonzero positions return NULL.

For example, these targeted operations return NULL without disabling ANSI:

```sql
SELECT
    TRY_ADD(2147483647, 1) AS overflow_result,
    TRY_ELEMENT_AT(ARRAY(10, 20), 3) AS missing_element;
```

Check function availability and supported types for the deployed Spark release.

## 6. Configuration and defaults

Enable ANSI mode:

```python
spark.conf.set("spark.sql.ansi.enabled", "true")
```

Disable it deliberately for a controlled comparison:

```python
spark.conf.set("spark.sql.ansi.enabled", "false")
```

Inspect the effective value:

```python
spark.conf.get("spark.sql.ansi.enabled")
```

| Apache Spark version | Default ANSI setting |
| --- | --- |
| Spark 3.x | false |
| Spark 4.0+ | true |

Spark 4.0 changed the default. Distribution settings, environment, and application/session overrides can change the effective value, so inspect it during upgrades. The snippets above intentionally change session behavior; choose the intended setting before constructing the actual application queries.

spark.sql.storeAssignmentPolicy is separate. It controls implicit conversions when assigning values to table columns during inserts; disabling ANSI expression mode does not automatically disable table-assignment validation.

## 7. Production example: an apparently valid subtotal

Suppose transaction amounts arrive as strings:

| transaction_id | amount STRING |
| --- | --- |
| 1 | "1000" |
| 2 | "2500" |
| 3 | "INVALID" |
| 4 | "3500" |

```python
raw_transactions = spark.createDataFrame(
    [(1, "1000"), (2, "2500"), (3, "INVALID"), (4, "3500")],
    "transaction_id INT, amount STRING"
)
raw_transactions.createOrReplaceTempView("raw_transactions")
```

With ANSI disabled, this produces 7000.0:

```sql
SELECT SUM(CAST(amount AS DOUBLE)) AS total
FROM raw_transactions;
```

The invalid string becomes NULL and SUM skips it. The value is the subtotal of three known conversions, not evidence of a complete financial total. With ANSI enabled, the same invalid cast raises an error.

### Preserve and classify expected conversion failures

A controlled conversion can keep the raw amount and a reason for rejection:

```python
parsed = raw_transactions.withColumn(
    "amount_decimal",
    F.expr("try_cast(amount AS DECIMAL(18, 2))")
)

classified = parsed.withColumn(
    "quality_reason",
    F.when(F.col("amount").isNull(), F.lit("MISSING_AMOUNT"))
     .when(F.col("amount_decimal").isNull(), F.lit("INVALID_AMOUNT"))
     .otherwise(F.lit(None).cast("string"))
)

quarantine_df = classified.filter(F.col("quality_reason").isNotNull())
accepted_df = classified.filter(F.col("quality_reason").isNull())

classified.agg(
    F.count("*").alias("input_rows"),
    F.count("amount_decimal").alias("parsed_rows"),
    F.count(
        F.when(F.col("quality_reason").isNotNull(), F.lit(1))
    ).alias("quarantined_rows"),
    F.sum("amount_decimal").alias("observed_total")
).show()
```

| Metric | Result |
| --- | --- |
| input_rows | 4 |
| parsed_rows | 3 |
| quarantined_rows | 1 |
| observed_total | 7000.00 |

The rejected row retains transaction_id, the raw INVALID value, and its reason. The example classifies conversion quality only; add range, scale/rounding, currency, mandatory-key, and other business checks as needed. A successful cast alone does not prove validity.

Persist quarantine results and enforce the publication policy before releasing metrics. If completeness is required, block a final total while rejected amounts remain unresolved. If a partial report is permitted, label it and expose rejected counts. TRY_CAST without monitoring can otherwise hide the same missing contribution as a permissive CAST.

## 8. Interview-ready answer

> ANSI mode changes how Spark handles invalid operations, not what NULL means. With ANSI enabled, malformed casts, division by zero, and supported arithmetic overflows raise errors. With it disabled, some operations return NULL and some integral operations can wrap.
>
> Ordinary NULL propagation, COUNT's treatment of NULL, COALESCE, and null-safe equality remain intact. ANSI also affects type-coercion rules, so I check types as well as missing values.
>
> For expected bad input, I use targeted functions such as TRY_CAST and TRY_DIVIDE, preserve raw data, classify failures, and monitor rejected records rather than globally relaxing validation.
>
> Apache Spark 4.0 enabled ANSI by default, whereas Spark 3.x defaulted to false. I verify the effective configuration and test malformed records during upgrades.

**Key takeaway:** ANSI distinguishes invalid operations from legitimate missing data. Tolerant conversions should create measured, explainable NULLs rather than hide failures.
