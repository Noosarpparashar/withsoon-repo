# How would you measure missing data in a production pipeline?

Define missingness per field, compute counts and rates together, measure them at meaningful pipeline stages, and compare them with versioned business thresholds and historical baselines. Persist the results with run/source context and enforce the required action before publishing.

Keep SQL NULL, floating-point NaN, blank strings, absent schema fields, failed conversions, and domain placeholders distinguishable. Completeness is not the same as full business validity, and a NULL profile cannot identify records that never arrived.

## 1. Metrics and definitions

| Metric | Meaning |
| --- | --- |
| Total records | COUNT(*) for the measured population |
| NULL count/rate | SQL NULL values and their share of input rows |
| NaN count | Floating-point NaN values, measured separately |
| Blank-string count | Empty/space-only strings under an explicit text rule |
| Missing-value count/rate | Rows satisfying the field's combined missingness predicate |
| Completeness percentage | 100 minus missing percentage for a non-empty population |
| Fully missing column | Non-empty input with every row missing under that field's rule |
| Critical-field violations | Rows violating mandatory-field rules; combine predicates without double-counting rows |
| Missing-data trend | Change over time relative to a comparable baseline |
| Missing values by source | Counts/rates segmented by source, date, partition, or other dimensions |
| Missing records | Reconciliation against source totals, expected keys, or another authoritative expectation |

For a non-empty population, missing rate = 100 × missing count / total records, and completeness = 100 − missing rate. With 2,000 missing values among 100,000 rows, these are 2% and 98%.

Use the union of applicable conditions for a field, not an unqualified sum of overlapping categories. A field can be non-missing but invalid, such as an out-of-range amount. Track conversion and validity failures separately. For empty input, rates/completeness are undefined rather than automatically 0% missing and 100% complete.

## 2. SQL example

| transaction_id | customer_id | amount DOUBLE |
| --- | --- | --- |
| T101 | C101 | 500 |
| T102 | NULL | 700 |
| T103 | C103 | NULL |
| T104 | "" | 0 |
| T105 | C105 | NaN |

Define the sample and view:

```python
from pyspark.sql import functions as F

df = spark.createDataFrame(
    [
        ("T101", "C101", 500.0),
        ("T102", None, 700.0),
        ("T103", "C103", None),
        ("T104", "", 0.0),
        ("T105", "C105", float("nan"))
    ],
    "transaction_id STRING, customer_id STRING, amount DOUBLE"
)
df.createOrReplaceTempView("transactions")
```

For this contract, NULL or an empty/ordinary-space-only customer ID is missing; NULL or NaN amount is missing:

```sql
SELECT
    COUNT(*) AS total_records,
    COUNT_IF(
        customer_id IS NULL OR TRIM(customer_id) = ''
    ) AS missing_customer_ids,
    COUNT_IF(
        amount IS NULL OR ISNAN(amount)
    ) AS missing_amounts
FROM transactions;
```

| total_records | missing_customer_ids | missing_amounts |
| --- | --- | --- |
| 5 | 2 | 2 |

Zero is not missing under this rule. It may still need another business validation, depending on the transaction type.

```sql
SELECT
    COUNT(*) AS total_records,
    ROUND(
        100.0 * COUNT_IF(
            customer_id IS NULL OR TRIM(customer_id) = ''
        ) / NULLIF(COUNT(*), 0),
        2
    ) AS customer_id_missing_pct,
    ROUND(
        100.0 * COUNT_IF(
            amount IS NULL OR ISNAN(amount)
        ) / NULLIF(COUNT(*), 0),
        2
    ) AS amount_missing_pct
FROM transactions;
```

| total_records | customer_id_missing_pct | amount_missing_pct |
| --- | --- | --- |
| 5 | 40.0 | 40.0 |

NULLIF protects against an empty denominator, including with ANSI enabled. ROUND here is for display. Preserve counts and use unrounded values for enforcement so a tiny violation is not rounded away.

## 3. Efficient PySpark implementation

Compute multiple metrics in one aggregation rather than launching a separate action for each field. This top-level-column helper counts NULLs, blanks for STRING fields, and NaN for FLOAT/DOUBLE fields separately. Only configured categories join the NULL predicate to define missingness.

