# How do you handle schema evolution in streaming jobs?

Schema evolution in Spark Structured Streaming means handling changes to incoming schemas—such as added, removed, renamed, or differently typed columns—while preserving data correctness and recovery behavior.

Unlike batch processing, streaming queries are long-lived. If a source schema changes while a query runs, the existing query may fail, ignore new fields, or require a controlled restart, depending on its source, decoder, and transformations.

The recommended production approach combines schema validation, compatible evolution, explicit transformations, schema versioning, checkpointing, and controlled deployments.

## 1. What happens when the schema changes in a streaming job?

Suppose a Kafka topic initially produces employee events with this structure.

### Event using V1

```json
{
  "employee_id": 101,
  "name": "Rahul",
  "salary": 50000
}
```

Later, the producer introduces a new field.

### Event using V2

```json
{
  "employee_id": 102,
  "name": "Priya",
  "salary": 60000,
  "department": "IT"
}
```

A V1 application may keep processing records while ignoring department if its decoder supports that behavior. To use or write the new field, update the query's parsing/output schema and ensure the sink accepts it.

| Schema change | Typical handling |
| --- | --- |
| Add optional column | Usually compatible when the reader tolerates it; update reader and sink if the field is needed |
| Remove column | Supply a valid default, preserve compatibility, or update consumers |
| Rename column | Use aliasing or a versioned migration |
| INT → BIGINT | Apply supported widening or an explicit conversion |
| STRING → INT | Validate and cast; quarantine invalid records |
| Add nested field | Update the nested schema and decoder |
| Change aggregation/state schema | Plan for existing checkpoint-state incompatibility |

**Important:** Spark does not provide unrestricted automatic schema evolution for every streaming source. Compatibility depends on the implementation and change type.

## 2. Recommended production architecture

[spark-reference:streaming-schema-pipeline]

Checkpointing, monitoring, versioning, and recovery apply throughout the pipeline. The key design principle is to separate the incoming event schema from the stable schema consumed downstream.

Sources need appropriate connectors or ingestion integrations; an arbitrary API is not a built-in Structured Streaming source. Delta Lake and Iceberg likewise require their connectors and catalog/session setup.

## 3. Use Schema Registry with Kafka streaming

For Kafka pipelines, a common approach is Avro, Protobuf, or JSON Schema with a schema registry. The registry validates proposed schemas against a configured compatibility policy.

| Version | Fields |
| --- | --- |
| V1 | employee_id, name, salary |
| V2 | employee_id, name, salary, department |

For example, if an Avro V2 reader adds department with a default, it can read V1 data using that default.

Typical policies are:

- **BACKWARD:** New readers can read older data.
- **FORWARD:** Old readers can read newer data.
- **FULL:** Both directions are supported.

Consider BACKWARD_TRANSITIVE when new readers must replay all historical schema versions, rather than only the immediately preceding one. The exact rules differ between Avro, Protobuf, and JSON Schema.

**Important:** Spark's Kafka connector exposes message values as bytes. Registry validation does not automatically decode every version for Spark; the application needs an appropriate schema-aware decoder or integration.

## 4. Example: Handle a newly added field in Kafka JSON streaming

Suppose the topic contains both V1 and V2 JSON events. Define a unified schema that already includes the new nullable field:

```python
from pyspark.sql.functions import col, from_json, coalesce, lit
from pyspark.sql.types import (
    StructType, StructField, LongType, StringType
)

# Unified schema supporting V1 and V2.
schema = StructType([
    StructField("employee_id", LongType(), True),
    StructField("name", StringType(), True),
    StructField("salary", LongType(), True),
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
)

normalized_df = (
    parsed_df
    .select("data.*")
    .withColumn(
        "department",
        coalesce(col("department"), lit("UNKNOWN"))
    )
)
```

For the two valid sample events, the logical output is:

| employee_id | name | salary | department |
| --- | --- | --- | --- |
| 101 | Rahul | 50000 | UNKNOWN |
| 102 | Priya | 60000 | IT |

### Why does this work?

from_json uses the supplied schema. Old records missing department yield NULL for that field; coalesce supplies the approved fallback. This example also maps an explicit null department to UNKNOWN.

It works without a schema-related restart if the running query already uses this schema. If it was deployed with only V1, changing the parser generally requires restarting the query with updated code.

This example handles an additive field, not complete record validation. A production pipeline should retain original payloads and Kafka topic/partition/offset metadata, capture parse failures, validate required fields, and route problematic records to quarantine before treating them as valid sink input. Nullable=True does not enforce business-level mandatory fields.

## 5. Use Delta Lake or Iceberg for evolving streaming sinks

Handle both ends:

1. The source decoder and transformations must understand the new schema.
2. The destination table must accept the new output schema.

For a Delta sink, supported evolution can be enabled on the write:

```python
query = (
    normalized_df.writeStream
    .format("delta")
    .outputMode("append")
    .option("mergeSchema", "true")
    .option(
        "checkpointLocation",
        "/checkpoints/employees"
    )
    .start("/data/delta/employees")
)
```

Here, mergeSchema=true permits supported write-time changes such as added columns. It does not update the source decoder or make incompatible type/state changes safe.

Iceberg also supports metadata-managed changes, including adding and renaming fields. Automatic write-time schema merging requires explicit table and writer configuration. Check the connector version and streaming-write support for the intended operation.

