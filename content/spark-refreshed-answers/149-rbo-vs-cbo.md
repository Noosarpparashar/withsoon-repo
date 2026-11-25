# What is the difference between rule-based optimization and cost-based optimization in Spark?

In Apache Spark, **Rule-Based Optimization (RBO)** and **Cost-Based Optimization (CBO)** are two techniques used by the **Catalyst Optimizer** to improve query execution performance.

The primary difference is:

- **Rule-Based Optimization (RBO):** Applies predefined optimization rules to transform a query into a more efficient form, without requiring detailed data statistics.
- **Cost-Based Optimization (CBO):** Uses statistics about the data to estimate the cost of alternative execution plans and select a more efficient plan.

Both techniques work together within Spark SQL's query optimization process.

## 1. Rule-Based Optimization (RBO)

Rule-Based Optimization applies predefined transformation rules to the logical query plan.

These rules are based on general optimization principles rather than the actual size or distribution of the data.

### Common rule-based optimizations

| Optimization           | Description                                                                     |
| ---------------------- | ------------------------------------------------------------------------------- |
| Predicate Pushdown     | Moves filters closer to the data source to reduce the amount of data processed. |
| Column Pruning         | Eliminates unnecessary columns from the query plan.                             |
| Constant Folding       | Evaluates constant expressions during optimization.                             |
| Boolean Simplification | Simplifies redundant logical conditions.                                        |
| Projection Pushdown    | Pushes required column selections toward the data source when supported.        |
| Null Propagation       | Simplifies expressions based on known null behavior.                            |

### Example: Predicate Pushdown

Consider the following SQL query:

```sql
SELECT customer_name
FROM (
    SELECT *
    FROM customers
    WHERE country = 'India'
) t
WHERE age > 25;
```

Spark can combine the filters and push them closer to the table scan.

Conceptually, the optimized query becomes:

```sql
SELECT customer_name
FROM customers
WHERE country = 'India'
  AND age > 25;
```

The optimized logical plan can eliminate unnecessary intermediate operations, read only required columns, and push eligible filters into the data source.

**Important:** RBO does not need to know whether the customers table contains 1,000 or 1 billion records to apply these rules.

### Advantages

- Works without detailed table statistics.
- Applies widely useful optimizations automatically.
- Has relatively low optimization overhead.
- Produces more efficient logical query plans.

### Limitations

- Does not necessarily choose the best plan for different data distributions.
- Cannot reliably determine the most efficient join order using data sizes alone.
- A generally beneficial transformation may not be optimal for every workload.

## 2. Cost-Based Optimization (CBO)

Cost-Based Optimization considers statistics about the underlying data to estimate the efficiency of alternative query plans.

Instead of relying exclusively on predefined transformation rules, CBO evaluates alternatives using estimated data volumes and intermediate result sizes.

### Statistics used by CBO

| Statistic                  | Purpose                                                                 |
| -------------------------- | ----------------------------------------------------------------------- |
| Table size                 | Estimates how much data a table contains.                               |
| Row count                  | Estimates the number of records processed.                              |
| Distinct value count       | Helps estimate join cardinality and filter selectivity.                 |
| Minimum and maximum values | Helps estimate the impact of certain filters.                           |
| Null count                 | Helps estimate predicate selectivity.                                   |
| Column histograms          | Help estimate data distributions and filter selectivity when available. |

Spark uses these statistics primarily for cardinality estimation and cost-based join reordering. Statistics also help Spark select physical join strategies, although that selection is not exclusively controlled by the CBO setting.

### Example: Join Reordering

Suppose we have three tables:

| Table     | Number of rows |
| --------- | -------------- |
| Orders    | 100 million    |
| Customers | 10 million     |
| Countries | 200            |

Consider this query:

```sql
SELECT o.order_id, c.customer_name
FROM orders o
JOIN customers c
    ON o.customer_id = c.customer_id
JOIN countries co
    ON c.country_id = co.country_id
WHERE co.country_name = 'India';
```

Without cost-based join reordering, Spark may follow a logical join order that first combines `orders` and `customers`, producing a large intermediate dataset.

With CBO enabled and sufficient statistics available, Spark can estimate whether joining `customers` with the filtered `countries` table first would reduce the intermediate result size.

[spark-reference:rbo-cbo-join-order]

By reducing the size of intermediate results, CBO can reduce shuffle volume, memory consumption, and execution time.

### Advantages

