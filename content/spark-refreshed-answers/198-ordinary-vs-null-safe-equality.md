# What is the difference between ordinary equality and null-safe equality in Spark?

Ordinary equality (=) returns UNKNOWN (NULL) when either operand is NULL. Null-safe equality (<=>) returns TRUE for two NULL operands and FALSE when exactly one operand is NULL. Non-null values are compared normally.

In PySpark, use == for ordinary equality and eqNullSafe() for null-safe equality. For supported comparisons, null-safe equality returns TRUE or FALSE rather than UNKNOWN. Both operators still require comparable types; null-safe does not mean invalid casts or other evaluation errors are suppressed.

## 1. Key differences

| Feature | Ordinary equality | Null-safe equality |
| --- | --- | --- |
| SQL operator | = | <=> |
| PySpark expression | == | eqNullSafe() |
| NULL compared with NULL | NULL (UNKNOWN) | TRUE |
| NULL compared with a non-null value | NULL (UNKNOWN) | FALSE |
| Equal non-null values | TRUE | TRUE |
| Different non-null values | FALSE | FALSE |
| Can match NULL join keys? | No | Yes |
| Can the comparison result be NULL? | Yes | No |
| Common use | Standard comparisons and joins | Explicit NULL matching and nullable-field comparisons |

## 2. Truth table and SQL three-valued logic

| Value A | Value B | A = B | A <=> B |
| --- | --- | --- | --- |
| 10 | 10 | TRUE | TRUE |
| 10 | 20 | FALSE | FALSE |
| NULL | NULL | NULL | TRUE |
| NULL | 10 | NULL | FALSE |
| 10 | NULL | NULL | FALSE |

SQL conditions can be TRUE, FALSE, or UNKNOWN. Ordinary equality cannot infer that two unknown values are equal. Null-safe equality explicitly defines two NULL operands as equal for this comparison.

WHERE and join conditions retain matches only when the condition is TRUE. UNKNOWN does not pass. Likewise, negating an UNKNOWN ordinary comparison still yields UNKNOWN; it does not turn it into TRUE.

For nullable scalar values, <=> expresses the null-aware equality meaning of the SQL-standard IS NOT DISTINCT FROM comparison.

## 3. Spark SQL example

```sql
SELECT
    10 = 10 AS normal_equal,
    10 <=> 10 AS null_safe_equal,
    NULL = NULL AS normal_null,
    NULL <=> NULL AS null_safe_null,
    NULL <=> 10 AS null_safe_value;
```

| normal_equal | null_safe_equal | normal_null | null_safe_null | null_safe_value |
| --- | --- | --- | --- | --- |
| TRUE | TRUE | NULL | TRUE | FALSE |

## 4. PySpark example

```python
from pyspark.sql import functions as F

comparison_df = spark.createDataFrame(
    [(1, 1), (1, 2), (None, None), (None, 1)],
    "a INT, b INT"
)

comparison_result = comparison_df.select(
    "a",
    "b",
    (F.col("a") == F.col("b")).alias("normal_equal"),
    F.col("a").eqNullSafe(F.col("b")).alias("null_safe_equal")
)

comparison_result.show()
```

Expected values, shown in input order for illustration:

```text
+----+----+------------+---------------+
|   a|   b|normal_equal|null_safe_equal|
+----+----+------------+---------------+
|   1|   1|        true|           true|
|   1|   2|       false|          false|
|NULL|NULL|        NULL|           true|
|NULL|   1|        NULL|          false|
+----+----+------------+---------------+
```

Result order is not guaranteed without an ordering operation. Also, NaN is not NULL: Spark SQL applies its own floating-point NaN semantics, including treating two NaNs as equal under ordinary equality as well.

## 5. How does this affect joins?

Employees:

| employee_id | department_id |
| --- | --- |
| 101 | 1 |
| 102 | NULL |
| 103 | 2 |

Departments:

| department_id | department_name |
| --- | --- |
| 1 | IT |
| NULL | Unknown |
| 2 | HR |

Define these inputs independently from comparison_df:

```python
employees = spark.createDataFrame(
    [(101, 1), (102, None), (103, 2)],
    "employee_id INT, department_id INT"
)
departments = spark.createDataFrame(
    [(1, "IT"), (None, "Unknown"), (2, "HR")],
    "department_id INT, department_name STRING"
)

employees.createOrReplaceTempView("employees")
departments.createOrReplaceTempView("departments")
```

### A. Ordinary inner equality join

```sql
SELECT
    e.employee_id,
    d.department_name
FROM employees e
INNER JOIN departments d
    ON e.department_id = d.department_id
ORDER BY e.employee_id;
```

| employee_id | department_name |
| --- | --- |
| 101 | IT |
| 103 | HR |

