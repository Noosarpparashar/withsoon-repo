# What happens when a UDF throws an exception?

An unhandled exception during executor-side UDF evaluation fails the task attempt. Spark may retry the task; a repeatedly failing task can exhaust its failure budget and abort the stage/job.

The documented spark.task.maxFailures default is 4: where that policy applies, this means four consecutive failed attempts for a particular task, normally the initial attempt plus up to three retries. It does not mean four retries after the initial failure, or four failures summed across unrelated tasks. Execution mode and failure classification can affect retry behavior.

A single bad record can therefore fail a job if its UDF error is unhandled. Retrying deterministic bad data usually reproduces the same failure.

## 1. Example: Python conversion failure

Suppose employee salaries arrive as strings:

| employee_id | salary |
| --- | --- |
| 101 | "50000" |
| 102 | "60000" |
| 103 | "INVALID" |
| 104 | "80000" |

Create the example DataFrame:

```python
df = spark.createDataFrame(
    [(101, "50000"), (102, "60000"), (103, "INVALID"), (104, "80000")],
    "employee_id INT, salary STRING"
)
```

This intentionally unguarded UDF fails when the bad value is evaluated:

```python
from pyspark.sql.functions import udf, col
from pyspark.sql.types import IntegerType

@udf(IntegerType())
def convert_salary(salary):
    return int(salary)

result = df.withColumn(
    "salary_int",
    convert_salary(col("salary"))
)

result.show()
```

The problematic operation is:

```python
int("INVALID")
```

Python raises an error similar to:

```text
ValueError: invalid literal for int() with base 10: 'INVALID'
```

The Python failure propagates through Spark's Python evaluation path and is commonly reported as a PythonException inside a task/stage failure. Exact wrapping and messages vary.

## 2. What happens internally?

[spark-reference:udf-exception-recovery]

1. An executor task evaluates the function on partition data.
2. The function encounters the invalid value and raises an exception.
3. The attempt is reported as failed.
4. The scheduler retries when the applicable policy allows.
5. A transient failure may disappear; a deterministic input error generally repeats.
6. Exhausting the permitted failures can abort the stage/job.

A retry re-executes the task's required computation, not merely the single offending Python call. External side effects performed earlier in that task can be repeated, so they must not be assumed to occur exactly once.

## 3. Can one bad record fail the whole job?

Yes. A task processes a partition, and an unhandled record-level exception fails that task. Spark does not automatically skip that row and continue as a general UDF error-handling policy.

If a partition contains 100,000 rows and one always raises an exception, repeatedly scheduling that partition will not repair the input.

Evaluation is also lazy. Defining this expression does not itself require processing every row:

```python
result = df.withColumn(
    "salary_int",
    convert_salary(col("salary"))
)
```

An action that consumes the expression can expose the error:

```python
result.show()
# Other examples:
# result.collect()
# result.write.parquet("/data/output")
```

The bad row must actually be evaluated. A limited action may not reach every partition, and an action that needs only row counts may allow an unused UDF expression to be pruned. A successful limited query is not proof that all input is valid.

## 4. How should expected bad input be handled?

### A. Catch expected conversion failures

If a UDF is needed, handle the intended error cases and respect the declared Spark return type:

```python
from pyspark.sql.functions import udf

@udf("int")
def safe_convert_salary(salary):
    if salary is None:
        return None

    try:
        value = int(salary)
    except (ValueError, TypeError, OverflowError):
        return None

    # Python integers are not limited to Spark's signed 32-bit INT range.
    if not -(2 ** 31) <= value <= (2 ** 31 - 1):
        return None
    return value
```

Apply it to the string input:

```python
safe_result = df.withColumn(
    "salary_int",
    safe_convert_salary(col("salary"))
)
```

Illustrative output values:

| employee_id | salary | salary_int |
| --- | --- | --- |
| 101 | "50000" | 50000 |
| 102 | "60000" | 60000 |
| 103 | "INVALID" | NULL |
| 104 | "80000" | 80000 |

