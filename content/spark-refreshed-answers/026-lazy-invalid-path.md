# If a read operation is lazy, how does Spark detect an incorrect file path?

Although Spark uses lazy evaluation, it can detect an incorrect file path immediately when calling `spark.read`, even before an action is executed.

This happens because lazy evaluation applies to data processing, not necessarily to metadata validation.

## 1. Example

```python
df = spark.read.parquet("/data/invalid_path")
```

Spark may immediately throw:

```text
AnalysisException: [PATH_NOT_FOUND]
Path does not exist: /data/invalid_path
```

But no action like `show()` or `count()` has been called. Why?

## 2. What happens internally?

When you call `spark.read.parquet()`:

1. Path validation: Spark checks whether the specified path exists.
2. File discovery: Spark identifies the files available at that location.
3. Schema resolution: Spark reads necessary metadata, such as Parquet footers, to determine the schema.
4. Logical plan creation: Spark constructs a logical plan representing the read operation.
5. Actual data processing: Spark defers reading and processing the dataset until an action triggers execution.

[spark-read-lifecycle]

## 3. What is lazy and what isn't?

| Operation | Lazy? |
| --- | --- |
| Validate file path existence | Generally no |
| Discover files and infer schema | Generally no |
| Construct logical plan | No — plan is built immediately |
| `df.filter()` | Yes |
| `df.select()` | Yes |
| `df.join()` | Yes |
| Read and process actual data | Yes, deferred until execution |
| `df.show()` | No — triggers execution |

## 4. Important interview scenario

Suppose the path exists when you create the DataFrame, but the file is deleted before the action.

```python
df = spark.read.parquet("/data/sales")
# File exists at this point.

# Someone deletes the underlying file.
df.show()
```

What happens?

- Spark may successfully create the DataFrame initially.
- When `show()` triggers execution, Spark tries to read the file.
- Because the file has been deleted, the job can fail with a file-not-found error.

This demonstrates that Spark can perform initial metadata validation eagerly while deferring actual data processing.

## Interview-ready answer

> Spark's lazy evaluation does not mean that everything is deferred until an action. When we call `spark.read`, Spark generally validates the path, discovers files, and resolves the schema to construct the logical plan. These metadata operations can happen immediately, so an invalid file path may throw an exception before any action. However, actual data reading and transformations remain lazy and are executed when an action is triggered.

Key takeaway: Lazy evaluation means deferred data processing, not deferred metadata validation.