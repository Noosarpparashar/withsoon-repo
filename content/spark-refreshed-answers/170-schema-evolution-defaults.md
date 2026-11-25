# Is schema evolution automatically enabled in Spark?

**No. Schema evolution is not automatically enabled for every data source in Apache Spark.** Its behavior depends on the underlying file format, table format, and read/write configuration.

For example:

- **Parquet:** Schema merging is disabled by default. Enable it explicitly or provide a compatible read schema.
- **Delta Lake:** Schema enforcement applies by default. Enable evolution for the relevant supported write operation when needed.
- **Apache Iceberg:** Supports metadata-managed schema evolution through operations such as ALTER TABLE, but does not automatically accept arbitrary schema changes.

## 1. Default schema evolution behavior

| Data format | Automatically enabled? | How to handle schema changes |
| --- | --- | --- |
| Parquet | No, for schema merging | mergeSchema=true for reads, or a compatible explicit/catalog schema |
| ORC | No, for schema merging | mergeSchema=true for supported reads, or a compatible explicit schema |
| Delta Lake | No, generally | Operation-specific mergeSchema=true or supported evolution commands |
| Apache Iceberg | Managed, but not arbitrary automatic changes | ALTER TABLE or explicitly configured write evolution |
| CSV | No general table evolution | Explicit schema or DataFrame transformation; validate headers and column order |
| JSON | Schema inferred on read when no schema is supplied | Explicit schema or controlled schema reconciliation |
| JDBC | Depends on the database schema | Database DDL and a new read or appropriate metadata refresh |

**Important:** Schema inference, schema merging, and schema evolution are different concepts. Reading a newly discovered column does not necessarily mean Spark has evolved a stored table schema.

Delta Lake and Iceberg require their respective connectors and catalog/session setup. The examples below assume that setup is complete and new_df is an incoming DataFrame with compatible schema changes.

## 2. How to enable Parquet schema merging

Suppose older Parquet files contain:

```text
id, name, salary
```

Newer files contain:

```text
id, name, salary, department
```

With the default configuration:

```python
df = spark.read.parquet("/data/employees")
```

Spark may not discover the department column because it does not merge every file schema by default. A session-level setting can override this default.

Enable schema merging explicitly:

```python
df = (
    spark.read
    .option("mergeSchema", "true")
    .parquet("/data/employees")
)
```

Now Spark can reconcile the compatible schemas:

```text
id: INT
name: STRING
salary: DOUBLE
department: STRING
```

Older records will have NULL values for department. The original files are not rewritten.

Alternatively, enable merging at the session level:

```python
spark.conf.set(
    "spark.sql.parquet.mergeSchema",
    "true"
)
```

Merging schemas across many files can increase metadata processing and query planning time. It also does not make incompatible type changes safe.

## 3. How to enable Delta Lake schema evolution

Delta Lake enforces its table schema by default.

To allow compatible new columns during an append operation:

```python
(
    new_df.write
    .format("delta")
    .mode("append")
    .option("mergeSchema", "true")
    .save("/data/delta/employees")
)
```

Unlike Parquet read-time merging, this updates the Delta table's schema as part of the write.

You can also enable automatic schema evolution for supported write operations throughout the Spark session:

```python
spark.conf.set(
    "spark.databricks.delta.schema.autoMerge.enabled",
    "true"
)
```

Enabling it session-wide can allow unexpected incoming columns to modify table schemas unintentionally. For production, prefer operation-specific schema evolution so that the intended schema changes are visible in the write operation.

Supported changes and APIs depend on the Delta Lake version and table features. Enabling evolution does not allow every type change, rename, or drop.

## 4. How schema evolution works in Apache Iceberg

Iceberg supports schema evolution through table metadata.

For example:

```sql
ALTER TABLE catalog.db.employees
ADD COLUMN department STRING;
```

Iceberg updates the table schema without requiring a rewrite of all existing data files.

To enable automatic schema merging during supported Spark writes, configure the table:

```sql
ALTER TABLE catalog.db.employees
SET TBLPROPERTIES (
  'write.spark.accept-any-schema' = 'true'
);
```

Together with the write option:

```python
(
    new_df.writeTo("catalog.db.employees")
    .option("mergeSchema", "true")
    .append()
)
```

Both the table property and an enabled writer merge setting are required for this automatic schema-merge mechanism. The example supplies the writer setting explicitly for this append.

This mechanism handles supported schema differences; it is not permission to make arbitrary incompatible changes. An explicit ADD COLUMN operation does not require these automatic-merge settings.

## 5. Why is automatic schema evolution not always enabled?

Automatic schema evolution can introduce several risks:

- **Unexpected columns:** A typo such as customer_nmae could become a new column.
- **Incompatible types:** A column changing from INT to STRING may break downstream jobs.
- **Data quality issues:** Schema drift may hide upstream data problems.
- **Performance overhead:** File schema discovery and merging may increase metadata-processing costs.
- **Downstream compatibility:** BI reports, SQL queries, and consuming applications may depend on a stable schema.

For these reasons, production pipelines should detect schema changes, validate compatibility, and explicitly review breaking modifications.

## 6. Interview-ready answer

> No, schema evolution is not automatically enabled for every data source in Apache Spark. Its behavior depends on the storage format and configuration.
>
> For Parquet, schema merging is disabled by default because reconciling schemas across many files can be expensive. We can enable it using mergeSchema=true to read compatible schema differences, such as newly added columns, or supply a compatible schema explicitly.
>
> For Delta Lake, schema enforcement applies by default, and schema evolution can be enabled during supported write operations using mergeSchema=true.
>
> Apache Iceberg supports metadata-managed schema evolution, including adding, dropping, and renaming columns. Automatic schema merging during writes requires explicit configuration as well.
>
> In production, we generally prefer controlled schema evolution rather than enabling it session-wide, because unexpected changes can introduce data quality and downstream compatibility issues.

**Key takeaway:** Spark supports schema evolution, but it is not universally automatic. Parquet read-time schema reconciliation and Delta Lake or Iceberg table schema updates use different, configurable mechanisms.
