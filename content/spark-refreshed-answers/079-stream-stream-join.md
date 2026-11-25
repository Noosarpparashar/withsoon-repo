# How do stream-stream joins work in Structured Streaming?

In Apache Spark Structured Streaming, a stream-stream join is a stateful operation that continuously joins records arriving from two streaming DataFrames.

Unlike batch joins, where both datasets are already available, streaming joins must handle records that arrive at different times.

Spark solves this using three mechanisms:

1. State Store: Retains previously received records from both streams.
2. Watermarks: Track event-time progress and help remove old state.
3. Event-time constraints: Define how far apart two events can occur and still match.

## 1. How stream-stream joins work

Consider two Kafka streams:

Stream 1: Ad Impressions

| ad_id | impression_time |
| ----- | --------------- |
| A101  | 10:00:00        |
| A102  | 10:01:00        |
| A103  | 10:02:00        |

Stream 2: Ad Clicks

| ad_id | click_time |
| ----- | ---------- |
| A101  | 10:03:00   |
| A103  | 10:04:00   |
| A102  | 10:05:00   |

We want to match an impression with a click occurring within 10 minutes of the impression.

[spark-stream-join]

### Step-by-step execution

1. An impression with `ad_id = A101` arrives at 10:00.
2. Spark checks previously received clicks for a matching record.
3. If no matching click is available, Spark retains the impression in its state store.
4. A click for A101 arrives at 10:03.
5. Spark matches the click against the buffered impression.
6. The matching record is emitted to the output stream.
7. Once the relevant event-time boundaries have passed, Spark can remove obsolete records from state.

This process continues incrementally as new data arrives.

## 2. PySpark implementation

Assume `impressions_df` and `clicks_df` are streaming DataFrames created using `spark.readStream`.

```python
from pyspark.sql.functions import expr

# Add event-time watermarks
impressions = (
    impressions_df
    .withWatermark("impression_time", "15 minutes")
    .alias("i")
)
clicks = (
    clicks_df
    .withWatermark("click_time", "15 minutes")
    .alias("c")
)

# Stream-stream inner join
joined = impressions.join(
    clicks,
    expr("""
        i.ad_id = c.ad_id
        AND c.click_time >= i.impression_time
        AND c.click_time <= i.impression_time + interval 10 minutes
    """),
    "inner"
)

# Start streaming query
query = (
    joined.writeStream
    .format("parquet")
    .option("path", "/data/joined_clicks")
    .option("checkpointLocation", "/checkpoints/click_join")
    .outputMode("append")
    .start()
)
```

Here:

- The join key is `ad_id`.
- The allowed difference between impression and click times is 0–10 minutes.
- Both streams use a 15-minute event-time watermark delay.
- Spark retains the necessary join state until it can safely remove it.

## 3. Why are watermarks important?

Without watermarks and event-time constraints, Spark might need to retain historical records indefinitely because a future event could match an old record.

For example, an impression received today could theoretically match a click arriving next month if there is no time constraint.

A watermark is calculated conceptually as:

**Watermark = Maximum observed event time - Configured delay (conceptually)**

For example, if the maximum event time observed is 10:30 and the watermark delay is 15 minutes, the watermark is approximately 10:15.

[spark-stream-watermark]

**Important:** A watermark is not simply a timer that deletes records after 15 minutes of wall-clock time. Spark uses event-time progress together with the join condition to determine when records are no longer needed.

Spark can process late and out-of-order records within its supported watermark guarantees. Records arriving too late may be discarded.
## 4. What join types are supported?

| Join type        | Stream-stream support  | Watermark requirements                                       |
| ---------------- | ---------------------- | ------------------------------------------------------------ |
| Inner Join       | Yes                    | Optional, but needed with time constraints to bound state    |
| Left Outer Join  | Yes                    | Right-side watermark and time constraints required           |
| Right Outer Join | Yes                    | Left-side watermark and time constraints required            |
| Full Outer Join  | Yes                    | Watermark on at least one side and time constraints required |
| Left Semi Join   | Yes                    | Right-side watermark and time constraints required           |
| Left Anti Join   | Not supported directly | —                                                            |

For complete state cleanup, watermarks on both sides are generally recommended. Stream-stream joins use Append output mode, not Update or Complete mode.
## 5. How do outer joins work with late data?

Consider a Left Outer Join between impressions and clicks.

An impression arrives, but the matching click has not arrived yet.

Spark cannot immediately output:

```text
A101 | 10:00 | NULL
```

Why?

Because a matching click may arrive later.

Spark must wait until watermark progress and the join's time boundary establish that a matching click can no longer arrive within the accepted lateness.

Only then can Spark emit the unmatched impression with NULL values for the click columns.

This means outer join results may be delayed, and their emission also depends on micro-batch execution and watermark advancement.
## 6. Stream-stream join vs batch join

| Feature           | Batch Join                            | Stream-stream Join                              |
| ----------------- | ------------------------------------- | ----------------------------------------------- |
| Data availability | Both datasets are finite              | Both datasets continuously receive events       |
| State             | Managed during execution              | Persisted across micro-batches                  |
| Late events       | Not a streaming concern               | Must be handled                                 |
| Watermark         | Not required                          | Important for state cleanup                     |
| Event-time range  | Optional                              | Needed to bound state in typical joins          |
| Checkpointing     | Not normally needed for join recovery | Required for fault-tolerant streaming execution |
| State growth      | Limited to finite inputs              | Can grow indefinitely without bounds            |

## 7. Performance considerations

Stream-stream joins are expensive because Spark must retain and maintain state for both inputs.

Key optimizations include using selective time-range conditions, choosing reasonable watermark delays, filtering unnecessary events before joining, and monitoring state-store size.

Spark stores the join buffers in its state-store subsystem and can recover them using checkpointed state. Depending on configuration, it can use different state-store providers, including RocksDB-backed state.
## Interview-ready answer

> A stream-stream join in Spark Structured Streaming is a stateful join between two continuously arriving streams.

> Since matching records may arrive at different times, Spark maintains previously received records from both streams in state stores and matches new events against buffered records.

> For example, we can join an ad impression stream with a click stream on `ad_id`, allowing clicks that occur within 10 minutes of an impression.

> Spark uses watermarks to manage late-arriving events and event-time constraints to identify when older records can be safely removed from state.

> Inner joins can run without watermarks, but their state may grow indefinitely. Outer joins require appropriate watermarks and time constraints to determine when unmatched records can be emitted.

**Key takeaway:** Stream-stream joins are stateful operations, and their biggest challenges are handling late data, controlling state growth, and maintaining fault tolerance across continuous processing.