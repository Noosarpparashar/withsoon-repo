# Can a UDF cause executor out-of-memory errors?

**Yes.** Custom functions can exhaust JVM heap, Python worker memory, native buffers, or the total memory available to an executor container.

Common causes include large allocations or outputs, oversized pandas batches/groups, retained objects, model copies in multiple workers, and excessive task concurrency. The UDF's allocation behavior matters as much as the API used to call it.

**Important:** Python workers run outside the executor JVM heap. Increasing spark.executor.memory alone may not address the failing memory region or an overall container limit.

## 1. How UDFs consume executor memory

[spark-reference:udf-memory-regions]

Scala/Java UDF objects generally contribute to JVM memory use. Python UDFs run in separate processes alongside the JVM. Arrow/native allocations can exist in both the JVM-side process and Python workers, so not every Arrow buffer belongs to one memory region.

On YARN and Kubernetes, combined usage must fit the applicable container allocation. JVM heap size is only part of that budget. A Python allocation can fail, or the container can be killed, even when JVM heap metrics appear healthy.

Standalone and local deployments have different resource-enforcement details; use the actual process and cluster limits when diagnosing a failure.

## 2. Common reasons UDFs cause OOM

| Cause | Explanation | Potential response |
| --- | --- | --- |
| Large Python objects | Huge lists/dictionaries or temporary copies | Bound allocations and avoid unnecessary materialization |
| Large pandas batches | Input, converted data, intermediates, and output coexist | Measure and tune batch size |
| Skewed groups | One key contains far more rows than others | Redesign group processing or handle skew while preserving semantics |
| Retained objects | Growing caches or references survive calls/tasks | Bound retained state and inspect allocation/retention |
| Large models | Multiple Python workers hold separate copies | Amortize loading and budget for every concurrent copy |
| Too much concurrency | Several tasks allocate memory simultaneously | Tune executor/task concurrency against measured working memory |
| Huge output rows | A function returns enormous strings or arrays | Bound output size or redesign the representation |

## 3. Example: Allocation-heavy UDF

This illustrates an expensive allocation pattern:

```python
from pyspark.sql.functions import udf, col
from pyspark.sql.types import ArrayType, LongType

@udf(ArrayType(LongType()))
def generate_large_array(value):
    return list(range(1_000_000))

result = df.withColumn(
    "large_array",
    generate_large_array(col("id"))
)
```

Every evaluated row creates a million-element list. Python objects, encoded output, transfer buffers, and the receiving representation can have overlapping lifetimes. Repeated rows create substantial allocation and serialization pressure.

This does not mean the whole dataset must be held simultaneously. Even a single huge result, a buffered set of results, or several concurrent tasks can exceed memory. Smaller partitions or batches cannot guarantee that one enormous value will fit.

The example defines a lazy computation; it is the action consuming those arrays that triggers their allocation.

## 4. Pandas UDF and Arrow batch memory

For example:

```python
import pandas as pd
from pyspark.sql.functions import pandas_udf

@pandas_udf("double")
def calculate_score(values: pd.Series) -> pd.Series:
    return values * 1.5
```

Arrow input buffers, pandas representations, temporary arrays, and output can coexist. Useful vectorization does not eliminate peak-memory requirements.

For eligible scalar batch paths, reduce the row cap if measurements justify it:

```python
spark.conf.set(
    "spark.sql.execution.arrow.maxRecordsPerBatch",
    "1000"
)
```

Compared with a 10,000-row cap, smaller batches may reduce working data per call while increasing setup/processing overhead. A row cap is not a byte or per-task memory limit; wide values, output expansion, models, and concurrent workers still matter.

## 5. Whole-group pandas operations need special care

Consider the DataFrame-per-group applyInPandas interface:

```python
def process_group(pdf: pd.DataFrame) -> pd.DataFrame:
    return pdf.sort_values("amount")

grouped_result = df.groupBy("customer_id").applyInPandas(
    process_group,
    schema=df.schema
)
```

If most customers have 100 rows but one has ten million, that customer's group is materialized for the Python function. Sorting can require additional working memory, so one group can fail while others succeed.

**Critical distinction:** maxRecordsPerBatch does not cap the complete group supplied to this whole-group interface. Grouped pandas functions are a related API with different memory semantics from scalar Series-to-Series Pandas UDFs.

