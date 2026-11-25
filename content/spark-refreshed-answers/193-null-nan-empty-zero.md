# What is the difference between null, NaN, an empty string, and zero?

NULL, NaN, an empty string, and zero describe different facts. NULL means missing or unknown; NaN is a special floating-point Not-a-Number value; an empty string is a present string with no characters; and zero is a present numeric value.

Spark handles them differently in comparisons, filters, joins, aggregations, and cleaning operations. Normalize them only when the business contract calls for it.

## 1. Key differences

[spark-reference:null-nan-empty-zero]

| Feature | NULL | NaN | Empty string "" | Zero 0 |
| --- | --- | --- | --- | --- |
| Meaning | Missing/unknown | Special Not-a-Number value | String with no characters | Numeric zero |
| Data type | Null value in a column's type | FLOAT/DOUBLE | STRING | Numeric |
| Is it NULL? | Yes | No | No | No |
| Is it meaningful data? | No known value | Valid floating-point representation; may violate the business contract | Yes, if permitted | Yes, if permitted |
| Detection | isNull() | isnan() | col == "" | col == 0 |
| COUNT(column) | Excluded | Included | Included | Included |
| SUM/AVG | Ignored | Can propagate NaN | Not a numeric input; requires an explicit conversion policy | Included |
| fillna | Can replace | Can replace in floating-point columns | Not replaced by null filling | Not replaced by null filling |

NULL is not the literal string "NULL", and numeric NaN is not the literal string "NaN". Converting text into a numeric column is a separate parsing step that may fail or yield NULL depending on the operation and configuration.

## 2. Understanding each value

### A. NULL: missing or unknown

An unknown salary can be represented as NULL. In a PySpark row, Python None commonly represents that SQL NULL value.

Ordinary comparisons with NULL return UNKNOWN (NULL), including equality with another NULL:

```sql
SELECT NULL = NULL AS ordinary_equality;
-- NULL
```

Use IS NULL/isNull to test for NULL. Spark also supports null-safe equality:

```sql
SELECT NULL <=> NULL AS null_safe_equality;
-- TRUE
```

WHERE keeps only TRUE, so comparing a column to NULL with ordinary equality does not find missing rows.

### B. NaN: Not a Number

NaN is a special FLOAT/DOUBLE value. It can arrive from source data or calculations; it does not mean that a SQL value is absent.

```python
nan_value = float("nan")
```

Spark SQL has specific NaN semantics:

- NaN = NaN is TRUE.
- NaN keys can match in ordinary equality joins.
- NaN values form one grouping key.
- NaN sorts above every other numeric value, including positive infinity.

These are Spark SQL semantics; do not substitute Python's scalar NaN comparison behavior. Also, an invalid mathematical operation does not invariably produce NaN: some operations can raise an error or return NULL instead.

### C. Empty string: a string with no characters

An empty string is a present STRING value with length zero. It differs from NULL and from a string containing one space.

Use equality with "" to detect an exact empty string. If strings containing only ordinary spaces should count as empty, apply trim first. The default trim rule is not a complete Unicode-whitespace policy; define any broader normalization explicitly.

### D. Zero: a valid numeric value

Zero can mean a known account balance, zero purchases, or a zero bonus. Missing means the value is unknown; zero means the value is known to be zero.

Do not automatically replace missing measurements with zero or discard real zeros. Both decisions change the meaning of the dataset.

## 3. How do aggregations handle them?

Use a separate numeric dataset, with an explicit DOUBLE column:

| Record | Amount |
| --- | --- |
| A | 100 |
| B | 200 |
| C | NULL |
| D | 0 |

```python
transactions = spark.createDataFrame(
    [("A", 100.0), ("B", 200.0), ("C", None), ("D", 0.0)],
    "record STRING, amount DOUBLE"
)
transactions.createOrReplaceTempView("transactions")
```

```sql
SELECT
    COUNT(*) AS total_rows,
    COUNT(amount) AS non_null_count,
    SUM(amount) AS total_amount,
    AVG(amount) AS average_amount
FROM transactions;
```

| Operation | Result | Explanation |
| --- | --- | --- |
| COUNT(*) | 4 | Counts every row |
| COUNT(amount) | 3 | Excludes NULL; includes zero |
| SUM(amount) | 300 | Adds 100 + 200 + 0 |
| AVG(amount) | 100 | Divides 300 by 3 non-null values |

The alias non_null_count is deliberate: COUNT(amount) is not a data-quality validity check. A non-null value can still be invalid for the business.

Now replace record C's NULL with NaN in a new DataFrame:

```python
from pyspark.sql import functions as F

nan_transactions = transactions.withColumn(
    "amount",
    F.when(F.col("record") == "C", F.lit(float("nan")))
     .otherwise(F.col("amount"))
)

nan_summary = nan_transactions.agg(
    F.count("amount").alias("non_null_count"),
    F.sum("amount").alias("total_amount"),
    F.avg("amount").alias("average_amount")
)
nan_summary.show()
```

| Operation on the modified DOUBLE column | Result |
| --- | --- |
| COUNT(amount) | 4 |
| SUM(amount) | NaN |
| AVG(amount) | NaN |

NaN is not skipped like NULL. Zero participates normally and affects AVG's denominator, even though it adds nothing to SUM. Empty strings are non-null strings, so COUNT includes them; do not rely on implicit numeric casting to decide how SUM/AVG should handle them.

## 4. How do you detect all four in PySpark?

Define numeric and string fields separately rather than mixing the four cases into one untyped column:

