# What is a deterministic versus non-deterministic UDF?

A deterministic UDF returns the same result for the same inputs under the same defined function and reference-data contract. A non-deterministic UDF may return different results even when its explicit arguments are unchanged.

For example, calculating a fixed 10% bonus from salary is deterministic. Calling a random generator or consulting a changing external service is generally non-deterministic.

Spark treats ordinary UDFs as deterministic by default; it does not inspect arbitrary Python code to prove that declaration. Mark a varying function with asNondeterministic before using or registering it.

## 1. Key differences

| Feature | Deterministic UDF | Non-deterministic UDF |
| --- | --- | --- |
| Output | Same input produces the same result under the defined contract | Same arguments may produce different results |
| Examples | Fixed arithmetic or stable classification rules | Randomness, worker clock time, changing external state |
| Reference state | Inputs or fixed/versioned reference data determine the result | May depend on changing state outside the arguments |
| Optimizer assumptions | Eligible equivalent computations may be reused | Must respect non-deterministic expression semantics |
| Duplicate evaluations | May be eliminated when the plan permits | Rewrites that incorrectly equate varying calls are restricted |
| Default declaration | Assumed for ordinary UDFs | Explicitly mark when applicable |
| Reproducibility | Easier when code, inputs, and dependencies are fixed | Results may change on reevaluation |
| Suitable uses | Repeatable business transformations | Intentional randomness or time-varying behavior, with replay implications understood |

[spark-reference:udf-determinism-comparison]

## 2. Example: Deterministic bonus calculation

```python
from pyspark.sql.functions import udf, col

@udf("double")
def calculate_bonus(salary):
    if salary is None:
        return None
    return salary * 0.10

bonus_result = df.withColumn(
    "bonus",
    calculate_bonus(col("salary"))
)
```

For the illustrated DOUBLE salary values:

| Salary | First evaluation | Second evaluation |
| --- | --- | --- |
| 50,000 | 5,000 | 5,000 |
| 80,000 | 8,000 | 8,000 |
| 100,000 | 10,000 | 10,000 |

The result depends on salary and a fixed rule. No additional deterministic declaration is needed for this ordinary UDF. Native arithmetic would be preferable for such a simple operation.

## 3. Example: Non-deterministic random score

```python
import random
from pyspark.sql.functions import udf, col

@udf("double")
def generate_random_score(value):
    return random.random()

random_score_udf = generate_random_score.asNondeterministic()

random_result = df.withColumn(
    "random_score",
    random_score_udf(col("employee_id"))
)
```

Possible values on reevaluation:

| Employee ID | First evaluation | Second evaluation |
| --- | --- | --- |
| 101 | 0.234 | 0.876 |
| 102 | 0.567 | 0.123 |
| 103 | 0.891 | 0.452 |

These values are illustrative. Non-deterministic means the result may differ, not that every pair of calls must return unequal values.

asNondeterministic informs Spark that identical explicit arguments are not enough to assume identical results. It does not seed the generator, make the result replay-stable, or change how retries are committed externally.

## 4. Why does determinism matter to Catalyst?

Catalyst uses expression properties to decide which transformations are safe.

For a deterministic call:

```python
duplicate_bonus = df.select(
    calculate_bonus(col("salary")).alias("bonus1"),
    calculate_bonus(col("salary")).alias("bonus2")
)
```

Both outputs should agree for the same input under the function's contract. Spark may avoid redundant computation where its execution plan supports reuse, but there is no universal promise about invocation counts.

For varying calls:

```python
two_scores = df.select(
    random_score_udf(col("employee_id")).alias("score1"),
    random_score_udf(col("employee_id")).alias("score2")
)
```

The results may differ. Spark must not apply a deterministic-expression assumption that incorrectly substitutes one varying call for another.

| Optimization | Deterministic declaration | Non-deterministic declaration |
| --- | --- | --- |
| Equivalent-expression reuse | May be eligible | Restricted where reuse changes semantics |
| Duplicate evaluation elimination | May be eligible | Must preserve varying-call semantics |
| Expression movement | More freedom where otherwise valid | Must respect non-deterministic semantics |
| Constant folding | Still requires a foldable implementation; ordinary opaque Python calls generally remain runtime evaluations | Cannot assume varying output is a constant |
| Source pushdown of hidden body logic | Generally unavailable | Generally unavailable |
| Pruning unrelated columns | Still available | Still available |

