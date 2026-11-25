# How does predicate pushdown work with JDBC?

Predicate pushdown in JDBC allows Spark to send filter conditions directly to the source database (such as PostgreSQL, MySQL, Oracle, or SQL Server) instead of reading all records and filtering them in Spark.

Spark translates supported DataFrame filter expressions into SQL WHERE clauses that are executed by the database.

This optimization helps reduce:

- Network I/O: Fewer rows are transferred from the database to Spark.
- Memory usage: Executors process fewer records.
- CPU overhead: Less filtering is performed inside Spark.
- Execution time: Queries can be faster, especially if the source database uses indexes efficiently.

## 1. Example of JDBC predicate pushdown

Suppose a PostgreSQL table named employees contains 10 million rows.

```python
from pyspark.sql.functions import col

# Example connection settings: replace for your environment.
jdbc_url = "jdbc:postgresql://localhost:5432/company"
jdbc_user = "postgres"
jdbc_password = "password"

df = (
    spark.read
    .format("jdbc")
    .option("url", jdbc_url)
    .option("dbtable", "employees")
    .option("user", jdbc_user)
    .option("password", jdbc_password)
    .load()
)

result = df.filter(col("salary") > 50000)
```

### Without predicate pushdown

Spark would conceptually execute:

```sql
SELECT * FROM employees;
```

For a complete result scan without other reductions, it would fetch the source rows and filter them locally. Defining a DataFrame filter is lazy; an action triggers execution. Limited actions may stop after obtaining enough rows.

### With predicate pushdown

Spark can issue SQL equivalent to:

```sql
SELECT *
FROM employees
WHERE salary > 50000;
```

The database evaluates the filter and returns only matching records.

For example, if only 500,000 employees satisfy the condition, Spark needs to receive approximately 500,000 rows instead of 10 million.

**Important:** This does not mean Spark necessarily uses a database index. The source database's query optimizer decides whether to use an index or perform a table scan.

## 2. How predicate pushdown works internally

[spark-reference:jdbc-predicate-pushdown]

Internally, Spark identifies supported predicates, and the JDBC connector uses the corresponding database dialect to generate appropriate SQL.

## 3. How to enable or disable JDBC predicate pushdown

Predicate pushdown is enabled by default for Spark's JDBC data source.

Explicitly enable it:

```python
df = (
    spark.read
    .format("jdbc")
    .option("url", jdbc_url)
    .option("dbtable", "employees")
    .option("user", jdbc_user)
    .option("password", jdbc_password)
    .option("pushDownPredicate", "true")
    .load()
)
```

To disable it:

```python
no_pushdown_df = (
    spark.read
    .format("jdbc")
    .option("url", jdbc_url)
    .option("dbtable", "employees")
    .option("user", jdbc_user)
    .option("password", jdbc_password)
    .option("pushDownPredicate", "false")
    .load()
)
```

With pushdown disabled, Spark evaluates the DataFrame filters rather than passing them to the JDBC source.

## 4. Which filters can JDBC push down?

| Filter condition | Typical support |
| --- | --- |
| salary > 50000 | Supported |
| department = 'IT' | Supported |
| salary BETWEEN 30000 AND 80000 | Supported |
| department IN ('IT', 'HR') | Supported |
| salary IS NOT NULL | Supported |
| salary > 50000 AND department = 'IT' | Supported |
| Python or Scala UDF | Generally not supported |
| Complex Spark-specific expressions | Depends on the JDBC dialect |

Supported predicates vary by Spark version, JDBC connector, and underlying database.

## 5. Can predicate pushdown work with parallel JDBC reads?

Yes. Spark can combine predicate pushdown with JDBC partitioning to read filtered data in parallel.

```python
df = (
    spark.read
    .format("jdbc")
    .option("url", jdbc_url)
    .option("dbtable", "employees")
    .option("user", jdbc_user)
    .option("password", jdbc_password)
    .option("partitionColumn", "employee_id")
    .option("lowerBound", "1")
    .option("upperBound", "10000000")
    .option("numPartitions", "4")
    .option("pushDownPredicate", "true")
    .load()
)

result = df.filter(col("salary") > 50000)
```

Spark can generate multiple queries similar to:

```sql
-- JDBC partition 1 (illustrative)
SELECT *
FROM employees
WHERE (employee_id < 2500000 OR employee_id IS NULL)
  AND salary > 50000;
```

Other JDBC partitions receive different `employee_id` ranges. The first partition can include null keys, as illustrated above; actual boundaries and generated SQL vary by implementation.

Each query can apply the salary predicate inside the database, reducing the records returned to Spark.

**Important:** lowerBound and upperBound determine partition strides; they are not global row-filtering boundaries. Also, increasing numPartitions increases potential database concurrency, which can overload the source.

## 6. How to verify JDBC predicate pushdown

Use:

```python
result.explain("formatted")
```

For Spark's JDBC V1 implementation, the physical plan may contain:

```text
Scan JDBCRelation(employees)
  PushedFilters:
    [IsNotNull(salary),
     GreaterThan(salary,50000)]
  ReadSchema:
    struct<...>
```

The exact plan format depends on the Spark version and JDBC implementation.

To verify execution:
1. Check PushedFilters in the Spark execution plan.
2. Inspect the source database's query logs to confirm the generated SQL.
3. Use the database's EXPLAIN functionality to determine whether indexes or table scans are used.
4. Compare rows transferred, database execution time, and Spark execution time.

## 7. JDBC vs Parquet predicate pushdown

| Feature | JDBC pushdown | Parquet pushdown |
| --- | --- | --- |
| Filtering happens in | Source database | Parquet reader |
| Mechanism | SQL WHERE clause | Statistics-based skipping and reader filtering |
| Uses indexes | Possible | No traditional database indexes |
| Reduces network transfer | Often significantly | Depends on storage and execution |
| Can eliminate Spark Filter operator | Yes, when fully enforced | Spark often retains a filter |
| Requires a database | Yes | No |

Unlike Parquet, where statistics may only allow skipping complete row groups, a JDBC database can evaluate the full predicate and return exclusively matching rows.

## 8. Interview-ready answer

> Predicate pushdown in JDBC allows Apache Spark to push filter conditions directly into the source database instead of fetching all the records and filtering them locally.
>
> For example, when we read an employee table through JDBC and apply salary > 50000, Spark can generate a SQL query with WHERE salary > 50000, which is executed by the database.
>
> This reduces the number of records transferred over the network, executor memory consumption, and Spark processing overhead.
>
> JDBC predicate pushdown is enabled by default through pushDownPredicate=true. However, only supported predicates can be pushed down; UDFs and certain complex expressions may still need to be evaluated by Spark.
>
> Predicate pushdown can also work with partitioned JDBC reads, where Spark executes multiple queries with both partition-range conditions and pushed filters.
>
> We can verify this optimization by inspecting PushedFilters in the physical execution plan and checking the actual SQL executed in the source database.

**Key takeaway:** JDBC predicate pushdown moves filtering to the source database, reducing unnecessary data transfer and Spark processing. Its effectiveness depends on predicate support and how efficiently the database executes the generated SQL.
