# What happens when a source column is deleted?

When a column is deleted from a source system, Spark may return NULL for it, fail with a schema-related error, or continue without exposing the column. The behavior depends on the source format, Spark's read schema, and downstream references to the field.

Treat a deleted column as a potentially breaking change, especially in continuously running Structured Streaming pipelines. A job that keeps running can still produce incorrect business results.

## 1. What happens when a column is deleted?

Suppose an employee dataset initially has this schema.

### Original schema — V1

```text
employee_id: INT
name: STRING
salary: DOUBLE
department: STRING
```

Later, the source removes department.

### New schema — V2

```text
employee_id: INT
name: STRING
salary: DOUBLE
```

Spark now receives records without department. Several outcomes are possible:

| Scenario | What happens? |
| --- | --- |
| JSON field removed, explicit nullable schema retained | Missing field becomes NULL |
| Parquet file lacks a field included in Spark's compatible read schema | Spark can return NULL for that field |
| Spark infers a schema without the deleted column | Column is absent from the DataFrame |
| Transformation references a column absent from the DataFrame schema | Spark raises an unresolved-column error |
| Avro reader expects a removed writer field | May fail unless the reader schema provides a default |
| Sink requires the deleted column | Write may fail or require validated normalization |

[spark-reference:deleted-column-outcomes]

**The key distinction:** A column present in the DataFrame schema with NULL values is different from a column absent from that schema.

## 2. Example: Deleted column in a Kafka streaming pipeline

Originally, Kafka receives JSON events like:

```json
{
  "employee_id": 101,
  "name": "Rahul",
  "department": "IT"
}
```

After department is removed:

```json
{
  "employee_id": 102,
  "name": "Priya"
}
```

Keep an explicit reader schema containing the optional field:

```python
from pyspark.sql.functions import col, from_json
from pyspark.sql.types import (
    StructType, StructField, LongType, StringType
)

schema = StructType([
    StructField("employee_id", LongType(), True),
    StructField("name", StringType(), True),
    StructField("department", StringType(), True)
])

kafka_df = (
    spark.readStream
    .format("kafka")
    .option("kafka.bootstrap.servers", "localhost:9092")
    .option("subscribe", "employees")
    .load()
)

parsed_df = kafka_df.select(
    from_json(
        col("value").cast("string"),
        schema
    ).alias("data")
).select("data.*")
```

For the valid sample events, the logical output is:

| employee_id | name | department |
| --- | --- | --- |
| 101 | Rahul | IT |
| 102 | Priya | NULL |

The missing JSON field becomes NULL because the explicit schema still includes it. This retains a stable DataFrame schema, but does not establish that losing department is acceptable.

The example assumes Spark's Kafka integration is available. Production parsing should also retain raw payloads and source metadata, detect malformed events, and validate required fields.

## 3. What if downstream transformations reference the deleted column?

Consider:

```python
df = spark.read.parquet("/data/employees")

result = df.select(
    "employee_id",
    "department"
)
```

If the inferred DataFrame schema no longer contains department, Spark raises an error similar to:

```text
AnalysisException:
[UNRESOLVED_COLUMN.WITH_SUGGESTION]
A column named `department` cannot be resolved.
```

Exact error wording can vary. In streaming, an updated query may fail to start when the missing reference is analyzed.

### How to handle the missing column

If department is genuinely optional and consumers still expect it, explicitly add a typed null:

```python
from pyspark.sql.functions import lit
from pyspark.sql.types import StringType

if "department" not in df.columns:
    df = df.withColumn(
        "department",
        lit(None).cast(StringType())
    )
```

Apply this normalization before selecting or otherwise referencing the missing column. The check inspects the DataFrame schema when the plan is built; it does not monitor each incoming event or automatically update a running query.

**Important:** Supplying NULL preserves the column's shape, not its business meaning. If the field is critical, quarantine affected records or reject the change instead of silently substituting a value.

## 4. What happens across different data formats?

### Parquet

Suppose historical files contain department and newer files do not:

```python
df = (
    spark.read
    .option("mergeSchema", "true")
    .parquet("/data/employees")
)
```

Compatible schema merging can retain department and return NULL for records from files that lack it. Without merging or an explicit/catalog schema, Spark might discover a schema excluding it.

If no discovered file still contains department, merging alone cannot recover that field's definition. Supply an appropriate read schema or explicitly add the optional field when required.

### Avro with Schema Registry

Avro resolution depends on both reader and writer schemas. Suppose the old reader contains this field:

```json
{
  "name": "department",
  "type": ["null", "string"],
  "default": null
}
```

A newer producer can omit department from its writer schema, and the old reader can supply its declared default. If the reader has no default for that missing field, deserialization can fail.

Nullability alone does not declare a default in Avro. Removing a field without a reader-side default can break forward compatibility even though a new reader can ignore that field in older data. Registry compatibility checks and Spark's runtime decoder must both be configured appropriately.

### Apache Iceberg and Delta Lake

Both support controlled table evolution. For a configured Iceberg table:

```sql
ALTER TABLE catalog.db.employees
DROP COLUMN department;
```

Iceberg updates table metadata without rewriting existing data files. Current table reads no longer expose the field; its historical bytes may remain in older files.

Delta Lake supports metadata-only column drops with column mapping enabled. Reader compatibility, streaming schema tracking, and restart requirements depend on the Delta version and change.

A source ceasing to send a field does not automatically execute a DROP COLUMN on the destination table. Treat source-contract changes and target-table changes as separate decisions. A metadata-only drop also does not itself erase historical physical values.

## 5. What happens to a running streaming job?

| Situation | Expected outcome |
| --- | --- |
| Existing decoder retains the missing field as nullable | Stream may continue with NULL |
| Updated reader removes a field still required downstream | Query may fail during analysis |
| Field participates in aggregation, joins, or state | May require code changes and controlled state migration |

For example:

```python
df.groupBy("department").count()
```

If department remains in the schema but becomes NULL for all new events, Spark can keep counting them under a null group. That may silently distort the result. A filter such as department = 'IT' would instead exclude null-valued rows.

If you remove department from grouping keys or change state schemas, ordinary restart from the existing checkpoint may not be supported. Plan a documented migration or a separate query/checkpoint and controlled replay; a restart by itself does not transform old state.

## 6. Recommended production approach

1. **Detect the change:** Compare incoming schemas with the expected schema or registry version; monitor missing-field and null rates as well.
2. **Check dependencies:** Identify joins, filters, aggregations, and reports using the field.
3. **Validate compatibility:** Determine whether readers can safely process its absence.
4. **Maintain compatibility where appropriate:** Supply a typed NULL, valid default, or temporary alias to a verified replacement for optional fields.
5. **Reject critical breaking changes:** Quarantine events or stop processing rather than produce incorrect results.
6. **Update the target deliberately:** Use supported table evolution only if the field should be removed permanently.
7. **Manage recovery:** Reuse a checkpoint only for compatible query changes; plan migration when stateful logic changes.

For CDC pipelines, retain schema-version metadata and alerts showing when the field stopped arriving. Schema checks alone may not detect its absence when a fixed decoder still exposes it as NULL.

## 7. Interview-ready answer

> When a source column is deleted, Spark's behavior depends on the reader schema, source format, and downstream dependencies.
>
> An explicit JSON schema can retain the missing nullable field as NULL. Parquet reads can also return NULL when the read schema includes a field absent from some files. If the column disappears from the DataFrame schema but code still references it, Spark raises an unresolved-column error.
>
> With Avro, old consumers can fail on a removed writer field unless their reader schema supplies a default.
>
> I detect the change, assess dependencies, provide validated fallbacks for optional fields, and quarantine incompatible records. For Structured Streaming, I also check checkpoint compatibility, especially when the field affects aggregation or join state. Target-table changes are applied separately through controlled evolution.

**Key takeaway:** Deletion does not always fail visibly. Distinguish a missing value from a missing schema column, validate downstream semantics, and manage stateful changes deliberately.