```python
from pyspark.sql import functions as F

df = spark.createDataFrame(
    [
        (1, None, None),
        (2, float("nan"), ""),
        (3, 0.0, " "),
        (4, 100.0, "Rahul")
    ],
    "id INT, amount DOUBLE, name STRING"
)

null_df = df.filter(F.col("amount").isNull())
nan_df = df.filter(F.isnan(F.col("amount")))
exact_empty_df = df.filter(F.col("name") == "")
empty_or_spaces_df = df.filter(F.trim(F.col("name")) == "")
zero_df = df.filter(F.col("amount") == 0)
```

For this sample, the matching IDs are: NULL → 1; NaN → 2; exact empty string → 2; empty after trim → 2 and 3; zero → 3. The string filters do not include the NULL name because their comparison result is UNKNOWN.

To flag both NULL and NaN in a floating-point column:

```python
missing_or_nan = (
    F.col("amount").isNull()
    | F.isnan(F.col("amount"))
)

invalid_df = df.filter(missing_or_nan)
```

Calling these values invalid is a business rule, not a property of all Spark datasets. A complete numeric quality rule may also need range and infinity checks.

## 5. How do you replace NULL and NaN?

### fillna: replace applicable NULL and NaN values

```python
filled_df = df.fillna({
    "amount": 0.0,
    "name": "UNKNOWN"
})
```

The amount values for IDs 1 and 2 become zero; ID 1's name becomes UNKNOWN. The empty string and space in the other names remain unchanged.

These methods return new DataFrames; the original df is not changed in place. Choose defaults compatible with the column types and business meaning.

### when/trim: handle empty strings explicitly

```python
normalized_names = df.withColumn(
    "name",
    F.when(
        F.col("name").isNull()
        | (F.trim(F.col("name")) == ""),
        F.lit("UNKNOWN")
    ).otherwise(F.col("name"))
)
```

This replaces NULL, empty names, and names containing only ordinary spaces. It preserves the original contents of other names.

### coalesce: first non-null expression

```sql
SELECT COALESCE(CAST('NaN' AS DOUBLE), 0.0) AS result;
-- NaN
```

coalesce does not treat NaN or an empty string as NULL. This is the SQL expression function, distinct from DataFrame.coalesce(n), which controls partitions.

### nanvl: replace NaN, preserve NULL

```python
nan_replaced = df.withColumn(
    "amount",
    F.nanvl(F.col("amount"), F.lit(0.0))
)
```

nanvl takes floating-point inputs. For this sample, ID 2's NaN becomes zero while ID 1's NULL remains NULL.

To replace both with a documented default:

```python
both_replaced = df.withColumn(
    "amount",
    F.coalesce(
        F.nanvl(F.col("amount"), F.lit(0.0)),
        F.lit(0.0)
    )
)
```

For a DOUBLE amount column:

| Input | coalesce(amount, 0.0) | nanvl(amount, 0.0) | fillna on amount with 0.0 |
| --- | --- | --- | --- |
| NULL | 0.0 | NULL | 0.0 |
| NaN | NaN | 0.0 | 0.0 |
| 0.0 | 0.0 | 0.0 | 0.0 |
| 100.0 | 100.0 | 100.0 | 100.0 |

Replacing missing amounts with zero changes aggregate completeness and can change averages. Retain a quality indicator or the original value when that distinction matters.

## 6. How do filtering and joins differ?

| Comparison | Spark SQL result |
| --- | --- |
| NULL = NULL | NULL (UNKNOWN) |
| NULL <=> NULL | TRUE |
| CAST('NaN' AS DOUBLE) = CAST('NaN' AS DOUBLE) | TRUE |
| '' = '' | TRUE |
| 0 = 0 | TRUE |
| NULL = 0 | NULL (UNKNOWN) |
| NULL IS NULL | TRUE |
| isnan(CAST('NaN' AS DOUBLE)) | TRUE |

The typed NaN expression matters: the literal string 'NaN' is a different value from numeric NaN.

- Ordinary equality joins do not match two NULL keys; null-safe equality can.
- Spark SQL equality joins can match two NaN keys in floating-point columns.
- Empty-string keys match other empty-string keys.
- Zero keys match other zero keys.

Replacing missing join keys with a shared empty string or zero can therefore create unintended matches. If many records share the replacement key on both sides, the join can multiply rows. Validate key uniqueness and cardinality before applying such a default.

## 7. Production practices

| Situation | Recommended handling |
| --- | --- |
| Mandatory customer ID is NULL | Reject or quarantine with a reason |
| Amount is NaN | Validate and quarantine or normalize under an explicit rule |
| Customer name is empty | Preserve, convert to NULL, or default according to the contract |
| Transaction amount is zero | Preserve when zero is legitimate |
| Financial amount is NULL | Investigate missingness before substituting zero |
| Numeric aggregation contains NaN | Profile and validate inputs before calculating metrics |

Report these categories separately before normalization. The same applies to domain-specific sentinel values such as "N/A" or -1. A missing amount and a known amount of zero express different business facts.

## 8. Interview-ready answer

> NULL represents a missing or unknown value. Ordinary comparisons involving NULL return UNKNOWN, so I use isNull/isNotNull or null-safe equality when appropriate.
>
> NaN is a special floating-point value, not NULL. I detect it with isnan. Spark SQL treats NaN values as equal for comparisons and joins, and numeric aggregates can propagate NaN.
>
> An empty string is a present string containing zero characters. Zero is a present numeric value and participates normally in arithmetic and averages.
>
> COUNT(column) excludes NULL but includes the other three. fillna can replace NULL and floating-point NaN; coalesce replaces NULL only; nanvl replaces NaN only. Empty strings require a separate rule.
>
> In production, I preserve legitimate zeros, define how blanks and missing values should be handled, and validate inputs before joins and critical aggregations.

**Key takeaway:** Missing, Not-a-Number, empty, and zero are different states. Cleaning them into the same default can change calculations and join results.