Employee 102 does not match the NULL-key department because the condition is UNKNOWN.

### B. Null-safe inner equality join

```sql
SELECT
    e.employee_id,
    d.department_name
FROM employees e
INNER JOIN departments d
    ON e.department_id <=> d.department_id
ORDER BY e.employee_id;
```

| employee_id | department_name |
| --- | --- |
| 101 | IT |
| 102 | Unknown |
| 103 | HR |

Employee 102 now matches because NULL <=> NULL is TRUE.

The PySpark equivalent is:

```python
join_result = (
    employees.alias("e")
    .join(
        departments.alias("d"),
        F.col("e.department_id").eqNullSafe(
            F.col("d.department_id")
        ),
        "inner"
    )
    .select(F.col("e.employee_id"), F.col("d.department_name"))
    .orderBy("employee_id")
)
```

An outer join can preserve unmatched NULL-key rows even with ordinary equality. Preserving a row is different from finding a matching partner for it.

## 6. Can null-safe equality cause performance problems?

It can when NULL matching creates an unexpectedly large result. If one side contains 100,000 NULL keys and the other contains 10,000, a single null-safe key condition without additional restrictions produces one billion pairs.

[spark-reference:null-key-billion-pairs]

Such output growth can cause long tasks, memory pressure, spill, and OOM failures. A shuffle-based plan may also concentrate the hot key. The physical join strategy determines whether a join-key shuffle occurs; null-safe equality does not inherently require extra shuffles or a nested-loop join.

Spark can optimize supported null-safe equi-joins with hash-based or sort-merge strategies. The central risk is unintended cardinality, so validate NULL frequencies, key uniqueness, and expected matching rules rather than assuming <=> is intrinsically inefficient.

## 7. When should you use each operator?

| Scenario | Recommended comparison |
| --- | --- |
| Standard equality comparison | = |
| Business-key join where missing IDs must not match | = |
| Compare nullable fields with NULL equal to NULL | <=> |
| Detect changes between aligned old/new values | NOT(old_value <=> new_value) |
| Match missing join keys under an explicit business rule | <=> |
| Avoid matching unrelated missing identifiers | =, with a separate missing-key policy |

### CDC example: detect nullable field changes

Assume old and new records have already been aligned using a stable customer key:

| customer_id | old_email | new_email |
| --- | --- | --- |
| 101 | NULL | NULL |
| 102 | NULL | a@test.com |
| 103 | a@test.com | NULL |
| 104 | a@test.com | a@test.com |

Create a separate change-comparison DataFrame:

```python
cdc_df = spark.createDataFrame(
    [
        (101, None, None),
        (102, None, "a@test.com"),
        (103, "a@test.com", None),
        (104, "a@test.com", "a@test.com")
    ],
    "customer_id INT, old_email STRING, new_email STRING"
)

changed_df = cdc_df.filter(
    ~F.col("old_email").eqNullSafe(F.col("new_email"))
)

cdc_df.createOrReplaceTempView("customer_changes")
```

Equivalent SQL:

```sql
SELECT *
FROM customer_changes
WHERE NOT (old_email <=> new_email)
ORDER BY customer_id;
```

| customer_id | old_email | new_email |
| --- | --- | --- |
| 102 | NULL | a@test.com |
| 103 | a@test.com | NULL |

[spark-reference:null-safe-change-detection]

Ordinary inequality (!=) misses transitions involving NULL because those comparisons return UNKNOWN and fail the filter. Negated null-safe equality detects NULL-to-value and value-to-NULL transitions while treating NULL-to-NULL as unchanged. It also detects different non-null values.

This example detects a field update, not the presence of an entire record. For full CDC, track inserts and deletes separately using row-presence indicators; an absent old/new record is not the same as a present record whose email is NULL. Define any case-folding, trimming, or other normalization before comparing values.

## 8. Interview-ready answer

> Ordinary equality uses = in Spark SQL or == in PySpark. If either operand is NULL, it returns UNKNOWN. Null-safe equality uses <=> or eqNullSafe: two NULLs compare TRUE, one NULL compares FALSE, and non-null values are compared normally.
>
> In joins, ordinary equality leaves NULL keys unmatched, while null-safe equality allows NULL-to-NULL matches. I use that matching rule only when it is meaningful, because multiple NULL keys on both sides can multiply output rows.
>
> Null-safe equality is particularly useful for nullable-field comparisons and change detection. NOT(old_value <=> new_value) detects changes including transitions between NULL and a known value, which ordinary inequality would miss.

**Key takeaway:** Ordinary equality preserves UNKNOWN for NULL comparisons. Null-safe equality defines NULL matching explicitly and is useful when comparing nullable values consistently.
