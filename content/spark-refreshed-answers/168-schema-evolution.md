# How does Spark handle schema evolution?

Schema evolution in Apache Spark is the ability to handle changes in a dataset's schema over time without necessarily rewriting all existing data or breaking data processing pipelines.

For example, a dataset may initially contain three columns, but a new column may be introduced later. Spark can handle such changes through schema merging, explicit schema transformations, and schema evolution capabilities provided by table formats such as Apache Iceberg, Delta Lake, and Apache Hudi.

However, Spark does not automatically support every schema change. The behavior depends on the file format, table format, read/write operation, and type of schema modification.

## 1. What is schema evolution?

Suppose an employee dataset initially has this schema:

[spark-reference:schema-add-column]

Now the dataset contains files written with different schemas.

Schema evolution allows a compatible reader or table format to expose both old and new records under a unified schema.

| employee_id | name | salary | department |
| --- | --- | --- | --- |
| 101 | Rahul | 50000 | null |
| 102 | Priya | 65000 | null |
| 103 | Amit | 70000 | IT |
| 104 | Neha | 80000 | HR |

Older records do not contain department, so Spark can represent the missing field as NULL.

## 2. How Spark handles schema evolution in Parquet

Parquet files store schema information in their metadata.

Spark supports schema merging, which combines compatible schemas from multiple Parquet files into a unified schema.

Consider two batches of data.

### Batch 1:

```python
df1 = spark.createDataFrame(
    [(101, "Rahul", 50000.0)],
    "employee_id INT, name STRING, salary DOUBLE"
)

df1.write.mode("overwrite").parquet(
    "/data/employees/batch1"
)
```

### Batch 2:

```python
df2 = spark.createDataFrame(
    [(102, "Priya", 65000.0, "IT")],
    """employee_id INT,
       name STRING,
       salary DOUBLE,
       department STRING"""
)

df2.write.mode("overwrite").parquet(
    "/data/employees/batch2"
)
```

Now the directory contains:

```text
/data/employees/
    batch1/
        part-*.parquet    # 3 columns
    batch2/
        part-*.parquet    # 4 columns
```

### Enable schema merging

```python
df = (
    spark.read
    .option("mergeSchema", "true")
    .parquet(
        "/data/employees/batch1",
        "/data/employees/batch2"
    )
)

df.printSchema()
df.show()
```

Naming both batch directories explicitly ensures this example reads files from both batches. Spark discovers the compatible schemas and merges them.

```text
root
 |-- employee_id: integer
 |-- name: string
 |-- salary: double
 |-- department: string
```

The old records have NULL for department.

Schema merging is disabled by default for Parquet because collecting and reconciling schemas across files can be expensive. It can be enabled per read or globally.

```python
spark.conf.set(
    "spark.sql.parquet.mergeSchema",
    "true"
)
```

**Important:** Parquet schema merging is primarily a read-time capability. It does not automatically alter existing files or provide the same schema management guarantees as a transactional table format.

## 3. What types of schema evolution are possible?

| Schema change | Example | How Spark handles it |
| --- | --- | --- |
| Add column | Add department | Merge compatible schemas or update table metadata |
| Remove column | Remove salary | Supported by some table formats; old files may retain physical data |
| Rename column | name → full_name | Requires explicit mapping or supported table metadata |
| Change data type | INT → BIGINT | Possible for supported safe type widening |
| Reorder columns | Change column order | Depends on format and field-identification rules |
| Add nested fields | Add address.city | Supported by appropriate table formats and schema merging |
| Incompatible change | STRING → STRUCT | Usually requires transformation or data migration |

A critical distinction: Adding a new column is generally straightforward, but renaming a column or changing its data type can be significantly more complicated.

For example, plain Parquet schema merging does not automatically know that name and full_name represent the same logical column.

## 4. Schema evolution in Delta Lake and Apache Iceberg

Modern lakehouse table formats provide more advanced schema evolution capabilities than reading ordinary Parquet files. The connector and catalog must be configured, and supported changes depend on the table-format version and enabled features.

| Feature | Plain Parquet | Delta Lake | Apache Iceberg |
| --- | --- | --- | --- |
| Add columns | Schema merging on read | Supported | Supported |
| Drop columns | No managed table-level evolution | Supported with appropriate features | Supported |
| Rename columns safely | Not automatically | Supported with column mapping | Supported using field IDs |
| Type widening | Limited; incompatible files may fail | Supported for eligible types and configurations | Supported for safe type changes |
| Nested schema evolution | Compatible schema merging | Supported | Supported |
| Transactional schema changes | No | Yes | Yes |
| Schema tracking | Individual file schemas | Transaction log | Table metadata and field IDs |

Delta Lake supports write-time schema evolution and column mapping, while Iceberg uses stable field IDs to manage changes such as renaming or reordering without confusing fields.

### Example: Delta Lake automatic schema evolution

Suppose an existing Delta table contains:

```text
employee_id
name
salary
```

Now a new DataFrame contains:

```text
employee_id
name
salary
department
```

We can append the new data and evolve the Delta schema:

```python
# Assumes an existing Delta table and an incoming DataFrame new_df.
(
    new_df.write
    .format("delta")
    .mode("append")
    .option("mergeSchema", "true")
    .save("/data/delta/employees")
)
```

Delta Lake updates the table metadata to include the new column.

Older records are returned with NULL for that field.

Unlike plain Parquet schema merging, this is a write-time schema evolution operation that updates the table's schema.

For production environments, enabling schema evolution explicitly for individual operations is generally safer than enabling unrestricted session-wide schema merging.

### Example: Apache Iceberg schema evolution

Suppose an Iceberg table already exists.

Add a column:

```sql
ALTER TABLE catalog.db.employees
ADD COLUMN department STRING;
```

Rename a column:

```sql
ALTER TABLE catalog.db.employees
RENAME COLUMN name TO full_name;
```

Iceberg assigns unique IDs to columns, allowing it to track fields independently of their names and positions.

As a result, supported schema changes can often be performed through metadata updates without rewriting existing data files.

## 5. What happens when a column's data type changes?

Not all type changes are safe.

Suppose the original schema is:

```text
salary: INT
```

The new schema is:

```text
salary: BIGINT
```

This is a widening conversion because BIGINT can represent all INT values.

Some table formats support this change directly.

However, consider:

```text
salary: STRING
```

Changing salary from INT to STRING is not universally supported as automatic schema evolution.

Spark may report an incompatible schema error when attempting to merge files.

One solution is to normalize the schema explicitly before writing:

```python
from pyspark.sql.functions import col

df = df.withColumn(
    "salary",
    col("salary").cast("long")
)
```

This works when the source values can be safely converted to the target type. Normalize each incoming batch before writing or combining incompatible files; a cast after a failing merged read cannot repair that read. Validate precision, invalid values, and null handling.

**Important:** Setting mergeSchema=true does not mean Spark can merge arbitrary incompatible data types.

## 6. How should schema evolution be handled in production?

In production data pipelines, schema evolution should be controlled rather than blindly accepting every change.

A reliable approach is:
1. Maintain a target schema: Define the expected columns, types, and nullability.
2. Detect schema changes: Compare incoming schemas against the current contract or registered schema.
3. Classify changes: Identify additive, breaking, and potentially compatible changes.
4. Apply compatible changes: Add nullable columns or perform explicitly supported type widening.
5. Handle breaking changes: Require approval, transformations, or data migration for incompatible changes.
6. Validate downstream compatibility: Check jobs, SQL queries, streaming consumers, and data quality rules.
7. Monitor and audit: Record schema versions and alert on unexpected changes.
For streaming pipelines, schema changes require additional care because an existing streaming query may need to be restarted or reconfigured, depending on the source and table format.

## 7. Schema evolution vs schema enforcement vs schema inference

These concepts are frequently confused in interviews.

| Concept | Meaning |
| --- | --- |
| Schema inference | Spark determines a schema from input data |
| Schema enforcement | Data is checked or aligned against an expected schema |
| Schema evolution | An existing schema is changed to accommodate new requirements |
| Schema merging | Compatible schemas from multiple files or datasets are combined |

For example:

```python
df = (
    spark.read
    .option("mergeSchema", "true")
    .parquet("/data/employees/batch1", "/data/employees/batch2")
)
```

This performs Parquet schema merging during reading.

Whereas:

```python
df1.unionByName(
    df2,
    allowMissingColumns=True
)
```

Combines two DataFrames by matching column names and filling missing columns with nulls. This handles schema differences during DataFrame processing, but does not automatically evolve an underlying table's stored schema.

## 8. Interview-ready answer

> Schema evolution in Apache Spark refers to handling changes in a dataset's schema over time, such as adding, removing, renaming, or modifying columns.
>
> Spark supports schema evolution through multiple mechanisms depending on the underlying storage format.
>
> For Parquet files, Spark provides schema merging using mergeSchema=true. When different files contain compatible schemas, Spark can combine them into a unified schema, with missing fields represented as null.
>
> However, Parquet schema merging can be expensive and does not automatically resolve incompatible data types or column renames.
>
> Modern lakehouse formats such as Delta Lake and Apache Iceberg provide more advanced schema evolution capabilities.
>
> Delta Lake supports schema evolution during writes through options such as mergeSchema, while Iceberg uses unique column IDs to support safe schema changes, including column additions, drops, and renames.
>
> In production, we should distinguish compatible changes from breaking changes, validate incoming schemas, enforce data contracts, and monitor downstream compatibility.
>
> Schema evolution is particularly important for continuously evolving data pipelines, CDC ingestion, and data lake architectures where source schemas change over time.

**Key takeaway:** Spark can reconcile compatible schema differences, but how safely and automatically a schema evolves depends primarily on the underlying file or table format. For production data lakes, Delta Lake and Apache Iceberg offer stronger schema evolution capabilities than plain Parquet files.