This handles expected malformed, missing, and out-of-range values. It is not a reason to catch every Exception and silently return NULL for programming errors, missing dependencies, or infrastructure failures.

Keep the original value and an error reason when invalid records must be audited. Returning NULL alone can hide a quality problem or conflate invalid and genuinely missing values.

### B. Prefer a native conversion when it fits

For this task, a Python UDF is unnecessary:

```python
from pyspark.sql.functions import expr

native_result = df.withColumn(
    "salary_int",
    expr("try_cast(salary AS INT)")
)
```

For supported conversions, try_cast returns NULL on malformed or out-of-range values. Unsupported type combinations can still fail during analysis. Python int and SQL casts are not interchangeable for every input type or parsing rule; verify the required semantics.

Keep all three categories explicit:

```python
invalid_df = native_result.filter(
    col("salary").isNotNull()
    & col("salary_int").isNull()
)

missing_df = native_result.filter(
    col("salary").isNull()
)

valid_df = native_result.filter(
    col("salary_int").isNotNull()
)
```

Reject or quarantine invalid values and apply the agreed policy to missing ones. This avoids silently dropping missing inputs while splitting valid and invalid data. Native expressions also avoid Python worker execution for the conversion.

## 5. What happens in Structured Streaming?

An unhandled UDF exception can fail a micro-batch and eventually terminate the query. The following uses an actual streaming source and the deliberately unsafe convert_salary defined earlier:

```python
stream_df = (
    spark.readStream
    .schema("employee_id INT, salary STRING")
    .json("/data/incoming_employees")
)

stream_result = stream_df.withColumn(
    "salary_int",
    convert_salary(col("salary"))
)

query = (
    stream_result.writeStream
    .format("parquet")
    .option("checkpointLocation", "/checkpoints/employees")
    .start("/data/processed_employees")
)

query.awaitTermination()
```

If the query terminates with an exception, awaitTermination reports a StreamingQueryException. A query failure does not necessarily shut down every query or the entire Spark application.

In production:

- Diagnose and correct the failing logic or handle the input through explicit validation/quarantine.
- Preserve raw payloads and source coordinates for investigation and replay.
- Restart with a compatible checkpoint and unchanged recovery assumptions where supported.
- Make sink behavior replay-safe, including any external side effects.

Use durable checkpoint/output locations for the deployment. Restarting without correcting a deterministic bad record can fail again. Deleting the checkpoint is not a routine repair for that record.

## 6. How do you debug UDF exceptions?

| Area | What to inspect |
| --- | --- |
| Spark UI | Failed tasks/stages, repeated partitions, and attempt counts |
| Executor/worker logs | The original exception and its context |
| Python traceback | The function and line causing the failure |
| Input records | Nulls, malformed values, overflow, and unexpected types |
| Return type | Whether outputs fit the declared schema and execution mode |
| Cluster diagnostics | Worker termination, missing dependencies, or memory/resource failures |

Read the underlying traceback rather than stopping at Job aborted. Failures around a UDF can also arise from serialization, dependency loading, return conversion, or OOM, even when the function's input logic is correct. Driver-side registration or serialization errors may occur before a task is scheduled and do not follow the same executor-task retry path.

## 7. Interview-ready answer

> An unhandled exception during UDF evaluation fails the task attempt. Spark retries when permitted, but deterministic bad input usually fails again. Exhausting the per-task failure budget can abort the stage/job.
>
> The documented default spark.task.maxFailures is four consecutive failures, normally an initial attempt plus up to three retries where that policy applies.
>
> I handle expected bad data explicitly, preserve original values and error reasons, and quarantine or reject invalid records. For simple parsing I prefer a supported native expression such as try_cast, while keeping unexpected failures visible.
>
> In streaming, the failure can terminate the query, so recovery must preserve checkpoint compatibility and replay-safe output. I investigate the original traceback, input, declared output type, and worker/container diagnostics.

**Key takeaway:** Retrying a deterministic UDF error does not repair it. Validate expected bad input, respect return types, and use retries for recoverable failures rather than as a substitute for data handling.
