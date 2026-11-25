# What does serialization mean?

Serialization is the process of converting an object or data structure into a sequence of bytes so it can be stored, transferred over a network, or reconstructed later.

The reverse process is called **deserialization**.

For example, suppose you have a Python object:

```python
employee = {
    "id": 101,
    "name": "John",
    "salary": 50000
}
```

Serialization converts this object into bytes.

[spark-reference:serialization]

## Why does Spark need serialization?

Spark is a distributed processing engine. Data and objects often need to move between processes or machines.

Serialization is useful for:

1. **Network communication:** Transferring objects between the driver and executors, or between executors.
2. **Caching:** Storing RDD partitions in serialized form can reduce memory usage compared with object representations.
3. **Disk storage:** Writing objects or intermediate results to disk.
4. **Task distribution:** Sending task closures and their required variables from the driver to executors.

For example, when Spark sends task information to an executor, the required objects may be serialized, transmitted over the network, and deserialized by the executor.

## Serialization in Spark: Java vs Kryo

For JVM-based RDD workloads, Spark supports these serializers:

| Feature | Java serializer | Kryo serializer |
| --- | --- | --- |
| Speed | Generally slower | Generally faster |
| Serialized size | Often larger | Often smaller |
| Configuration | Default for many JVM object serialization operations | Explicit configuration for general object serialization |
| Main advantage | Convenient for serializable JVM objects | Better performance and compactness |
| Main limitation | More overhead | Class registration may be needed for optimal efficiency |

To configure Kryo before creating the Spark context:

```python
from pyspark.sql import SparkSession

spark = (
    SparkSession.builder
    .config(
        "spark.serializer",
        "org.apache.spark.serializer.KryoSerializer"
    )
    .getOrCreate()
)
```

For JVM applications, this can improve performance when serializing many objects. However, Kryo is not a universal optimization for DataFrames because Spark SQL already uses optimized internal binary representations.

Also, Python objects in PySpark use Python-specific serialization mechanisms for Python execution and communication. Configuring Kryo does not replace Python serialization of the dictionary shown above.

## How serialization affects Spark performance

Imagine a Spark application transferring millions of JVM objects during a shuffle.

If the serialized objects are large:

- More bytes must move across the network.
- More memory may be required for buffers.
- More disk I/O may occur during spills.
- Serialization and deserialization consume CPU.

A compact, efficient serialization format can reduce some of this overhead.

However, Spark SQL shuffles use optimized internal formats, so switching to Kryo will not necessarily make DataFrame joins or aggregations faster.

## Interview-ready answer

> Serialization in Spark is the process of converting objects into bytes so they can be transferred across the network, cached, or stored on disk. Deserialization reconstructs those bytes into usable objects.
>
> Spark supports Java and Kryo serialization for JVM objects. Kryo is generally faster and produces more compact serialized data than Java serialization, making it useful for RDD and object-heavy workloads.
>
> Serialization performance matters because inefficient serialization increases CPU overhead, network traffic, and memory consumption. However, Spark DataFrames already use optimized internal binary formats, so Kryo mainly benefits workloads involving JVM object serialization.

**Key takeaway:** Serialization converts objects into bytes. Its primary purpose in Spark is to enable efficient movement and storage of distributed data and objects.
