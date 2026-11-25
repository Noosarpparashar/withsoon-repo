# Does predicate pushdown work with every file format?

**No. Predicate pushdown does not work equally with every file format in Apache Spark.** Its effectiveness depends on the file format, the data source implementation, and the filtering condition.

Predicate pushdown works particularly well with **Parquet and ORC** because these formats maintain metadata and statistics that allow readers to skip irrelevant data without scanning every record when the layout and statistics permit it.

For text-based formats such as CSV and JSON, predicate pushdown provides more limited benefits because these formats generally lack the metadata needed to skip irrelevant sections of a file.

## 1. Predicate pushdown support by file format

| File format | Support | Explanation |
| --- | --- | --- |
| **Parquet** | Supported, with statistics-based skipping | Uses row-group statistics, including minimum and maximum values, to skip irrelevant data where possible |
| **ORC** | Supported, with statistics-based skipping | Uses stripe statistics and row-group indexes to skip unnecessary data where possible |
| **CSV** | Limited physical skipping | Supports eligible reader-level filtering, but generally must read and parse records |
| **JSON** | Limited physical skipping | Supports eligible reader-level filtering, but generally must scan records because it lacks column statistics |
| **Avro** | Limited physical skipping | Spark supports filter pushdown, but standard Avro files generally lack Parquet-style statistics-based data skipping |
| **Text** | Very limited | No built-in column-level statistics for efficient row skipping |

**Important:** Supporting filter pushdown is not the same as supporting physical data skipping. A file reader might evaluate filters internally while still reading the input bytes.

## 2. Does predicate pushdown work with CSV and JSON?

Yes. Spark supports filter pushdown for CSV and JSON, and both settings are enabled by default in modern Spark versions.

However, unlike Parquet and ORC, CSV and JSON generally cannot use row-group statistics to skip large sections of a file.

For example:

```python
df = spark.read.csv(
    "employees.csv",
    header=True,
    inferSchema=True
)

result = df.filter("salary > 50000")
result.explain("formatted")
```

Spark may push the salary filter into the CSV reader. This can reduce the amount of data passed to subsequent operators, but the reader generally still needs to scan the input records.

## 3. Which configurations control predicate pushdown?

Spark provides the following configurations:

```python
# Parquet
spark.conf.set("spark.sql.parquet.filterPushdown", "true")

# ORC
spark.conf.set("spark.sql.orc.filterPushdown", "true")

# CSV
spark.conf.set("spark.sql.csv.filterPushdown.enabled", "true")

# JSON
spark.conf.set("spark.sql.json.filterPushdown.enabled", "true")
```

These settings are enabled by default in current upstream Spark versions. They illustrate the relevant controls rather than changes required for every application.

Even with these enabled, not every predicate is supported. Spark may need to evaluate unsupported filters after reading the data.

## 4. How can you verify predicate pushdown?

```python
df = spark.read.parquet("s3://bucket/employees/")
result = df.filter("salary > 50000")
result.explain("formatted")
```

Look for something similar to:

```text
FileScan parquet
PushedFilters: [
  IsNotNull(salary),
  GreaterThan(salary,50000)
]
```

This confirms that Spark passed the filter to the Parquet reader. It does not prove that physical data skipping occurred. Use scan metrics and knowledge of the file layout to assess actual I/O savings.

## Interview-ready answer

> No, predicate pushdown does not work equally with every file format.
>
> Parquet and ORC offer efficient predicate pushdown because they maintain statistics that allow readers to skip irrelevant row groups or stripes when possible.
>
> CSV and JSON also support predicate pushdown in Spark, but their benefits are limited because they generally lack metadata for skipping large portions of a file. They still need to scan and parse input records.
>
> The effectiveness of predicate pushdown depends on the file format, the reader implementation, and whether the filtering expression is supported.

**The key distinction is that predicate pushdown means moving filtering closer to the data source, while data skipping means actually avoiding physical reads. They are related but not identical.**
