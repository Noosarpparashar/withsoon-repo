# Do Spark SQL and the DataFrame API use the same execution engine?

**Yes. Spark SQL and the DataFrame API use the same underlying Spark SQL execution engine, including the Catalyst Optimizer and Spark's distributed execution infrastructure.**

The main difference is how transformations are expressed, not how they are executed.

- **Spark SQL:** Uses SQL queries, which Spark parses and converts into logical plans.
- **DataFrame API:** Uses programmatic transformations such as `filter()`, `select()`, and `join()`, which also produce logical plans.

Once the logical plans are constructed, both approaches follow the same optimization and execution process:

1. **Logical plan:** Represents the operations that need to be performed. Analysis resolves names and data types before optimization.
2. **Catalyst Optimizer:** Optimizes the logical plan using techniques such as predicate pushdown, column pruning, and join optimization.
3. **Physical planning:** Selects appropriate physical operators and execution strategies, such as broadcast hash joins or sort-merge joins.
4. **Distributed execution:** An action triggers execution of the physical plan as tasks across executors, using optimizations such as whole-stage code generation and Adaptive Query Execution (AQE) where applicable.

## Example

**Using Spark SQL:**

```python
df.createOrReplaceTempView("employees")

sql_result = spark.sql("""
    SELECT name, salary
    FROM employees
    WHERE salary > 50000
""")
```

**Using the DataFrame API:**

```python
df_result = (
    df.filter(df.salary > 50000)
      .select("name", "salary")
)
```

Both operations are logically equivalent and can generate the same optimized physical execution plan.

Compare their plans using:

```python
sql_result.explain("formatted")
df_result.explain("formatted")
```

With AQE, also inspect the final executed plans after equivalent actions: runtime statistics can change eligible parts of the initial physical plan.

## Does this mean their performance is always identical?

Not necessarily.

Although both share the same execution engine, performance can differ based on the expressions used, join strategies, UDFs, data partitioning, and generated physical plans.

However, **if both approaches generate effectively identical physical execution plans under the same conditions, their execution performance should generally be comparable.**

## Interview-ready answer

> Yes, Spark SQL and the DataFrame API use the same underlying execution engine. Both generate logical plans that are optimized using Catalyst and converted into physical execution plans executed across Spark executors.
>
> Therefore, neither approach is inherently faster. For equivalent transformations, both generally produce similar execution plans and performance. The choice between them mainly depends on code readability, maintainability, and flexibility.
