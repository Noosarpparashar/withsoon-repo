# What happens in the unresolved, analyzed, optimized logical, and physical plan stages?

## 1. Interview-ready answer

When Spark executes a SQL query or DataFrame operation, the **Catalyst framework transforms the query through four major planning stages: Unresolved Logical Plan, Analyzed Logical Plan, Optimized Logical Plan, and Physical Plan.**

Each stage has a specific responsibility:

1. **Unresolved Logical Plan:** Represents what the user wants to do, without fully resolving table names, column references, or data types.
2. **Analyzed Logical Plan:** Resolves tables, columns, functions, and data types using schema and catalog metadata, then validates the query.
3. **Optimized Logical Plan:** Applies optimization rules such as predicate pushdown, column pruning, constant folding, and join reordering where applicable.
4. **Physical Plan:** Determines how Spark will execute the operations using physical operators such as scans, joins, aggregations, sorts, and shuffles.

The first three stages focus on **what operations are required and how to logically simplify them**, while the physical plan specifies **how those operations will be executed in the distributed environment**.

## 2. Query execution flow

These are query-planning phases, not Spark job stages. DataFrame expressions can construct logical plans programmatically rather than parsing SQL text.

[spark-reference:four-query-plans]

## 3. Detailed explanation with an example

Consider the following query:

```sql
SELECT name
FROM employees
WHERE salary > 50000
  AND department = 'IT';
```

Assume the `employees` table contains:

| Column     | Data type |
| ---------- | --------- |
| id         | INT       |
| name       | STRING    |
| salary     | INT       |
| department | STRING    |
| location   | STRING    |

### Stage 1: Unresolved Logical Plan

The SQL parser converts the query into a tree of logical operations.

At this point, Spark knows the requested operations but has not fully resolved them against catalog metadata.

A simplified representation is:

```text
'Project ['name]
   |
   'Filter [('salary > 50000)
            AND ('department = IT)]
       |
       'UnresolvedRelation [employees]
```

The single quotation marks in Spark's plan output can indicate unresolved attributes or expressions.

**What happens internally?**

- Spark identifies `SELECT`, `FROM`, and `WHERE`.
- Creates logical nodes such as `Project`, `Filter`, and `UnresolvedRelation`.
- Records column references such as `name`, `salary`, and `department`.
- Has not yet established that those references correspond to valid columns in the target table.

For example, if the query references a nonexistent column, the unresolved representation may still be constructed. Validation occurs during analysis.

**Output:** A logical tree representing the query's structure.

### Stage 2: Analyzed Logical Plan

Spark's Analyzer resolves the unresolved references using metadata from the catalog and schemas.

For the same query, the analyzed plan might conceptually look like:

```text
Project [name#2]
   |
   Filter [(salary#3 > 50000)
           AND (department#4 = IT)]
       |
       Relation [
         id#1,
         name#2,
         salary#3,
         department#4,
         location#5
       ]
```

Here, identifiers such as `name#2` and `salary#3` represent resolved attributes with expression IDs.

**What happens internally?**

1. Resolves `employees` against an available table or view.
2. Retrieves its schema.
3. Resolves column references to actual attributes.
4. Resolves functions and operators.
5. Determines expression data types and inserts implicit casts when necessary.
6. Checks for invalid, ambiguous, or incompatible expressions.

For example:

```sql
SELECT age
FROM employees;
```

If `age` does not exist, Spark typically raises an `AnalysisException` during analysis.

**Important:** Analysis does not scan all table rows to validate the query. It primarily works with metadata and expression semantics, although obtaining metadata can involve catalog or file-system operations.

**Output:** A valid, resolved logical plan.

### Stage 3: Optimized Logical Plan

The Catalyst Optimizer now transforms the analyzed plan into a more efficient equivalent logical plan.

For our example, Spark recognizes that the query requires only three columns:

- `name`
- `salary`
- `department`

The `id` and `location` columns are unnecessary.

An illustrative optimized logical plan is:

```text
Project [name#2]
   |
   Filter [(salary#3 > 50000)
           AND (department#4 = IT)]
       |
       Relation [
         name#2,
         salary#3,
         department#4
       ]
```

The actual optimized logical plan may retain a full relation schema while recording required-column information for later scan pruning.

**What happens internally?**

| Optimization           | What Spark does                                        |
| ---------------------- | ------------------------------------------------------ |
| Column pruning         | Removes unused columns from downstream processing      |
| Predicate pushdown     | Moves eligible filters closer to scans                 |
| Constant folding       | Evaluates constant expressions                         |
| Boolean simplification | Simplifies redundant conditions                        |
| Projection elimination | Removes unnecessary projections                        |
| Join reordering        | Reorders eligible joins where beneficial and supported |

For example:

```sql
WHERE salary > 20000 + 30000
```