Prefer a suitable native operation when it meets the requirement, or redesign the algorithm to process bounded data through a supported batched/streaming interface. Salting changes groups and is valid only when the computation can correctly combine partial results. Merely increasing the partition count cannot split a required single-key group arbitrarily.

This sorting example illustrates materialization; the resulting Spark DataFrame does not have guaranteed global row order. Use native sorting/window operations when those express the actual requirement.

## 6. How to fix UDF-related memory failures

### A. Remove unnecessary Python execution

For a simple bonus calculation, prefer native arithmetic:

```python
from pyspark.sql.functions import col

native_result = df.withColumn(
    "bonus",
    col("salary") * 0.10
)
```

This avoids a Python worker for the calculation. Native operators still use memory and can fail for other reasons; the benefit is removing an unnecessary process/conversion path.

### B. Size the appropriate memory budget

An illustrative YARN/Kubernetes submission is:

```bash
spark-submit \
  --executor-memory 4g \
  --conf spark.executor.memoryOverhead=2g \
  application.py
```

Here, 4g configures 4 GiB of executor JVM heap and 2g adds 2 GiB of container overhead capacity. When separately configured PySpark memory is absent, overhead also accounts for Python usage. Additional configured off-heap/PySpark allocations affect the total resource request.

spark.executor.pyspark.memory provides separate PySpark accounting/limits where supported, and is added to YARN/Kubernetes executor requests. Enforcement depends on Python's resource module and platform; it is not a universal cross-platform memory guarantee.

Configure deployment resources at submission/initialization time and size them from observed usage. Increasing limits does not repair an unbounded allocation or an oversized required group.

### C. Account for concurrent workers

[spark-reference:udf-worker-memory]

Four concurrent Python workers using roughly 1 GiB each need approximately 4 GiB in worker memory alone, in addition to JVM/native usage. Several workers can also load separate copies of one model.

Reducing task concurrency through executor sizing or supported task CPU requirements may lower peak memory, with a possible throughput trade-off. More task CPU allocation does not automatically make a Python function use more threads.

### D. Amortize model initialization and bound retention

Avoid loading a large model per row. An iterator API can initialize once per invocation across several batches; a deliberate worker-local cache can provide further reuse. Worker/task lifetime and reuse are not guarantees of one model copy per executor.

Bound caches and retained references. Releasing Python references may allow objects to be reclaimed, but process RSS does not necessarily fall immediately because allocators may retain memory.

## 7. How to diagnose the failure

| Evidence | What it can reveal |
| --- | --- |
| Executor stderr and worker logs | Allocation errors, worker crashes, and stack traces |
| YARN/Kubernetes diagnostics | Container limit exceeded or OOMKilled |
| Spark UI task failures | Repeated failures associated with Python evaluation or a specific partition |
| Python worker RSS | Worker memory growth or duplicated model allocations |
| JVM heap and GC metrics | JVM pressure rather than Python-only allocation |
| Per-key group sizes and skew | A hot key requiring an oversized materialization |
| Batch/input/output sizes | Large buffers, wide rows, or output expansion |

Common messages include:

```text
java.lang.OutOfMemoryError: Java heap space
Python worker exited unexpectedly
Container killed for exceeding memory limits
```

They are different signals. A worker exit by itself is not proof of OOM; correlate timestamps with worker/container logs and memory metrics. Likewise, an executor lost during a UDF stage does not automatically prove the UDF body caused it.

Supported Spark versions provide Python UDF memory profiling. Use it alongside process and cluster metrics, recognizing that profiler coverage and native-memory visibility differ. Validate the fix on representative batch sizes, skew, and concurrency.

## 8. Interview-ready answer

> Yes. UDF allocations and output can exhaust JVM heap, Python worker memory, or the executor container's overall budget.
>
> Python and Pandas UDFs add worker-process memory, Arrow/pandas buffers, models, and intermediate arrays. Whole-group applyInPandas can materialize a large hot-key group, which a scalar Arrow batch-row setting does not cap.
>
> I first identify the failing memory region using logs and process/container metrics. Then I remove unnecessary UDFs, bound allocations and outputs, tune applicable batches, redesign skewed group processing, and manage model copies and concurrency.
>
> If measured non-JVM usage exceeds the configured budget, I adjust the appropriate overhead or PySpark allocation. Raising JVM heap alone is not a general solution for Python memory failures.

**Key takeaway:** Diagnose the memory region and allocation pattern first. Size resources and bound work according to actual rows, batches, groups, outputs, and concurrent workers.
