# What is the Catalyst Optimizer?

## 1. Interview-ready answer

The **Catalyst Optimizer** is Spark SQL's built-in, extensible query optimization framework. It analyzes and optimizes SQL queries and DataFrame/Dataset operations before Spark executes them.

Its primary goal is to **generate an efficient physical execution plan by reducing unnecessary computations, data scans, shuffling, and overall execution cost.**

Catalyst performs several optimizations, including:

- **Predicate pushdown:** Moves filters closer to the data source to reduce the amount of data processed.
- **Column pruning:** Eliminates unnecessary columns from processing.
- **Constant folding:** Evaluates constant expressions before execution.
- **Join optimization:** Helps select efficient join strategies, such as broadcast hash joins or sort-merge joins.
- **Expression simplification:** Simplifies redundant expressions and conditions.
- **Cost-based optimization:** Uses available statistics to improve certain planning decisions, including join ordering when enabled.

Catalyst works with both Spark SQL and the DataFrame API, meaning equivalent operations generally produce the same optimized execution plan.

## 2. How does the Catalyst Optimizer work internally?

Spark transforms a query through several stages before executing it.

[spark-reference:catalyst-query-lifecycle]

### Stage 1: Parsing

Spark converts SQL statements into an initial logical plan. DataFrame API expressions construct logical plans programmatically rather than parsing SQL text. These are query-compilation phases, not Spark execution stages.

For example:

```sql
SELECT name
FROM employees
WHERE salary > 100000;
```

Spark creates a representation containing operations such as:

- Read the `employees` table.
- Filter records where `salary > 100000`.
- Select the `name` column.

At this stage, Spark has not necessarily verified whether the table and columns exist.

### Stage 2: Analysis

The Analyzer resolves the logical plan using metadata from the catalog and the schemas of the input relations.

It checks:

- Whether tables and columns exist.
- Whether column references are valid and unambiguous.
- Whether expressions have compatible data types.
- Whether implicit type conversions are required.

**Output:** An analyzed logical plan with resolved attributes and data types.

### Stage 3: Logical optimization

Catalyst applies optimization rules to the analyzed logical plan without changing the query's intended result.

For example:

```sql
SELECT name
FROM employees
WHERE salary > 100000
  AND department = 'IT';
```

Spark can optimize this operation by:

1. Pushing supported filters toward the data source.
2. Reading only the columns required by the query.
3. Removing redundant expressions.
4. Combining compatible filters and projections.

**Output:** An optimized logical plan describing a more efficient way to compute the same result.

### Stage 4: Physical planning

Spark converts the optimized logical plan into an executable physical plan.

For example, consider:

```sql
SELECT *
FROM orders o
JOIN customers c
ON o.customer_id = c.id;
```

Depending on the join type, data sizes, statistics, hints, and configurations, Spark may choose:

| Join strategy              | Typical situation                                              |
| -------------------------- | -------------------------------------------------------------- |
| Broadcast hash join        | One side is sufficiently small                                 |
| Sort-merge join            | Both sides are large and the join uses sortable equi-join keys |
| Shuffled hash join         | Hash-based joining is advantageous under supported conditions  |
| Broadcast nested-loop join | Certain non-equi joins or other join conditions                |

Spark may also insert shuffle (`Exchange`) and sort operations where necessary.

**Output:** A physical execution plan that Spark can execute.

After physical planning, Spark can use whole-stage code generation to produce efficient JVM code for supported operators.

## 3. Important optimization techniques

| Optimization                | What Catalyst does                                             | Performance benefit                |
| --------------------------- | -------------------------------------------------------------- | ---------------------------------- |
| Predicate pushdown          | Moves filters closer to data sources when possible             | Reduces data read and processed    |
| Column pruning              | Removes unused columns                                         | Reduces I/O and memory consumption |
| Constant folding            | Simplifies `salary > 50000 + 50000` to `salary > 100000`       | Reduces unnecessary calculations   |
| Filter combining            | Combines compatible filter expressions                         | Simplifies execution               |
| Join optimization           | Chooses physical join strategies                               | Can reduce shuffle and computation |
| Join reordering             | Changes eligible join order using rules or statistics          | Can reduce intermediate data       |
| Redundant operation removal | Eliminates unnecessary projections, sorts, or other operations | Avoids wasted computation          |

These optimization rules are implemented within Spark's Catalyst optimizer framework.

## 4. Practical example using PySpark

Consider the following DataFrame operation:

