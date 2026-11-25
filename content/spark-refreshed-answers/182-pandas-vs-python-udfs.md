# Are Pandas UDFs always faster than regular Python UDFs?

**No.** Pandas UDFs can outperform traditional scalar Python UDFs when useful batch/vectorized computation outweighs their conversion and memory costs. Large data volume alone does not guarantee an advantage.

Their performance depends on the computation, degree of vectorization, input types, partitioning, batch size, dependencies, and Spark version. Arrow-optimized scalar Python UDFs also reduce the transfer-cost gap.

## 1. Key differences

| Feature | Scalar Python UDF | Scalar Pandas UDF — Series to Series |
| --- | --- | --- |
| Function interface | Individual Python values | pandas Series batches |
| Transfer format | Pickle or Arrow, depending on configuration/version | Apache Arrow |
| Processing semantics | One output value per input row | One output value per input row, computed through a batch interface |
| Vectorized computation | Not inherent to a scalar function | Possible when the body uses genuinely vectorized operations |
| Python function calls | Typically once per row | Typically once per batch for this API |
| Memory | Has worker, transfer-buffer, and function working memory | Also holds batch/pandas representations and intermediate results |
| Large workloads | Can be dominated by scalar Python overhead | Can benefit substantially from vectorized work |
| Small workloads | May be competitive | Batch conversion/setup may outweigh savings |
| Catalyst visibility | Generally cannot inspect the body | Generally cannot inspect the body |

Other Pandas UDF interfaces, such as iterator and grouped aggregations, have different invocation and memory behavior. The examples here focus on scalar Series-to-Series functions.

Current PySpark documentation describes Arrow transfer as the regular scalar-UDF default since Spark 4.2, subject to supported execution paths and dependencies. Do not assume every regular UDF uses pickle; identify the actual mode being benchmarked.

## 2. How do they execute internally?

[spark-reference:scalar-vs-pandas-batches]

With one million rows, a scalar function is typically invoked approximately one million times, even if transport is batched.

A scalar Pandas UDF is called once for each input batch. If all batches contained exactly 10,000 rows, one million rows would require 100 calls. Actual batches are built within partitions and may be smaller because of partial tails or other limits, so the call count can be higher.

Fewer calls can reduce Python overhead, but the batch body still needs to perform efficient work. Receiving a Series does not automatically remove Python-level loops.

## 3. Example: Calculate a 10% bonus

Assume df is a batch DataFrame with a DOUBLE salary column. The examples use distinct names so they can be compared together.

### Approach 1: Traditional scalar Python UDF

```python
from pyspark.sql.functions import udf, col

# Explicitly select pickle-based scalar transfer for this comparison.
@udf("double", useArrow=False)
def scalar_bonus(salary):
    return salary * 0.10 if salary is not None else None

scalar_result = df.withColumn(
    "bonus",
    scalar_bonus(col("salary"))
)
```

The function receives individual salary values. The useArrow parameter requires a supporting modern PySpark version.

### Approach 2: Scalar Pandas UDF

```python
import pandas as pd
from pyspark.sql.functions import pandas_udf, col

@pandas_udf("double")
def pandas_bonus(salary: pd.Series) -> pd.Series:
    return salary * 0.10

pandas_result = df.withColumn(
    "bonus",
    pandas_bonus(col("salary"))
)
```

The multiplication operates on a Series batch. Compatible pandas and PyArrow dependencies are required on the relevant processes. Validate returned types, nulls, and NaN behavior when comparing implementations and Spark versions.

### Approach 3: Built-in expression — preferred here

```python
native_result = df.withColumn(
    "bonus",
    col("salary") * 0.10
)
```

For this simple operation, native arithmetic is the clearest starting point. It avoids Python workers and exposes the expression to Catalyst.

## 4. When might Pandas UDFs be slower or provide little benefit?

### A. Small datasets or tiny partitions

Arrow/pandas conversion, worker initialization, and per-batch setup can outweigh savings when each task does little useful work. A regular UDF can be competitive; a native expression may avoid both alternatives' custom-function costs.

### B. Non-vectorized logic

This Pandas UDF still calls Python logic for individual elements:

```python
@pandas_udf("double")
def apply_bonus(salary: pd.Series) -> pd.Series:
    return salary.apply(
        lambda value: value * 0.10 if pd.notna(value) else None
    )
```

By contrast:

```python
@pandas_udf("double")
def vectorized_bonus(salary: pd.Series) -> pd.Series:
    return salary * 0.10
```

