# Does Spark automatically collect every statistic it needs?

**No. Apache Spark automatically obtains some basic statistics, but it does not automatically collect every statistic required for effective Cost-Based Optimization (CBO).**

Spark can derive certain statistics from data-source metadata and query plans. However, detailed statistics such as row counts, distinct value counts, null counts, and column histograms often need to be collected explicitly.

This is important because **CBO depends on accurate statistics to estimate intermediate result sizes and make better join-ordering decisions.**

## 1. Which statistics does Spark collect automatically?

| Statistic                  | Automatically available? | Explanation                                                                                            |
| -------------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------ |
| Table size in bytes        | Sometimes                | May be obtained from file metadata, catalog metadata, or maintained statistics                         |
| Row count                  | Not always               | Usually requires statistics collection for accurate estimates                                          |
| Distinct value count       | Generally no             | Requires column statistics collection                                                                  |
| Minimum and maximum values | Sometimes                | File formats may expose these through metadata, but CBO column statistics generally require collection |
| Null count                 | Generally no             | Requires column statistics collection                                                                  |
| Column histograms          | Generally no             | Must be explicitly collected when supported and enabled                                                |
| Runtime shuffle statistics | Yes, during execution    | AQE can collect actual statistics at runtime                                                           |

**Important distinction:** Spark being able to read Parquet or other file-format metadata does not mean all those statistics are automatically available to Catalyst's CBO.

## 2. Where does Spark get its statistics?

Spark uses three primary sources of statistics:

[spark-reference:spark-statistics-sources]

Spark can obtain statistics directly from a data source, retrieve previously collected statistics from a catalog such as Hive Metastore, and gather runtime statistics through AQE.

## 3. How do you collect missing statistics?

For supported catalog tables, Spark provides the `ANALYZE TABLE` command.

**Collect table size only:**

```sql
ANALYZE TABLE orders
COMPUTE STATISTICS NOSCAN;
```

`NOSCAN` collects size information without scanning all rows.

**Collect table size and row count:**

```sql
ANALYZE TABLE orders
COMPUTE STATISTICS;
```

**Collect column statistics:**

```sql
ANALYZE TABLE orders
COMPUTE STATISTICS
FOR COLUMNS customer_id, order_status;
```

Column statistics can improve CBO's ability to estimate join cardinality and filter selectivity.

To collect histograms when supported:

```python
spark.conf.set(
    "spark.sql.statistics.histogram.enabled",
    "true"
)
```

Then run column statistics collection for supported column types. Not every column type supports histograms. Histogram collection has additional computational cost and is disabled by default.

## 4. Can Spark automatically update table statistics?

Spark provides a configuration:

```python
spark.conf.set(
    "spark.sql.statistics.size.autoUpdate.enabled",
    "true"
)
```

This enables automatic updates of table-size statistics following supported data changes.

However, there are important limitations:

- It does not automatically collect all row-count and column statistics.
- Its behavior depends on the table and catalog implementation.
- Updating sizes for tables containing large numbers of files can introduce overhead.

This configuration is disabled by default.

## 5. What happens when statistics are missing?

Spark does not necessarily fail. Instead, it continues optimization using available metadata, estimates, default assumptions, and rule-based transformations.

For example, without accurate row counts or column statistics, Spark may be unable to determine the most efficient order for joining several tables.

AQE may subsequently improve some physical execution decisions using actual runtime statistics, but it cannot fully replace accurate catalog statistics.

## 6. How do you verify available statistics?

Inspect stored table statistics:

```sql
DESCRIBE EXTENDED orders;
```

Inspect column statistics:

```sql
DESCRIBE EXTENDED orders customer_id;
```

Inspect the optimizer's estimates:

```sql
EXPLAIN COST
SELECT *
FROM orders
WHERE order_status = 'COMPLETED';
```

In the plan, look for `sizeInBytes` and, when available, `rowCount`.

## Interview-ready answer

> No, Spark does not automatically collect every statistic required for Cost-Based Optimization.
>
> Spark can automatically obtain basic statistics such as file sizes from data-source metadata. However, detailed statistics like row counts, distinct value counts, null counts, and histograms often need to be collected explicitly using `ANALYZE TABLE`.
>
> For example, `ANALYZE TABLE orders COMPUTE STATISTICS` collects table-level statistics, while `ANALYZE TABLE orders COMPUTE STATISTICS FOR COLUMNS customer_id` collects column statistics.
>
> Spark also supports automatic table-size updates through `spark.sql.statistics.size.autoUpdate.enabled`, but this does not automatically maintain every statistic.
>
> Additionally, Adaptive Query Execution collects runtime statistics and can adjust certain execution decisions.
>
> **Spark can automatically obtain basic metadata and runtime statistics, but accurate CBO often requires explicitly collecting and maintaining table and column statistics.**
