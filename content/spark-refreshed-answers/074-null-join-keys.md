# How does Spark handle null join keys?

In Apache Spark, NULL join keys do not match each other by default when using standard equality (`=`).

This follows SQL's three-valued logic, where comparing `NULL = NULL` produces `UNKNOWN`, not `TRUE`.

However, Spark provides the null-safe equality operator (`<=>`) to explicitly treat two NULL values as equal.

## 1. Example: Joining tables containing NULL keys

Consider these DataFrames:

Employees (Left)

| ID   | Name    |
| ---- | ------- |
| 1    | Alice   |
| 2    | Bob     |
| NULL | Charlie |

Departments (Right)

| ID   | Department |
| ---- | ---------- |
| 1    | IT         |
| 3    | HR         |
| NULL | Finance    |

### A. Default Inner Join

```python
result = employees_df.join(
    departments_df,
    "id",
    "inner"
)
```

Result:

| ID | Name  | Department |
| -- | ----- | ---------- |
| 1  | Alice | IT         |

Notice that Charlie and Finance are not matched, even though both have `NULL` IDs.

### B. Null-Safe Inner Join

```python
e = employees_df.alias("e")
d = departments_df.alias("d")

result = (
    e.join(d, e.id.eqNullSafe(d.id), "inner")
     .select("e.id", "e.name", "d.department")
)
```

Result (showing the left ID):

| ID   | Name    | Department |
| ---- | ------- | ---------- |
| 1    | Alice   | IT         |
| NULL | Charlie | Finance    |

Here, the NULL keys match because `eqNullSafe()` treats `NULL` as equal to `NULL`.

## 2. Behavior of NULL keys across join types

The following table summarizes standard equality joins.

| Join type        | Behavior of NULL join keys                                                      |
| ---------------- | ------------------------------------------------------------------------------- |
| Inner Join       | NULL keys do not match; those rows are excluded                                 |
| Left Outer Join  | Left rows with NULL keys are preserved, with NULL values for right-side columns |
| Right Outer Join | Right rows with NULL keys are preserved, with NULL values for left-side columns |
| Full Outer Join  | Unmatched NULL-key rows from both sides are preserved separately                |
| Left Semi Join   | Left rows with NULL keys are excluded                                           |
| Left Anti Join   | Left rows with NULL keys are included                                           |
| Cross Join       | NULL keys do not affect matching because there is no join-key condition         |

These behaviors assume the join condition uses normal equality, without additional predicates.

## 3. Difference between `=` and `<=>`

| Comparison       | Standard `=`   | Null-safe `<=>` |
| ---------------- | -------------- | --------------- |
| `1` vs `1`       | TRUE           | TRUE            |
| `1` vs `2`       | FALSE          | FALSE           |
| `1` vs `NULL`    | NULL (unknown) | FALSE           |
| `NULL` vs `NULL` | NULL (unknown) | TRUE            |

In SQL:

```sql
-- Standard equality join
SELECT *
FROM employees e
JOIN departments d
    ON e.id = d.id;

-- Null-safe equality join
SELECT *
FROM employees e
JOIN departments d
    ON e.id <=> d.id;
```

## 4. Can NULL keys cause row multiplication?

Yes, when null-safe equality is used.

Suppose:

- Left table contains 100 rows with `id = NULL`.
- Right table contains 50 rows with `id = NULL`.

With standard equality:

**NULL-key matches = 0**

With null-safe equality:

**NULL-key matches = 100 x 50 = 5,000**

This can lead to unexpected join-output growth.

## 5. How does Spark handle NULL keys internally?

For an ordinary equi-join, Spark's optimizer can push `isnotnull()` filters onto join keys for join types where NULL keys cannot contribute to the output.

For example, an Inner Join may generate a physical plan containing:

```text
SortMergeJoin [id], [id], Inner
  :- Sort
  :   +- Exchange
  :       +- Filter isnotnull(id)
  :           +- Scan Employees
  +- Sort
      +- Exchange
          +- Filter isnotnull(id)
              +- Scan Departments
```

This helps Spark avoid unnecessary processing of NULL-key rows.

However, Spark cannot simply remove NULL-key rows for every join type. In a Left Outer Join, for example, it must preserve left-side rows even if their keys are NULL.

## 6. Best practices for handling NULL join keys

### A. Remove NULL keys when they are invalid

```python
clean_df = df.filter(df.id.isNotNull())
```

### B. Use null-safe equality when NULL-to-NULL matching is required

```python
result = df1.join(
    df2,
    df1.id.eqNullSafe(df2.id),
    "inner"
)
```

### C. Avoid blindly replacing NULL with default values

```python
df.fillna({"id": -1})
```

This can create incorrect matches if `-1` is a valid ID. It can also cause multiple missing keys to match one another.

### D. Be careful with `NOT IN`

A SQL `NOT IN` subquery can behave differently from a standard Left Anti Join when the right side contains NULL values. This happens because `NOT IN` follows SQL NULL-aware semantics.

For finding unmatched records, `NOT EXISTS` or an explicitly defined Left Anti Join is often clearer.

## Interview-ready answer

> Spark follows SQL NULL semantics when joining DataFrames. By default, NULL join keys do not match each other because `NULL = NULL` evaluates to UNKNOWN.

> For an Inner Join, rows containing NULL join keys are excluded from matches. For outer joins, unmatched rows are preserved according to the join type. A Left Anti Join retains left-side rows with NULL join keys when using standard equality.

> If we explicitly want NULL values to match, Spark provides the null-safe equality operator `<=>` in SQL or `eqNullSafe()` in PySpark.

> Spark can also optimize ordinary equi-joins by filtering NULL keys when they cannot contribute to the result.

**Key takeaway:** Standard equality joins do not match NULL keys, while null-safe equality joins do. Choosing the wrong behavior can lead to missing records or unexpected row multiplication.