# What role does Apache Arrow play in Pandas UDFs?

Apache Arrow provides efficient columnar data interchange between Spark executor JVMs and Python workers. Pandas UDFs use Arrow to exchange batches, then expose the data through pandas objects for computation.

This can reduce conversion and serialization overhead compared with traditional pickle-based Python interchange. The batch interface also makes efficient pandas/NumPy computation possible, but does not guarantee that the function body is vectorized or faster.

## 1. Why is Arrow useful here?

Spark's SQL execution engine primarily runs in JVM processes, while a Pandas UDF executes in Python workers. Values must cross that process boundary in a representation both sides understand.

Traditional scalar Python execution encodes values, transfers them to Python, calls a function on individual row values, and returns encoded results. Transport may still be batched.

A scalar Pandas UDF exchanges Arrow batches, receives pandas Series, operates on the batch, and returns results through Arrow:

[spark-reference:scalar-vs-pandas-batches]

Arrow's standardized columnar representation reduces interchange costs; it does not remove the JVM–Python boundary.

## 2. How does Arrow work internally?

[spark-reference:arrow-pandas-transfer]

For a scalar Series-to-Series Pandas UDF, Spark:

1. Forms batches from input columns within partitions.
2. Encodes/transfers columnar data using Arrow.
3. Exposes the data to the Python worker as pandas objects.
4. Calls the Pandas UDF on a Series batch.
5. Converts the returned values as required and sends Arrow results back.
6. Continues JVM-side processing.

Exact conversion paths depend on types, versions, and execution support. Existing compatible columnar input may avoid some conversions, but an end-to-end zero-copy path is not guaranteed.

## 3. Example: Calculate a 10% bonus

Suppose df contains ten million employee rows with a DOUBLE salary column:

```python
import pandas as pd
from pyspark.sql.functions import pandas_udf, col

@pandas_udf("double")
def calculate_bonus(salary: pd.Series) -> pd.Series:
    return salary * 0.10

result = df.withColumn(
    "bonus",
    calculate_bonus(col("salary"))
)
```

Compatible pandas and PyArrow dependencies must be available in the relevant execution environment. Pandas UDFs already use Arrow; the separate configuration for Arrow-based toPandas/createDataFrame conversion is not an enable switch required for this decorator.

Spark passes salary batches to Python rather than calling this function separately for each salary value. A small illustrative batch is:

[spark-reference:pandas-bonus-series]

For this scalar interface, the returned Series must contain the same number of elements as the input batch. Other Pandas interfaces, such as iterators or grouped aggregation, have different contracts.

This calculation has a simple native Spark equivalent, so a UDF is useful here as an API illustration rather than the preferred implementation.

## 4. What benefits does Arrow provide?

| Benefit | Explanation |
| --- | --- |
| Efficient interchange | Standardized columnar binary representation |
| Reduced conversion overhead | Avoids some costs of traditional Python object interchange |
| Batch transfer | Exchanges multiple column values together |
| Supports vectorized work | Supplies batches that pandas/NumPy or other array libraries can process efficiently |
| Fewer function calls with scalar Pandas UDFs | The Series-to-Series API calls the user function per batch rather than per row |
| Cross-language interoperability | Provides a common data representation across runtimes |
| Potentially better performance | Savings depend on useful computation, conversion costs, types, and memory |

Fewer function calls are a property of the Pandas batch interface, not a guarantee of every Arrow-enabled API. An Arrow-optimized scalar Python UDF can still invoke its function per row.

### Who performs the calculation in this example?

- **Spark:** Distributes input and schedules execution.
- **Arrow interchange:** Carries columnar batches between the JVM and Python.
- **The Pandas expression:** Performs salary * 0.10 through its underlying array implementation, often NumPy.

The Arrow project also provides compute kernels, including pyarrow.compute. The distinction is that using Arrow for transport does not automatically make the transport layer execute the Pandas UDF's business logic.

## 5. Does Arrow eliminate serialization and copying?

No. Spark may still need to:

- Prepare internal values for Arrow transfer.
- Move data between processes.
- Convert between Arrow and pandas representations.
- Allocate batch buffers and intermediate results.

Some compatible conversions can use zero-copy access, but type handling, null representations, layout, and the selected pandas backend can require copying. Arrow reduces specific interchange costs; it does not make arbitrary Python code native, eliminate all allocations, or expose that code to Catalyst.

## 6. How does batch size affect performance?

For applicable batch paths, the row cap can be configured with:

```python
spark.conf.set(
    "spark.sql.execution.arrow.maxRecordsPerBatch",
    "10000"
)
```

The documented default is 10,000 records per batch. It is a maximum, not a guarantee that every batch contains that many rows.

| Batch size | Potential advantage | Potential disadvantage |
| --- | --- | --- |
| Smaller | Less working data per batch | More batch setup and conversion overhead |
| Larger | Fewer calls and better amortization of setup | Higher peak memory and larger intermediate arrays |

One million rows in exactly full 10,000-row batches would mean 100 batches. Actual counts can be higher because batches are formed within partitions and may be limited by other conditions, including applicable byte caps.

Row count is not a byte or per-task memory limit. Wide variable-length values, temporary arrays, and concurrent Python workers influence peak memory. Full-group pandas APIs also have different memory behavior; maxRecordsPerBatch does not generally cap the size of a group passed to applyInPandas.

## 7. Arrow in Pandas UDFs versus scalar Python UDFs

| Feature | Traditional pickle-based scalar UDF | Scalar Pandas UDF |
| --- | --- | --- |
| Transfer | Pickle-based value interchange | Arrow batches |
| Function input | Individual Python values | pandas Series; struct variants may use DataFrames |
| Invocation | Typically per row | Typically per batch for Series-to-Series functions |
| Vectorization | Not inherent | Possible if the body uses vectorized operations |
| Overhead | Python object interchange and scalar calls | Arrow/pandas conversion, batch setup, and computation |
| Suitable custom work | Individual row logic | Useful batch/array computations |

Modern scalar Python UDFs can also use Arrow. Current PySpark documentation describes Arrow transfer as the scalar-UDF default since Spark 4.2, subject to execution support and dependencies. Such a function can still receive ordinary Python values row by row.

Arrow serialization and vectorized Pandas execution are related but separate optimizations. Both still execute Python logic outside Spark's JVM-generated pipelines.

## 8. Interview-ready answer

> Arrow is the columnar interchange format used by Pandas UDFs to efficiently exchange batches between Spark executor JVMs and Python workers.
>
> The UDF receives pandas objects and can use vectorized operations, reducing Python call overhead compared with a scalar interface. Arrow improves transfer; the function's actual computation must still be implemented efficiently.
>
> Arrow does not eliminate all serialization, conversions, copying, or memory allocation. Batch size, input types, dependencies, and the degree of vectorization determine the benefit.
>
> Regular scalar Python UDFs can also use Arrow without becoming vectorized Pandas functions. I prefer native Spark expressions when available and use Pandas UDFs for custom batch-oriented work that justifies the boundary costs.

**Key takeaway:** Arrow improves JVM–Python batch interchange. Pandas UDF interfaces expose those batches for custom computation; efficient transfer and vectorized execution remain separate concerns.
