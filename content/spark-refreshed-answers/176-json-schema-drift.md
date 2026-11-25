# How do you handle schema drift in JSON data?

Schema drift occurs when incoming JSON changes over time: fields are added, removed, renamed, assigned different types, or restructured.

In Spark, detect those changes, validate incoming records, normalize known variants into a consistent target schema, and handle incompatible records separately.

JSON does not embed an enforced table schema like a managed table format. Drift is common in API ingestion, Kafka events, CDC, and data lakes. The goal is to preserve correctness, rather than simply make every changed record parse.

## 1. Common types of JSON schema drift

Suppose the original record is:

```json
{
  "employee_id": 101,
  "name": "Rahul",
  "salary": 50000
}
```

Changes may include:

| Drift type | Example | Potential impact |
| --- | --- | --- |
| New field | Add department | Existing readers may ignore it |
| Deleted field | Remove salary | Missing value may become NULL |
| Data type change | salary: 50000 → "50000" | Requires compatible parsing or conversion |
| Rename | name → full_name | Column references may break |
| Nested change | Add address.city | Nested read schema may need updating |
| Structural change | address object → array | Parsing may fail |
| Nullability change | Required field becomes null | Business validation fails |
| Unexpected field | Add metadata.source | Information may be lost if ignored |

## 2. How does Spark handle JSON drift by default?

Batch file reads can infer a schema:

```python
df = spark.read.json("/data/employees")
df.printSchema()
```

Inferred schemas can differ between reads as the input changes. Inference is useful for exploration, but is not a schema-evolution policy.

For a controlled read, supply a schema:

```python
from pyspark.sql.types import (
    StructType, StructField, LongType, StringType, DoubleType
)

schema = StructType([
    StructField("employee_id", LongType(), True),
    StructField("name", StringType(), True),
    StructField("salary", DoubleType(), True),
    StructField("department", StringType(), True)
])

df = (
    spark.read
    .schema(schema)
    .json("/data/employees")
)
```

With this schema:

- Missing department values become NULL.
- Unknown fields are normally omitted from the parsed result.
- Values that cannot be parsed into the declared types are handled according to the parsing mode and parser behavior.
- Malformed JSON follows the configured malformed-record policy.

JSON file reading supports PERMISSIVE, DROPMALFORMED, and FAILFAST. The examples assume one self-contained JSON object per line; use multiLine=True for appropriate multiline files. A fixed schema does not itself alert on unknown fields or enforce mandatory business values.

## 3. Handle missing, renamed, and changing fields

### Missing optional fields

When the column is included in the parsing schema, supply an approved default:

```python
from pyspark.sql.functions import col, coalesce, lit

df = df.withColumn(
    "department",
    coalesce(col("department"), lit("UNKNOWN"))
)
```

This replaces both missing-derived and explicit NULL values. If department is absent from the DataFrame schema entirely, add it before referencing it. A fallback is appropriate only if its business meaning is valid.

### Renamed fields

Parse both old and new names before normalizing them:

```python
rename_schema = StructType([
    *schema.fields,
    StructField("full_name", StringType(), True)
])

rename_df = (
    spark.read
    .schema(rename_schema)
    .json("/data/employees")
)

normalized_df = rename_df.withColumn(
    "full_name",
    coalesce(col("full_name"), col("name"))
)
```

This explicitly prefers full_name. If both names are populated differently, validate the conflict instead of assuming they are equivalent. Schema merging cannot infer that the two names mean the same field.

### Data type changes

When salary can arrive as a JSON number or numeric string, preserve a text representation before applying the target conversion:

```python
from pyspark.sql.functions import expr

salary_schema = StructType([
    StructField("salary", StringType(), True)
])

salary_df = (
    spark.read
    .schema(salary_schema)
    .json("/data/employees")
)

salary_df = salary_df.withColumn(
    "salary_normalized",
    expr("try_cast(salary AS DOUBLE)")
)

invalid_salary_df = salary_df.filter(
    col("salary").isNotNull()
    & col("salary_normalized").isNull()
)
```

