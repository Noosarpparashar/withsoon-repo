# What does deserialization mean?

Deserialization is the process of converting serialized data (bytes) back into a usable object or data structure so that a program can read and use it.

It is the reverse of serialization. The reconstructed object has equivalent values, but is not the same object instance in memory.

## 1. Serialization vs. Deserialization

[spark-reference:deserialization]

## 2. Python example

```python
import pickle

# Original Python object
data = {"id": 101, "name": "Rahul"}

# Serialization: Object to bytes
serialized = pickle.dumps(data)

# Deserialization: Bytes to object
deserialized = pickle.loads(serialized)

print(deserialized)
```

Output:

```text
{'id': 101, 'name': 'Rahul'}
```

The deserialized object is again a Python dictionary.

**Note:** `pickle` is suitable only for trusted data because deserializing untrusted pickle data can execute malicious code.

## 3. Deserialization in Apache Spark

Spark uses serialization and deserialization when moving data between processes, executors, or machines.

For example, consider a shuffle operation:

```python
df.groupBy("country").count()
```

A simplified internal flow:

1. **Executor A:** Processes records and serializes shuffle data into bytes.
2. **Network/disk:** Serialized data is transferred or stored.
3. **Executor B:** Reads the data and deserializes it when the processing path requires objects.
4. **Executor B:** Performs aggregation.

Spark's optimized SQL engine often processes binary-encoded internal rows directly, so not every shuffle record needs to be converted into a normal Java or Python object.

## 4. Why is deserialization expensive?

Deserialization can consume significant CPU and memory because it may involve:

- Decoding binary representations.
- Reconstructing objects and their fields.
- Allocating memory for new objects.
- Creating garbage-collection overhead.

In Spark, excessive deserialization can contribute to slow tasks, particularly with object-heavy RDDs or inefficient serializers.

## 5. Spark UI: Deserialization Time

Spark UI exposes **Executor Deserialize Time**.

This measures the time executors spend deserializing tasks and their dependencies before executing them. It is not a measurement of all data deserialization happening during Spark processing.

## Interview-ready answer

> Deserialization is the process of converting serialized bytes back into usable objects or data structures. In distributed systems like Spark, it enables executors to reconstruct transmitted tasks and data. Deserialization introduces CPU and memory overhead, so efficient serialization formats and Spark's optimized internal binary representations help improve performance.
