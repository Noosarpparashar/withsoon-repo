# Are broadcast variables copied once per task or once per executor?

In Apache Spark, broadcast variables are distributed and cached per executor, rather than separately for every task, under normal execution.

- **Driver:** Creates the broadcast variable.
- **Executor:** Receives and caches the broadcast data locally.
- **Tasks:** Multiple tasks running on the same executor reuse the cached broadcast data.

## Example

Suppose your Spark cluster has:

- 5 executors
- 4 CPU cores per executor
- 100 tasks
- A 50 MiB broadcast variable

| Component | Count | Broadcast copies |
| --- | --- | --- |
| Driver | 1 | 1 original |
| Executors | 5 | 5 cached copies |
| Tasks | 100 | No separate distributed copy required for each task |

**Simplified executor-side storage estimate = 5 × 50 MiB = 250 MiB**, ignoring serialization, deserialized representations, and runtime overhead.

This is an estimate of cached broadcast data, not a guarantee of total memory consumption.

Without broadcasting, the same 50 MiB object captured in task closures could be serialized and transferred repeatedly.

## Important nuance

Spark caches broadcast data per executor, but the number of in-memory representations can vary. For example, with PySpark, the Python worker processes accessing a broadcast variable may each deserialize their own copy.

Therefore, once per executor describes Spark's broadcast distribution mechanism, not a guarantee of exactly one physical memory copy per executor.

## Interview-ready answer

> Broadcast variables are distributed and cached per executor rather than separately for each task. Tasks running within an executor can reuse the broadcast data, reducing network transfer and serialization overhead. However, additional deserialized copies may exist, particularly in PySpark Python worker processes.