For this supported conversion, invalid numeric strings yield NULL. Distinguish those failures from genuinely missing values. Use domain checks for values such as NaN, infinity, and invalid ranges, and choose DECIMAL when exact monetary precision is required. Casting after an earlier parser has already replaced the original value with NULL cannot recover that value.

## 4. Handle malformed JSON using parsing modes

| Mode | Behavior |
| --- | --- |
| PERMISSIVE | Can retain corrupt input in a configured string field and return null for invalid fields; valid portions may still be parsed |
| DROPMALFORMED | Drops malformed records during JSON file reads |
| FAILFAST | Throws an error when malformed input is encountered |

Example for batch file reading:

```python
corrupt_schema = StructType([
    StructField("employee_id", LongType(), True),
    StructField("name", StringType(), True),
    StructField("salary", DoubleType(), True),
    StructField("_corrupt_record", StringType(), True)
])

corrupt_df = (
    spark.read
    .schema(corrupt_schema)
    .option("mode", "PERMISSIVE")
    .option("columnNameOfCorruptRecord", "_corrupt_record")
    .json("/data/employees")
)

# Materialize before queries that inspect only the corrupt-record field.
corrupt_df.cache()
corrupt_df.count()
```

Separate parse failures:

```python
parse_valid_df = corrupt_df.filter(
    col("_corrupt_record").isNull()
)

parse_invalid_df = corrupt_df.filter(
    col("_corrupt_record").isNotNull()
)

# Process/write these results, then call corrupt_df.unpersist().
```

Parse-valid does not mean business-valid. Further checks may still reject missing required values or invalid ranges.

Spark restricts raw JSON/CSV file queries that reference only the corrupt-record column; materializing the parsed result avoids that specific restriction. Do not apply this batch count/cache pattern to a streaming DataFrame.

**Important:** _corrupt_record is not a general schema-drift capture column. Unknown fields in valid JSON may be ignored without setting it. Also, from_json supports PERMISSIVE and FAILFAST, but not DROPMALFORMED; route bad events explicitly when using that function.

## 5. Production example: Handle JSON drift from Kafka

Preserve the original event and Kafka coordinates, parse known variants, normalize values, and attach validation reasons:

```python
from pyspark.sql import functions as F
from pyspark.sql.types import (
    StructType, StructField, LongType, StringType
)

event_schema = StructType([
    StructField("employee_id", LongType(), True),
    StructField("name", StringType(), True),
    StructField("full_name", StringType(), True),
    StructField("salary", StringType(), True),
    StructField("department", StringType(), True),
    StructField("_corrupt_record", StringType(), True)
])

raw_df = (
    spark.readStream
    .format("kafka")
    .option("kafka.bootstrap.servers", "localhost:9092")
    .option("subscribe", "employees")
    .load()
    .selectExpr(
        "CAST(value AS STRING) AS raw_json",
        "timestamp AS kafka_timestamp",
        "topic", "partition", "offset"
    )
)

parsed_df = raw_df.withColumn(
    "record",
    F.from_json(
        F.col("raw_json"),
        event_schema,
        {
            "mode": "PERMISSIVE",
            "columnNameOfCorruptRecord": "_corrupt_record"
        }
    )
)

flat_df = parsed_df.select(
    "raw_json", "kafka_timestamp", "topic", "partition", "offset",
    "record.*"
).withColumnRenamed("salary", "salary_raw")

normalized_df = (
    flat_df
    .withColumn("full_name", F.coalesce("full_name", "name"))
    .withColumn("salary", F.expr("try_cast(salary_raw AS DOUBLE)"))
)

checked_df = normalized_df.withColumn(
    "error_reason",
    F.when(F.col("_corrupt_record").isNotNull(), "unparseable_event")
     .when(F.col("employee_id").isNull(), "missing_or_invalid_id")
     .when(F.col("full_name").isNull(), "missing_name")
     .when(
         F.col("name").isNotNull()
         & (F.col("name") != F.col("full_name")),
         "conflicting_names"
     )
     .when(
         F.col("salary_raw").isNotNull() & F.col("salary").isNull(),
         "invalid_salary"
     )
)

valid_df = checked_df.filter(F.col("error_reason").isNull()).select(
    "employee_id", "full_name", "salary", "department",
    "raw_json", "kafka_timestamp", "topic", "partition", "offset"
)

invalid_df = checked_df.filter(F.col("error_reason").isNotNull())
```

