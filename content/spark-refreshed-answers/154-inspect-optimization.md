# How do you inspect Spark's optimization decisions?

In Apache Spark, optimization decisions can be inspected using `explain()`, SQL `EXPLAIN` statements, `EXPLAIN COST`, and the **Spark UI**.

These tools help us understand how the Catalyst Optimizer transforms a query, which physical execution strategies Spark selects, and whether Adaptive Query Execution (AQE) changes those strategies at runtime.

The most important distinction is:

- **Logical plan:** Shows how Catalyst has transformed the query through rule-based and cost-based optimization.
- **Physical plan:** Shows how Spark intends to execute the query, including join strategies, scans, exchanges, and aggregations.
- **Runtime execution:** Shows what actually happened, including shuffle volume, output rows, memory usage, and AQE adjustments.

## 1. Inspect query plans using `explain()`

The `explain()` method is the primary tool for inspecting Spark's optimization decisions.

Example:

```python
df = spark.sql("""
    SELECT c.country, COUNT(*) AS total_orders
    FROM orders o
    JOIN customers c
        ON o.customer_id = c.customer_id
    WHERE o.amount > 1000
    GROUP BY c.country
""")

df.explain(mode="extended")
```

This displays four important stages of query planning.

[spark-reference:explain-plan-views]

### What to inspect at each stage

| Stage                  | What to look for                                                                      |
| ---------------------- | ------------------------------------------------------------------------------------- |
| Parsed Logical Plan    | Original operations and unresolved references                                         |
| Analyzed Logical Plan  | Resolved column names, table references, and data types                               |
| Optimized Logical Plan | Filter pushdown, column pruning, simplified expressions, and possible join reordering |
| Physical Plan          | Broadcast joins, sort-merge joins, exchanges, sorts, scans, and aggregations          |

For example, if the original query uses `SELECT *` but only three columns are needed downstream, the optimized logical plan may show a `Project` operation containing only the required columns.

This demonstrates that **Catalyst has applied column pruning**.

## 2. Understand the different `explain()` modes

Spark provides several explain modes for different debugging purposes.

| Mode        | What it displays                                 | When to use                               |
| ----------- | ------------------------------------------------ | ----------------------------------------- |
| `simple`    | Physical execution plan                          | Quick inspection                          |
| `extended`  | Parsed, analyzed, optimized, and physical plans  | Understand Catalyst transformations       |
| `cost`      | Optimized logical plan with available statistics | Investigate CBO and cardinality estimates |
| `formatted` | Structured physical plan with operator details   | Debug joins, scans, and shuffles          |
| `codegen`   | Generated Java code where available              | Investigate whole-stage code generation   |

PySpark examples:

```python
df.explain(mode="simple")
df.explain(mode="extended")
df.explain(mode="cost")
df.explain(mode="formatted")
df.explain(mode="codegen")
```

Equivalent Spark SQL commands:

```sql
EXPLAIN EXTENDED SELECT * FROM orders;

EXPLAIN COST SELECT * FROM orders;

EXPLAIN FORMATTED SELECT * FROM orders;

EXPLAIN CODEGEN SELECT * FROM orders;
```

The explain modes show complementary views of the same query planning process.

## 3. Inspect Cost-Based Optimization decisions

To understand how CBO estimates the cost of operations, use:

```python
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

An illustrative optimized plan might contain:

```text
== Optimized Logical Plan ==

Project [...], Statistics(sizeInBytes=120 MiB)
+- Join Inner, Statistics(
     sizeInBytes=500 MiB,
     rowCount=2.50E+6
   )
   :- Relation orders,
   :  Statistics(
   :    sizeInBytes=2.0 GiB,
   :    rowCount=5.00E+7
   :  )
   +- Relation customers,
      Statistics(
        sizeInBytes=20 MiB,
        rowCount=2.00E+5
      )
```

Illustrative values and simplified formatting, not output from an actual Spark run.

Here, Spark estimates:

- `sizeInBytes`: Estimated data size associated with a logical plan node.
- `rowCount`: Estimated number of output records, when available.

These statistics help explain why Spark may prefer one logical join order over another.

**Important:** `EXPLAIN COST` displays estimated statistics, not a complete numerical breakdown of CPU, network, memory, or disk costs for every candidate physical plan.

If row counts are missing, Spark may not have sufficient statistics for effective cost-based join reordering.

You can inspect catalog statistics using:

```sql
DESCRIBE EXTENDED orders;
DESCRIBE EXTENDED orders customer_id;
```

And refresh supported table statistics using:

```sql
ANALYZE TABLE orders COMPUTE STATISTICS;

ANALYZE TABLE orders
COMPUTE STATISTICS FOR COLUMNS customer_id;
```

Spark explicitly recommends inspecting catalog statistics, cost estimates, and runtime statistics when diagnosing inaccurate query plans.

## 4. Inspect physical optimization decisions

Use:

```python
df.explain(mode="formatted")
```

This displays the physical execution plan in a more readable structure.

An example physical plan could look like:

```text
AdaptiveSparkPlan
+- HashAggregate
   +- Exchange hashpartitioning(country, 200)
      +- HashAggregate
         +- Project
            +- BroadcastHashJoin
               :- Filter
               :  +- FileScan parquet orders
               +- BroadcastExchange
                  +- FileScan parquet customers
