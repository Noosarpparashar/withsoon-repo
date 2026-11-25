# Does column pruning work on nested data?

**Yes. Apache Spark supports nested column pruning, which allows it to read only the required fields inside nested data structures instead of reading the entire nested column.**

This optimization is particularly effective with **Parquet and ORC**, which store data in a columnar format.

Spark supports nested column pruning for `STRUCT` types and certain operations involving `ARRAY<STRUCT>` and `MAP` types, depending on the Spark version and query expression.

## 1. Example of nested column pruning

Suppose we have a Parquet dataset with the following schema:

```text
root
 |-- employee_id: long
 |-- name: string
 |-- address: struct
 |    |-- city: string
 |    |-- state: string
 |    |-- country: string
 |    |-- pincode: string
 |-- salary: double
```

Consider this query:

```python
from pyspark.sql.functions import col

df = spark.read.parquet("/data/employees")

employee_result = df.select(
    col("employee_id"),
    col("address.city")
)
```

Spark only needs:

- `employee_id`
- `address.city`

With nested column pruning, Spark can avoid reading the unused fields:

```text
name
address.state
address.country
address.pincode
salary
```

### How it works internally

[spark-reference:nested-schema-pruning]

This reduces disk I/O, data decoding, and memory consumption.

## 2. Does nested column pruning work with arrays and maps?

Yes, for supported nested expressions.

| Data type | Nested pruning support |
| --- | --- |
| `STRUCT` | Yes, individual fields |
| `ARRAY<STRUCT>` | Yes, for supported field-access expressions |
| `MAP<STRING, STRUCT>` | Supported in certain cases |
| Deeply nested `STRUCT` | Yes, for supported expressions |
| Entire nested object selected | Limited, because all fields may be required |

For example, consider a separate dataset containing:

```text
orders: array<struct<
    order_id: long,
    amount: double,
    status: string
>>
```

Query:

```python
from pyspark.sql.functions import transform, col

orders_df = spark.read.parquet("/data/orders")

amounts_result = orders_df.select(
    transform(
        col("orders"),
        lambda x: x["amount"]
    ).alias("amounts")
)
```

Spark may prune `order_id` and `status` and read only the `amount` field from each order on versions and expressions that support pruning through `transform()`.

However, the exact behavior depends on the Spark version, reader implementation, and expression used. Inspect `amounts_result.explain("formatted")` rather than assuming that every release supports this rewrite. Direct field access such as `orders_df.select(col("orders.amount"))` also exposes a nested field projection.

Pruning fields within map values is different from skipping individual map entries; a key lookup does not guarantee entry-level physical skipping.

## 3. Does nested column pruning work with every file format?

| File format | Nested column pruning |
| --- | --- |
| Parquet | Yes, for supported nested projections |
| ORC | Yes, for supported nested projections |
| JSON | Logical/schema pruning possible, but not equivalent physical column skipping |
| CSV | No native nested column structure |
| Avro | Depends on reader and projection support |

Parquet and ORC provide the greatest benefit because they allow Spark to avoid reading unnecessary nested field data.

For JSON, Spark generally needs to read the underlying records even when only a few nested fields are requested.

## 4. How to verify nested column pruning

Run:

```python
employee_result.explain("formatted")
```

Look for `ReadSchema` in the physical execution plan.

For the employee example:

```text
FileScan parquet

ReadSchema:
  struct<
    employee_id:bigint,
    address:struct<city:string>
  >
```

This indicates that Spark requests only `address.city`, not the entire `address` struct, alongside `employee_id`.

Compare this with:

```text
ReadSchema:
  struct<
    employee_id:bigint,
    address:struct<
      city:string,
      state:string,
      country:string,
      pincode:string
    >
  >
```

The second plan indicates that the full nested structure is being requested. These excerpts are illustrative; actual scan labels and formatting vary.

Nested schema pruning is controlled by the internal configuration:

```python
spark.conf.set(
    "spark.sql.optimizer.nestedSchemaPruning.enabled",
    "true"
)
```

It is enabled by default in modern Spark versions for supported data sources.

## 5. When might nested column pruning not work?

Nested column pruning may be limited when:

1. The query requires the complete nested struct.
2. A UDF consumes the entire nested object.
3. The file format or reader does not support physical nested projection.
4. Certain complex array or map transformations prevent field-level pruning.
5. An expression requires additional nested fields for evaluation.

For example:

```python
df.select("address")
```

Spark must read the entire `address` struct because all its fields are part of the requested output.

However:

```python
df.select("address.city")
```

allows Spark to prune the other address fields when the reader supports nested pruning.

## 6. Interview-ready answer

> Yes, Spark supports nested column pruning, particularly with columnar formats such as Parquet and ORC.
>
> Nested column pruning allows Spark to read individual fields from nested structures instead of reading the entire struct.
>
> For example, if an `address` column contains `city`, `state`, and `country`, and the query selects only `address.city`, Spark can avoid reading the unused nested fields.
>
> This reduces disk I/O, memory consumption, and data decoding overhead.
>
> Spark also supports nested pruning for certain arrays and maps containing structs, although the effectiveness depends on the query expression and Spark version.
>
> We can verify this optimization using `explain("formatted")` and inspecting the `ReadSchema` of the Parquet or ORC scan.

**Key takeaway:** Regular column pruning removes unnecessary top-level columns, while nested column pruning removes unnecessary fields within complex data types. Its biggest benefits are typically seen with Parquet and ORC.