- Uses actual data statistics to make better planning decisions.
- Can optimize join ordering for complex queries.
- Can reduce expensive intermediate results.
- Particularly useful for analytical queries involving multiple large tables.

### Limitations

- Depends on the availability and accuracy of statistics.
- Outdated statistics can result in poor execution plans.
- Optimization itself introduces some planning overhead.
- Spark's CBO does not exhaustively evaluate every possible physical execution strategy.

## 3. Key differences between RBO and CBO

| Feature                         | RBO                                                | CBO                                        |
| ------------------------------- | -------------------------------------------------- | ------------------------------------------ |
| Primary approach                | Predefined transformation rules                    | Statistics-based cost estimation           |
| Requires data statistics        | No                                                 | Yes, for effective optimization            |
| Data size awareness             | Not required                                       | Yes                                        |
| Filter pushdown                 | Yes                                                | Not its primary responsibility             |
| Column pruning                  | Yes                                                | Not its primary responsibility             |
| Join ordering                   | Mostly preserves or heuristically transforms order | Can reorder joins based on estimated costs |
| Optimization overhead           | Generally low                                      | Can be higher                              |
| Sensitivity to stale statistics | Low                                                | High                                       |
| Best suited for                 | General logical optimizations                      | Complex, data-dependent query planning     |

## 4. How to enable CBO in Spark

In Apache Spark, the general rule-based optimization framework is active by default, while the dedicated CBO features are disabled by default in standard Spark configurations.

Enable CBO using:

```python
spark.conf.set("spark.sql.cbo.enabled", "true")
spark.conf.set("spark.sql.cbo.joinReorder.enabled", "true")
spark.conf.set("spark.sql.cbo.planStats.enabled", "true")
```

These configurations enable CBO statistics estimation, cost-based join reordering, and retrieval of catalog row counts and column statistics.

### Collect statistics

CBO requires useful statistics to make accurate estimates.

```sql
-- Collect table statistics
ANALYZE TABLE customers
COMPUTE STATISTICS;

-- Collect column statistics
ANALYZE TABLE customers
COMPUTE STATISTICS
FOR COLUMNS customer_id, country_id;
```

Repeat for other relevant catalog tables and columns. These commands target catalog tables rather than local temporary views. Histograms require the relevant statistics configuration and are not guaranteed to be available.

### Inspect the optimized query plan

```python
df = spark.sql("""
    SELECT *
    FROM orders o
    JOIN customers c
    ON o.customer_id = c.customer_id
""")

df.explain(mode="cost")
```

Or:

```sql
EXPLAIN COST
SELECT *
FROM orders o
JOIN customers c
ON o.customer_id = c.customer_id;
```

This displays the optimized logical plan with available statistics and the physical plan, helping you inspect Spark's estimated cardinalities and chosen operations.


## 5. How does Adaptive Query Execution (AQE) differ from CBO?

This is an important interview follow-up.

- **RBO:** Applies predefined transformations during query optimization.
- **CBO:** Uses available statistics to estimate a good execution plan before execution.
- **AQE:** Uses actual runtime statistics to adjust parts of the physical execution plan while the query runs.

For example, CBO or Spark's initial planning might estimate that a table is too large to broadcast and choose a sort-merge join.

During execution, AQE might discover that the table becomes small after filtering and convert the join into a broadcast hash join.

AQE can also coalesce small shuffle partitions and optimize skewed joins.

**Important:** AQE does not replace RBO or CBO. These optimization mechanisms complement one another.

## Interview-ready answer

> Spark uses both Rule-Based Optimization and Cost-Based Optimization within the Catalyst Optimizer.
>
> Rule-Based Optimization applies predefined rules such as predicate pushdown, column pruning, constant folding, and expression simplification. It does not require detailed table statistics.
>
> Cost-Based Optimization uses statistics such as table size, row count, distinct values, and column distributions to estimate the cost of alternative query plans. It is particularly useful for optimizing join order and reducing the size of intermediate results.
>
> For example, when joining three tables, CBO may reorder the joins so that selective operations happen earlier, minimizing expensive shuffle operations.
>
> RBO is active by default, while Spark's dedicated CBO functionality must generally be enabled and supported with collected statistics.
>
> Additionally, Spark provides Adaptive Query Execution, which uses runtime statistics to further optimize the physical execution plan.
>
> **RBO determines which general optimization rules can improve a query, CBO uses data statistics to choose among alternatives, and AQE adapts execution decisions based on runtime information.**
