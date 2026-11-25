# What happens when a column's data type changes?

When a column's data type changes, Spark may handle a supported conversion, reject it with a schema incompatibility error, or require an explicit migration. The behavior depends on the original and new data types, the storage format, and the table's schema evolution capabilities.

For example, changing a column from INT to BIGINT is generally safer than changing it from INT to STRING.

**Important:** Setting mergeSchema=true does not guarantee that Spark can merge columns with different data types. A DataFrame cast, merging file schemas, and evolving a table's stored schema are separate operations.

## 1. Types of data type changes

Common scenarios include:

| Change type | Example | Typical behavior |
| --- | --- | --- |
| Type widening | INT → BIGINT | Lossless for integer values; supported evolution depends on the table format and version |
| Type narrowing | BIGINT → INT | May fail, overflow, or lose information |
| Incompatible type change | STRING → STRUCT | Usually requires an explicit transformation |
| Numeric to string | INT → STRING | Requires a compatible conversion or migration |
| String to numeric | STRING → INT | May fail for invalid values |
| Precision increase | DECIMAL(10,2) → DECIMAL(15,2) | Supported by some table formats |

The storage format, reader, table features, and Spark configuration determine which changes are supported.

## 2. What happens when a Parquet column changes type?

Suppose we initially have Parquet files with this schema:

```text
employee_id: INT
name: STRING
salary: INT
```

Later, the source system changes salary from INT to STRING. New files are written with:

```text
employee_id: INT
name: STRING
salary: STRING
```

The directory contains:

```text
/data/employees/
    part-00001.parquet  # salary: INT
    part-00002.parquet  # salary: INT
    part-00003.parquet  # salary: STRING
    part-00004.parquet  # salary: STRING
```

Now Spark attempts to read the entire dataset:

```python
df = (
    spark.read
    .option("mergeSchema", "true")
    .parquet("/data/employees")
)
```

Spark may raise an error similar to:

```text
Failed to merge schemas.
Failed to merge incompatible data types: INT and STRING
```

The exact error wording depends on the Spark version and read path.

[spark-reference:parquet-type-conflict]

### Why does this happen?

Parquet files store their own physical and logical type information. Spark cannot assume that incompatible representations should be interpreted as the same type.

Unlike adding a missing column, changing a column's type requires determining whether existing values can be converted safely.

Even apparently safe changes such as INT to BIGINT are not guaranteed to merge automatically across ordinary Parquet files. Parquet schema merging is not a general-purpose type-conversion mechanism. Disabling schema merging can instead defer a conflict until Spark reads a file whose type does not match the selected read schema.

## 3. What happens with safe type widening?

Suppose the original schema is:

```text
salary: INT
```

The new schema is:

```text
salary: BIGINT
```

This is called type widening. A BIGINT can represent the complete range of an INT, so this conversion does not lose integer values.

Supported table formats can evolve eligible column types without rewriting existing data.

For example, Apache Iceberg supports safe promotions such as:

- INT → BIGINT
- FLOAT → DOUBLE
- Increasing decimal precision while preserving scale

Iceberg tracks schemas through table metadata and field IDs, allowing supported type promotions without rewriting data files.

### Example using Apache Iceberg

```sql
ALTER TABLE catalog.db.employees
ALTER COLUMN salary TYPE BIGINT;
```

The Iceberg table schema is updated. Old data files can remain physically unchanged while compatible readers interpret values using the evolved schema. This assumes a configured Iceberg catalog and connector.

## 4. What happens with incompatible data type changes?

Suppose a column changes from:

```text
customer_id: STRING
```

to:

```text
customer_id: INT
```

Old values might contain:

```text
"101"
"102"
"ABC"
"104"
```

Spark cannot safely convert every string to an integer because ABC is not numeric.

If you execute:

```python
from pyspark.sql.functions import col

# df contains the original string customer_id column.
converted_df = df.withColumn(
    "customer_id",
    col("customer_id").cast("int")
)
```

The behavior when this conversion executes depends on spark.sql.ansi.enabled:

- **ANSI mode enabled:** Invalid string-to-integer conversions generally raise an exception.
- **ANSI mode disabled:** Invalid numeric strings may produce NULL.