This example assumes the Kafka connector is installed. Its checks illustrate a contract in which ID and name are required while salary and department may be missing; add the actual domain constraints your pipeline requires.

The design normalizes known names, checks conversion failures, separates invalid events, and keeps raw data for replay. It supports known variants; detecting new but valid fields still requires schema comparison, version metadata, or inspection of raw events.

Write valid_df and invalid_df to their sinks using separate checkpoint directories. Separate streaming queries do not automatically provide an atomic commit across both sinks. Preserve raw input durably, plan replay/idempotency, and check recovery compatibility when changing a deployed parser or stateful logic.

## 6. Handle unknown fields using Databricks Auto Loader

For cloud file ingestion on Databricks, Auto Loader provides managed detection and evolution:

```python
autoloader_df = (
    spark.readStream
    .format("cloudFiles")
    .option("cloudFiles.format", "json")
    .option("cloudFiles.schemaLocation", "/data/schema_tracking")
    .option("cloudFiles.schemaEvolutionMode", "rescue")
    .load("/data/incoming")
)
```

Rescue mode retains unexpected fields, type mismatches, and applicable case mismatches in _rescued_data without evolving the schema. Malformed JSON and business-invalid values still need appropriate handling.

| Mode | Behavior |
| --- | --- |
| addNewColumns | Updates stored schema for new columns, then stops the query; restart uses the updated schema |
| addNewColumnsWithTypeWidening | Also supports eligible type widening in supported runtimes |
| rescue | Preserves unexpected data without evolving the schema |
| failOnNewColumns | Fails on new columns without automatically updating the schema |
| none | Does not evolve the schema; unexpected columns may be ignored unless rescue is configured |

Auto Loader is Databricks-specific, not a standard open-source Spark source. Its rescued-data behavior differs from Spark's _corrupt_record handling.

## 7. Recommended production architecture

[spark-reference:json-drift-medallion]

1. **Preserve raw JSON:** Keep payloads and source coordinates so changed records can be replayed.
2. **Maintain a canonical schema:** Do not let every unexpected source change modify downstream tables.
3. **Detect and classify drift:** Compare observed fields/types and registered versions with the expected contract.
4. **Normalize compatible changes:** Apply valid defaults, aliases, and checked conversions.
5. **Quarantine breaking changes:** Retain invalid records with error reasons.
6. **Monitor drift:** Alert on new fields, missing required fields, and conversion failures.
7. **Manage recovery:** Check restart and checkpoint compatibility when parser or stateful logic changes.

An explicit parsing schema hides unknown fields from the parsed result, so comparing that fixed DataFrame schema with itself cannot detect all drift. Inspect raw events or use appropriate source/schema metadata as well.

## 8. Interview-ready answer

> I handle JSON schema drift with an explicit target contract, durable raw payload retention, schema-change detection, and validation.
>
> I normalize known optional fields, renames, and type variations using defaults, aliases, and checked conversions. Malformed records are captured with PERMISSIVE parsing and a corrupt-record field; unknown valid fields require separate detection because Spark may ignore them.
>
> For Kafka and CDC, I retain source coordinates and schema versions, and route incompatible records to quarantine. On Databricks, Auto Loader's rescued-data column can preserve unexpected fields.
>
> I keep Bronze raw, Silver validated and normalized, and Gold aligned with stable business contracts. I also monitor drift and check streaming checkpoint compatibility before deploying changes.

**Key takeaway:** Preserve raw data, detect actual input changes, normalize supported variants, and explicitly quarantine breaking changes. Parsing successfully is only one part of data validation.
