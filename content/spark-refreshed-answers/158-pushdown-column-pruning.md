# What are predicate pushdown and column pruning?

**Predicate pushdown** and **column pruning** are two important query optimization techniques used by Apache Spark to reduce the amount of data read and processed.

Both are primarily handled by Spark SQL's **Catalyst Optimizer**, with support from the underlying data source.

- **Predicate pushdown:** Pass supported row-filter conditions to the source, potentially reducing data read or returned.
- **Column pruning:** Read only the columns required by the query.

These optimizations reduce disk I/O, memory consumption, network transfer, and query execution time.

## 1. What is Predicate Pushdown?

Predicate pushdown is an optimization technique in which Spark pushes filtering conditions closer to the data source instead of reading all the data and filtering it afterward.

### Example

Suppose a Parquet dataset contains 100 million employee records.

```python
df = spark.read.parquet("s3://bucket/employees/")

result = (
    df.filter(df.department == "IT")
      .select("employee_id", "salary")
)

result.show()
```

**Without predicate pushdown:**

1. For a full scan without source-level skipping, Spark may read all 100 million records.
2. Spark filters records where `department = 'IT'`.
3. Spark selects `employee_id` and `salary`.

Actions such as `show()` may stop after obtaining enough output rows; the full-scan comparison illustrates the optimization rather than measuring this example.

**With predicate pushdown:**

1. Spark passes the filter `department = 'IT'` to the Parquet reader.
2. The reader uses available metadata, such as row-group statistics, to skip irrelevant data.
3. Spark reads relevant data and applies any necessary filtering to produce the correct result.

[spark-reference:predicate-pushdown-comparison]

### How does predicate pushdown work internally?

1. Catalyst analyzes the query's filter conditions.
2. It identifies predicates supported by the data source.
3. Spark passes eligible predicates to the source reader.
4. The reader may use partition information, statistics, indexes, or its own filtering capabilities to reduce data reads.
5. Spark evaluates any remaining conditions that were not fully handled by the source.

For example, Parquet may use row-group minimum and maximum statistics to eliminate row groups that cannot contain matching records.

### When does predicate pushdown work?

It depends on the data source and the filter expression.

| Data source | Predicate pushdown support                                                  |
| ----------- | --------------------------------------------------------------------------- |
| Parquet     | Yes, including row-group skipping                                           |
| ORC         | Yes, using statistics and supported filters                                 |
| JDBC        | Yes, supported filters can become SQL `WHERE` clauses                       |
| CSV         | Limited; cannot generally skip arbitrary file bytes using column statistics |
| JSON        | Limited; often still requires scanning records                              |

Not every filter can be pushed down. Complex UDFs, unsupported expressions, and some function transformations can prevent pushdown.

## 2. What is Column Pruning?

Column pruning is an optimization technique in which Spark eliminates unnecessary columns from the query execution plan and requests only the required columns from the data source.

### Example

Suppose an employee dataset has 50 columns.

```python
df = spark.read.parquet("s3://bucket/employees/")
result = df.select("employee_id", "salary")
result.show()
```

**Without column pruning:** Spark reads all 50 columns, even though only two are required.

**With column pruning:** Spark requests only `employee_id` and `salary` from the Parquet reader.

[spark-reference:column-pruning-fifty]

With a columnar source such as Parquet, Spark can avoid reading the 48 unneeded columns.

### How does column pruning work internally?

1. Catalyst identifies the columns referenced in projections, filters, joins, aggregations, and other expressions.
2. It removes unnecessary attributes from the optimized logical plan.
3. Spark requests the required columns from the reader, if supported.
4. For columnar formats such as Parquet or ORC, unnecessary column data can be skipped.

**Important:** Column pruning is particularly effective for columnar storage formats. Row-oriented formats such as CSV may still require reading complete input lines to extract selected fields.

## 3. Predicate Pushdown vs. Column Pruning

