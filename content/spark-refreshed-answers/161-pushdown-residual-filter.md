# Does predicate pushdown eliminate the need for a filter operator?

**No, not always.** Predicate pushdown allows Spark to send filter conditions to the underlying data source, but Spark may still retain a `Filter` operator to ensure that only matching rows are returned.

Whether the `Filter` operator can be eliminated depends on **whether the data source fully evaluates the predicate or only uses it to skip unnecessary data**.

## 1. Why might Spark still need a Filter operator?

Consider:

```python
from pyspark.sql.functions import col

df = spark.read.parquet("/data/employees")
filtered_df = df.filter(col("salary") > 50000)
filtered_df.explain("formatted")
```

A simplified physical execution plan might look like:

```text
Filter (salary > 50000)
    |
FileScan parquet
    PushedFilters:
      [IsNotNull(salary), GreaterThan(salary,50000)]
```

Here, the same predicate appears in two places:

- **PushedFilters:** Spark sends `salary > 50000` to the Parquet reader, which may use column statistics to skip irrelevant row groups.
- **Filter operator:** Spark evaluates the condition on the remaining rows to guarantee correctness.

### Example

Suppose a Parquet row group contains these salary values:

| Employee | Salary |
| --- | --- |
| A | 30,000 |
| B | 45,000 |
| C | 60,000 |
| D | 90,000 |

The row-group statistics are:

```text
Minimum salary = 30000
Maximum salary = 90000
```

For `salary > 50000`, when the reader uses row-group skipping without fully enforcing row-level filtering:

1. Parquet cannot skip the row group because its maximum salary exceeds 50,000.
2. Rows from the row group are read.
3. A filter must eliminate employees A and B.
4. Only employees C and D appear in the result.

Predicate pushdown can reduce I/O without guaranteeing that every row returned by the reader matches the predicate.

## 2. When can the Filter operator be eliminated?

The `Filter` operator may be removed when the data source guarantees complete predicate evaluation.

For example, consider a JDBC source, with `jdbc_url` and `connection_properties` already configured:

```python
jdbc_df = spark.read.jdbc(
    url=jdbc_url,
    table="employees",
    properties=connection_properties
)

jdbc_result = jdbc_df.filter(col("salary") > 50000)
```

Spark may push the filter into the source database, conceptually:

```sql
SELECT *
FROM employees
WHERE salary > 50000;
```

If the JDBC connector fully enforces the predicate, Spark may avoid evaluating the same filter again.

This behavior depends on the Spark version, connector implementation, and supported predicates.

## 3. Comparison

| Scenario | Predicate pushdown | Separate Filter operator |
| --- | --- | --- |
| Parquet using row-group statistics | Yes, for supported predicates | Usually retained |
| ORC using statistics | Yes, for supported predicates | Usually retained |
| JDBC with fully enforced filtering | Yes | May be eliminated |
| Unsupported predicate | No | Required |
| Partition pruning with partition-column filter | Partition filter applied | May be eliminated for that condition |

## 4. How to verify in Spark

Execute:

```python
# Parquet example
filtered_df.explain("formatted")

# JDBC example
jdbc_result.explain("formatted")
```

Inspect the physical plan for:

- `PushedFilters`: Predicates passed to the data source.
- `DataFilters`: Data-level predicates Spark retains at the scan.
- `PartitionFilters`: Conditions used to prune partitions.
- `Filter`: A separate Spark filtering operator.

**Important:** Seeing a condition in `PushedFilters` does not mean that Spark has removed the `Filter` operator. Plan labels vary by reader and connector.

## 5. Interview-ready answer

> No, predicate pushdown does not necessarily eliminate the Filter operator in Spark.
>
> Predicate pushdown sends filter conditions to the underlying data source to reduce unnecessary data reads.
>
> However, formats such as Parquet may only use predicates to skip row groups using minimum and maximum column statistics. Since the remaining row groups may contain nonmatching rows, Spark can retain a Filter operator to ensure correctness.
>
> On the other hand, if a data source such as a JDBC database fully evaluates the pushed predicate and guarantees that only matching rows are returned, Spark may eliminate the redundant Filter operator.
>
> We can verify this behavior using `explain("formatted")` by inspecting `PushedFilters` and the physical `Filter` operator.

**Key takeaway:** Predicate pushdown primarily reduces **data-source I/O and scan-level processing**. It can eliminate the need for a separate Filter operator only when the pushed predicate is fully enforced by the data source.
