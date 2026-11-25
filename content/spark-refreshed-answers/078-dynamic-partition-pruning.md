# What is dynamic partition pruning?

Dynamic Partition Pruning (DPP) is a Spark SQL optimization that automatically skips unnecessary partitions of a large table during a join by using filter values obtained from the other table.

It was introduced in Apache Spark 3.0 and is enabled by default in standard Spark configurations.

The main objective is to reduce disk I/O, data scanning, and join processing time.
## 1. Why do we need Dynamic Partition Pruning?

Suppose we have two tables.

Sales (Fact Table — 1,000 GiB)

Partitioned by `country_id`:

```text
sales/
├── country_id=1/     200 GiB
├── country_id=2/     200 GiB
├── country_id=3/     200 GiB
├── country_id=4/     200 GiB
└── country_id=5/     200 GiB
```

Countries (Dimension Table)

| country_id | country_name |
| ---------- | ------------ |
| 1          | India        |
| 2          | USA          |
| 3          | UK           |
| 4          | Japan        |
| 5          | Germany      |

Now execute:

```sql
SELECT s.*
FROM sales s
JOIN countries c
    ON s.country_id = c.country_id
WHERE c.country_name = 'India';
```

Notice that the filter is on the countries table, not directly on the `sales.country_id` partition column.

Without DPP, Spark may scan all five sales partitions even though only sales from India are needed.

With DPP, Spark uses the filtered countries table to discover that `country_id = 1` and skips the other sales partitions.

## 2. How Dynamic Partition Pruning works

[spark-dynamic-pruning]

### Internal execution steps

1. Spark identifies a join between the sales and countries tables.
2. The countries table is filtered using `country_name = 'India'`.
3. Spark determines the relevant `country_id` values from the filtered dimension table.
4. Catalyst adds a dynamic pruning condition to the scan of the partitioned sales table.
5. At execution time, Spark uses those values to select the relevant partitions.
6. Only the selected sales partitions are scanned and processed by the join.

Spark can reuse an existing broadcast exchange to obtain the pruning keys, avoiding unnecessary duplicate work.
## 3. Static Partition Pruning vs Dynamic Partition Pruning

| Feature             | Static Partition Pruning                 | Dynamic Partition Pruning                         |
| ------------------- | ---------------------------------------- | ------------------------------------------------- |
| Partition values    | Known directly from query predicates     | Derived from another table during query execution |
| Common scenario     | Filtering directly on a partition column | Joining a partitioned table with a filtered table |
| Example             | `WHERE country_id = 1`                   | `WHERE country_name = 'India'`                    |
| Requires join       | No                                       | Typically yes                                     |
| Partition selection | Determined from direct filters           | Determined using runtime join-side values         |

Static example:

```sql
SELECT *
FROM sales
WHERE country_id = 1;
```

Spark directly knows which partition to scan.

Dynamic example:

```sql
SELECT s.*
FROM sales s
JOIN countries c
    ON s.country_id = c.country_id
WHERE c.country_name = 'India';
```

Spark can derive the relevant partition IDs from the countries table.

## 4. When does Spark apply DPP?

Several conditions influence whether DPP is applied.

| Condition           | Explanation                                                                                               |
| ------------------- | --------------------------------------------------------------------------------------------------------- |
| Partitioned table   | The table being pruned must expose a pruneable partition column or supported runtime-filtering capability |
| Equi-join key       | The join condition must support deriving relevant partition values                                        |
| Selective filter    | Filtering the other table should reduce the required partitions                                           |
| Supported join type | Spark must preserve the join's semantics                                                                  |
| Cost benefit        | Spark may skip the optimization if pruning costs more than it saves                                       |
| DPP enabled         | The optimization configuration must allow it                                                              |

DPP is particularly effective for star-schema joins between large partitioned fact tables and filtered dimension tables.

## 5. How to enable Dynamic Partition Pruning

In standard Apache Spark, DPP is enabled by default.

```python
spark.conf.set("spark.sql.optimizer.dynamicPartitionPruning.enabled", "true")
```

Check its current setting:

```python
spark.conf.get("spark.sql.optimizer.dynamicPartitionPruning.enabled")
```

## 6. How to verify DPP in the execution plan

```python
result = spark.sql("""
    SELECT s.*
    FROM sales s
    JOIN countries c
      ON s.country_id = c.country_id
    WHERE c.country_name = 'India'
""")
result.explain("formatted")
```

Look for a partition filter resembling:

```text
FileScan parquet sales
  PartitionFilters:
    isnotnull(country_id)
    dynamicpruningexpression(
        country_id IN dynamicpruning#...
    )
```

This indicates that Spark has added a dynamic pruning predicate.

The exact execution-plan syntax varies by Spark version and data source.

## 7. Limitations of Dynamic Partition Pruning

DPP is not always beneficial or applicable.

- If the fact table is not partitioned on a relevant key, ordinary partition pruning may not be possible.
- If the dimension-side filter selects nearly every partition, DPP offers little benefit.
- If the join condition or join type is unsupported, Spark may not apply DPP.
- If obtaining pruning keys is expensive, Spark may decide not to use the optimization.
- DPP does not automatically eliminate the join shuffle or replace the join algorithm.

## Interview-ready answer

> Dynamic Partition Pruning is a Spark SQL optimization that reduces unnecessary partition scans during joins.

> When a large fact table is partitioned by a join key and the dimension table has a selective filter, Spark can derive the relevant partition values from the filtered dimension table and use them to prune the fact table.

> For example, if a 1,000 GiB sales table is partitioned by country and we join it with a country dimension filtered to India, Spark can dynamically identify India's country ID and scan only the corresponding sales partition.

> DPP is enabled by default in Spark 3.0 and later, and it can significantly reduce disk I/O, data scanning, and processing time.

**Key takeaway:** Static partition pruning uses filter values already available in the query, whereas Dynamic Partition Pruning obtains partition-filter values from the other side of a join at execution time.