For controlled conversion, Spark SQL provides try_cast, which returns NULL for supported conversion failures:

```sql
SELECT
    try_cast(customer_id AS INT) AS customer_id
FROM customers;
```

Unsupported source/target type combinations can still be rejected. In production, identify and handle invalid values explicitly rather than silently discarding them. Retain the original value when auditing conversion failures, so that original nulls can be distinguished from failed casts.

## 5. Schema evolution behavior across storage formats

| Storage format | Data type evolution |
| --- | --- |
| Plain Parquet | Limited; incompatible file schemas may fail to merge or read |
| Delta Lake | Supports eligible type widening with the appropriate version and table feature |
| Apache Iceberg | Supports safe type promotions through metadata |
| CSV | Types are not embedded in files; explicit schema or inference determines types |
| JSON | Inferred types may vary; explicit schema recommended |

Delta Lake supports eligible type widening when the appropriate feature is enabled. Supported changes can leave existing files unchanged, but the supported type pairs depend on the Delta version.

For example, with Delta Lake 4.0+ and compatible readers:

```sql
ALTER TABLE employees
SET TBLPROPERTIES (
  'delta.enableTypeWidening' = 'true'
);

ALTER TABLE employees
ALTER COLUMN salary TYPE BIGINT;
```

This example assumes an existing INT salary column in a Delta table. The INT-to-BIGINT pair is supported in Delta Lake 4.0+; the earlier 3.2 preview supports a more limited set of changes.

Not all type changes are supported, and enabling the table feature can affect compatibility with older Delta readers.

## 6. How should you handle data type changes in production?

Suppose your pipeline receives daily Parquet files and the source system unexpectedly changes salary from INT to STRING.

A reliable approach is:

1. **Detect schema drift:** Compare the incoming schema with the expected target schema.
2. **Classify the change:** Determine whether it is a safe widening, narrowing, or incompatible modification.
3. **Validate the data:** Check whether values can be converted to the expected type without unacceptable loss.
4. **Apply explicit conversions:** Cast incoming columns to the agreed target schema when safe.
5. **Handle incompatible data:** Quarantine invalid records or reject the batch.
6. **Update the table schema:** Use supported schema evolution operations for Iceberg or Delta Lake when appropriate.
7. **Validate downstream consumers:** Check dependent Spark jobs, SQL queries, and reporting systems.

For plain Parquet datasets containing incompatible physical types, read the old and new files separately using their respective schemas, normalize them to a common target schema, and rewrite the affected data to a separate validated destination. A cast applied after a read that already fails cannot repair that read.

### Example: Normalize incoming data before writing

```python
from pyspark.sql.functions import col

# Read one internally compatible incoming batch.
incoming_df = spark.read.parquet("/data/incoming")

normalized_df = (
    incoming_df
    .withColumn("employee_id", col("employee_id").cast("long"))
    .withColumn("salary", col("salary").cast("double"))
)

# Validate conversions before appending. Existing destination files
# must already use the agreed compatible types.
normalized_df.write.mode("append").parquet(
    "/data/normalized_employees"
)
```

This normalizes the illustrated columns, provided the conversions are valid and the destination is compatible. It does not repair older incompatible files automatically. Choose an appropriate DECIMAL type instead of DOUBLE when exact monetary precision is required.

## 7. Interview-ready answer

> When a column's data type changes in Apache Spark, the behavior depends on whether the change is compatible and which storage format is being used.
>
> INT to BIGINT is a lossless integer widening, while STRING to INT can fail for invalid or out-of-range values.
>
> In plain Parquet datasets, individual files can have different schemas, but Spark cannot automatically merge arbitrary type changes. Even with mergeSchema=true, incompatible schemas can cause errors.
>
> Apache Iceberg supports safe type promotions through metadata. Delta Lake supports eligible type widening with the appropriate version and table feature enabled.
>
> For incompatible changes, we generally need explicit casting, validation, or a rewrite using a consistent schema. We should detect schema drift, distinguish compatible from breaking changes, and validate downstream consumers.

**Key takeaway:** Adding a column is generally easier than changing its data type. Compatible widening may be handled through supported table-format evolution, while incompatible changes usually require explicit conversion or migration.