```

The physical plan tells us which operations Spark has selected.

| Physical operator   | What it indicates                                  |
| ------------------- | -------------------------------------------------- |
| `FileScan`          | Spark reads data from a data source                |
| `Filter`            | Records are filtered                               |
| `Project`           | Required columns or expressions are selected       |
| `BroadcastHashJoin` | Spark broadcasts one side of the join              |
| `SortMergeJoin`     | Spark performs a sort-merge join                   |
| `Exchange`          | Data is redistributed, typically through a shuffle |
| `HashAggregate`     | Spark performs hash-based aggregation              |
| `Sort`              | Data is sorted                                     |
| `BroadcastExchange` | Data is prepared and distributed for broadcasting  |

### What should you check?

**Predicate pushdown**

Look for `PushedFilters` or equivalent information in scan details.

```text
PushedFilters: [IsNotNull(amount), GreaterThan(amount,1000)]
```

This indicates that Spark has pushed eligible filters toward the data source. The actual filtering performed by the source depends on its capabilities.

**Column pruning**

Look at the schema or columns listed by the scan operator.

```text
ReadSchema: struct<customer_id:bigint,amount:double>
```

If the table contains 30 columns but the scan only reads two, column pruning has occurred.

**Join strategy**

Check whether Spark selected `BroadcastHashJoin`, `SortMergeJoin`, or another join operator.

**Shuffle operations**

Look for `Exchange` operators. These frequently indicate expensive data redistribution.

## 5. Inspect optimization decisions in Spark UI

The Spark UI is especially useful because it shows actual execution metrics rather than only estimated plans.

For a local Spark application, the UI is typically available at:

`http://localhost:4040`

Open the **SQL / DataFrame** tab and select the executed query.

What you can inspect in the SQL tab

- Physical execution plan and operator graph.
- Query duration and associated jobs and stages.
- Number of rows processed by supported operators.
- Shuffle bytes read and written.
- Spill metrics and execution times.
- Runtime statistics used by AQE.
- Adaptive changes to the physical execution plan.

You can also inspect the Stages tab for task skew, garbage collection, spill, and shuffle metrics.

For example, suppose the optimizer estimates that a filter will produce 10,000 records, but the execution produces 10 million records.

That difference suggests that the statistics or selectivity estimates may be inaccurate.

It is particularly useful when investigating incorrect join strategies or unexpectedly large intermediate datasets.

## 6. Inspect Adaptive Query Execution (AQE) decisions

AQE can modify the physical execution plan during runtime based on actual statistics.

For example, an initial plan might use:

```text
SortMergeJoin
  :- Exchange
  +- Exchange
```

After AQE discovers that one side of the join is sufficiently small, the final plan might use:

```text
BroadcastHashJoin
  :- ...
  +- BroadcastQueryStage
```

This illustrates that AQE has converted a sort-merge join into a broadcast hash join.

To inspect AQE behavior, enable it:

```python
spark.conf.set("spark.sql.adaptive.enabled", "true")
```

Then examine the query in Spark UI after execution.

In adaptive plan output, you may see:

```text
AdaptiveSparkPlan isFinalPlan=false
```

This indicates that the adaptive physical plan has not yet been finalized.

After execution, the final adaptive plan may show:

```text
AdaptiveSparkPlan isFinalPlan=true
```

Spark UI can also expose runtime statistics marked with `isRuntime=true`.

**Important:** Calling `explain()` before execution generally shows the initial physical plan, not necessarily the final AQE-optimized plan.

## 7. Practical production debugging workflow

Suppose a Spark SQL query is unexpectedly slow.

I would investigate it in the following order:

| Step | Tool                      | Investigation                                                                         |
| ---- | ------------------------- | ------------------------------------------------------------------------------------- |
| 1    | `EXPLAIN EXTENDED`        | Verify predicate pushdown, column pruning, logical join order                         |
| 2    | `EXPLAIN COST`            | Inspect estimated table sizes and row counts                                          |
| 3    | `EXPLAIN FORMATTED`       | Check join strategy, scans, and exchanges                                             |
| 4    | Spark SQL UI              | Inspect actual output rows, shuffle size, and operator metrics                        |
| 5    | Stages and Executors tabs | Identify skew, spills, GC overhead, or memory pressure                                |
| 6    | AQE final plan            | Check whether Spark changed join strategies or shuffle partitioning                   |
| 7    | Compare plans             | Re-run under controlled conditions after updating statistics or tuning configurations |

For example, if I observe a `SortMergeJoin` between a 500 GB table and a 5 MB table, I would check:

- Whether Spark knows the smaller table's estimated size.
- Whether the join type and conditions permit a broadcast hash join.
- Whether automatic broadcasting is enabled.
- Whether AQE converts the join at runtime.

This avoids blindly changing Spark configurations without identifying the underlying cause.

## Interview-ready answer

> To inspect Spark's optimization decisions, I primarily use the `explain()` method, SQL `EXPLAIN` statements, and the Spark UI.
>
> First, I use `df.explain(mode='extended')` to examine the parsed, analyzed, optimized logical, and physical plans. This helps verify whether Catalyst has applied optimizations such as predicate pushdown, column pruning, and join reordering.
>
> Second, I use `df.explain(mode='cost')` to inspect estimated row counts and data sizes, which helps understand Cost-Based Optimization decisions and identify missing or inaccurate statistics.
>
> Third, I use `df.explain(mode='formatted')` to inspect physical execution strategies such as broadcast hash joins, sort-merge joins, shuffles, and aggregations.
>
> For runtime analysis, I use the Spark SQL UI to inspect actual output rows, shuffle volume, operator metrics, and the final AQE plan.
>
> I compare estimated statistics with actual execution metrics to determine whether Spark selected an appropriate plan.
>
> `EXPLAIN EXTENDED` shows what Catalyst optimized, `EXPLAIN COST` shows available statistics, `EXPLAIN FORMATTED` shows how Spark plans to execute the query, and Spark UI shows what actually happened during execution.