Use durable, application-specific checkpoint storage accessible to the cluster; the paths above are illustrative.

## 6. How does Databricks Auto Loader handle schema evolution?

For cloud file ingestion, Databricks Auto Loader provides managed schema inference and evolution:

```python
autoloader_df = (
    spark.readStream
    .format("cloudFiles")
    .option("cloudFiles.format", "json")
    .option(
        "cloudFiles.schemaLocation",
        "/schemas/employees"
    )
    .option(
        "cloudFiles.schemaEvolutionMode",
        "addNewColumns"
    )
    .load("/data/incoming/employees")
)
```

With addNewColumns:

1. Auto Loader detects a new column.
2. It updates stored schema information.
3. The current query stops with UnknownFieldException.
4. A configured job orchestrator restarts it.
5. The restarted query uses the evolved schema.

Other modes include rescue, failOnNewColumns, and none. Supported runtimes offer additional type-widening behavior. addNewColumns does not itself evolve existing column types and cannot be combined with an explicitly supplied full source schema; schema hints are a separate supported mechanism.

Auto Loader is Databricks-specific. Standard Spark file streaming requires an explicit schema by default and does not provide equivalent managed ongoing evolution. Auto Loader's schemaLocation records inferred schemas; checkpointLocation records streaming recovery progress. They have different purposes.

## 7. What happens to checkpoints when schemas change?

Checkpoints retain source offsets, batch commit/progress information, query metadata, and state-store data when stateful operators are present.

### Case 1: Adding a column to a stateless query

Original projection:

```python
df.select("employee_id", "salary")
```

Updated projection, after the reader exposes department:

```python
df.select(
    "employee_id",
    "salary",
    "department"
)
```

A restart with the existing checkpoint may be supported if the source and sink accept the modified query. An output-schema change is conditional, not a guarantee for every sink.

### Case 2: Changing a stateful operation

Original aggregation:

```python
df.groupBy("department").count()
```

Changed aggregation:

```python
df.groupBy("department", "country").count()
```

This changes the grouping keys in checkpointed aggregation state. Ordinary recovery from the old checkpoint does not support that change. Streaming joins, deduplication, and other stateful operators also have restrictions.

Use documented migration support only when the exact stateful API and version provide it. Otherwise, plan a new query/checkpoint with a controlled replay or state rebuild; changing a source or sink schema option does not migrate aggregation state.

### Should we delete the checkpoint after a schema change?

Do not delete a production checkpoint as a routine fix. Starting without it can change the source's starting position and cause replay or skipped records, depending on configuration and retention.

Preserve the checkpoint for compatible changes. For incompatible ones, plan state migration, a separate checkpoint, replay boundaries, and sink deduplication/idempotency. Do not run two active queries against the same checkpoint directory.

## 8. Production strategy for different schema changes

| Schema change | Recommended approach | Restart required? |
| --- | --- | --- |
| Add optional field | Update reader and allow compatible sink evolution | Often, unless already supported |
| Remove field | Preserve a valid default or compatibility layer; update consumers | Often |
| Rename column | Use aliases or a metadata-managed rename | Generally for affected jobs |
| Safe type widening | Explicit cast or supported table evolution | Often |
| Incompatible type change | Validate, transform, or quarantine | Usually |
| Add unknown JSON field | Preserve in raw payload or a supported rescue mechanism | Not necessarily |
| Change stateful aggregation keys | State migration or new query/checkpoint strategy | Requires controlled migration |

Restart requirements depend on the implementation. A change does not automatically require rebuilding every query, and a restart alone does not make incompatible state recoverable.

## 9. Recommended production workflow

1. **Detect changes:** Compare incoming schemas with registered or expected versions.
2. **Validate compatibility:** Identify added, removed, renamed, and incompatible fields; apply registry policies where appropriate.
3. **Normalize records:** Apply validated defaults, casts, and aliases to provide a stable downstream schema.
4. **Quarantine incompatible records:** Preserve original payloads and errors for investigation and replay.
5. **Evolve the destination:** Apply supported Delta or Iceberg table changes after validation.
6. **Manage checkpoints and deployments:** Reuse checkpoints only for supported query changes; plan migration for incompatible state changes.
7. **Monitor and validate:** Track schema versions, malformed records, null rates, failures, lag, and downstream compatibility.

## 10. Interview-ready answer

> Structured Streaming schema evolution must account for decoding, transformations, destination tables, and checkpoint recovery.
>
> I use versioned schemas and compatibility checks. For additive changes, I update the reader, supply valid defaults for older records, and ensure the sink supports the new schema. A registry helps govern Kafka schemas but still requires appropriate decoding in Spark.
>
> For incompatible changes, I validate conversions and quarantine invalid records. Delta Lake and Iceberg provide controlled sink evolution; Databricks Auto Loader can manage new file-source fields, typically with an orchestrated restart in addNewColumns mode.
>
> Some stateless query changes can reuse a checkpoint after a controlled restart. Changes to aggregation keys or other stateful schemas need a planned migration or state rebuild. I preserve raw input and monitor schema drift to avoid silent loss, duplicate processing, and downstream failures.

**Key takeaway:** Streaming schema evolution requires compatible event decoding, validated transformations, supported sink changes, and a recovery plan that respects checkpointed state.