Determinism does not make the function body transparent to Catalyst. Marking a Python UDF deterministic also does not, by itself, make it eligible for constant folding merely because its arguments are literals.

## 5. What if a varying UDF is incorrectly declared deterministic?

This function has no explicit inputs, but consults random state:

```python
@udf("double")
def random_value():
    return random.random()
```

Its default declaration is inaccurate. Optimizations may eliminate duplicate invocations or evaluate a function a different number of times than a source-code reading suggests.

Correct the declaration before building expressions or registering the function:

```python
random_udf = random_value.asNondeterministic()
```

That restricts unsafe deterministic assumptions. It does not guarantee exactly one call per record: task retries, recomputation, repeated actions, and replay can still cause reevaluation.

Likewise, a cached random result may be reused while its blocks remain available. The declaration does not force a fresh value on every read, and cache loss/recomputation is not a durable way to preserve an originally generated identifier.

## 6. What makes a function non-deterministic?

| Behavior | Deterministic? | Reason |
| --- | --- | --- |
| Tax from amount and a supplied fixed rate | Yes, under a fixed rule | All relevant values are inputs |
| Uppercase a string under fixed semantics | Yes | Same input and rule produce the same output |
| Call a random generator | Generally no | Uses evolving random state |
| Read the worker's current clock | No | Depends on evaluation time |
| Fetch a changing price/rate from an API | No | Depends on external state |
| Consult mutable global state | Not safely assumed | State may differ across calls/workers |
| Generate a random UUID | No | A new value can be generated on reevaluation |
| Use a fixed immutable lookup snapshot | Potentially | Snapshot, version, and interpretation must remain fixed |

A currency conversion using a live fetched rate can change for the same amount. Supplying a fixed rate or a versioned reference snapshot makes the dependency explicit. Changing library versions, configuration, or business rules can also change results across deployments; reproducibility needs a broader versioned contract.

## 7. Why does this matter in streaming and retries?

A random transaction ID generated during processing may change if the task or micro-batch is recomputed. That can undermine downstream deduplication, reconciliation, and replay-safe writes.

For a stable business key, derive the value from immutable source identifiers with a defined encoding. Avoid simple delimiter concatenation when fields may contain that delimiter or NULL values.

```python
from pyspark.sql.functions import sha2, to_json, struct, col, when

# Define and version the field types, normalization, and encoding contract.
key_payload = to_json(
    struct(
        col("source_system").cast("string").alias("source_system"),
        col("transaction_id").cast("string").alias("transaction_id")
    ),
    options={"ignoreNullFields": "false"}
)

keyed_result = df.withColumn(
    "transaction_key",
    when(
        col("source_system").isNotNull()
        & col("transaction_id").isNotNull(),
        sha2(key_payload, 256)
    )
)
```

The structured encoding preserves field boundaries and escapes string content. Under this example's policy, a missing required source identifier yields a NULL key and must be handled separately. Keep field order, types, normalization, and serialization rules stable/versioned when replaying data.

A hash is not a uniqueness constraint. Stable source identity and a suitable sink key/upsert or deduplication policy are still required.

**Determinism and idempotency are different:** A deterministic transformation produces repeatable values. An idempotent write prevents repeated processing from creating unintended duplicate effects. Declaring nondeterminism does not make side effects safe, and repeatable return values do not automatically make writes idempotent.

## 8. Interview-ready answer

> A deterministic UDF produces the same output for the same inputs under its defined contract. A non-deterministic UDF may vary because it uses randomness, time, or changing external state.
>
> Spark assumes ordinary UDFs are deterministic by default. I mark a varying function with asNondeterministic before using it so Spark does not apply inappropriate deterministic-expression assumptions.
>
> Determinism can permit reuse or elimination of equivalent computations, but does not make an opaque Python body fully optimizer-visible or guarantee one invocation per record.
>
> For replayable pipelines, I prefer stable inputs, versioned reference data, and repeatable keys. When varying behavior is required, I declare it correctly and separately design retry-safe, idempotent output.

**Key takeaway:** Declare determinism accurately, make hidden dependencies explicit, and design replay behavior separately from expression optimization.
