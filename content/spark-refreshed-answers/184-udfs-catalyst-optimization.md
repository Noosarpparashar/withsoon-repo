# Do UDFs completely disable Catalyst optimization?

**No.** An opaque language UDF primarily restricts Spark's ability to inspect and optimize the logic inside its body. Catalyst can continue optimizing eligible relational operations around it.

- **Inside an arbitrary Python/Scala/Java function:** Spark generally cannot infer the custom algorithm and rewrite it as native expressions.
- **Around the function:** Independent filters, required-column selection, supported joins, and other operations can still be optimized.

Eligibility depends on semantics, dependencies, determinism, and data-source support. A UDF is an optimization boundary for some purposes, not a switch that disables the optimizer globally.

## 1. What optimizations are affected?

| Optimization | Impact of opaque UDFs |
| --- | --- |
| Predicate pushdown | Logic inside a UDF generally cannot be translated into a source predicate; independent supported conditions can still push |
| Column pruning | Columns unused by the query/UDF can still be removed; passing an entire struct can require more nested fields |
| Partition pruning | Independent supported partition filters can still prune directories/partitions |
| Join optimization | Continues where eligible, though UDF expressions can restrict transformations or estimates |
| Constant folding | Cannot generally simplify arbitrary function-body logic |
| Filter movement/reordering | Eligible independent predicates can still move where semantics permit |
| Projection pruning | Unused outputs and eligible intermediate projections can still be pruned |
| Whole-stage code generation | Python execution is outside generated JVM code; eligible surrounding operators can still use it |
| Adaptive Query Execution | Supported runtime physical-plan optimizations remain available; AQE does not inspect arbitrary UDF bodies |

AQE is a runtime physical-planning feature, distinct from Catalyst's logical expression rewrites. Neither is globally switched off simply because a query contains a UDF.

## 2. Example: Optimization around a Python UDF

Suppose an unpartitioned Parquet dataset has these columns:

```text
employee_id: BIGINT
name: STRING
department: STRING
salary: DOUBLE
location: STRING
joining_date: DATE
```

Apply an independent native filter, then calculate a bonus in Python:

```python
from pyspark.sql.functions import udf, col

# Explicitly select non-Arrow execution for the illustrative plan below.
@udf("double", useArrow=False)
def calculate_bonus(salary):
    return salary * 0.10 if salary is not None else None

df = spark.read.parquet("/data/employees")

result = (
    df.filter(col("department") == "IT")
      .withColumn("bonus", calculate_bonus(col("salary")))
      .select("employee_id", "bonus")
)

result.explain("formatted")
```

### A. Predicate pushdown

Spark can pass a supported department = 'IT' predicate to the Parquet reader. That may allow statistics-based skipping, but does not guarantee that all returned rows already satisfy the condition.

### B. Column pruning

The scan needs employee_id, department, and salary. It can omit name, location, and joining_date. Department is required for filtering even though it is absent from the final output.

### C. Separate Python evaluation

The bonus function still executes in a Python worker. That does not prevent the independent scan optimizations:

[spark-reference:catalyst-around-udf]

### Simplified physical plan

```text
Project [employee_id, bonus]
       |
BatchEvalPython [calculate_bonus(salary)]
       |
Project [employee_id, salary]
       |
Filter [department = IT]
       |
FileScan parquet
  PushedFilters:
    [IsNotNull(department), EqualTo(department,IT)]
  ReadSchema:
    struct<employee_id:bigint,department:string,salary:double>
```

This sketch assumes an ordinary department data column, default opaque UDF execution, and a supporting reader. A directory partition column can instead appear in PartitionFilters and need not be physically read from the Parquet data. Actual plans may contain additional null checks, reordered operators, or different scan implementations.

The useArrow option is available in modern PySpark. Arrow execution may show ArrowEvalPython instead of BatchEvalPython; it does not automatically make the body visible to Catalyst.

Spark has optimizer rules that extract Python evaluation into appropriate operators while allowing surrounding relational optimization to continue.

## 3. What if the UDF is inside a filter?