Can be simplified to:

```sql
WHERE salary > 50000
```

**Important distinction:** The optimized logical plan still represents logical operations. It does not necessarily specify whether Spark will use a broadcast join, a sort-merge join, or a particular physical aggregation operator.

**Output:** An efficient logical plan that preserves the query's semantics.

### Stage 4: Physical Plan

Spark's physical planner converts the optimized logical plan into executable operators.

For a supported Parquet source, an illustrative physical plan might look like:

```text
Project [name#2]
   |
   Filter [(salary#3 > 50000)
           AND (department#4 = IT)]
       |
       FileScan parquet
           ReadSchema:
             name, salary, department

           PushedFilters:
             GreaterThan(salary, 50000)
             EqualTo(department, IT)
```

This is a simplified representation; actual Spark output includes operator details, expression IDs, and other metadata.

**What happens internally?**

- Selects physical scan operators.
- Chooses suitable physical join and aggregation strategies.
- Determines required exchanges and sorts.
- Prepares distribution and ordering requirements.
- Applies physical preparation optimizations.
- Enables code generation where operators support it.

For example, a logical join could become:

```text
BroadcastHashJoin
```

or:

```text
SortMergeJoin
   |
   Sort
   |
   Exchange
```

The sort-merge example above is an operator sketch for one input path; a complete join has two input branches. The strategy depends on join semantics, statistics, configurations, and hints.

The prepared physical plan is then used by Spark's execution engine to run distributed tasks. With AQE enabled, parts of the physical plan may be revised using runtime statistics.

**Output:** An executable physical plan.

## 4. Comparison of all four stages

| Stage              | Main purpose               | Key activities                                        |
| ------------------ | -------------------------- | ----------------------------------------------------- |
| Unresolved logical | Understand query structure | Parse SQL and construct unresolved operators          |
| Analyzed logical   | Validate query correctness | Resolve tables, columns, functions, and types         |
| Optimized logical  | Improve logical efficiency | Push filters, prune columns, simplify expressions     |
| Physical           | Decide execution strategy  | Select scans, joins, aggregates, sorts, and exchanges |

A useful way to remember the distinction:

- **Unresolved:** What did the user write?
- **Analyzed:** Is the query valid, and what exactly does it reference?
- **Optimized:** Can the same result be computed more efficiently?
- **Physical:** Which execution operators should Spark use?

## 5. How can you inspect all four plans?

Using PySpark:

```python
df = spark.sql("""
    SELECT name
    FROM employees
    WHERE salary > 50000
      AND department = 'IT'
""")

df.explain(mode="extended")
```

Or using Spark SQL:

```sql
EXPLAIN EXTENDED
SELECT name
FROM employees
WHERE salary > 50000
  AND department = 'IT';
```

The output includes:

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

`EXPLAIN EXTENDED` exposes all four representations, making it useful for understanding Catalyst's transformations.

For deeper performance analysis, use:

```python
df.explain(mode="formatted")
```

This provides a physical plan outline and detailed information about each physical operator.

## 6. Important interview follow-up questions

**Q1. Does the unresolved logical plan validate column names?**

No. Column references are resolved and checked during analysis.

**Q2. Is the analyzed logical plan already optimized?**

Not necessarily. Its main purpose is to produce a semantically valid, resolved plan. The optimizer subsequently applies logical transformations.

**Q3. Does the optimized logical plan decide the join algorithm?**

Generally, no. It can simplify and reorder joins, but physical planning chooses implementations such as broadcast hash join or sort-merge join.

**Q4. Does physical plan generation mean execution has started?**

No. A physical plan can be generated and inspected using `explain()` without executing the complete query. Actual computation occurs when Spark executes the plan.

**Q5. Is the initial physical plan always the final physical plan?**

No. Adaptive Query Execution may modify portions of the physical plan during execution based on actual shuffle statistics.

**Q6. Does every DataFrame transformation go through these stages?**

Structured DataFrame operations are represented within Spark's logical and physical planning framework, but the timing of analysis varies by API and execution mode. Spark Classic and Spark Connect, for example, differ in when unresolved plans are analyzed.

## 7. Final interview summary

When Spark processes a SQL or DataFrame query, Catalyst moves through four important stages.

First, the **Unresolved Logical Plan** represents the query structure without resolving tables or columns. Next, the **Analyzed Logical Plan** resolves references, determines data types, and validates the query.

The **Optimized Logical Plan** then applies techniques such as predicate pushdown, column pruning, constant folding, and join reordering to reduce unnecessary processing.

Finally, the **Physical Plan** selects the actual execution operators, including scan methods, join strategies, aggregations, sorts, and shuffles. Spark then executes the prepared plan across the cluster.

**Key takeaway: Unresolved → Validate → Optimize → Execute efficiently.**