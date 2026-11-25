# What is the difference between temporary views and permanent tables?

In Spark SQL, **temporary views are session-scoped logical representations of DataFrames**, whereas **permanent tables are persistent catalog objects whose definitions survive Spark session termination**.

The main differences are their **lifecycle, metadata storage, data storage, and accessibility**.

## 1. Temporary Views

A temporary view allows you to execute SQL queries against a DataFrame without creating a permanent table.

```python
df = spark.read.parquet("s3://bucket/orders/")
df.createOrReplaceTempView("orders")

spark.sql("""
    SELECT * FROM orders
    WHERE amount > 1000
""").show()
```

**Key characteristics:**

- **Session-scoped:** Available only within the SparkSession that created it.
- **No permanent metadata:** Its definition is not registered as a persistent table in the external metastore.
- **No data duplication:** Creating a temporary view does not copy or materialize the underlying data.
- **Lazy execution:** SQL queries against the view are executed when an action is triggered.
- **Automatically removed:** The view disappears when the SparkSession ends.

## 2. Permanent Tables

Permanent tables are registered in a persistent catalog, such as a Hive-backed Spark session catalog or another supported persistent catalog. Table data alone does not ensure that metadata survives an application restart; an in-memory catalog does not provide that durability.

```python
df = spark.read.parquet("s3://bucket/orders/")

# Requires a catalog with persistent metadata for cross-application reuse.
spark.sql("CREATE DATABASE IF NOT EXISTS sales_db")

(
    df.write
    .mode("overwrite")
    .saveAsTable("sales_db.orders")
)
```

Query the table:

```python
spark.sql("""
    SELECT * FROM sales_db.orders
""").show()
```

**Key characteristics:**

- **Persistent metadata:** Table definitions survive Spark application and session termination.
- **Reusable:** Other sessions or applications can access the table if they share the catalog and have the necessary permissions.
- **Data storage:** Tables reference persistent data stored in systems such as HDFS or S3.
- **Managed or external:** Spark supports tables whose data lifecycle is managed by the catalog and tables that reference externally managed data.
- **Schema management:** The catalog maintains table schemas, locations, and other metadata.

## 3. Temporary Views vs Permanent Tables

| Feature                      | Temporary View              | Permanent Table               |
| ---------------------------- | --------------------------- | ----------------------------- |
| Lifetime                     | SparkSession                | Persists beyond session       |
| Metadata                     | Session catalog, in-memory  | Persistent catalog            |
| Stores data itself           | No                          | References persistent data    |
| Data copied on creation      | No                          | Depends on creation method    |
| Accessible across sessions   | No                          | Yes, with shared catalog      |
| Survives application restart | No                          | Yes                           |
| Database qualification       | Not for local temp views    | Yes                           |
| Primary use case             | Intermediate SQL processing | Persistent, reusable datasets |

## 4. What about Global Temporary Views?

Spark also supports **global temporary views**, which are accessible across multiple SparkSessions within the same Spark application.

```python
df.createOrReplaceGlobalTempView("orders")

spark.sql("""
    SELECT * FROM global_temp.orders
""").show()
```

| View Type             | Scope                                 | Lifetime                 |
| --------------------- | ------------------------------------- | ------------------------ |
| Local temporary view  | Single SparkSession                   | Until session ends       |
| Global temporary view | All sessions in one Spark application | Until application ends   |
| Permanent table       | Shared catalog                        | Until explicitly dropped |

Global temporary views do not survive Spark application termination.

## 5. Important Interview Follow-up Questions

**Q1. Does creating a temporary view store data in memory?**

No. Creating a temporary view only registers a logical query definition. The underlying DataFrame is not automatically cached or materialized.

**Q2. Does creating a permanent table always copy the data?**

No. It depends on the operation.

- `saveAsTable()` writes data to a table.
- `CREATE TABLE ... USING PARQUET LOCATION 's3://...'` can register existing data without copying it.

**Q3. Is a temporary view faster than a permanent table?**

Not inherently. Both use Spark's Catalyst optimizer and execution engine. Performance depends on the physical execution plan, data layout, partitioning, statistics, caching, and storage format.

**Q4. What happens when a session or application ends?**

- Local temporary views belong to their creating SparkSession; another session does not inherit them.
- Global temporary views remain available across sessions while the shared Spark application is running.
- In classic Spark, calling `spark.stop()` stops the underlying SparkContext, ending the shared application; it does not leave global views usable by other sessions sharing that context.
- Permanent table metadata remains when backed by a persistent catalog.

## Interview-ready answer

Temporary views in Spark SQL are logical representations of DataFrames that exist only within a SparkSession. They do not store data independently or persist their definitions in an external metastore, making them useful for intermediate transformations and SQL queries.

Permanent tables, on the other hand, are registered in a persistent catalog such as Hive Metastore or another supported catalog. Their metadata survives Spark session termination, and they can be accessed by multiple applications using the same catalog.

Spark also supports global temporary views, which are shared across SparkSessions within the same Spark application but disappear when the application terminates.

**The key difference is that temporary views are session-scoped and non-persistent, whereas permanent tables have persistent metadata and are designed for reusable datasets.**