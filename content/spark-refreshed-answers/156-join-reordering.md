# What is join reordering?

**Join reordering is a query optimization technique in which Apache Spark changes the order of joining multiple tables to minimize intermediate data processing and improve query performance.**

It is primarily performed by the **Catalyst Optimizer through Cost-Based Optimization (CBO)**, which uses table and column statistics to estimate the cost of different join orders.

Catalyst also includes heuristic join rewrites. Dedicated cost-based join reordering uses statistics to compare eligible alternatives; it is not the only way a logical join tree can change.

The goal is to choose a join order that reduces expensive operations such as shuffling, sorting, and processing large intermediate datasets.

## 1. Why is join reordering needed?

When a SQL query joins multiple tables, the order in which the joins are executed can significantly affect performance.

Consider three tables:

| Table     | Number of records |
| --------- | ----------------- |
| Orders    | 100 million       |
| Customers | 10 million        |
| Countries | 200               |

Suppose we execute:

```sql
SELECT
    o.order_id,
    c.customer_name
FROM orders o
JOIN customers c
    ON o.customer_id = c.customer_id
JOIN countries co
    ON c.country_id = co.country_id
WHERE co.country_name = 'India';
```

There are multiple ways to execute the joins.

### Plan A: Join Orders and Customers first

[spark-reference:join-order-orders-first]

Assuming each order matches one customer, the first join may produce approximately 100 million records.

Spark then needs to join that large intermediate dataset with the filtered Countries table.

### Plan B: Join Customers and filtered Countries first

[spark-reference:join-order-selective-first]

Suppose only 10% of customers belong to India.

Then:

- Customers after the first join: approximately 1 million records.
- The final join processes a much smaller customer-side dataset.
- Less intermediate data may need to be shuffled, sorted, or stored.

**Plan B may be significantly faster because the selective join happens before the large join.**

However, this is not guaranteed. If almost every customer belongs to India, filtering Countries first might provide little benefit.

## 2. How does Spark perform join reordering?

Spark's Catalyst Optimizer can use CBO to evaluate different logical join orders.

Conceptually, the process involves four steps.

[spark-reference:join-reordering-process]

Spark uses a dynamic-programming-based approach for cost-based join enumeration, subject to eligibility conditions and configuration limits.

The optimizer does not simply join the smallest table first. It considers estimated intermediate results and join relationships when selecting a plan.

## 3. What statistics are used for join reordering?

| Statistic            | Why it matters                                 |
| -------------------- | ---------------------------------------------- |
| Table size           | Estimates how much data each relation contains |
| Row count            | Estimates input and intermediate cardinalities |
| Distinct value count | Helps predict how many rows a join may produce |
| Null count           | Helps estimate matching rows for join keys     |
| Column histograms    | Help estimate selectivity when supported       |

For example, two tables containing 10 million records each may produce very different join sizes depending on whether their join keys are unique or duplicated.

This is why **join reordering depends on more than just table size**.

## 4. How to enable join reordering in Spark

Cost-based join reordering is disabled by default in standard Spark configurations.

Enable it using:

```python
spark.conf.set("spark.sql.cbo.enabled", "true")
spark.conf.set("spark.sql.cbo.joinReorder.enabled", "true")
spark.conf.set("spark.sql.cbo.planStats.enabled", "true")
```

Collect relevant table statistics:

```sql
ANALYZE TABLE orders COMPUTE STATISTICS;

ANALYZE TABLE customers COMPUTE STATISTICS;

ANALYZE TABLE countries COMPUTE STATISTICS;
```

Collect column statistics for relevant join keys:

```sql
ANALYZE TABLE customers
COMPUTE STATISTICS
FOR COLUMNS customer_id, country_id;
```

The statistics collection commands depend on the table format and catalog implementation.

## 5. How to verify that Spark reordered joins

Use:

```python
df.explain(mode="extended")
```

Inspect the **Optimized Logical Plan** and compare its join structure with the original query.

You can also use:

```python
df.explain(mode="cost")
```

This displays the optimized logical plan together with available cardinality and size estimates.

For more reliable verification, compare the optimized plans with cost-based join reordering enabled and disabled, keeping the data, statistics, and other configurations unchanged.

## 6. Does Spark always reorder joins?

No. Join reordering is subject to several limitations.

- **Join type:** Inner joins are common candidates. Outer, semi, and anti joins have additional semantic restrictions, so arbitrary reordering is not valid.
- **Statistics availability:** Missing row counts or other required information may prevent cost-based join reordering.
- **Number of tables:** Spark limits the number of joined nodes considered by its dynamic-programming algorithm. The default threshold is 12, controlled by `spark.sql.cbo.joinReorder.dp.threshold`.
- **Query structure:** Join conditions, hints, projections, and other operators can restrict eligible transformations.
- **Statistics accuracy:** Outdated statistics can result in a worse join order.

These restrictions help Spark preserve query correctness and control optimization overhead.

## 7. Join reordering vs join strategy selection

This is an important interview distinction.

| Join reordering                                      | Join strategy selection                                     |
| ---------------------------------------------------- | ----------------------------------------------------------- |
| Determines which tables should be joined first       | Determines how two inputs should be joined                  |
| Example: Join Customers with Countries before Orders | Example: Use broadcast hash join instead of sort-merge join |
| Changes the logical join tree                        | Selects physical join operators                             |
| CBO can perform cost-based join reordering           | Physical planner and AQE select or adapt join strategies    |

For example, Spark can first reorder joins so that Customers joins with Countries, then choose a broadcast hash join for that particular operation.

**Join reordering decides the sequence of joins; join strategy selection decides the algorithm used to execute each join.**

## Interview-ready answer

> Join reordering is an optimization technique in Apache Spark where Catalyst changes the order of joining multiple tables to reduce intermediate data processing and improve query performance.
>
> Spark's Cost-Based Optimizer can use statistics such as table sizes, row counts, distinct values, and estimated join cardinalities to evaluate different join orders.
>
> For example, when joining Orders, Customers, and Countries, Spark may decide to join Customers with a filtered Countries table first rather than joining the large Orders table with Customers immediately. This can reduce intermediate data volume, shuffle operations, and memory consumption.
>
> Cost-based join reordering can be enabled using `spark.sql.cbo.enabled` and `spark.sql.cbo.joinReorder.enabled`, and it requires sufficient statistics for effective decisions.
>
> However, Spark does not reorder every query. It must preserve join semantics, and missing or inaccurate statistics can limit optimization.
>
> **Join reordering aims to choose a more efficient sequence of joins, while join strategy selection determines how those joins are physically executed.**
