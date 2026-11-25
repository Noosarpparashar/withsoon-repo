# What is the difference between a left anti join and a left semi join?

In Apache Spark, Left Semi Join and Left Anti Join are used to filter rows from the left DataFrame based on whether matching records exist in the right DataFrame.

The main difference is:

- Left Semi Join: Returns rows from the left DataFrame that have a match in the right DataFrame.
- Left Anti Join: Returns rows from the left DataFrame that do not have a match in the right DataFrame.

Both return only columns from the left DataFrame.

## 1. Example with sample data

Consider two DataFrames:

Employees (Left)

| ID | Name    |
| -- | ------- |
| 1  | Alice   |
| 2  | Bob     |
| 3  | Charlie |
| 4  | David   |

Active Employees (Right)

| ID |
| -- |
| 1  |
| 3  |
| 5  |

[spark-semi-anti-explorer]

## 2. PySpark implementation

### A. Left Semi Join

```python
result = employees_df.join(
    active_df,
    on="id",
    how="left_semi"
)
```

Equivalent SQL:

```sql
SELECT *
FROM employees e
WHERE EXISTS (
    SELECT 1
    FROM active_employees a
    WHERE e.id = a.id
);
```

Use case: Find employees who are active.

### B. Left Anti Join

```python
result = employees_df.join(
    active_df,
    on="id",
    how="left_anti"
)
```

Equivalent SQL:

```sql
SELECT *
FROM employees e
WHERE NOT EXISTS (
    SELECT 1
    FROM active_employees a
    WHERE e.id = a.id
);
```

Use case: Find employees who are not active.

## 3. Key differences

| Feature                   | Left Semi Join            | Left Anti Join            |
| ------------------------- | ------------------------- | ------------------------- |
| Returns matching rows     | Yes                       | No                        |
| Returns non-matching rows | No                        | Yes                       |
| Columns returned          | Left DataFrame only       | Left DataFrame only       |
| Right-side columns        | Not included              | Not included              |
| SQL equivalent            | `EXISTS`                  | `NOT EXISTS`              |
| Primary purpose           | Inclusion filtering       | Exclusion filtering       |
| Duplicate right-side keys | Do not multiply left rows | Do not multiply left rows |

## 4. Why use Semi/Anti instead of Inner/Left Join?

Suppose the right DataFrame contains duplicate IDs:

Employees:

| ID | Name  |
| -- | ----- |
| 1  | Alice |

Active Employees:

| ID |
| -- |
| 1  |
| 1  |
| 1  |

An Inner Join produces three rows:

```text
1  Alice
1  Alice
1  Alice
```

A Left Semi Join produces only one:

```text
1  Alice
```

This happens because a Semi Join checks whether at least one matching record exists, rather than generating every matching combination.

Similarly, a Left Anti Join checks whether no matching record exists.

Both approaches can avoid unnecessary duplicate generation and reduce processing when only existence information is required.

One important distinction: duplicate rows already present in the left DataFrame are still preserved if they satisfy the join condition.

## 5. Real-world Data Engineering use cases

| Scenario                                             | Join      |
| ---------------------------------------------------- | --------- |
| Find customers who placed at least one order         | Left Semi |
| Find customers who never placed an order             | Left Anti |
| Identify records missing from a target table         | Left Anti |
| Filter transactions belonging to valid accounts      | Left Semi |
| Identify orphan records without matching parent keys | Left Anti |
| Find records not yet processed by an ETL pipeline    | Left Anti |

For example, identifying new records for incremental processing:

```python
new_records = source_df.join(
    target_df.select("id"),
    on="id",
    how="left_anti"
)
```

This returns source records whose IDs do not exist in the target. It is useful for insert-only incremental loads, but it will not detect updates to existing IDs.

## 6. Important interview point: NULL handling

With a standard equality join condition, `NULL` does not match `NULL`.

For example, if both DataFrames contain `id = NULL`:

- Left Semi Join does not consider those null keys matching.
- Left Anti Join includes the left row with the null key, provided it has no other match.

You can use Spark's null-safe equality operator (`<=>` in SQL or `eqNullSafe()` in PySpark) when you intentionally want null keys to match.

Also, `NOT IN` in SQL can behave differently from `NOT EXISTS` when the right side contains NULL values, so `NOT EXISTS` is generally a clearer equivalent for a Left Anti Join.

## Interview-ready answer

> A Left Semi Join returns rows from the left DataFrame that have at least one matching record in the right DataFrame, whereas a Left Anti Join returns rows from the left DataFrame that have no matching record in the right DataFrame.

> Both return only columns from the left DataFrame and do not duplicate left-side rows because of multiple matches on the right.

> Left Semi Join is equivalent to an `EXISTS` condition in SQL, while Left Anti Join is equivalent to `NOT EXISTS`.

> In Data Engineering, Left Semi Joins are commonly used for filtering valid or existing records, while Left Anti Joins are useful for finding missing, unmatched, or not-yet-processed records.
