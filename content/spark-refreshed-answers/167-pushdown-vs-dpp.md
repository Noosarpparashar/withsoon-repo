# What is the difference between predicate pushdown and dynamic partition pruning?

Predicate pushdown and Dynamic Partition Pruning (DPP) are two important Apache Spark optimizations that reduce unnecessary data scanning, but they operate at different levels.

- Predicate pushdown: Pushes filter conditions to the underlying data source, such as Parquet, ORC, or JDBC, so unnecessary data can be skipped or filtered before being returned to Spark.
- Dynamic Partition Pruning (DPP): Uses values derived from one side of a join to dynamically identify and skip irrelevant partitions of another table.

**The main difference:** Predicate pushdown optimizes filtering at the data-source level, whereas DPP optimizes partition selection using information obtained from a join.

## 1. Key differences

| Feature | Predicate pushdown | Dynamic partition pruning |
| --- | --- | --- |
| Primary purpose | Reduce unnecessary data reads | Skip unnecessary partitions |
| Filtering basis | Supported predicates | Join-derived partition values |
| Requires a join? | No | Typically yes |
| Requires partitioned data? | No | Yes, for conventional file-based DPP |
| Values determined | From filter expressions | From another relation during query execution |
| Optimization location | Data-source scan | Partition selection during scan planning/execution |
| Common sources | Parquet, ORC, JDBC | Partitioned Parquet/ORC tables |
| Spark configuration | Source-dependent | spark.sql.optimizer.dynamicPartitionPruning.enabled |
| Main benefit | Reduced I/O and processing | Fewer partitions and files scanned |

## 2. Example of predicate pushdown

Suppose a sales table contains 100 million records stored in Parquet.

```sql
SELECT *
FROM sales
WHERE amount > 10000;
```

Spark identifies the predicate:

```sql
amount > 10000
```

It can pass this condition to the Parquet reader.

Parquet may use row-group statistics such as minimum and maximum values:

| Row group | Amount range | Action |
| --- | --- | --- |
| 1 | 1,000–5,000 | Skip |
| 2 | 4,000–8,000 | Skip |
| 3 | 12,000–50,000 | Read |
| 4 | 2,000–7,000 | Skip |

Instead of reading every row group, Spark can avoid reading those that cannot satisfy the predicate when the reader can use the available statistics. Pushed filters alone do not prove physical bytes were skipped.

**Important:** Predicate pushdown does not require the table to be partitioned or joined with another table.

## 3. Example of Dynamic Partition Pruning

Suppose we have two tables.

Sales table: 100 million records partitioned by region_id.

[spark-reference:region-partition-selection]

Regions table:

| region_id | region_name |
| --- | --- |
| 1 | North |
| 2 | South |
| 3 | East |
| 4 | West |

Now execute:

```sql
SELECT s.*
FROM sales s
JOIN regions r
  ON s.region_id = r.region_id
WHERE r.region_name = 'South';
```

Notice that the query does not explicitly contain:

```sql
WHERE s.region_id = 2
```

### Without DPP

Spark may:
1. Read all four sales partitions.
2. Filter the regions table for South.
3. Join sales with the matching region.
4. Return the results.
This potentially scans unnecessary sales data.

### With DPP

Spark can:
1. Filter regions to identify rows where region_name = 'South'.
2. Obtain the matching region_id, which is 2.
3. Use that value to construct a runtime partition filter for sales.
4. Skip sales partitions for regions 1, 3, and 4.
5. Scan only region_id=2 and execute the join.

[spark-reference:join-derived-region-pruning]

DPP is not guaranteed for every join. Spark evaluates eligibility, including the join conditions, partitioning, and whether dynamic filtering is expected to be beneficial.

## 4. Static Partition Pruning vs Dynamic Partition Pruning

This distinction is particularly important for Spark interviews.

### Static Partition Pruning

```sql
SELECT *
FROM sales
WHERE region_id = 2;
```

Spark already knows the partition value (2) from the query and can prune partitions without evaluating another table.

### Dynamic Partition Pruning

```sql
SELECT s.*
FROM sales s
JOIN regions r
  ON s.region_id = r.region_id
WHERE r.region_name = 'South';
```

Spark derives the relevant region_id values from the filtered regions table and uses them to prune the sales partitions.

| Static Partition Pruning | Dynamic Partition Pruning |
| --- | --- |
| Filter values known during planning | Values derived from another relation |
| No join required | Typically requires a join |
| Uses direct partition filters | Uses runtime partition filters |
| Usually minimal additional overhead | May involve a subquery or broadcast reuse |

## 5. Can predicate pushdown and DPP work together?

Yes. Both optimizations can be applied to the same query.

Consider:

```sql
SELECT s.*
FROM sales s
JOIN regions r
  ON s.region_id = r.region_id
WHERE r.region_name = 'South'
  AND s.amount > 10000;
```

Spark may perform two optimizations:

**Dynamic Partition Pruning:** Determines the relevant region_id values from regions and skips unrelated sales partitions.

**Predicate Pushdown:** Pushes amount > 10000 into the Parquet reader, allowing it to skip irrelevant row groups within the selected partitions.

This can significantly reduce the total amount of data read.

## 6. How to verify both optimizations in Spark

Use:

```python
spark.sql("""
    SELECT s.*
    FROM sales s
    JOIN regions r
      ON s.region_id = r.region_id
    WHERE r.region_name = 'South'
      AND s.amount > 10000
""").explain("formatted")
```

A simplified scan plan might contain:

```text
FileScan parquet

PartitionFilters:
  [dynamicpruningexpression(
      region_id IN dynamicpruning#...
  )]

PushedFilters:
  [IsNotNull(amount),
   GreaterThan(amount,10000)]

DataFilters:
  [isnotnull(amount), amount > 10000]
```

Interpretation:

| Plan attribute | Meaning |
| --- | --- |
| PartitionFilters containing dynamicpruningexpression | Dynamic partition pruning |
| PushedFilters | Predicate pushdown into the source |
| DataFilters | Data-level filtering conditions |
| ReadSchema | Columns requested from the source |

DPP is controlled by:

```python
spark.conf.set(
    "spark.sql.optimizer.dynamicPartitionPruning.enabled",
    "true"
)
```

It is enabled by default in Spark 3.0 and later, although the optimizer applies it only when suitable conditions are met.

## 7. Interview-ready answer

> Predicate pushdown and Dynamic Partition Pruning are two Spark optimizations that reduce unnecessary data reads, but they work at different levels.
>
> Predicate pushdown sends filter conditions to the underlying data source. For example, amount > 10000 can be pushed into the Parquet reader to skip row groups using column statistics.
>
> Dynamic Partition Pruning is primarily a join optimization introduced in Spark 3.0. It uses values obtained from one side of a join to determine which partitions of the other table need to be scanned.
>
> For example, if a large sales table is partitioned by region_id and joined with a regions table filtered by region_name = 'South', Spark can dynamically identify the relevant region IDs and skip unrelated sales partitions.
>
> Both optimizations can work together. DPP reduces the number of partitions scanned, while predicate pushdown reduces the amount of data read within those partitions.
>
> We can verify these optimizations using explain("formatted") by checking dynamicpruningexpression under PartitionFilters and supported predicates under PushedFilters.

**Key takeaway:** Predicate pushdown reduces data read using source-level filters, whereas Dynamic Partition Pruning reduces partitions scanned using values derived from another table during a join.
