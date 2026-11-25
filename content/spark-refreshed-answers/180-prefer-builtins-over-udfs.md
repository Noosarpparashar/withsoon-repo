# Why should UDFs be avoided when built-in functions can be used?

Prefer equivalent built-in Spark expressions because they usually offer more optimizer visibility, lower execution overhead, and better integration with Spark's execution engine.

Catalyst understands supported native expressions and can apply relevant optimizations, including constant folding, expression simplification, and source predicate pushdown. Supported physical operators can also use whole-stage code generation.

Opaque language UDFs restrict optimization of their internal logic. Python UDFs additionally execute across a JVM–Python process boundary. These costs make an unnecessary UDF a poor default, rather than making every UDF inappropriate.

## 1. Key reasons to prefer built-in functions

| Feature | Built-in Spark expressions | Python UDFs |
| --- | --- | --- |
| Performance | Generally efficient for supported operations | Additional Python execution and transfer costs |
| Catalyst visibility | Understands supported expression semantics | Generally cannot inspect the function body |
| Predicate pushdown | Possible for source-supported predicates | Generally unavailable for logic hidden inside the UDF |
| Whole-stage code generation | Available for many supported operators | Cannot include Python function execution |
| JVM–Python communication | No Python UDF process boundary | Required |
| Serialization overhead | Avoids Python UDF interchange | Additional value/batch interchange |
| Memory | Avoids a Python worker for this computation | Python workers need additional memory |
| Batch/vectorized processing | Available on eligible execution paths | Scalar functions operate row by row; Pandas/Arrow APIs offer batch interfaces |
| Maintenance | Standard expressions with documented semantics | Custom code, dependencies, and edge cases to maintain |

These are typical trade-offs, not a guaranteed performance ranking for every expression or dataset.

## 2. Limited visibility into UDF logic

Catalyst understands a native comparison:

```python
from pyspark.sql.functions import col

native_filtered = df.filter(col("salary") > 50000)
```

For a compatible Parquet scan, Spark can pass a supported salary predicate to the reader. Actual data skipping depends on statistics and file layout; a residual filter may still be needed.

Now express the condition through a Python UDF:

```python
from pyspark.sql.functions import udf
from pyspark.sql.types import BooleanType

@udf(BooleanType())
def high_salary(salary):
    return salary is not None and salary > 50000

udf_filtered = df.filter(high_salary(col("salary")))
```

Catalyst generally cannot infer the salary comparison from the Python body or translate it into a Parquet predicate. More input may therefore be read and passed through Python before filtering.

For numeric salary values and NULL, these filters retain the same rows. Their Boolean values differ on NULL input: the native comparison yields NULL, while the UDF returns False. A filter discards both, but projecting those results would expose the difference.

Using a UDF does not disable optimization of the entire query. Independent native predicates may still be pushed down, and unrelated columns may still be pruned.

## 3. JVM–Python and serialization overhead

[spark-reference:builtin-vs-python-udf-path]

Scalar Python UDF execution involves:

1. Preparing and encoding values on the JVM side.
2. Transferring inputs to a Python worker.
3. Decoding them into Python values.
4. Evaluating the Python function.
5. Encoding and returning results to the executor JVM.

Transfers can be batched; this is not necessarily a separate network request for every row. The repeated processing and process boundary can still be costly at scale.

Arrow-optimized scalar UDFs improve data interchange while retaining row-oriented Python function semantics. Pandas and vectorized Arrow UDFs offer batch interfaces. None automatically grants Catalyst full visibility into custom Python logic or removes the worker-process boundary.

## 4. Whole-stage code generation limitations

Spark can combine compatible native operators into efficient generated JVM code. For example:

```python
native_bonus = (
    df.filter(col("salary") > 50000)
      .withColumn("bonus", col("salary") * 0.10)
      .select("employee_id", "bonus")
)
```

Eligible filter, arithmetic, and projection operators may form a generated pipeline.

A Python computation runs outside that generated code:

```python
from pyspark.sql.functions import udf
from pyspark.sql.types import DoubleType

# Explicitly select the non-Arrow scalar path for this plan illustration.
calculate_bonus_udf = udf(
    lambda salary: None if salary is None else float(salary) * 0.10,
    DoubleType(),
    useArrow=False
)

udf_bonus = df.withColumn(
    "bonus",
    calculate_bonus_udf(col("salary"))
)
```

A simplified plan for the non-Arrow path may include:

