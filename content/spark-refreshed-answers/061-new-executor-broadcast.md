# What happens when a new executor joins the application?

When a new executor joins a running Spark application, it does not automatically receive every existing broadcast variable. Instead, Spark typically fetches broadcast data on demand when a task running on that executor needs it.

## 1. How it works internally

Suppose a Spark application initially has 3 executors, all using a 100 MiB broadcast variable.

Now, Dynamic Resource Allocation adds a fourth executor.

1. **New executor starts:** Spark allocates another executor to handle tasks.
2. **Task gets scheduled:** The scheduler assigns a task that references the existing broadcast variable.
3. **Broadcast data is fetched:** The executor retrieves the required broadcast blocks using Spark's block-transfer mechanism. Blocks may come from other executors or the driver.
4. **Data is cached locally:** The executor stores the broadcast blocks for reuse.
5. **Subsequent tasks reuse it:** Other tasks on that executor can access the cached broadcast data without fetching it again, provided it remains cached.

In PySpark, fetching the broadcast blocks and deserializing a Python value are separate steps; Python workers may each deserialize their own copy.

## 2. Does Spark broadcast the entire variable again?

No. Spark does not need to redistribute the entire broadcast variable to all existing executors.

Only the new executor needs to fetch its missing broadcast blocks, assuming existing executors still have their cached data.

For example:

| Component | Broadcast data |
| --- | --- |
| Executor 1 | Already cached — 100 MiB |
| Executor 2 | Already cached — 100 MiB |
| Executor 3 | Already cached — 100 MiB |
| Executor 4 (new) | Fetches 100 MiB when needed |

The new executor can use the same logical broadcast variable. You do not need to create another one.

## 3. What happens if the new executor cannot fetch it?

If broadcast blocks are unavailable locally, Spark attempts to retrieve them from other available locations.

If the required blocks cannot be retrieved or reconstructed, tasks may fail and be retried. Persistent broadcast-fetch failures can ultimately cause the Spark job to fail.

## Interview-ready answer

> When a new executor joins a Spark application, it does not immediately receive all existing broadcast variables. Instead, when a task on that executor needs a broadcast variable, Spark fetches the necessary broadcast blocks from the driver or other executors and caches them locally.

> Subsequent tasks on that executor reuse the cached broadcast data, reducing redundant network transfer.

**Key takeaway:** Spark distributes broadcast data on demand to newly added executors, without requiring the broadcast variable to be recreated or redistributed to every existing executor.