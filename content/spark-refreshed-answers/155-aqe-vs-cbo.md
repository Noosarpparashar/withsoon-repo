# Does Adaptive Query Execution replace cost-based optimization?

**No. Adaptive Query Execution (AQE) does not replace Cost-Based Optimization (CBO). Both are complementary optimization mechanisms that work at different stages of Spark SQL query processing.**

The key difference is:

- **Cost-Based Optimization (CBO):** Uses available table and column statistics to optimize the query plan before execution, particularly join ordering.
- **Adaptive Query Execution (AQE):** Uses actual runtime statistics to dynamically optimize parts of the physical execution plan while the query is running.

In simple terms:

**CBO makes decisions based on estimated data characteristics, whereas AQE adjusts execution decisions based on observed data characteristics.**

## 1. Key differences between CBO and AQE

| Feature                  | CBO                                                | AQE                                               |
| ------------------------ | -------------------------------------------------- | ------------------------------------------------- |
| Optimization stage       | Before execution                                   | During execution                                  |
| Statistics used          | Catalog and estimated statistics                   | Actual runtime statistics                         |
| Primary purpose          | Choose efficient logical plans                     | Adapt physical execution plans                    |
| Join ordering            | Can reorder joins using estimated costs            | Does not generally reorder logical joins          |
| Join strategy            | Statistics can influence initial physical planning | Can dynamically change certain join strategies    |
| Shuffle partitions       | Does not dynamically resize partitions             | Can coalesce shuffle partitions                   |
| Data skew                | Estimates may influence planning                   | Can detect and optimize skewed shuffle partitions |
| Handles stale statistics | Limited by their accuracy                          | Can compensate for some inaccurate estimates      |
| Enabled by default       | Generally no                                       | Yes, in modern Spark versions                     |

## 2. Example: How CBO and AQE work together

Suppose Spark executes a join between two tables:

| Table     | Estimated size | Actual size after filtering |
| --------- | -------------- | --------------------------- |
| Orders    | 500 GB         | 200 GB                      |
| Customers | 2 GB           | 5 MB                        |

### Step 1: CBO and initial query planning

Before execution, Spark sees that the Customers table is estimated to be 2 GB.

Because it appears too large for broadcasting under the default threshold, Spark's initial physical planner might select a sort-merge join.

[spark-reference:aqe-cbo-initial]

CBO helps with statistics-based logical planning, while the physical planner selects the join algorithm.

### Step 2: AQE during execution

During execution, Spark materializes intermediate shuffle results and discovers that Customers contains only 5 MB after filtering.

Since 5 MB is below the applicable adaptive broadcast threshold, AQE may convert the join into a broadcast hash join.

[spark-reference:aqe-cbo-runtime]

This avoids unnecessary sorting and may reduce shuffle-reading costs, although work already completed cannot be undone.

Spark documents this runtime conversion as one of AQE's major optimizations.

## 3. Why is CBO still needed if AQE can optimize at runtime?

AQE cannot correct every inefficient decision made during initial planning.

**First, CBO can optimize logical join ordering before execution.**

Consider:

```sql
SELECT *
FROM orders o
JOIN customers c
    ON o.customer_id = c.customer_id
JOIN countries co
    ON c.country_id = co.country_id
WHERE co.country_name = 'India';
```

CBO can use table and column statistics to determine whether joining filtered Countries with Customers first would reduce the intermediate result size.

AQE generally does not reconsider this logical join order.

**Second, AQE operates after some processing has already occurred.**

If Spark has already executed an expensive shuffle, AQE cannot eliminate the work that has been completed.

CBO can help produce a better initial plan and potentially avoid that unnecessary work.

**Third, CBO and AQE solve different problems.**

CBO primarily improves statistics-based logical optimization. AQE improves supported physical execution decisions, such as join conversion, shuffle partition coalescing, and skew handling.

Consequently, enabling both can be more effective than relying exclusively on AQE.

## 4. How to enable CBO and AQE together

```python
# Enable Cost-Based Optimization
spark.conf.set("spark.sql.cbo.enabled", "true")

# Enable cost-based join reordering
spark.conf.set("spark.sql.cbo.joinReorder.enabled", "true")

# Retrieve available catalog row counts and column statistics
spark.conf.set("spark.sql.cbo.planStats.enabled", "true")

# Enable Adaptive Query Execution
spark.conf.set("spark.sql.adaptive.enabled", "true")
```

For effective CBO, collect relevant statistics on supported catalog tables (not local temporary views):

```sql
ANALYZE TABLE orders COMPUTE STATISTICS;

ANALYZE TABLE customers COMPUTE STATISTICS;

ANALYZE TABLE customers
COMPUTE STATISTICS
FOR COLUMNS customer_id, country_id;
```

In standard Apache Spark, CBO and cost-based join reordering are disabled by default, while AQE has been enabled by default since Spark 3.2.

## Interview-ready answer

> No, Adaptive Query Execution does not replace Cost-Based Optimization. Both are complementary techniques within Spark SQL.
>
> CBO operates before query execution and uses table and column statistics to estimate cardinalities and optimize logical plans, especially join ordering.
>
> AQE operates during query execution and uses actual runtime statistics to adapt the physical execution plan.
>
> For example, CBO may reorder joins to minimize intermediate data, whereas AQE may convert a sort-merge join into a broadcast hash join if one side turns out to be smaller than initially estimated. AQE can also coalesce shuffle partitions and handle data skew.
>
> However, AQE cannot completely replace CBO because it does not generally reconsider the logical join order, and some expensive operations may already have been executed before AQE can optimize them.
>
> Therefore, using both helps Spark optimize queries before execution and adapt physical execution decisions during runtime.
>
> **CBO improves the initial query plan using estimated statistics, while AQE refines the physical execution plan using actual runtime statistics.**