```python
from pyspark.sql.types import StringType, FloatType, DoubleType

def calculate_missing_metrics(df, *, blank_columns=(), nan_columns=()):
    fields = df.schema.fields
    names = [field.name for field in fields]
    if len({name.casefold() for name in names}) != len(names):
        raise ValueError("Use unique, unambiguous column names")

    by_name = {field.name: field for field in fields}
    blank_columns = set(blank_columns)
    nan_columns = set(nan_columns)
    unknown = (blank_columns | nan_columns) - set(names)
    if unknown:
        raise ValueError(f"Configured columns absent from schema: {sorted(unknown)}")
    for name in blank_columns:
        if not isinstance(by_name[name].dataType, StringType):
            raise ValueError(f"Blank rule requires STRING: {name}")
    for name in nan_columns:
        if not isinstance(by_name[name].dataType, (FloatType, DoubleType)):
            raise ValueError(f"NaN rule requires FLOAT/DOUBLE: {name}")

    def count_matches(condition):
        return F.count(F.when(condition, F.lit(1)))

    expressions = [F.count("*").alias("total_records")]
    for i, field in enumerate(fields):
        # Quote literal top-level names, including dots or backticks.
        column = F.col("`" + field.name.replace("`", "``") + "`")
        null_condition = column.isNull()
        blank_condition = (
            F.coalesce(F.trim(column) == "", F.lit(False))
            if isinstance(field.dataType, StringType)
            else F.lit(False)
        )
        nan_condition = (
            F.isnan(column)
            if isinstance(field.dataType, (FloatType, DoubleType))
            else F.lit(False)
        )
        missing_condition = null_condition
        if field.name in blank_columns:
            missing_condition = missing_condition | blank_condition
        if field.name in nan_columns:
            missing_condition = missing_condition | nan_condition

        for category, condition in [
            ("null", null_condition), ("blank", blank_condition),
            ("nan", nan_condition), ("missing", missing_condition)
        ]:
            expressions.append(
                count_matches(condition).alias(f"c{i}_{category}")
            )

    row = df.agg(*expressions).first()
    total = row["total_records"]
    metrics = []
    for i, field in enumerate(fields):
        missing = row[f"c{i}_missing"]
        metrics.append({
            "column": field.name,
            "data_type": field.dataType.simpleString(),
            "total_records": total,
            "null_count": row[f"c{i}_null"],
            "blank_count": row[f"c{i}_blank"],
            "nan_count": row[f"c{i}_nan"],
            "missing_count": missing,
            "missing_percentage": 100.0 * missing / total if total else None,
            "completeness_percentage": (
                100.0 * (total - missing) / total if total else None
            ),
            "fully_missing": missing == total if total else None
        })
    return {"total_records": total, "columns": metrics}
```

Usage for the defined contract:

```python
profile = calculate_missing_metrics(
    df,
    blank_columns={"transaction_id", "customer_id"},
    nan_columns={"amount"}
)
metrics = profile["columns"]
for metric in metrics:
    print(metric)
```

Selected results:

| Column | NULL count | Blank count | NaN count | Missing count | Missing % | Completeness % |
| --- | --- | --- | --- | --- | --- | --- |
| transaction_id | 0 | 0 | 0 | 0 | 0 | 100 |
| customer_id | 1 | 1 | 0 | 2 | 40 | 60 |
| amount | 1 | 0 | 1 | 2 | 40 | 60 |

Blank/NaN counts are zero for types where those categories do not apply. The blank rule uses default trim, which covers ordinary spaces rather than every whitespace character. Nested children, empty collections, absent fields, sentinels, and conversion failures need explicit additional rules; a non-null struct does not prove all its children are present.

The helper performs one aggregate action and returns only summary data to the driver, not source rows. Spark may execute multiple stages/jobs internally, so one aggregate action is not a guarantee of exactly one physical job. Very wide schemas still add expression/planning/CPU overhead; prioritize relevant columns.

This per-column pattern is inefficient for large schemas:

```python
# Separate actions and potentially repeated scans:
for name in df.columns:
    df.filter(F.col(name).isNull()).count()
```

When possible, reuse pipeline computation. For batch workloads, Observation/observe can collect aggregate metrics during an existing action; its placement determines which rows flow through the measurement. An Observation instance reports its first action, not an indefinitely updating metric. A publication gate must run before consumers receive unvalidated output.

## 4. Measure at pipeline checkpoints

[spark-reference:missing-data-checkpoints]

| Stage | customer_id missing % |
| --- | --- |
| Raw ingestion | 1 |
| After cleaning | 1 |
| After transformation | 12 |
| Curated candidate | 12 |

The jump suggests inspecting the transformation stage: joins, failed lookups, schema changes, and null-producing conversions are possible causes. It does not prove the stage corrupted data. Filters, joins, and row multiplication can change the population and denominator, so compare both counts and rates for reconciled populations.

Segment by ingestion date, source system, producer, region, schema/rule version, or other meaningful dimensions. Compute an overall rate from summed counts and denominators across non-overlapping segments; do not average segment percentages without weighting them.

## 5. Business thresholds and publication gates

| Column | Illustrative maximum missing rate | Action |
| --- | --- | --- |
| transaction_id | 0% | Fail or quarantine |
| customer_id | 0.1% | Alert/reject according to severity |
| amount | 0% | Block critical validation |
| email | 5% | Warn under the example policy |
| middle_name | No fixed limit | Monitor trends |

These are examples, not universal limits. Version the rule, denominator, comparison boundary, owner, and severity. The code below applies a strict blocking policy to the three fields in the sample and compares counts without percentage rounding:

```python
from decimal import Decimal

