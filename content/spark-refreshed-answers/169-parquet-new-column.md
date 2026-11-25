# What happens when a new column is added to a Parquet dataset?

When a new column is added to a Parquet dataset, existing Parquet files remain unchanged, while newly written files can contain the additional column. Spark can read both versions together using schema merging, with NULL values for the new column in older records.

However, Parquet schema merging is disabled by default, so Spark may not automatically recognize the newly added column when reading the entire dataset. This answer describes a plain Parquet path; a registered table may also require a catalog schema update.

## 1. Example: Adding a new column

Suppose an employee dataset initially contains three columns.

### Original schema — Version 1

```text
employee_id: INT
name: STRING
salary: DOUBLE
```

Later, a new column named department is introduced.

### New schema — Version 2

```text
employee_id: INT
name: STRING
salary: DOUBLE
department: STRING
```

After appending data using the new schema, the directory might contain:

```text
/data/employees/
    part-00001.parquet   # Old schema: 3 columns
    part-00002.parquet   # Old schema: 3 columns
    part-00003.parquet   # New schema: 4 columns
    part-00004.parquet   # New schema: 4 columns
```

Parquet stores schema information in the metadata of individual files, so different files can contain different compatible schemas.

## 2. What happens when Spark reads the dataset?

### Case 1: Schema merging disabled — the default

```python
df = spark.read.parquet("/data/employees")
df.printSchema()
```

With the default merge setting, Spark selects a schema from a summary metadata file or, if none is available, a data file. A session configuration can override the default.

If Spark selects an older schema, the result may be:

```text
root
 |-- employee_id: integer
 |-- name: string
 |-- salary: double
```

The department column may not appear, even though it exists in newer Parquet files.

If Spark selects a newer schema, it may include department, with null values for records from older files.

Therefore, without schema merging or an explicitly supplied schema, the discovered schema may be incomplete. Do not depend on Spark selecting the newest file's schema.

### Case 2: Schema merging enabled

```python
df = (
    spark.read
    .option("mergeSchema", "true")
    .parquet("/data/employees")
)

df.printSchema()
```

Spark combines the compatible schemas:

```text
root
 |-- employee_id: integer
 |-- name: string
 |-- salary: double
 |-- department: string
```

The resulting DataFrame might look like:

| employee_id | name | salary | department |
| --- | --- | --- | --- |
| 101 | Rahul | 50000 | NULL |
| 102 | Priya | 60000 | NULL |
| 103 | Amit | 70000 | IT |
| 104 | Neha | 80000 | HR |

Notice that older records have NULL for department.

Spark does not rewrite the old Parquet files. It logically represents missing column values as null when reading them.

## 3. How schema merging works internally

[spark-reference:parquet-mixed-schema-read]

Internally, Spark:

1. Collects schema metadata from the relevant Parquet files.
2. Merges compatible fields into a unified schema.
3. Identifies fields missing from older files.
4. Supplies null values for those missing fields when reading records.
5. Exposes the data through a DataFrame using the merged schema.

Schema discovery may happen during DataFrame creation. Reading the dataset's records still happens when execution is triggered.

## 4. Does adding a new column require rewriting existing files?

No, not for a compatible nullable column addition.

Existing Parquet files can remain unchanged. However, you may choose to rewrite or compact them later for storage consistency, schema normalization, or performance reasons.

There are some important limitations:

| Scenario | Behavior |
| --- | --- |
| New column added | Supported through compatible schema merging |
| Old records missing the column | Returned as NULL |
| Existing files | Not automatically rewritten |
| Schema merging disabled | New column may not be discovered |
| Same column with incompatible types | Schema merging may fail |
| Column renamed | Generally treated as a different column in plain Parquet reads |
| Registered table schema | May require a separate catalog schema update |

Also, a DataFrame that was created before the schema change does not automatically acquire new columns. Read the dataset again with an appropriate schema.

## 5. What is the performance impact?

Schema merging has an additional cost because Spark needs to inspect and reconcile file schemas.

For a dataset containing thousands or millions of Parquet files, this can increase query planning and metadata-processing time. This cost is why Spark disables Parquet schema merging by default.

For production pipelines, common practices include:

- Maintaining an explicit schema rather than relying on inference for every read.
- Using mergeSchema=true when reading compatible mixed-schema files.
- Validating incoming columns and types before writing.
- Updating metastore or catalog schemas when required.
- Using a table format such as Apache Iceberg or Delta Lake when controlled schema evolution is a frequent requirement. These require the appropriate connector and catalog configuration.

## 6. Interview-ready answer

> When a new column is added to a Parquet dataset, existing files retain their original schema, while newly written files can contain the additional column.
>
> Since Parquet stores schema metadata at the file level, multiple files within the same dataset can have different compatible schemas.
>
> Spark handles this using schema merging. When we enable mergeSchema=true, Spark combines the schemas from the Parquet files into a unified DataFrame schema.
>
> For older files that do not contain the newly added column, Spark returns NULL values without rewriting those files.
>
> Schema merging is disabled by default because it requires additional metadata processing. Without it, Spark may select a schema that does not include the new column.
>
> In production, we can use schema merging or maintain an explicit schema. For more advanced schema evolution, table formats such as Apache Iceberg and Delta Lake provide metadata-managed schema changes.

**Key takeaway:** Adding a column to a plain Parquet dataset does not automatically update older files. Spark can reconcile compatible old and new schemas using mergeSchema=true, returning null values for fields missing from older records.
