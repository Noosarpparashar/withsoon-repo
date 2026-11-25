# What is the difference between predicate pushdown and partition pruning?

**Predicate pushdown** and **partition pruning** are two important Spark query optimizations that reduce the amount of data read from storage. However, they work at different levels.

- **Predicate pushdown:** Passes supported filters to the data source, which may reduce data read or returned.
- **Partition pruning:** Skips entire partitions (typically directories) based on filter conditions on partition columns.

## 1. Key differences

| Feature                    | Predicate Pushdown                                   | Partition Pruning                                  |
| -------------------------- | ---------------------------------------------------- | -------------------------------------------------- |
| Purpose                    | Avoid reading unnecessary rows                       | Avoid scanning unnecessary partitions              |
| Operates on                | Row-level filters and data-source metadata           | Partition columns and metadata                     |
| Filtering level            | Within files/data sources                            | Entire partitions                                  |
| Requires partitioned data? | No                                                   | Yes                                                |
| Common formats / sources             | Parquet, ORC, JDBC                                   | Parquet, ORC, CSV, JSON, etc., when partitioned    |
| Uses                       | Data-source filter capabilities, statistics, indexes | Partition column values                            |
| Example                    | `salary > 50000`                                     | `year = 2026`                                      |
| Main benefit               | Reduces unnecessary data scanning                    | Reduces the number of files or directories scanned |

## 2. Example

Suppose we have a sales dataset partitioned by `year` and `month`.

[spark-reference:sales-partition-pruning]

Each partition contains Parquet files with columns such as `customer_id`, `product_id`, `amount`, and `date`.

Consider the following query:

```sql
SELECT *
FROM sales
WHERE year = 2026
  AND month = 1
  AND amount > 10000;
```

### Step 1: Partition pruning

Spark first uses the partition filters:

```sql
year = 2026 AND month = 1
```

With the expected partition metadata and compatible filters, it can skip the other partitions and scan only:

```text
sales/year=2026/month=01/
```

**Benefit:** Spark avoids opening and scanning files from irrelevant partitions.

### Step 2: Predicate pushdown

Within the selected partition, Spark pushes the condition:

```sql
amount > 10000
```

to the Parquet reader.

Parquet may use row-group statistics (minimum and maximum values) to skip unnecessary row groups.

For example:

| Row group | Amount range    | Action     |
| --------- | --------------- | ---------- |
| 1         | ₹1,000–₹5,000   | Skip |
| 2         | ₹6,000–₹9,000   | Skip |
| 3         | ₹12,000–₹50,000 | Read |
| 4         | ₹2,000–₹8,000   | Skip |

**Benefit:** Spark can avoid reading irrelevant row groups within the selected Parquet files.

Note that predicate pushdown does not necessarily skip every nonmatching row physically. Its effectiveness depends on data-source capabilities and available statistics.

## 3. How both optimizations work together

[spark-reference:pruning-and-pushdown-flow]

## 4. How to verify in Spark

Use `explain()` to inspect the physical execution plan.

```python
df = spark.read.parquet("/data/sales")

filtered_df = df.filter(
    (df.year == 2026) &
    (df.month == 1) &
    (df.amount > 10000)
)

filtered_df.explain("formatted")
```

In the scan details, look for entries similar to:

```text
PartitionFilters:
  [year = 2026, month = 1]

PushedFilters:
  [IsNotNull(amount), GreaterThan(amount,10000)]

DataFilters:
  [isnotnull(amount), amount > 10000]
```

**Interpretation:**

- `PartitionFilters`: Spark uses these to prune partitions.
- `PushedFilters`: Filters passed to the underlying data source.
- `DataFilters`: Data-level conditions Spark retains for filtering; they are not proof that pushdown was ineffective.

A pushed filter appearing in the plan does not guarantee that the reader skipped bytes. Actual skipping depends on the source implementation and data layout.

## 5. Can one work without the other?

Yes.

**Case 1: Predicate pushdown without partition pruning**

```sql
SELECT *
FROM sales
WHERE amount > 10000;
```

If the files are Parquet but not partitioned by `amount`, predicate pushdown can still work using Parquet statistics.

**Case 2: Partition pruning without predicate pushdown**

```sql
SELECT *
FROM sales
WHERE year = 2026;
```

Spark can skip all other year partitions, even if the underlying files are CSV, which does not provide Parquet-style row-group predicate pushdown.

**Case 3: Both together**

```sql
SELECT *
FROM sales
WHERE year = 2026
AND amount > 10000;
```

Spark can prune partitions using `year` and push the `amount` filter into the Parquet reader.

## 6. Interview-ready answer

> Predicate pushdown and partition pruning are Spark optimizations that reduce unnecessary data reads.
>
> Partition pruning skips entire partitions based on partition-column filters, whereas predicate pushdown passes filter conditions to the data source so it can avoid reading irrelevant data within the selected files.
>
> For example, in a sales table partitioned by year, filtering `year = 2026` allows Spark to skip partitions from other years. Filtering `amount > 10000` can be pushed into a Parquet reader to skip row groups using column statistics.
>
> Both optimizations can work together: partition pruning reduces the files scanned, while predicate pushdown reduces the data read from those files.

**Key takeaway:** Partition pruning determines **which partitions to scan**, while predicate pushdown helps determine **which data within those partitions needs to be read**.