thresholds = {
    "transaction_id": "0.0",
    "customer_id": "0.1",
    "amount": "0.0"
}
by_column = {metric["column"]: metric for metric in metrics}
absent = set(thresholds) - set(by_column)
if absent:
    raise ValueError(f"Required metric columns absent: {sorted(absent)}")
if profile["total_records"] == 0:
    raise ValueError("Empty input: enforce the separate record-count policy")

violations = []
for name, threshold in thresholds.items():
    metric = by_column[name]
    limit_pct = Decimal(threshold)
    if not Decimal("0") <= limit_pct <= Decimal("100"):
        raise ValueError(f"Invalid missing-rate threshold for {name}")
    if (
        Decimal(metric["missing_count"]) * Decimal("100")
        > limit_pct * Decimal(metric["total_records"])
    ):
        violations.append(name)

if violations:
    raise ValueError(f"Missing-data limits exceeded: {violations}")
```

The supplied sample fails for customer_id and amount. A maximum of 0.1% permits exactly 0.1%; use a different boundary if the contract requires strictly less. Retain all violation details rather than failing at the first field when diagnosing an incident.

Empty input, absent required columns, and missing values inside existing rows are separate failures. For noncritical fields, record warnings or quarantine rows instead of applying the same blocking policy to every rule. Preserve input = accepted + quarantined reconciliation when those branches partition the input.

## 6. Monitor historical trends

[spark-reference:missing-data-trend]

The chart is an illustrative daily customer-ID trend for a separate source contract, not live production data. A shift from roughly 0.4% to 5.2% warrants investigation even when the field is optional. Use both absolute limits and deviations from a comparable historical baseline; thresholds can differ by source and rule version.

Compare similar windows and account for traffic volume, late arrivals, source mix, and seasonality. A sudden rate change based on ten records has different evidence from the same change across ten million records.

## 7. Store and operate the metrics

Persist counts, denominators, rates, rule version, threshold, action, run/batch ID, stage, timestamp, and source/partition context. For the illustrative 0.1% customer-ID and 0% amount limits:

| run_id | table_name | column_name | total_rows | missing_count | missing_pct | status |
| --- | --- | --- | --- | --- | --- | --- |
| R001 | transactions | customer_id | 100000 | 50 | 0.05 | PASS |
| R001 | transactions | amount | 100000 | 0 | 0.00 | PASS |
| R002 | transactions | customer_id | 120000 | 9600 | 8.00 | FAIL |
| R002 | transactions | amount | 120000 | 120 | 0.10 | FAIL |

An AWS-oriented deployment could calculate metrics in Spark on EMR, store history in Iceberg or another metrics table, enforce gates through Airflow, monitor through CloudWatch/Splunk, and route incidents to the responsible team. Use the existing operational stack and recorded severity; these are architecture examples, not a requirement to adopt particular services.

For streaming, compute these batch-style metrics on the micro-batch DataFrame inside the appropriate processing callback, or use supported streaming observations. Do not call the helper's first() directly on an unbounded streaming DataFrame. Store batch IDs and make metric writes idempotent so retries do not create duplicate incidents/history. Event-time windows and late-data policies must be explicit.

## 8. Production challenges

| Challenge | Approach |
| --- | --- |
| Large datasets | Aggregate related metrics together and reuse computation where practical |
| Wide schemas | Prioritize critical fields; monitor planning/CPU costs |
| Empty inputs | Apply a separate expected-record-count rule |
| NULL versus blank text | Use field-specific missingness definitions |
| Join-introduced NULLs | Measure before/after and reconcile population changes |
| Conversion failures | Preserve raw input and measure failed conversions separately |
| Late-arriving records | Use appropriate windows and maturity expectations |
| Natural variation | Combine fixed thresholds with volume-aware baselines |
| Repeated scans | Reuse observed/persisted computation when justified |
| Sensitive data | Store aggregate metrics and controlled diagnostic samples only as needed |

Placeholders such as UNKNOWN, N/A, -, or 999999 require column-specific interpretation; they can be legitimate values in other fields. Treat a field absent from the schema separately from a NULL value in an existing column. Detect wholly absent records through reconciliation rather than a NULL count.

## 9. Interview-ready answer

> I first define missingness per column, distinguishing SQL NULL, floating-point NaN, blanks, absent fields, and business placeholders. I compute counts, rates, completeness, and critical-field violations using native aggregate expressions rather than separate actions for every field.
>
> I preserve category counts and denominators, handle empty input separately, and compare unrounded counts/rates against versioned thresholds. Completeness alone does not prove validity or detect records that never arrived.
>
> I measure at raw, transformed, and pre-publication stages, segment by source and time, and reconcile population changes before interpreting rate differences. I store metrics with run/batch IDs and rule versions and monitor both absolute violations and historical anomalies.
>
> Critical failures block publication or route records to quarantine; noncritical issues follow a documented warning policy. Streaming metrics are batch/window aware and idempotent under retries.

**Key takeaway:** Missing-data measurement needs explicit definitions, counts and denominators, efficient aggregation, comparable populations, and an enforced operational response.
