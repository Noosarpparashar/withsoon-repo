# What is the biggest risk in schema evolution?

The biggest risk is breaking downstream data pipelines or, more dangerously, silently producing incorrect data without detecting it.

Changes can affect Spark jobs, SQL queries, streaming applications, quality checks, and reporting systems. An incompatible schema may fail visibly; a compatible-looking change can let the pipeline finish while altering the meaning or completeness of its results.

## 1. Major risks in schema evolution

| Risk | Example | Impact |
| --- | --- | --- |
| Silent incorrect results | An unexpectedly missing critical field becomes NULL | Wrong analytics without an obvious execution failure |
| Broken consumers | customer_id renamed to client_id | Existing queries and Spark jobs fail |
| Type incompatibility | salary changes from DOUBLE to STRING | Read failures or invalid conversions |
| Information loss | A removed or unknown field is ignored | Important business information disappears from derived output |
| Incorrect aggregation | Missing amount values become NULL | Revenue totals become incomplete |
| Streaming failure | Source schema changes unexpectedly | Query stops or ignores new fields |
| Checkpoint incompatibility | Stateful aggregation schema changes | Existing state cannot be recovered by an ordinary restart |
| Performance degradation | Extra nested fields are read or file schemas are repeatedly merged | Additional processing or planning cost |

A missing optional value is not inherently corrupt. The risk is accepting a change that violates the intended data contract. Even an unchanged physical schema can hide a semantic change, such as an amount switching from currency units to cents.

## 2. Why are silent incorrect results especially dangerous?

Suppose a sales dataset originally contains:

```text
order_id: LONG
customer_id: LONG
amount: DOUBLE
```

The source renames amount to total_amount:

```text
order_id: LONG
customer_id: LONG
total_amount: DOUBLE
```

If the pipeline keeps amount in its read schema or inserts a NULL fallback without mapping the new name, it may expose:

| order_id | Actual total_amount | Pipeline amount |
| --- | --- | --- |
| 101 | 5,000 | NULL |
| 102 | 8,000 | NULL |
| 103 | 12,000 | NULL |

Now consider:

```sql
SELECT SUM(amount)
FROM sales;
```

SUM ignores NULL inputs and returns NULL when all inputs are NULL. If only some rows lose amount, the total includes the remaining values and can understate revenue.

[spark-reference:schema-risk-silent-total]

The job can complete successfully while reporting an incorrect result. Those results may reach dashboards and downstream applications before the problem is noticed.

This example assumes amount still exists in the DataFrame schema. If it is absent entirely, a reference to amount instead raises an unresolved-column error. Spark does not automatically infer that amount and total_amount are the same field.

## 3. How can schema evolution break streaming jobs?

Suppose Kafka events originally use:

```text
transaction_id: STRING
amount: DOUBLE
```

The producer changes amount to STRING. Depending on the format, decoder, configuration, and target table:

1. Decoding may reject the changed representation.
2. Invalid conversions may yield NULL or raise an error.
3. Aggregations may produce incomplete or incorrect values.
4. The query may stop processing new events.
5. A subsequent change to stateful keys or aggregate types may prevent recovery from the existing checkpoint.

A source type change does not automatically change stored aggregation state. Check source decoding, sink compatibility, and checkpointed state separately. A numeric string may be convertible; not every type change necessarily fails.

## 4. How should these risks be prevented?

| Safeguard | Purpose |
| --- | --- |
| Schema Registry / data contracts | Govern compatible source changes |
| Schema validation | Compare observed input with the expected contract |
| Schema versioning | Track changes across producers and deployments |
| Data quality checks | Detect unexpected nulls, invalid values, and missing fields |
| Explicit transformations | Map known renames and validate conversions |
| Quarantine / dead-letter storage | Preserve incompatible records and error reasons |
| Downstream impact analysis | Identify affected jobs, reports, and interfaces |
| Monitoring and alerts | Detect drift and abnormal output metrics |
| Controlled evolution | Apply reviewed structural changes intentionally |

For example, validate critical transaction fields before writing. This illustrative rule assumes transaction_id and a typed DOUBLE amount already exist, and amounts must be finite and nonnegative:

```python
from pyspark.sql import functions as F

invalid_condition = (
    F.col("transaction_id").isNull()
    | F.col("amount").isNull()
    | F.isnan("amount")
    | (F.abs(F.col("amount")) == F.lit(float("inf")))
    | (F.col("amount") < 0)
)

invalid_df = df.filter(invalid_condition)
valid_df = df.filter(~invalid_condition)
```

Reject or quarantine invalid records according to the business contract. NULL checks alone do not reject NaN or infinity, and some businesses allow negative values for refunds. Adjust the rules accordingly; use an appropriate DECIMAL representation when exact monetary precision is required.

Validate source columns and conversions before applying these checks. They do not recover a missing column, restore an ignored source value, or detect every business inconsistency.

Also reconcile aggregate-level metrics: total amount, record counts, duplicate rates, null rates, and differences from trusted source totals. Schema compatibility alone cannot prove that outputs are complete or semantically correct.

## 5. Interview-ready answer

> The biggest risk in schema evolution is breaking consumers or silently introducing incorrect results.
>
> If amount is renamed to total_amount but a reader keeps the old field as NULL, revenue aggregation can become incomplete even while the job succeeds. Other risks include incompatible types, information loss, streaming failures, and checkpoint-state incompatibility.
>
> I mitigate these with versioned data contracts, compatibility checks, explicit mappings, quality validations, and downstream impact analysis. I allow supported compatible changes through controlled evolution and quarantine unexpected or incompatible records.
>
> Before publishing output, I monitor drift and reconcile business metrics. A successful job and a compatible schema do not by themselves establish that the data is correct.

**Key takeaway:** The most dangerous outcome is a pipeline that succeeds technically while silently violating its data contract. Validate meaning and completeness alongside schema compatibility.
