# Can SQL structure improve predicate pushdown?

Yes. The way SQL queries are written can influence how effectively Spark performs predicate pushdown. Using simple, selective, and data-source-compatible filter conditions makes it easier for Spark's Catalyst Optimizer to push filters closer to the data source.

However, Spark automatically optimizes many SQL expressions, so rewriting a query does not always improve performance. Two differently structured SQL queries may produce exactly the same optimized execution plan.

## 1. Use direct column comparisons instead of functions

**Less optimal:**

```sql
SELECT *
FROM orders
WHERE YEAR(order_date) = 2026;
```

Applying `YEAR()` to a column may prevent the underlying data source from using a simple range predicate.

**Better:**

```sql
SELECT *
FROM orders
WHERE order_date >= DATE '2026-01-01'
  AND order_date < DATE '2027-01-01';
```

**Why is this better?**

- Direct range comparisons are widely supported by data sources.
- Parquet can potentially use minimum and maximum statistics to skip row groups.
- JDBC databases may use an index on order_date.
- The expression may avoid per-row function evaluation.

**Important:** Catalyst may optimize some function-based expressions automatically. The actual improvement depends on the physical execution plan. Choose date or timestamp bounds that preserve the column's intended type and time-zone semantics.

## 2. Filter data before expensive joins

Consider two tables, orders and customers.

**Query 1:**

```sql
SELECT *
FROM orders o
JOIN customers c
  ON o.customer_id = c.customer_id
WHERE o.amount > 10000;
```

**Query 2:**

```sql
SELECT *
FROM (
    SELECT *
    FROM orders
    WHERE amount > 10000
) o
JOIN customers c
  ON o.customer_id = c.customer_id;
```

In the second query, the filter is explicitly placed before the join.

However, Spark's Catalyst Optimizer can usually push the filter below the inner join in Query 1 as well.

Both queries may generate a plan conceptually equivalent to:

[spark-reference:sql-filter-before-join]

If supported by the source, the filter can then be pushed into the orders scan.

**Key point:** Writing filters inside subqueries does not automatically make SQL faster. What matters is whether Catalyst can safely move the filters toward the data source.

## 3. Avoid UDFs in filter conditions

**Less optimal:**

```sql
SELECT *
FROM employees
WHERE custom_salary_check(salary);
```

If custom_salary_check() is a UDF, Catalyst generally cannot understand its internal logic.

**Better:**

```sql
SELECT *
FROM employees
WHERE salary > 50000;
```

Assuming `custom_salary_check()` implements the same salary comparison and null behavior, this is an equivalent native predicate that Spark can potentially push to Parquet, ORC, or JDBC. Preserve business logic when rewriting UDFs.

Using built-in expressions instead of UDFs generally provides more optimization opportunities.

## 4. Use WHERE instead of HAVING for row-level filters

**Less explicit:**

```sql
SELECT department, COUNT(*)
FROM employees
GROUP BY department
HAVING department = 'IT';
```

**Better for clarity:**

```sql
SELECT department, COUNT(*)
FROM employees
WHERE department = 'IT'
GROUP BY department;
```

The second query explicitly filters rows before aggregation.

Catalyst can often move the first query's condition below the aggregation because department is a grouping key. Therefore, both queries may execute identically.

However, an aggregate-dependent predicate such as:

```sql
HAVING COUNT(*) > 10
```

cannot generally be pushed into the initial data-source scan because Spark must first compute the aggregation.

## 5. Prefer simple AND predicates over unnecessarily complex expressions

Consider:

```sql
SELECT *
FROM employees
WHERE salary > 50000
  AND department = 'IT';
```

Both predicates may be pushed down independently.

However:

```sql
SELECT *
FROM employees
WHERE salary > 50000
   OR custom_check(department);
```

If custom_check() is a UDF, Spark generally cannot push down the entire OR expression. Pushing only salary > 50000 would be incorrect because it could exclude rows that satisfy the UDF condition.

Do not change OR to AND merely for performance, since that changes query semantics.

## 6. Which SQL structures are more pushdown-friendly?

| SQL structure | Pushdown behavior |
| --- | --- |
| `salary > 50000` | Generally supported |
| `department = 'IT'` | Generally supported |
| `order_date >= DATE '2026-01-01'` | Generally supported |
| `YEAR(order_date) = 2026` | Depends on optimizer and source |
| `CAST(salary AS STRING) = '50000'` | May limit pushdown |
| `custom_udf(salary)` | Generally not supported |
| `Simple predicates connected with AND` | Often independently pushable |
| `OR containing an unsupported expression` | May prevent pushdown of the combined predicate |
| `Filtering by an aggregate result` | Generally cannot be pushed into the base-table scan |

Spark's data-source interfaces allow connectors to accept supported predicates and return unsupported or partially enforced predicates for Spark to evaluate.

## 7. How to verify whether SQL structure improves pushdown

Use EXPLAIN FORMATTED:

```sql
EXPLAIN FORMATTED
SELECT *
FROM orders
WHERE amount > 10000
  AND order_date >= DATE '2026-01-01';
```

For a Parquet source, the physical plan may contain:

```text
FileScan parquet
  DataFilters:
    [isnotnull(amount), amount > 10000, ...]

  PushedFilters:
    [IsNotNull(amount), GreaterThan(amount,10000), ...]

  PartitionFilters:
    []

  ReadSchema:
    struct<...>
```

Inspect:

- PushedFilters: Filters passed to the data source.
- PartitionFilters: Filters used for partition pruning.
- DataFilters: Data-level conditions retained at the scan.
- ReadSchema: Columns actually requested from storage.

Compare both versions of the SQL. If the optimized plans are identical, rewriting the SQL probably provides no performance improvement.

Also compare scan bytes, task execution time, and total query duration to measure the actual benefit.

## 8. Interview-ready answer

> Yes, SQL structure can improve predicate pushdown in Apache Spark.
>
> Although Catalyst automatically pushes eligible filters closer to the data source, writing simple and direct filter expressions increases the likelihood that predicates can be pushed down.
>
> For example, instead of using YEAR(order_date) = 2026, we can use a direct date-range condition, which is generally more compatible with Parquet statistics and database indexes.
>
> Similarly, avoiding UDFs, unnecessary type conversions, and unsupported expressions can improve predicate pushdown.
>
> Writing filters before expensive operations can also help, although Catalyst often performs this optimization automatically.
>
> However, rewriting SQL does not guarantee better performance because Catalyst may generate identical physical plans for differently structured queries.
>
> We should verify the optimization using EXPLAIN FORMATTED, inspect PushedFilters and PartitionFilters, and compare execution metrics.

**Key takeaway:** SQL structure can influence predicate pushdown, but the optimized execution plan matters more than the written SQL structure. Spark already performs many filter optimizations automatically.
