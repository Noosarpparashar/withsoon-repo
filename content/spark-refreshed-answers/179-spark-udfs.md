# What are Spark UDFs?

A User-Defined Function (UDF) in Spark is a custom function used to apply application-specific logic to DataFrame columns or SQL expressions.

UDFs let developers reuse logic written in languages such as Python, Scala, or Java when suitable built-in expressions are unavailable or impractical. SQL-defined functions are also available in supported Spark versions.

Opaque language UDFs can limit Catalyst's visibility into the computation. Python UDFs also introduce a JVM–Python process boundary, so built-in expressions are generally the first choice when they implement the required semantics.

## 1. Why do we need UDFs?

Spark provides built-in functions for many common tasks:

- **Strings:** upper, lower, substring.
- **Math:** round, abs, sqrt.
- **Dates:** year, month, datediff.
- **Conditional expressions:** when, coalesce.

Sometimes an organization-specific rule or specialized library is difficult to express using those functions. A UDF packages that custom logic for reuse within distributed queries.

The salary example below is deliberately simple: it demonstrates the API, then shows a preferable built-in alternative.

## 2. Example of a Python UDF in PySpark

Suppose an employee DataFrame contains:

| employee_id | salary |
| --- | --- |
| 101 | 30000 |
| 102 | 60000 |
| 103 | 120000 |

Create the sample DataFrame:

```python
df = spark.createDataFrame(
    [(101, 30000), (102, 60000), (103, 120000)],
    "employee_id INT, salary INT"
)
```

### Step 1: Define a Python function

```python
def classify_salary(salary):
    if salary is None:
        return "Unknown"
    elif salary < 50000:
        return "Low"
    elif salary < 100000:
        return "Medium"
    else:
        return "High"
```

### Step 2: Wrap the function as a UDF

```python
from pyspark.sql.functions import udf, col
from pyspark.sql.types import StringType

salary_udf = udf(
    classify_salary,
    StringType()
)
```

This creates a DataFrame-callable UDF with an explicit return type. It does not register a SQL function name; calling it by name from SQL requires separate registration with spark.udf.register.

### Step 3: Apply the UDF

```python
result = df.withColumn(
    "salary_category",
    salary_udf(col("salary"))
)

result.show()
```

Output values:

| employee_id | salary | salary_category |
| --- | --- | --- |
| 101 | 30000 | Low |
| 102 | 60000 | Medium |
| 103 | 120000 | High |

Spark evaluates the function through tasks processing the dataset's partitions when an action executes. The table illustrates the values; row order is not guaranteed without an explicit ordering.

## 3. How does a Python UDF work internally?

[spark-reference:python-udf-execution]

For a scalar Python UDF:

1. Executor tasks run the JVM-side query operators.
2. Input values cross into Python worker processes.
3. The Python function computes the result for each input row.
4. Results return to the JVM.
5. Spark continues with downstream operators.

The process boundary adds serialization/deserialization, buffering, and communication costs. Input transfer can be batched; scalar row semantics do not imply a separate network request for every row.

Arrow-optimized scalar UDFs can reduce transfer overhead while still calling a function on ordinary Python values row by row. They are different from vectorized Pandas or Arrow UDFs. Selection depends on the Spark version, configuration, dependencies, and supported types; current Spark documentation describes Arrow as the scalar-UDF transfer default since Spark 4.2.

## 4. Types of UDFs and related custom functions

| Type | Description | Execution characteristics |
| --- | --- | --- |
| Scalar Python UDF | Custom function over individual row values | Runs in Python workers; pickle- or Arrow-based transfer depending on settings/version |
| Pandas UDF | Python function using pandas objects | Arrow-based transfer; scalar Series-to-Series functions process batches |
| Vectorized Arrow UDF | Function using pyarrow arrays in supported versions | Receives columnar arrays/batches directly |
| Scala/Java UDF | Function written in a JVM language | Runs within executor JVMs; body is generally opaque to Catalyst |
| SQL-defined function | Reusable SQL expression or query in supported versions | May retain more optimizer visibility than an opaque language UDF |
| UDAF | User-defined aggregate function | Combines values across rows/groups; distinct from a scalar UDF |

### Example: Pandas UDF

A scalar Pandas UDF processes Series batches and returns the same number of values:

```python
import pandas as pd
from pyspark.sql.functions import pandas_udf, col

@pandas_udf("double")
def calculate_bonus(salary: pd.Series) -> pd.Series:
    return salary * 0.10

bonus_result = df.withColumn(
    "bonus",
    calculate_bonus(col("salary"))
)
```