| Feature            | Predicate pushdown            | Column pruning                   |
| ------------------ | ----------------------------- | -------------------------------- |
| Main purpose       | Reduce rows read or processed | Reduce columns read or processed |
| Operates on        | Row-filter conditions         | Required columns                 |
| Typical SQL clause | `WHERE`                       | `SELECT`                         |
| Optimizer          | Catalyst + data source        | Catalyst + data source           |
| Primary benefit    | Less row scanning             | Less column I/O                  |
| Example            | `WHERE salary > 50000`        | `SELECT id, salary`              |

## 4. How do both optimizations work together?

Consider:

```python
df = spark.read.parquet("s3://bucket/employees/")

result = (
    df.filter(df.department == "IT")
      .select("employee_id", "salary")
)
```

Spark can apply both optimizations:

- **Predicate pushdown:** Push `department = 'IT'` to the Parquet reader to potentially skip irrelevant row groups.
- **Column pruning:** Read only `department`, `employee_id`, and `salary` from Parquet, instead of all 50 columns.

Although the final output contains only two columns, Spark may need the `department` column to evaluate the filter.

## 5. How do you verify these optimizations in Spark?

Use:

```python
result.explain("formatted")
```

You might see a physical plan containing:

```text
FileScan parquet
ReadSchema: struct<
  employee_id: bigint,
  salary: double,
  department: string
>
PushedFilters: [IsNotNull(department), EqualTo(department,IT)]
```

Interpretation:

- `PushedFilters` indicates which predicates Spark passed to the data source.
- `ReadSchema` indicates which columns Spark requests from the file reader.
- `PartitionFilters`, when present, indicates filters used for partition pruning.
- `DataFilters` indicates scan-level filter conditions.

The exact plan varies by Spark version, source implementation, and configuration.

**Important interview distinction:** `PushedFilters` appearing in the execution plan does not guarantee that all nonmatching rows were skipped at the storage level. For Parquet, actual skipping depends on row-group statistics and data distribution.

## 6. Predicate Pushdown vs. Partition Pruning

These optimizations are related but distinct.

Suppose the dataset is partitioned by date:

```text
sales/
  date=2026-11-12/
  date=2026-11-13/
  date=2026-11-14/
```

Query:

```python
df.filter("date = '2026-11-14'")
```

**Partition pruning:** Spark can avoid scanning the directories belonging to the other dates.

**Predicate pushdown:** Within selected files, the reader may use supported filtering mechanisms to skip irrelevant data.

Partition pruning eliminates entire partitions, while predicate pushdown can eliminate unnecessary data within files or push filtering to external systems.

## 7. Best practices

- Prefer Parquet or ORC for analytical workloads because they support efficient column reads and statistics-based filtering.
- Apply selective filters early where practical, although Catalyst can often push filters through suitable operators automatically.
- Select only the required columns instead of using `SELECT *`.
- Avoid wrapping filter columns in unsupported UDFs when a built-in expression can be used.
- Maintain suitable partitioning, file sizes, and clustering for efficient data skipping.
- Inspect `explain("formatted")` to verify whether Spark pushed filters and pruned columns.

## Interview-ready answer

Predicate pushdown and column pruning are Spark SQL optimizations that minimize unnecessary data scanning.

**Predicate pushdown** pushes supported filter conditions down to the data source so the reader can avoid scanning irrelevant data. For example, with Parquet, Spark can push a department filter and use Parquet statistics to skip row groups that cannot contain matching records.

**Column pruning** eliminates unnecessary columns from the query plan and ensures that Spark reads only the required columns where the source supports it. For example, if a Parquet table has 100 columns but a query needs only five, Spark can read those five columns rather than all 100.

Both optimizations are handled through Catalyst and source-specific scan capabilities. They reduce disk I/O, CPU usage, memory consumption, and overall execution time. We can verify them in the physical execution plan using `df.explain("formatted")`, particularly through `PushedFilters` and `ReadSchema`.