```text
Project
   |
BatchEvalPython
   |
FileScan parquet
```

The exact plan depends on the source and Spark version. An Arrow-based path may show ArrowEvalPython instead. Both create a Python execution boundary; supported JVM operators on either side can still use code generation.

The sample uses the useArrow parameter available in modern PySpark. Compare equivalent pipelines when benchmarking: the native_bonus example also filters and projects, while udf_bonus only adds a column.

## 5. More opportunities for native-expression optimization

| Optimization | Built-in expressions | Opaque language UDFs |
| --- | --- | --- |
| Predicate pushdown | Available for supported predicates and sources | Generally not for logic inside the body |
| Constant folding | Eligible constant expressions can be evaluated during optimization | Generally cannot simplify hidden body logic |
| Expression simplification | Available when semantics permit | Limited body visibility |
| Null propagation | Known for supported expressions | Depends on declared and implemented UDF semantics |
| Whole-stage code generation | Available for supported JVM operators | Python execution is outside generated JVM code |
| Column pruning | Can remove unneeded columns and eligible nested fields | Unused inputs can still be pruned; fields used inside opaque inputs may be harder to eliminate |

For a concrete constant-folding example:

```python
from pyspark.sql.functions import lit

folded_result = df.withColumn(
    "result",
    col("salary") * (lit(2) + lit(3))
)
```

Catalyst can fold the constant addition to 5. The salary-dependent multiplication remains. If the addition were hidden inside Python code, Catalyst could not inspect that body to perform the same rewrite.

Do not assume salary * 0 can always become a literal zero: NULL, floating-point NaN/infinity, and expression evaluation rules matter. An optimization must preserve semantics.

## 6. Practical example: Salary classification

Assume salary contains integer values or NULL.

### Approach 1: Python UDF

```python
from pyspark.sql.functions import udf, col
from pyspark.sql.types import StringType

@udf(StringType())
def salary_category(salary):
    if salary is None:
        return "Unknown"
    elif salary < 50000:
        return "Low"
    elif salary < 100000:
        return "Medium"
    return "High"

udf_result = df.withColumn(
    "category",
    salary_category(col("salary"))
)
```

### Approach 2: Built-in expressions

```python
from pyspark.sql.functions import when, col

native_result = df.withColumn(
    "category",
    when(col("salary").isNull(), "Unknown")
    .when(col("salary") < 50000, "Low")
    .when(col("salary") < 100000, "Medium")
    .otherwise("High")
)
```

The second implementation preserves the illustrated classification and null behavior while avoiding Python worker execution. It also exposes the conditional expression to Catalyst.

Inspect their execution paths with:

```python
udf_result.explain("formatted")
native_result.explain("formatted")
```

Look for Python evaluation operators and compare runtime metrics on equivalent input and output. Do not assume that a complex native conditional must itself be pushable into a file reader merely because it is a built-in expression.

## 7. Are UDFs always bad?

No. They are useful for specialized algorithms, external libraries, complex business logic, and some inference workloads with no suitable native implementation.

- **Python UDFs:** Add process-boundary overhead and limit visibility into the body.
- **Pandas/Arrow UDFs:** Can improve suitable workloads through efficient interchange and batch interfaces.
- **Scala/Java UDFs:** Avoid Python workers but still generally hide internal logic from Catalyst.
- **Built-ins:** Usually the best starting point when they implement the required behavior clearly.

A convoluted native expression is not guaranteed to beat a well-designed UDF. Benchmark representative data when the choice is unclear. Preserve null behavior, type conversions, error handling, and determinism when replacing an implementation.

## 8. Interview-ready answer

> Prefer equivalent built-in expressions because Catalyst understands their semantics and Spark can use relevant optimizations, including source pushdown, constant folding, and code generation for supported operators.
>
> Opaque UDF bodies limit those opportunities. Python UDFs also exchange data between executor JVMs and Python workers, adding serialization and communication overhead.
>
> Arrow-based execution can reduce some costs, but does not make arbitrary Python logic native or fully optimizer-visible. Scala and Java UDFs avoid the Python boundary but still have optimization limitations.
>
> I use built-ins when their semantics match the requirement, and reserve UDFs for custom logic that cannot be expressed efficiently using Spark's native functions. I compare equivalent plans and measured performance before choosing.

**Key takeaway:** Native expressions usually give Spark more information and avoid unnecessary execution boundaries. Use a UDF when its custom logic justifies those costs.