Pandas UDFs require compatible pandas and PyArrow dependencies in the execution environment. Arrow transfers columnar data between the JVM and Python, but does not remove the process boundary or make the Python body transparent to Catalyst.

They can outperform traditional scalar Python execution for suitable workloads; they are not guaranteed to beat native Spark expressions. This bonus calculation is simple enough to implement directly with a built-in column expression.

## 5. Why are UDFs often slower than built-in functions?

### A. Limited visibility into custom logic

Catalyst understands a native comparison:

```python
df.filter(col("salary") > 50000)
```

For a compatible file reader, Spark may push that predicate to the source.

By comparison:

```python
df.filter(salary_udf(col("salary")) == "High")
```

Catalyst generally cannot inspect the Python classification function and translate its body into a source predicate. These two filters demonstrate visibility; they intentionally select different salary ranges and are not equivalent rewrites.

A UDF does not disable every query optimization. Independent native filters and unused-column pruning can still be optimized where semantics allow.

### B. Serialization and communication overhead

Python UDF values must cross between executor JVMs and Python workers. Arrow can reduce transfer costs, but cannot eliminate all conversion and execution overhead.

### C. Code-generation boundaries

Spark can fuse supported native operators using whole-stage code generation. A generated JVM pipeline cannot span arbitrary Python execution, although supported operators before and after that boundary may still use code generation.

### D. Additional resources

Python workers consume CPU and memory alongside the executor JVM. JVM-language UDFs avoid this particular Python-process overhead, but can still incur object conversion and optimization limitations.

## 6. UDF versus built-in Spark functions

| Feature | Built-in expressions | Python UDFs |
| --- | --- | --- |
| Performance | Generally efficient for supported operations | Additional execution/transfer overhead; benchmark the workload |
| Catalyst visibility | Understands supported expression semantics | Generally cannot inspect the Python body |
| Predicate pushdown | Possible for source-supported predicates | Generally unavailable for logic inside the UDF |
| JVM–Python boundary | No Python UDF process boundary | Present |
| Whole-stage code generation | Supported for many native operators | Cannot include Python function execution |
| Custom logic | Broad expression library, including higher-order functions | Flexible Python and library logic |
| Recommended use | Prefer when semantics match | Use when native alternatives are insufficient |

### Avoid an unnecessary UDF

The classification can use native when expressions:

```python
from pyspark.sql.functions import when, col

native_result = df.withColumn(
    "salary_category",
    when(col("salary").isNull(), "Unknown")
    .when(col("salary") < 50000, "Low")
    .when(col("salary") < 100000, "Medium")
    .otherwise("High")
)
```

This preserves the illustrated integer/null behavior while avoiding Python execution. Native expressions give Spark more optimization opportunities; they do not guarantee that every derived expression is itself eligible for source pushdown.

## 7. When should you use Spark UDFs?

Use a UDF when:

- Required business logic cannot be implemented clearly and correctly with built-ins.
- Existing Python, Scala, or Java logic needs to be reused.
- A specialized computation or library has no suitable native equivalent.
- Its measured overhead is acceptable for the workload.

Prefer native expressions first, reduce data before expensive custom computation when safe, handle nulls and exceptional inputs inside the function, and package dependencies for workers. UDFs should avoid external side effects because evaluation and task retries do not guarantee one invocation per source row. Declare nondeterministic functions appropriately.

Benchmark representative data and inspect the physical plan before relying on a UDF in a large production query.

## 8. Interview-ready answer

> A Spark UDF is a custom function that applies business logic to DataFrame columns or SQL expressions when suitable built-in expressions are unavailable.
>
> Python UDFs execute in Python workers and exchange values with executor JVMs. That boundary adds transfer and serialization costs. Catalyst generally treats the Python body as opaque, limiting optimizations of that logic.
>
> Arrow-optimized scalar UDFs improve transfer, while Pandas and vectorized Arrow UDFs support batch-oriented interfaces. They still have different costs from native Spark expressions.
>
> I prefer built-ins when they preserve the required semantics and use UDFs for logic that cannot be expressed efficiently with native functions. I handle nulls, dependencies, and determinism explicitly and validate performance on representative data.

**Key takeaway:** UDFs extend Spark with custom logic. Choose the right API and execution model, and prefer native expressions when they already solve the problem.
