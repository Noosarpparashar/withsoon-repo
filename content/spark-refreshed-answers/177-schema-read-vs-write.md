# What is the difference between schema-on-read and schema-on-write?

Schema-on-read and schema-on-write describe when a pipeline interprets data and enforces a schema contract.

- **Schema-on-read:** Store data, often in its original form, and apply an interpretation when reading or querying it.
- **Schema-on-write:** Validate incoming data against a target schema before or during acceptance into the target system, transforming it when needed.

The fundamental difference is where the schema contract is enforced. Both approaches can use explicit schemas and validation; neither guarantees performance or data quality by itself.

## 1. Key differences

| Feature | Schema-on-read | Schema-on-write |
| --- | --- | --- |
| Schema applied | When reading data | Before or during writing |
| Validation boundary | Primarily at consumption | Primarily at ingestion into the target |
| Flexibility | Different readers can apply different interpretations | Target contract is more controlled |
| Raw-data preservation | Commonly preserves original input | May transform before storage; raw input can still be retained separately |
| Ingestion performance | Can avoid some upfront parsing/validation | May perform additional upfront work |
| Query performance | May repeatedly parse or convert raw values | Can benefit from prevalidated, structured data |
| Schema changes | Raw ingestion may tolerate new fields | Usually require controlled target evolution |
| Data quality | Depends on reader rules unless standardized | Schema compatibility enforced at the write boundary; business rules still need validation |
| Typical systems | Raw lakes, JSON/CSV/log ingestion | Warehouses and curated lakehouse tables |
| Best suited for | Raw retention and exploratory analysis | Curated analytics, reporting, and production contracts |

These are typical trade-offs, not universal speed rankings. File layout, format, indexing, query plans, and reuse can matter more than this architectural distinction.

## 2. How schema-on-read works

Data is stored first, then interpreted by the application reading it.

For example, JSON Lines records in S3 might contain:

```jsonl
{"id": 101, "name": "Rahul", "salary": 50000}
{"id": 102, "name": "Priya", "salary": 60000}
```

Spark can apply an explicit read schema:

```python
from pyspark.sql.types import (
    StructType, StructField, IntegerType, StringType, DoubleType
)

schema = StructType([
    StructField("id", IntegerType(), True),
    StructField("name", StringType(), True),
    StructField("salary", DoubleType(), True)
])

df = (
    spark.read
    .schema(schema)
    .json("s3://bucket/raw/employees/")
)
```

Spark interprets the raw records according to that schema. Missing fields, unknown fields, and malformed input still follow the selected reader's rules; additional business checks may be needed.

If a producer adds department, the original JSON can be stored without first changing a curated table's columns. Readers decide when to include that field. The explicit schema above will not automatically expose department.

### Execution flow

[spark-reference:schema-on-read-flow]

### Advantages

- Flexible ingestion of semi-structured data.
- New or unexpected fields can be retained in raw records.
- Raw data remains available for replay and reinterpretation.
- Different consumers can apply different views of the same input.

### Disadvantages

- Parsing and validation may be repeated at read time.
- Readers may interpret the same input inconsistently.
- Schema problems can be discovered late.
- Repeated conversion can add query cost.

## 3. How schema-on-write works

Incoming data must satisfy the target's schema contract before it is accepted.

Suppose the curated table requires:

```text
id: INT
name: STRING
salary: DOUBLE
```

Incoming data may instead contain a numeric string:

```json
{"id": 101, "name": "Rahul", "salary": "50000"}
```

The pipeline converts the value and validates it before writing.

### Example using Spark

```python
from pyspark.sql.functions import col

raw_df = spark.read.json(
    "s3://bucket/raw/employees/"
)

converted_df = raw_df.select(
    col("id").cast("int").alias("id"),
    col("name").cast("string").alias("name"),
    col("salary").cast("double").alias("salary")
)

# Illustrative contract: all three values are required.
# A cast can throw under ANSI mode; otherwise invalid values may be null.
invalid_df = converted_df.filter(
    col("id").isNull()
    | col("name").isNull()
    | col("salary").isNull()
)

if invalid_df.limit(1).count() > 0:
    raise ValueError("Reject batch: missing or invalid required values")

converted_df.writeTo(
    "catalog.db.employees"
).append()
```

