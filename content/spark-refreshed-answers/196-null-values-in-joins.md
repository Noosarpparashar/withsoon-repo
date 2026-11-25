# How does Spark handle null values in joins?

Spark follows SQL NULL semantics. With ordinary equality (=), two NULL join keys do not match: NULL = NULL evaluates to UNKNOWN, and a join condition must be TRUE to produce a match.

Outer joins can still preserve unmatched rows. To deliberately match NULL keys, use SQL <=> or PySpark eqNullSafe(), and check that the resulting matches make business sense.

## 1. Ordinary equality: example inputs and result

Employees:

| employee_id | department_id |
| --- | --- |
| 101 | 1 |
| 102 | 2 |
| 103 | NULL |
| 104 | 3 |

Departments:

| department_id | department_name |
| --- | --- |
| 1 | IT |
| 2 | HR |
| NULL | Unknown |

Create both DataFrames and views:

```python
from pyspark.sql import functions as F

employees = spark.createDataFrame(
    [(101, 1), (102, 2), (103, None), (104, 3)],
    "employee_id INT, department_id INT"
)
departments = spark.createDataFrame(
    [(1, "IT"), (2, "HR"), (None, "Unknown")],
    "department_id INT, department_name STRING"
)

employees.createOrReplaceTempView("employees")
departments.createOrReplaceTempView("departments")
```

An inner join using =:

```sql
SELECT
    e.employee_id,
    e.department_id,
    d.department_name
FROM employees e
JOIN departments d
    ON e.department_id = d.department_id
ORDER BY e.employee_id;
```

| employee_id | department_id | department_name |
| --- | --- | --- |
| 101 | 1 | IT |
| 102 | 2 | HR |

Employee 103 does not match the NULL department key, because NULL = NULL is UNKNOWN. Employee 104 has no match because department 3 is absent.

The rule applies to the join condition, not every column: a NULL in an unrelated field does not automatically prevent a row from matching.

## 2. Behavior across join types

For the same ordinary equality condition:

| Join type | Behavior |
| --- | --- |
| INNER JOIN | Keeps matching pairs; NULL keys do not match under = |
| LEFT JOIN | Preserves every left row; unmatched right columns become NULL |
| RIGHT JOIN | Preserves every right row; unmatched left columns become NULL |
| FULL OUTER JOIN | Preserves unmatched rows from both sides, including NULL-key rows separately |
| LEFT SEMI JOIN | Keeps left rows with at least one match; NULL keys have no match under = |
| LEFT ANTI JOIN | Keeps left rows with no match, including NULL keys under = |

### LEFT JOIN example

```sql
SELECT
    e.employee_id,
    e.department_id,
    d.department_name
FROM employees e
LEFT JOIN departments d
    ON e.department_id = d.department_id
ORDER BY e.employee_id;
```

| employee_id | department_id | department_name |
| --- | --- | --- |
| 101 | 1 | IT |
| 102 | 2 | HR |
| 103 | NULL | NULL |
| 104 | 3 | NULL |

Employees 103 and 104 remain as unmatched left rows. The right-side department named Unknown is not a match for employee 103 under ordinary equality.

A NULL right-side output can mean either no match or a matched record containing NULL. A nullable right join key is not a reliable match indicator, especially for null-safe joins. Add an explicit marker before the join:

```python
marked_departments = departments.withColumn("_matched", F.lit(True))

left_result = (
    employees.alias("e")
    .join(
        marked_departments.alias("d"),
        F.col("e.department_id") == F.col("d.department_id"),
        "left"
    )
    .select(
        F.col("e.employee_id"),
        F.col("e.department_id"),
        F.col("d.department_name"),
        F.coalesce(F.col("d._matched"), F.lit(False))
         .alias("department_matched")
    )
)
```

department_matched is TRUE for 101/102 and FALSE for 103/104. The marker also works if the condition is changed to null-safe equality: a matched right row carries TRUE even when its key is NULL.

Filtering right-side columns afterward can remove unmatched rows. For example, WHERE d.department_name = 'IT' after a left join does not preserve the NULL-extended rows.

## 3. Null-safe equality

The <=> operator compares NULL values explicitly:

| Left and right values | Result with = | Result with <=> |
| --- | --- | --- |
| 1 and 1 | TRUE | TRUE |
| 1 and 2 | FALSE | FALSE |
| NULL and NULL | NULL (UNKNOWN) | TRUE |
| NULL and 1 | NULL (UNKNOWN) | FALSE |
| 1 and NULL | NULL (UNKNOWN) | FALSE |

### SQL example

```sql
SELECT
    e.employee_id,
    e.department_id,
    d.department_name
FROM employees e
JOIN departments d
    ON e.department_id <=> d.department_id
ORDER BY e.employee_id;
```

| employee_id | department_id | department_name |
| --- | --- | --- |
| 101 | 1 | IT |
| 102 | 2 | HR |
| 103 | NULL | Unknown |

Employee 103 now matches the NULL-key department. Employee 104 still has no match.

### PySpark equivalent

```python
result = (
    employees.alias("e")
    .join(
        departments.alias("d"),
        F.col("e.department_id").eqNullSafe(
            F.col("d.department_id")
        ),
        "inner"
    )
    .select(
        F.col("e.employee_id"),
        F.col("e.department_id"),
        F.col("d.department_name")
    )
    .orderBy("employee_id")
)
```

