# What is Spark SQL?

**Spark SQL is a module in Apache Spark used to process structured and semi-structured data using SQL queries, DataFrames, and Datasets.**

It allows you to perform SQL operations on large datasets in a distributed environment without manually managing parallel processing.

Spark SQL supports data sources such as Parquet, JSON, CSV, ORC, Apache Hive tables, and JDBC databases.

## 1. How does Spark SQL work?

[spark-reference:spark-sql-execution]

## 2. Example of Spark SQL

Suppose you have a Parquet dataset containing employee information.

**Using the DataFrame API:**

```python
df = spark.read.parquet("s3://bucket/employees/")

result = (
    df.filter(df.salary > 50000)
      .groupBy("department")
      .count()
)

result.show()
```

**Using SQL:**

```python
df.createOrReplaceTempView("employees")

result = spark.sql("""
    SELECT department, COUNT(*) AS total
    FROM employees
    WHERE salary > 50000
    GROUP BY department
""")

result.show()
```

Both approaches can produce equivalent optimized physical execution plans. The examples give the count column different names (`count` versus `total`), while expressing the same aggregation.

## 3. Key features of Spark SQL

| Feature | Description |
| --- | --- |
| SQL support | Execute SQL queries on distributed datasets |
| DataFrame API | Process structured data using Python, Scala, Java, or R |
| Catalyst Optimizer | Automatically optimizes query execution plans |
| Tungsten | Improves execution efficiency through memory and CPU optimizations |
| Hive integration | Supports querying Hive tables and using Hive metastore metadata when configured |
| Multiple data sources | Supports Parquet, ORC, JSON, CSV, JDBC, etc. |
| Distributed processing | Executes queries in parallel across Spark executors |
| Adaptive Query Execution (AQE) | Can dynamically optimize query plans using runtime statistics |

Typed Dataset APIs are available in Scala and Java. PySpark uses DataFrames rather than a typed Dataset API.

## 4. Spark SQL vs. traditional SQL databases

| Spark SQL | Traditional RDBMS |
| --- | --- |
| Distributed computation across a cluster | Often centralized, although distributed databases exist |
| Designed for large-scale analytical processing | Commonly optimized for transactional or analytical workloads |
| Processes data in S3, HDFS, data lakes, etc. | Typically operates on database-managed tables |
| Uses Catalyst for query optimization | Uses a database-specific query optimizer |
| Generally optimized for batch and analytical workloads | Often supports low-latency transactional queries |

These are broad workload tendencies; capabilities vary across database systems.

## 5. Is Spark SQL different from DataFrames?

Spark SQL and DataFrames are not separate execution engines.

- **Spark SQL** is the overall structured-data processing module.
- **DataFrame** is a programming abstraction provided by Spark SQL.
- **SQL queries** are another interface for expressing the same operations.
- Both use Catalyst optimization and Spark's execution engine.

## Interview-ready answer

> Spark SQL is Apache Spark's structured-data processing module. It allows developers to process large datasets using SQL queries, DataFrames, and Datasets. Internally, Spark SQL uses the Catalyst Optimizer to generate efficient execution plans and Tungsten execution optimizations to improve CPU and memory efficiency. It supports multiple data sources and distributes query execution across Spark executors.
