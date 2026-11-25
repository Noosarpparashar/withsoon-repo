# What is the difference between backward and forward schema compatibility?

Backward and forward compatibility define whether readers using different schema versions can read data written with older or newer schemas.

- **Backward compatibility:** A new reader schema can read data written with an old schema.
- **Forward compatibility:** An old reader schema can read data written with a new schema.
- **Full compatibility:** Both directions are supported.

These concepts matter in Spark, Kafka, Avro, Schema Registry, and data lake schema evolution. The exact compatibility rules depend on the format and reader implementation.

## 1. Key differences

| Feature | Backward compatibility | Forward compatibility |
| --- | --- | --- |
| Reader | New schema — V2 | Old schema — V1 |
| Writer | Old schema — V1 | New schema — V2 |
| Main purpose | New applications read historical data | Old applications read newly produced data |
| Typical use case | Spark processing old records | Existing Kafka consumers processing new events |
| Typical rollout order | Upgrade consumers first | Upgrade producers first |
| Example compatible Avro change | Add a field with a default | Add a field that old readers can ignore |

Rollout order is a starting point, not a complete deployment guarantee. A newly upgraded consumer may still need to replay older data; that requires backward compatibility with those versions even if producers were upgraded first.

## 2. Backward compatibility explained

**A V2 reader can read data written with V1.**

Suppose we originally have this Avro schema.

### Version 1

```json
{
  "type": "record",
  "name": "Employee",
  "fields": [
    {"name": "id", "type": "int"},
    {"name": "name", "type": "string"}
  ]
}
```

Later, we introduce a department field.

### Version 2

```json
{
  "type": "record",
  "name": "Employee",
  "fields": [
    {"name": "id", "type": "int"},
    {"name": "name", "type": "string"},
    {
      "name": "department",
      "type": ["null", "string"],
      "default": null
    }
  ]
}
```

An old record contains:

```json
{
  "id": 101,
  "name": "Rahul"
}
```

When the V2 reader processes this record, Avro supplies the reader's default for the missing field:

```json
{
  "id": 101,
  "name": "Rahul",
  "department": null
}
```

The record snippets show logical values in a readable JSON style; they are not the Avro binary encoding or the literal encoding of an Avro union on the wire.

[spark-reference:backward-schema-read]

### Why does it work?

The new reader field has an explicit default. The reader can supply it when older records do not contain department.

In Avro, allowing null in a field's type does not automatically give the field a default when it is missing from the writer schema. Declare that default explicitly.

## 3. Forward compatibility explained

**A V1 reader can read data written with V2.**

Consider the same schemas. A new record written using V2 contains:

```json
{
  "id": 102,
  "name": "Priya",
  "department": "IT"
}
```

An application still using V1 understands only id and name. During Avro schema resolution, it ignores the additional department field and sees:

```json
{
  "id": 102,
  "name": "Priya"
}
```

[spark-reference:forward-schema-read]

### Why does it work?

Avro allows a reader to ignore writer fields absent from its own schema. The department default is needed for the backward direction; ignoring that extra field is what enables the forward direction.

Adding department with a default in this example preserves both backward and forward compatibility.

## 4. Which schema changes break compatibility?

Consider common Avro field additions and removals:

| Schema modification | Backward | Forward |
| --- | --- | --- |
| Add a field with a default | Yes | Yes |
| Add a field without a default | No | Yes |
| Remove a field that had a default | Yes | Yes |
| Remove a field without a default | Yes | No |
| Rename a field without an alias or mapping | Usually no | Usually no |
| Incompatible data type change | Generally no | Generally no |

This assumes conventional Avro record schema resolution, with the record identity and all other fields unchanged. For removal, the relevant default is the one in the old reader schema. Protobuf, JSON Schema, Parquet, and Iceberg have different rules. Aliases and supported type promotions also need direction-specific checks.

### Why does removing a field without a default break forward compatibility?

Suppose V1 has a required salary field with no default, but V2 removes it.

- A new V2 reader can ignore the salary field in an old V1 record.
- An old V1 reader still expects salary when reading new V2 data. Because the writer omits it and V1 supplies no default, schema resolution fails.

## 5. What is full compatibility?

Full compatibility means both backward and forward compatibility are satisfied.

[spark-reference:full-schema-compatibility]

Both old and new readers can process data from the other schema version. This helps when producers and consumers deploy independently and cannot always be upgraded together.

Full compatibility between V1 and V2 does not by itself guarantee compatibility with every older version. That is the purpose of transitive checks.

## 6. How does this work with Kafka Schema Registry?

In Kafka-based systems, producers write events and consumers read them. A schema registry can validate a proposed schema against configured compatibility requirements before accepting it.

Common Confluent Schema Registry modes include:

| Mode | Meaning |
| --- | --- |
| BACKWARD | New schema reads data written with the previous schema |
| FORWARD | Previous schema reads data written with the new schema |
| FULL | Both backward and forward compatible with the previous schema |
| BACKWARD_TRANSITIVE | New schema reads data from all previous versions |
| FORWARD_TRANSITIVE | All previous schemas read data written with the new schema |
| FULL_TRANSITIVE | Both directions across all previous versions |
| NONE | No compatibility checks |

In Confluent Schema Registry, the default is BACKWARD, normally checking the latest registered version rather than every historical version. Global or subject-level configuration can change that policy.

Registry validation is separate from decoding records correctly at runtime. It does not automatically rewrite Kafka messages, update consumers, or validate the business meaning of a change.

## 7. How does this relate to Apache Spark?

Suppose a Spark pipeline reads historical events from Kafka or an evolving data lake.

With backward-compatible Avro schemas, a newer Spark application can process older records when it uses the appropriate writer/reader schemas and schema-aware decoding.

With forward compatibility, an older Spark application may continue reading newer records after producers add fields, if its decoder supports the relevant schema resolution.

Spark's plain Parquet mergeSchema=true is a different mechanism. It combines compatible file schemas; it does not enforce Schema Registry's backward or forward compatibility modes. A nullable Parquet column returning NULL is also distinct from an Avro reader applying an explicitly declared default.

## 8. Interview-ready answer

> Backward compatibility means a new reader can read data written with an older schema. For example, adding an Avro field with a default lets a new consumer read old records by supplying that default.
>
> Forward compatibility means an old reader can read data written with a newer schema. An old Avro consumer can generally ignore an added field absent from its own schema.
>
> Supporting both directions is called full compatibility. Schema Registry modes such as BACKWARD, FORWARD, FULL, and their transitive variants help control evolution.
>
> Backward compatibility supports upgrading consumers before producers; forward compatibility supports upgrading producers first. Historical replay requirements and the versions still in use determine whether transitive or full compatibility is needed.

**Key takeaway:**

- **Backward:** New reader reads old data.
- **Forward:** Old reader reads new data.
- **Full:** Both directions.

Backward compatibility protects new applications reading historical data. Forward compatibility protects older applications reading newly produced data.