eqNullSafe is the PySpark equivalent of <=>. It does not mean missing identifiers refer to the same real entity; that interpretation requires an explicit business rule.

For composite equi-join keys joined with AND, each component comparison must permit the whole condition to be TRUE. Applying null-safe equality to one component does not make ordinary equality on another nullable component null-safe.

## 4. Multiple NULL keys can multiply rows

Consider separate inputs:

| employee_id | department_id |
| --- | --- |
| 101 | NULL |
| 102 | NULL |

| department_id | department_name |
| --- | --- |
| NULL | Unknown A |
| NULL | Unknown B |
| NULL | Unknown C |

With an ordinary inner equality join, these inputs produce zero matching rows. With null-safe equality, each of the two employees matches all three departments: 2 × 3 = 6 rows.

[spark-reference:null-safe-null-matches]

A runnable comparison:

```python
null_employees = spark.createDataFrame(
    [(101, None), (102, None)],
    "employee_id INT, department_id INT"
)
null_departments = spark.createDataFrame(
    [(None, "Unknown A"), (None, "Unknown B"), (None, "Unknown C")],
    "department_id INT, department_name STRING"
)

ordinary_count = null_employees.alias("e").join(
    null_departments.alias("d"),
    F.col("e.department_id") == F.col("d.department_id"),
    "inner"
).count()

null_safe_count = null_employees.alias("e").join(
    null_departments.alias("d"),
    F.col("e.department_id").eqNullSafe(F.col("d.department_id")),
    "inner"
).count()

print(ordinary_count, null_safe_count)  # 0 6
```

In general, M NULL-key rows on one side and N on the other produce M × N matches for a single null-safe join key. Additional predicates can restrict the matches. Large matching groups can increase output size and computation; a shuffle-based plan can also concentrate this work and suffer skew.

## 5. LEFT ANTI JOIN is not always equivalent to NOT IN

Return employees with no ordinary-equality match:

```sql
SELECT e.*
FROM employees e
LEFT ANTI JOIN departments d
    ON e.department_id = d.department_id
ORDER BY e.employee_id;
```

For the original inputs, this returns employees 103 and 104, including the NULL-key employee.

Now compare:

```sql
SELECT *
FROM employees
WHERE department_id NOT IN (
    SELECT department_id
    FROM departments
);
```

This returns no rows for the original inputs. Keys 1 and 2 are present, so their NOT IN result is FALSE. Key 3 has no equal value, but the subquery's NULL makes its result UNKNOWN. The NULL employee key also does not satisfy the predicate. WHERE retains neither FALSE nor UNKNOWN.

Spark preserves these null-aware subquery semantics; a NOT IN plan cannot generally be replaced with an ordinary equality anti join without considering them.

If the requirement is ordinary-equality nonexistence, a correlated NOT EXISTS expresses that condition:

```sql
SELECT e.*
FROM employees e
WHERE NOT EXISTS (
    SELECT 1
    FROM departments d
    WHERE e.department_id = d.department_id
)
ORDER BY e.employee_id;
```

For these inputs it returns the same employees 103/104 as the ordinary LEFT ANTI JOIN. Choose the intended missing-key semantics before choosing the syntax.

## 6. Performance and production handling

- Ordinary equi-joins: Catalyst can filter NULL keys from sides where they cannot affect the output, subject to the join type and condition.
- Outer joins: NULL-key rows on the preserved side must remain unless another explicit operation removes them.
- Null-safe joins: Profile the NULL-key counts and expected matching cardinality on both sides.
- Shared default keys: Replacing every NULL with -1 or an empty string can create unintended matches, collide with real values, and concentrate work on one key.

For an ordinary inner join, explicitly excluding invalid NULL employee keys is reasonable:

```python
result = (
    employees.filter(F.col("department_id").isNotNull())
    .join(departments, "department_id", "inner")
)
```

Catalyst may already infer the same filtering, so the explicit filter does not guarantee a speed improvement. Applying it before a left outer join would remove rows that the join would otherwise preserve.

Inspect the execution plan and actual row counts. Null-safe matching does not always imply a shuffle: the physical join strategy, including broadcasting, determines data movement. Separately, NaN is not NULL; Spark SQL has its own NaN comparison and join semantics.

## 7. Interview-ready answer

> Spark follows SQL NULL semantics. Ordinary equality does not match two NULL join keys because NULL = NULL is UNKNOWN. Inner joins therefore exclude those unmatched rows, while outer joins preserve unmatched rows according to the join type.
>
> SQL <=> and PySpark eqNullSafe allow NULL keys to match deliberately. I use them only when that interpretation is correct, because M NULL-key rows joined with N NULL-key rows can generate M × N matches.
>
> An ordinary LEFT ANTI JOIN retains NULL-key left rows with no match, while NOT IN has different null-aware semantics and may return no rows when its subquery includes NULL.
>
> In production, I validate missing keys, monitor join cardinality, distinguish unmatched rows with an explicit match indicator, and avoid shared sentinel keys that accidentally join unrelated records.

**Key takeaway:** Matching and preservation are separate decisions. Ordinary equality leaves NULL keys unmatched; null-safe equality matches them; the join type determines which unmatched rows remain.