Assume catalog.db.employees is an existing Iceberg table with compatible types and the connector/catalog is configured. The sample illustrates a batch validation boundary; use a controlled source schema and the complete contract in production, including type/range checks and appropriate treatment of malformed input.

Casting alone is not comprehensive validation. For example, some narrowing casts can lose information, NaN is not NULL, and exact monetary values may need DECIMAL instead of DOUBLE. Preserve rejected raw records when investigation or replay is required.

The table enforces supported schema compatibility. An incompatible write can fail instead of silently changing the table structure, unless an appropriate evolution mechanism has deliberately been enabled.

### Execution flow

[spark-reference:schema-on-write-flow]

### Advantages

- Consistent structures for downstream consumers.
- Earlier detection of incompatible records.
- A centralized schema contract and quality boundary.
- Curated data can simplify analytical queries.

### Disadvantages

- More validation and transformation during ingestion.
- Unexpected changes may interrupt writes.
- Schema migrations need coordination.
- Strict targets can limit immediate ingestion flexibility.

## 4. How do schema changes behave?

Suppose the source adds department:

| Scenario | Schema-on-read | Schema-on-write |
| --- | --- | --- |
| New column | Raw data can usually retain it without a curated-table change | Target schema may need explicit evolution |
| Deleted column | Reader may return NULL, omit the column, or fail | Write may fail when a required value is missing |
| Type changed | Reader may convert or reject values | Values must satisfy target compatibility and conversion rules |
| Column renamed | Reading logic must reconcile names | Requires mapping or controlled schema evolution |
| Unexpected field | Can remain in the raw payload | May be rejected, ignored, or accepted according to policy |

**Important:** Schema-on-read does not mean there is no schema. Schema-on-write does not mean that a schema can never change.

Parquet embeds schema metadata in its files, even when used in a data lake. A pipeline's approach depends on its enforcement boundary, not merely the file extension or storage location. Likewise, writing a Spark DataFrame to a plain Parquet path does not automatically establish table-wide schema governance across all existing files.

## 5. Can both approaches work together?

Yes. Lakehouse pipelines commonly use both, often through Bronze, Silver, and Gold layers:

[spark-reference:schema-read-write-layers]

For example, in a Spark and Iceberg pipeline:

- **Bronze:** Preserve raw Kafka JSON payloads and source metadata without immediately modeling every payload field as a table column.
- **Silver:** Parse, normalize, and validate events before writing a controlled Iceberg schema.
- **Gold:** Produce curated business datasets with stable schemas and quality requirements.

Bronze can still have a schema-enforced envelope containing raw_payload, timestamp, and source metadata. The flexible part is the payload's interpretation; the layers are not inherently schema-free versus schema-enforced.

This combines raw-data flexibility with consistent downstream contracts. Table formats such as Iceberg and Delta Lake support controlled schema evolution, but do not replace business validation.

## 6. Interview-ready answer

> Schema-on-read and schema-on-write differ mainly in when the schema contract is applied and enforced.
>
> Schema-on-read stores data first and interprets it when queried. It is useful for raw JSON, CSV, and events because readers can evolve their interpretation while retaining the original input.
>
> Schema-on-write validates data against the destination's schema before accepting it, transforming values as needed. It provides a stable boundary for curated tables, but schema changes need controlled handling.
>
> In production, I often combine them: Bronze retains raw payloads, while Silver and Gold validate records and enforce downstream contracts. Explicit schemas, quality checks, and supported table evolution are useful in both approaches.

**Key takeaway:** Schema-on-read emphasizes flexible interpretation of stored data. Schema-on-write emphasizes a validated target contract. A single pipeline can use both at different boundaries.
