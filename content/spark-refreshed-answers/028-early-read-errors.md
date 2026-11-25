# Why can schema inference or file listing raise an error before an action runs?

In Apache Spark, lazy evaluation applies primarily to data processing, not metadata operations.

When creating a DataFrame, Spark may need to access the underlying data source to determine its structure before it can construct a logical execution plan.

## 1. Schema inference requires reading metadata or data

```python
df = spark.read.csv(
    "/data/employees.csv",
    header=True,
    inferSchema=True
)
```

Spark needs to determine the column names and data types.

For CSV, Spark may need to read actual records to infer types. This can trigger Spark jobs internally, even though the user hasn't called an action.

For Parquet:

```python
df = spark.read.parquet("/data/employees/")
```

Spark usually reads Parquet footer metadata to determine the schema without scanning all records.

### Possible errors

- File not found
- Permission denied
- Corrupted Parquet metadata
- Incompatible schemas

## 2. File listing requires accessing the filesystem

```python
df = spark.read.parquet("/invalid/path/")
```

Before constructing the DataFrame, Spark may list files to identify:

- Available data files
- Partition directories
- File formats and metadata
- Files required for schema inference

If the directory doesn't exist or Spark lacks permission, an exception can occur immediately.

## 3. Metadata operations vs data processing

| Operation | Eager or lazy? |
| --- | --- |
| Validate input path | Usually eager |
| List input files | Usually eager |
| Infer schema | Usually eager |
| Construct logical plan | Eager |
| Filter records | Lazy |
| Join DataFrames | Lazy |
| Execute aggregations | Lazy |
| `count()`, `collect()`, `show()` | Actions that trigger execution |

## 4. Example

```python
# Step 1: May access filesystem and infer schema
df = spark.read.parquet("/data/orders")

# Step 2: Lazy transformation
filtered_df = df.filter("amount > 1000")

# Step 3: Lazy transformation
result = filtered_df.groupBy("customer_id").count()

# Step 4: Action triggers data processing
result.show()
```

Spark may access the filesystem during Step 1, but the filter and aggregation are executed only when Step 4 triggers a job.

## Interview-ready answer

> Schema inference and file listing can raise errors before an action because Spark must resolve metadata to construct and analyze its logical plan. These operations may involve filesystem access or reading file metadata, and sometimes even executing internal Spark jobs.
>
> Lazy evaluation postpones the execution of the main data-processing plan, not all filesystem or metadata operations.

Key takeaway: Spark can access files before an action without executing the transformations defined on the DataFrame.