The second uses vectorized arithmetic. Batch input alone does not make the first implementation vectorized.

### C. Memory pressure

Arrow buffers, pandas representations, and intermediate arrays can coexist. Wide strings, large batches, and multiple concurrent Python workers can raise peak memory and cause failures.

For applicable batch paths, tune the row cap:

```python
spark.conf.set(
    "spark.sql.execution.arrow.maxRecordsPerBatch",
    "10000"
)
```

Smaller batches may reduce working memory; larger ones may amortize setup costs. A row cap is not a byte or per-task memory limit. Variable-width values and intermediate results still matter, and applicable byte limits can produce smaller batches.

Do not assume this setting bounds a full group in grouped pandas APIs such as applyInPandas. Those operations have separate group-size and skew considerations.

### D. Expensive conversion relative to computation

If the calculation itself is trivial, creating and converting batches may cost more than the arithmetic. Native expressions are usually preferable for supported simple operations.

### E. Per-row work dominates

An expensive function that cannot be vectorized may consume most runtime regardless of transfer format. Reducing calls or serialization then yields only a modest overall improvement. Avoid per-row external requests when a suitable join or batched integration can express the requirement.

## 5. What about Arrow-optimized scalar Python UDFs?

Arrow can also improve transfer for an ordinary scalar interface:

```python
from pyspark.sql.functions import udf

@udf("double", useArrow=True)
def arrow_bonus(salary):
    return salary * 0.10 if salary is not None else None
```

This function still works on individual Python values. It does not become Series-based vectorized computation just because transfer uses Arrow.

The comparison is therefore not simply Arrow versus pickle. Consider both interchange costs and how the function body executes.

## 6. When should you choose each approach?

| Scenario | Starting point |
| --- | --- |
| Simple mathematical expressions | Built-in Spark expressions |
| Supported string operations | Built-in Spark functions |
| Useful NumPy/pandas vectorized computation | Benchmark a Pandas UDF |
| Custom scalar Python logic | Consider Arrow-optimized scalar execution when supported |
| Small workloads with custom logic | Measure setup and conversion costs for both interfaces |
| Batch-oriented inference | A suitable Pandas/Arrow or other supported batched API |
| Memory-constrained executors | Measure peak worker memory and tune batches/concurrency |

## 7. How to compare performance

Use the same stable input, partitioning, resources, and output requirements. The following consumes the computed bonus in an aggregation, comparing the functions already defined above:

```python
import time
from pyspark.sql.functions import sum as spark_sum

cases = [
    ("pickle scalar", scalar_bonus(col("salary"))),
    ("Arrow scalar", arrow_bonus(col("salary"))),
    ("Pandas", pandas_bonus(col("salary"))),
    ("native", col("salary") * 0.10)
]

for label, bonus_expression in cases:
    started = time.perf_counter()
    total = (
        df.select(bonus_expression.alias("bonus"))
          .agg(spark_sum("bonus").alias("total"))
          .collect()[0]["total"]
    )
    elapsed = time.perf_counter() - started
    print(label, "seconds:", elapsed, "total:", total)
```

This is a timing pattern, not benchmark evidence or a complete harness. Warm up each path, repeat trials, rotate execution order, and compare correctness as well as runtime. Keep cache conditions consistent and distinguish initialization from steady-state execution.

Simply counting rows after adding bonus may let Spark prune an unused UDF expression. Aggregating bonus makes the result depend on that computation. For floating-point results, use an appropriate comparison tolerance and check null/NaN cases explicitly.

Inspect the final plan and Spark UI task duration, transfer costs, worker memory, and failures. Do not infer a universal ranking from one run.

## 8. Interview-ready answer

> No. Pandas UDFs can be faster when batch processing and genuinely vectorized operations save enough work to outweigh conversion and memory overhead.
>
> They may offer little benefit or be slower for small tasks, scalar Python loops hidden inside Series.apply, expensive conversions, or memory-heavy batches.
>
> Regular scalar UDFs can also use Arrow transfer, so the actual execution mode and degree of vectorization matter more than the function label alone.
>
> I prefer native Spark expressions when available. For necessary custom Python logic, I benchmark equivalent scalar and Pandas implementations on representative input, consume the computed output, and compare correctness, runtime, and memory.

**Key takeaway:** Batch input enables vectorization but does not guarantee it. Choose by measured useful work, transfer/conversion cost, and memory behavior.
