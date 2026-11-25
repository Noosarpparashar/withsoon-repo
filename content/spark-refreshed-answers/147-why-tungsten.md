# Why was Tungsten needed?

## 1. Interview-ready answer

**Project Tungsten was introduced because early versions of Apache Spark suffered from performance bottlenecks caused by inefficient JVM memory usage, excessive garbage collection, CPU overhead, and poor utilization of modern hardware.**

Although Spark was significantly faster than traditional Hadoop MapReduce for many workloads because it supported in-memory computation, keeping data in memory alone did not guarantee efficient processing.

Early Spark workloads frequently involved large numbers of Java objects, expensive serialization and deserialization, frequent garbage collection, and inefficient CPU execution.

As datasets grew, these limitations became more significant.

**Tungsten was developed to address three major problems:**

1. **Memory inefficiency:** Java objects consumed significantly more memory than the actual data they represented, leading to unnecessary memory usage and garbage collection.
2. **CPU inefficiency:** Generic execution logic, object handling, and repeated function calls introduced processing overhead.
3. **Poor hardware utilization:** Traditional object-oriented data structures and execution patterns did not fully exploit modern CPU caches and memory architectures.

Tungsten addressed these problems through **compact binary memory representations, cache-aware algorithms, explicit memory management, and whole-stage code generation**.

Its goal was to make Spark execution more efficient without requiring developers to manually optimize low-level memory handling or CPU instructions.

## 2. What problems existed before Tungsten?

### Problem 1: Excessive Java object overhead

Early Spark execution relied heavily on JVM objects to represent and process data.

Consider a dataset containing 100 million records.

Each record might be represented through Java objects containing:

- Object headers.
- References to other objects.
- Primitive fields or boxed values.
- Alignment and padding bytes.
- Additional wrapper objects.

A small logical record could therefore occupy substantially more memory than its raw data.

[spark-reference:tungsten-memory-layout]

**How Tungsten helped:**

Tungsten introduced compact internal binary formats, such as `UnsafeRow`, reducing object overhead and allowing more efficient memory access.

### Problem 2: Excessive garbage collection

When Spark creates millions of temporary Java objects, the JVM garbage collector must periodically identify and reclaim unused objects.

This can result in:

- Long garbage collection pauses.
- Reduced CPU time available for processing.
- Unpredictable task execution times.
- Increased memory pressure.
- Potential executor failures under severe pressure.

**How Tungsten helped:**

By reducing intermediate object creation and using more efficient memory representations, Tungsten reduced garbage collection pressure.

It did not eliminate garbage collection entirely.

### Problem 3: CPU inefficiency

Traditional query execution often involved multiple generic operators interacting with one another.

For example:

[spark-reference:tungsten-generic-operators]

Each operator could introduce intermediate processing, method calls, and object handling.

For large datasets, these overheads accumulate across millions or billions of records.

**How Tungsten helped:**

Whole-stage code generation allows Spark to fuse compatible physical operators into specialized JVM code, reducing interpretation overhead and intermediate materialization.

For example, filtering and projection can be executed within the same generated processing loop rather than through multiple generic execution layers.

### Problem 4: Inefficient use of CPU caches

Modern CPUs have fast but limited cache memory.

Traditional object-oriented processing frequently accesses objects scattered across different memory locations, which can cause cache misses and slower memory access.

**How Tungsten helped:**

Compact data layouts and cache-aware algorithms improved memory locality, benefiting operations such as:

- Sorting
- Hash aggregation
- Hash joins
- Binary row processing

This helped Spark make better use of available CPU resources.

### Problem 5: Serialization, hashing, and memory pressure

As Spark's storage and network performance improved, CPU-intensive operations such as serialization, deserialization, and hashing became increasingly noticeable bottlenecks.

For example, during a large `groupBy` or join, Spark may need to process, hash, compare, and shuffle millions of records.

Tungsten reduced some of these costs through compact binary formats and specialized algorithms. More efficient memory usage could also reduce spilling to disk.

This was an important motivation behind the project: **many Spark workloads were becoming limited more by CPU and memory efficiency than by disk or network throughput.**

## 3. Before Tungsten vs. after Tungsten

| Area                | Earlier Spark execution                    | Tungsten improvements                               |
| ------------------- | ------------------------------------------ | --------------------------------------------------- |
| Data representation | Heavy reliance on JVM objects              | Compact binary formats                              |
| Memory overhead     | Higher object overhead                     | Lower memory footprint                              |
| Garbage collection  | More temporary objects and GC pressure     | Fewer unnecessary objects                           |
| CPU processing      | Generic execution with more function calls | Specialized code generation                         |
| CPU cache           | Less efficient memory locality             | Cache-aware data structures                         |
| Memory management   | Greater reliance on JVM allocation         | Explicit memory management for supported operations |
| Query execution     | More intermediate processing overhead      | Operator fusion through whole-stage code generation |

Note that these improvements arrived incrementally: initial Tungsten optimizations appeared in Spark 1.4, while whole-stage code generation was introduced with Spark 2.0.

## 4. Real-world example

Suppose Spark processes 500 million transaction records:

```python
result = (
    transactions
    .groupBy("customer_id")
    .sum("amount")
)
```

In an object-heavy execution approach, Spark may create substantial numbers of intermediate objects, perform expensive hash lookups, and trigger frequent garbage collection.

With Tungsten-related optimizations, Spark can:

1. Represent rows using compact binary formats.
2. Use efficient internal hash aggregation structures.
3. Reduce unnecessary JVM object allocations.
4. Generate specialized execution code for supported operators.
5. Reduce memory pressure and potentially avoid unnecessary disk spilling.

The result can be lower memory usage and faster execution, although actual performance improvements depend on the workload.

## 5. Final interview summary

**Tungsten was needed because Spark's in-memory processing model was not enough to ensure optimal performance.**

Early Spark execution could suffer from significant JVM object overhead, garbage collection pauses, inefficient CPU usage, and poor CPU cache utilization. As disk and network performance improved, CPU and memory became increasingly important bottlenecks.

Tungsten addressed these limitations through three fundamental improvements: **memory management and binary processing, cache-aware computation, and runtime code generation.**

The key distinction is:

- **Spark's in-memory computation** reduces unnecessary disk I/O.
- **Catalyst** optimizes the query execution plan.
- **Tungsten** makes the actual execution more CPU- and memory-efficient.

**Tungsten was introduced to make Spark not just fast at moving and retaining data, but also efficient at processing it.**