```python
from pyspark.sql import functions as F

df = spark.read.parquet("s3://bucket/employees/")

result = (
    df.filter(F.col("salary") > 100000)
      .select("name", "department")
)

result.show()
```

Although the code reads a DataFrame and then filters and selects columns, Catalyst can optimize the query before execution.

For a suitable Parquet data source, Spark can:

- Request only `name`, `department`, and `salary` from the scan.
- Push the salary predicate down to the Parquet reader when supported.
- Avoid materializing unnecessary columns.

The actual amount of data skipped depends on file statistics, layout, and source capabilities. Predicate pushdown does not guarantee that every nonmatching row group can be skipped.

### How to inspect Catalyst's execution plans

```python
result.explain(mode="extended")
```

This displays four important plans:

```text
== Parsed Logical Plan ==
...

== Analyzed Logical Plan ==
...

== Optimized Logical Plan ==
...

== Physical Plan ==
...
```

You can compare the optimized logical plan with the physical plan to understand which optimizations Spark applied.

For SQL queries:

```sql
EXPLAIN EXTENDED
SELECT name
FROM employees
WHERE salary > 100000;
```

Spark also supports `EXPLAIN FORMATTED`, `EXPLAIN COST`, and `EXPLAIN CODEGEN`.

## 5. Is Catalyst a rule-based or cost-based optimizer?

**Catalyst primarily uses rule-based optimization, but it also supports cost-based optimization (CBO).**

- **Rule-based optimization (RBO):** Applies predefined transformation rules, such as constant folding, predicate pushdown, and column pruning.
- **Cost-based optimization (CBO):** Uses available table and column statistics to estimate the cost of alternative plans, particularly for join ordering.

Cost-based optimization can be enabled using:

```python
spark.conf.set("spark.sql.cbo.enabled", "true")
spark.conf.set("spark.sql.cbo.joinReorder.enabled", "true")
```

For catalog tables, statistics can be collected with commands such as:

```sql
ANALYZE TABLE employees COMPUTE STATISTICS;

-- Collect relevant column statistics when needed:
ANALYZE TABLE employees COMPUTE STATISTICS FOR COLUMNS salary, department;
```

These commands target a catalog table, not a local temporary view. Accurate statistics help Spark make better planning decisions. However, Catalyst cannot guarantee the globally optimal execution plan.

## 6. What is the relationship between Catalyst and Adaptive Query Execution (AQE)?

Catalyst and AQE complement each other, but they operate at different points.

| Catalyst Optimizer                             | Adaptive Query Execution                                |
| ---------------------------------------------- | ------------------------------------------------------- |
| Primarily optimizes before execution           | Optimizes during execution                              |
| Uses logical rules and available statistics    | Uses actual runtime statistics                          |
| Chooses an initial physical plan               | Can modify portions of that plan                        |
| Performs predicate pushdown and column pruning | Can coalesce shuffle partitions and handle skewed joins |
| Helps determine join strategies                | Can change join strategies based on runtime data        |

AQE is enabled by default in Apache Spark versions since 3.2.0.

## 7. Important interview points

**Does Catalyst optimize RDD operations?**

No. Catalyst optimizes structured operations expressed through Spark SQL and the DataFrame/Dataset APIs. It does not optimize arbitrary RDD transformations.

**Does Catalyst optimize Python UDF logic?**

Generally, Catalyst treats ordinary Python UDF implementations as opaque. It can reason about surrounding query operators but cannot freely rewrite the internal Python code as it does built-in SQL expressions.

**Does Catalyst execute Spark jobs?**

No. Catalyst constructs optimized plans. Spark's execution engine, scheduler, and executors perform the actual distributed computation.

**Are Catalyst and Tungsten the same?**

No. Catalyst focuses on query optimization and planning, whereas Tungsten refers to Spark's execution-efficiency improvements, including memory management and code generation techniques.

## 8. Final interview summary

The **Catalyst Optimizer is the core query optimization framework in Spark SQL**. It transforms SQL and DataFrame operations into optimized execution plans through parsing, analysis, logical optimization, and physical planning.

It uses techniques such as predicate pushdown, column pruning, constant folding, expression simplification, and join optimization to reduce unnecessary processing.

Catalyst primarily applies rule-based optimizations, with support for statistics-driven cost-based optimization. Its initial plans can be further improved at runtime through Adaptive Query Execution.

**The key distinction is that Catalyst determines how a query should execute efficiently; Spark's execution engine actually runs it.**