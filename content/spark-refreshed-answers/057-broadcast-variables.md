# What are broadcast variables, and when should you use them?

A broadcast variable is a read-only variable that Spark efficiently distributes to all executors, allowing multiple tasks on the same executor to reuse the data instead of repeatedly transferring it from the driver.

Broadcast variables are useful when you need to share relatively small, frequently accessed data across many tasks.

## 1. How broadcast variables work

Without broadcast variables, a normal Python or Scala variable captured by a task closure may be serialized and sent with tasks, causing unnecessary network traffic and serialization overhead.

With broadcast variables:

1. The driver creates a broadcast variable.
2. Spark distributes the data to executors efficiently.
3. Executors cache the broadcast data locally.
4. Tasks access the broadcast value rather than carrying the full object in their closures.

The broadcast data is reused locally. In PySpark, separate Python worker processes may each deserialize their own copy, so there is not necessarily exactly one in-memory Python object per executor.

## 2. Example in PySpark

Suppose we have a dictionary containing country codes and their names, and we want to use it while processing millions of records.

### Without broadcast

```python
country_map = {
    "IN": "India",
    "US": "United States",
    "UK": "United Kingdom"
}

result = rdd.map(lambda x: (x, country_map.get(x)))
```

The dictionary may be serialized with task closures repeatedly.

### With broadcast

```python
country_map = {
    "IN": "India",
    "US": "United States",
    "UK": "United Kingdom"
}

broadcast_map = spark.sparkContext.broadcast(country_map)
result = rdd.map(lambda x: (x, broadcast_map.value.get(x)))

# Execute the lazy computation before destroying the broadcast.
result.saveAsTextFile("/data/output/country_names")

# Release resources after all computations using it have finished.
broadcast_map.destroy()
```

Here, the country mapping is distributed efficiently, and tasks can reuse a locally cached value.

Do not destroy the broadcast immediately after defining `map()`: the transformation is lazy and still needs the broadcast when an action executes. Keep it available for any future actions that may recompute the RDD.

## 3. When should you use broadcast variables?

| Scenario | Why broadcast helps |
| --- | --- |
| Lookup dictionaries | Avoid repeatedly sending mappings to tasks |
| Configuration data | Share common read-only settings |
| Small reference datasets | Efficiently access shared reference data |
| ML inference | Share a reasonably sized read-only model or supporting data |
| Reused constants | Avoid redundant task serialization |

## 4. Broadcast variable vs. broadcast join

These concepts are related but different.

| Broadcast variable | Broadcast join |
| --- | --- |
| Shares read-only data across executors | Optimizes a join by broadcasting the smaller side |
| Created with `sc.broadcast()` | Often triggered automatically or with `broadcast()` |
| Used in RDD transformations and application logic | Used in DataFrame and Spark SQL operations |
| Does not automatically perform a join | Can eliminate a large join shuffle |

Example of a broadcast join:

```python
from pyspark.sql.functions import broadcast

result = large_df.join(
    broadcast(small_df),
    "customer_id"
)
```

For joining a large DataFrame with a small DataFrame, prefer a broadcast join over manually collecting a lookup dictionary and broadcasting it.

## 5. Important considerations

- **Read-only:** Tasks should not modify broadcast data. To update it, create a new broadcast variable.
- **Memory consumption:** Executors and, in PySpark, Python workers may retain copies, so excessively large broadcast variables can cause memory pressure or OOM errors.
- **Serialization:** Data must be serializable for distribution.
- **Lifecycle:** `unpersist()` removes cached executor copies, allowing them to be fetched again if needed. `destroy()` permanently invalidates the broadcast; use it only after all uses have finished.
- **Avoid unnecessary broadcasting:** Small variables that are rarely used may not justify the overhead.

## Interview-ready answer

> A broadcast variable in Spark is a read-only shared variable distributed efficiently from the driver to executors and cached locally for reuse by tasks.

> We use broadcast variables when many tasks need access to the same relatively small dataset, such as lookup dictionaries, configuration values, or reference information.

> They reduce repeated serialization and network transfer, improving performance. However, we should avoid broadcasting very large objects because local copies consume memory, including potentially separate copies in PySpark worker processes.

**Key distinction:** Broadcast variables optimize data sharing, whereas broadcast joins optimize join execution.