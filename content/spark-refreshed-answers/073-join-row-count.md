# Can joining two tables increase the row count?

Yes. Joining two tables in Apache Spark can increase the row count, sometimes significantly, depending on the join type and whether the join keys contain duplicate values.

The most common reason is a one-to-many or many-to-many relationship between the joining tables.

## 1. How joins affect row counts

| Join relationship | Example                         | Output rows |
| ----------------- | ------------------------------- | ----------- |
| One-to-one        | 1 left row matches 1 right row  | 1           |
| One-to-many       | 1 left row matches 5 right rows | 5           |
| Many-to-one       | 5 left rows match 1 right row   | 5           |
| Many-to-many      | 5 left rows match 4 right rows  | 20          |
| Cross join        | 100 left rows × 200 right rows  | 20,000      |

For an inner equi-join, if a non-null key appears M times in the left table and N times in the right table, the join produces:

**Output rows for that key = M x N**

## 2. Example: Many-to-many join

Consider these two DataFrames:

Orders

| Order ID | Customer ID |
| -------- | ----------- |
| O1       | C101        |
| O2       | C101        |
| O3       | C102        |

Payments

| Payment ID | Customer ID |
| ---------- | ----------- |
| P1         | C101        |
| P2         | C101        |
| P3         | C101        |

When joining on `customer_id`:

```python
result = orders_df.join(
    payments_df,
    "customer_id",
    "inner"
)
```

Result:

| Order ID | Customer ID | Payment ID |
| -------- | ----------- | ---------- |
| O1       | C101        | P1         |
| O1       | C101        | P2         |
| O1       | C101        | P3         |
| O2       | C101        | P1         |
| O2       | C101        | P2         |
| O2       | C101        | P3         |

The two matching orders and three matching payments produce six rows. Customer C102 has no matching payment and is excluded by the inner join.

[spark-join-multiplicity]

## 3. Can every join increase row count?

Not necessarily. Different join types have different behavior.

| Join type        | Can exceed the left table's row count? | Explanation                                       |
| ---------------- | -------------------------------------- | ------------------------------------------------- |
| Inner Join       | Yes                                    | Duplicate matching keys multiply rows             |
| Left Outer Join  | Yes                                    | Multiple right-side matches duplicate left rows   |
| Right Outer Join | Yes                                    | Multiple left-side matches duplicate right rows   |
| Full Outer Join  | Yes                                    | Matching duplicates and unmatched rows contribute |
| Cross Join       | Yes                                    | Produces Cartesian combinations                   |
| Left Semi Join   | No                                     | Returns each matching left row once               |
| Left Anti Join   | No                                     | Returns only unmatched left rows                  |

**Important:** An inner join can also reduce row count when some rows do not match. A left outer join always returns at least as many rows as the left input, including its duplicate rows.

## 4. How to identify unexpected row multiplication

First, compare counts:

```python
print("Left:", df1.count())
print("Right:", df2.count())
print("Joined:", result.count())
```

Check for duplicate join keys:

```python
from pyspark.sql.functions import count, col

(df1.groupBy("customer_id")
    .agg(count("*").alias("cnt"))
    .filter(col("cnt") > 1)
    .show())

(df2.groupBy("customer_id")
    .agg(count("*").alias("cnt"))
    .filter(col("cnt") > 1)
    .show())
```

If both sides contain duplicate keys, investigate whether the many-to-many relationship is expected.

## 5. How to prevent unwanted row multiplication

- Use the correct join keys: Joining on `customer_id` instead of `order_id` can create unintended matches.
- Deduplicate when appropriate: Use `dropDuplicates(["customer_id"])` only if one row per customer is logically valid.
- Aggregate before joining: If multiple payments should produce a single customer-level amount, aggregate payments by customer first.
- Use Left Semi Join: If you only need to check whether a matching record exists, use `left_semi` rather than an inner join.

For example:

```python
result = orders_df.join(
    payments_df.select("customer_id").distinct(),
    "customer_id",
    "left_semi"
)
```

This filters orders to customers with payments without multiplying orders based on the number of payment records. The `distinct()` is optional for semi-join correctness.

## Interview-ready answer

> Yes, joining two tables in Spark can increase the row count, especially when the join keys contain duplicate values.

> In a one-to-many relationship, one row from the left can match multiple rows from the right. In a many-to-many relationship, if a key appears M times in one table and N times in the other, Spark generates M × N matching rows.

> This behavior is commonly called join cardinality explosion.

> To avoid unexpected row multiplication, I would validate join-key uniqueness, verify the relationship between tables, use the correct join conditions, and aggregate or deduplicate data where business logic permits.

**Key takeaway:** The output row count depends on the cardinality of the join keys, not simply the number of rows in the input tables.