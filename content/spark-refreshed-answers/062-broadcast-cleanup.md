# How do you remove broadcast variables from memory?

In Apache Spark, you can remove cached broadcast data using two methods:

1. `unpersist()` — Removes cached broadcast data from executors but allows it to be fetched again.
2. `destroy()` — Permanently destroys the broadcast variable, making it unusable.

## 1. Using unpersist()

```python
broadcast_var = sc.broadcast({
    "IN": "India",
    "US": "United States"
})

# Remove cached broadcast data from executors
broadcast_var.unpersist()
```

### What happens internally?

- Spark removes the cached broadcast blocks from executors.
- The broadcast variable remains valid.
- If a task accesses it again, Spark can fetch the broadcast data again.
- By default, `unpersist()` is asynchronous.

To wait for the removal to complete:

```python
broadcast_var.unpersist(blocking=True)
```

## 2. Using destroy()

```python
broadcast_var = sc.broadcast({
    "IN": "India",
    "US": "United States"
})

# Permanently destroy the broadcast variable
broadcast_var.destroy()
```

### What happens internally?

- Spark removes the broadcast's cached blocks and associated metadata.
- The broadcast variable becomes unusable.
- Subsequent attempts to use the destroyed broadcast variable can fail.
- You must create a new broadcast variable if you need the data again.

To destroy it synchronously:

```python
broadcast_var.destroy(blocking=True)
```

## 3. Difference between unpersist() and destroy()

| Feature | `unpersist()` | `destroy()` |
| --- | --- | --- |
| Removes cached executor data | Yes | Yes |
| Broadcast remains usable | Yes | No |
| Can fetch data again | Yes | No |
| Permanently releases broadcast resources | No | Yes |
| Supports `blocking=True` | Yes | Yes |

## 4. When should you use each?

### Use unpersist() when

- You want to free executor memory temporarily.
- You might need the same broadcast variable again.
- You want Spark to reload broadcast data when needed.

### Use destroy() when

- The broadcast variable is no longer required.
- You have finished processing all tasks using it.
- You want to permanently release its resources.

**Important:** Avoid destroying a broadcast variable while running or pending tasks still depend on it, because those tasks may fail. Also ensure no future action needs it to recompute a lazy RDD.

In PySpark, Python workers may retain deserialized objects or application references. Removing Spark's cached blocks does not guarantee that every Python object is immediately reclaimed or that process memory instantly falls.

## Interview-ready answer

> In Spark, we can remove broadcast variables from memory using `unpersist()` or `destroy()`.

> `unpersist()` removes cached broadcast data from executors but allows Spark to fetch it again when required.

> `destroy()` permanently removes the broadcast data and associated resources, making the broadcast variable unusable.

> Both operations support `blocking=True` to wait for Spark's cleanup operation to complete.

**Key takeaway:** Use `unpersist()` for temporary memory cleanup and `destroy()` when the broadcast variable is no longer needed.