```python
@udf("boolean", useArrow=False)
def is_high_salary(salary):
    return salary is not None and salary > 50000

udf_filtered = df.filter(
    is_high_salary(col("salary"))
)
```

Catalyst generally cannot inspect this Python body and derive a source-level salary > 50000 condition. An illustrative plan is:

```text
Filter [pythonUDF0]
       |
BatchEvalPython [is_high_salary(salary)]
       |
FileScan parquet
  PushedFilters: []
```

The sketch assumes no other eligible predicates. Spark may need to read more data before evaluating the custom filter.

Now add an independent native condition:

```python
mixed_filtered = df.filter(
    (col("department") == "IT")
    & is_high_salary(col("salary"))
)
```

Spark can still push department = 'IT' where supported, while leaving the salary UDF in Python. This separation applies to eligible conjuncts; it is not generally safe to extract one branch of an OR as a mandatory source filter.

Also, Boolean syntax is not an execution-order guarantee for UDFs. Handle nulls and exceptional inputs inside the function rather than relying on another condition to short-circuit its evaluation.

## 4. How does this affect whole-stage code generation?

Supported native operators can form generated JVM pipelines:

```python
native_bonus = (
    df.filter(col("salary") > 50000)
      .withColumn("bonus", col("salary") * 0.10)
)
```

A Python UDF requires a separate evaluation path:

```python
python_bonus = df.withColumn(
    "bonus",
    calculate_bonus(col("salary"))
)
```

Generated JVM code cannot span the Python function itself. Eligible operators before and after it can still use code generation; the entire query does not become unoptimized.

Scala UDF calls can participate in generated JVM code, but Catalyst still generally cannot inspect their internal business logic. Code-generation support and expression-level visibility are different properties.

## 5. Does the implementation type matter?

| Implementation | Catalyst visibility | Execution behavior |
| --- | --- | --- |
| Scalar Python UDF | Generally opaque | Python worker; pickle or Arrow interchange depending on mode |
| Pandas UDF | Generally opaque | Arrow interchange with a batch-oriented pandas interface |
| Scala/Java UDF | Generally opaque body | JVM function invocation and value conversions |
| Built-in Spark expression | Represented directly in Catalyst | Eligible native optimization/execution |

SQL-expression-defined functions can differ from opaque language UDFs because their bodies are expressed using Spark's own operations.

Spark 4.3 also documents experimental, opt-in transpilation of a limited subset of simple Python UDFs into Catalyst expressions. This is not a general promise for arbitrary functions or the assumed execution mode of these examples. Verify the supported subset, configuration, and actual plan for your deployment.

## 6. Best practices

1. **Prefer built-ins:** Use when, coalesce, regexp_extract, transform, and other native expressions when their semantics match.
2. **Keep selective filters native:** Expose supported source predicates instead of hiding them inside a function.
3. **Pass only required inputs:** Avoid unnecessary columns and whole structs when a few fields suffice.
4. **Review UDF join keys and predicates:** They can limit transformations and source optimization.
5. **Choose the right Python interface:** Pandas or Arrow-based execution can reduce suitable workloads' costs, but does not by itself expose body logic.
6. **Inspect the plan:** Check scan fields, pushed and partition filters, Python evaluation operators, and code-generated regions with explain("formatted").
7. **Preserve correctness:** Handle nulls, errors, and determinism explicitly; do not infer short-circuit behavior from textual filter order.

## 7. Interview-ready answer

> No. Catalyst still optimizes the overall query, but generally treats opaque language UDF bodies as black boxes.
>
> A Python UDF implementing salary > 50000 usually prevents that specific logic from being translated into a Parquet predicate. An independent department = 'IT' condition can still be pushed where supported, and unnecessary columns can still be pruned.
>
> Join optimization, partition pruning, and eligible runtime optimizations also remain available. Python execution creates a code-generation boundary, but compatible JVM operators around it can still use generated code.
>
> I prefer native expressions and verify the resulting plan rather than assuming one UDF disables all optimization.

**Key takeaway:** Distinguish optimization of the UDF body from optimization of the query around it. A function can remain opaque while the surrounding plan still benefits from Catalyst.
