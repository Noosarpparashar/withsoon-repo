# When does Spark validate an input path?

Spark generally validates an input file path when creating a DataFrame using `spark.read`, even though Spark transformations are lazily evaluated.

However, the exact timing depends on the API and data source.

## 1. DataFrame API — Usually during spark.read

```python
df = spark.read.parquet("/invalid/path")
```

If the path doesn't exist, Spark typically throws an `AnalysisException` immediately:

```text
[PATH_NOT_FOUND] Path does not exist: ...
```

### Why?

Spark needs to perform certain operations before executing the actual data-processing job:

- Check whether the input path exists.
- Discover files and partitions.
- Read metadata.
- Infer the schema when necessary.

These operations can happen during DataFrame creation, even though reading the actual records is lazy.

## 2. RDD API — Usually during an action

```python
rdd = sc.textFile("/invalid/path")  # Usually succeeds
rdd.count()                       # Fails when Spark accesses the input
```

RDDs generally defer input-path validation until Spark needs to access the underlying data, often during the first action.

## 3. Important distinction: Path validation vs data execution

| Operation | When it happens |
| --- | --- |
| Check input path existence | Usually during `spark.read` |
| Discover files and partitions | Usually during `spark.read` |
| Infer schema | During DataFrame creation when needed |
| Apply filters and transformations | During action execution |
| Read and process actual records | During action execution |

Spark's file-source implementation performs path checks and file discovery before normal query execution.

## Interview-ready answer

> Spark uses lazy evaluation for data processing, but not necessarily for metadata operations. With the DataFrame API, Spark typically validates the input path during DataFrame creation because it needs file metadata and schema information. With the RDD API, path validation is generally deferred until execution begins.
>
> Therefore, lazy evaluation does not mean Spark postpones every operation until an action is called.