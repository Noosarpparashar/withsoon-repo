# Can a UDF be used in a Spark SQL query?

**Yes.** Spark SQL can resolve and call registered user-defined functions in expressions such as SELECT and WHERE. Python, Scala, and Java implementations use their supported registration interfaces and execution runtimes.

In PySpark, spark.udf.register associates a function with a SQL name. Registering a name makes the function callable from SQL; it does not turn Python code into a built-in expression or remove its execution costs.

[spark-reference:sql-udf-registration]

## 1. Example: Register a Python function

Suppose the employee data contains:

| employee_id | name | salary |
| --- | --- | --- |
| 101 | Rahul | 30000 |
| 102 | Priya | 60000 |
| 103 | Amit | 120000 |

Create the sample DataFrame:

```python
df = spark.createDataFrame(
    [
        (101, "Rahul", 30000),
        (102, "Priya", 60000),
        (103, "Amit", 120000)
    ],
    "employee_id INT, name STRING, salary INT"
)
```

### Step 1: Define the function

```python
def classify_salary(salary):
    if salary is None:
        return "Unknown"
    elif salary < 50000:
        return "Low"
    elif salary < 100000:
        return "Medium"
    return "High"
```

### Step 2: Register its SQL name

```python
from pyspark.sql.types import StringType

classify_salary_udf = spark.udf.register(
    "classify_salary",
    classify_salary,
    StringType()
)
```

Spark now recognizes classify_salary in this session's SQL function registry. The returned callable is retained as classify_salary_udf for later DataFrame use. Specify a return type that matches the Python function's output.

### Step 3: Create a temporary view

```python
df.createOrReplaceTempView("employees")
```

The view supplies the SQL table name. It is separate from function registration and does not cache or copy the data.

### Step 4: Call the function in SQL

```python
result = spark.sql("""
    SELECT
        employee_id,
        name,
        salary,
        classify_salary(salary) AS salary_category
    FROM employees
""")

result.show()
```

Output values:

| employee_id | name | salary | salary_category |
| --- | --- | --- | --- |
| 101 | Rahul | 30000 | Low |
| 102 | Priya | 60000 | Medium |
| 103 | Amit | 120000 | High |

Row order is illustrative unless explicitly sorted. When execution is triggered, the function still uses Python UDF infrastructure; SQL syntax does not move its body into the JVM.

## 2. Can a UDF be used in WHERE?

Yes:

```sql
SELECT *
FROM employees
WHERE classify_salary(salary) = 'High';
```

Catalyst generally cannot inspect this Python function and infer the underlying salary comparison. Its UDF condition usually remains above the scan rather than becoming a source predicate.

For the integer/null salary behavior illustrated here, a native filter retains the same rows:

```sql
SELECT *
FROM employees
WHERE salary >= 100000;
```

On a compatible Parquet, ORC, or JDBC source, Spark can potentially push that native predicate to the reader. The sample employees view comes from an in-memory DataFrame, so it does not itself demonstrate file/database pushdown.

UDFs can also appear in supported conditional expressions, but do not rely on CASE WHEN or Boolean expression order to protect an unsafe Python function. Handle nulls and exceptional inputs inside the function.

## 3. Can Pandas UDFs be registered for SQL?

Yes. Register the already-defined Pandas UDF without supplying another return type:

```python
import pandas as pd
from pyspark.sql.functions import pandas_udf

@pandas_udf("double")
def calculate_bonus(salary: pd.Series) -> pd.Series:
    return salary * 0.10

spark.udf.register(
    "calculate_bonus",
    calculate_bonus
)
```

Its declared double return type is already part of the UDF. The same rule applies when registering an existing regular Python UDF object: do not pass a second returnType to register.

Now SQL can call it:

```sql
SELECT
    employee_id,
    salary,
    calculate_bonus(salary) AS bonus
FROM employees;
```

The function retains its Pandas batch interface and Arrow interchange. Compatible pandas/PyArrow dependencies are still required. Arrow-optimized scalar Python UDFs can also use Arrow while retaining row-oriented function semantics; registration does not choose a vectorized interface by itself.

For a simple multiplication, native SQL arithmetic remains the preferred starting point.

## 4. Temporary versus permanent functions

| Feature | Session-registered/temporary function | Permanent catalog function |
| --- | --- | --- |
| Availability | Current Spark session | Across sessions through a supporting persistent catalog |
| Creation | spark.udf.register or supported temporary-function DDL | Provider-supported function DDL/catalog APIs |
| Metadata persistence | No persistent catalog definition from spark.udf.register | Definition persists when supported by the catalog |
| Typical use | Application-specific logic | Shared, governed reusable functions |
| Deployment | Register again in a new session; provide worker dependencies | Provide a supported implementation and its dependencies as required |

spark.udf.register does not make an arbitrary Python closure a permanent catalog function. External class-based functions and SQL-defined functions have separate DDL and provider/version requirements.

### Example: SQL-defined temporary function

In a Spark version supporting SQL-expression functions:

```sql
CREATE OR REPLACE TEMPORARY FUNCTION calculate_bonus_sql(salary DOUBLE)
RETURNS DOUBLE
RETURN salary * 0.10;
```

Use it in the same session:

```sql
SELECT
    employee_id,
    calculate_bonus_sql(salary) AS bonus
FROM employees;
```

The distinct name avoids replacing the previously registered Python/Pandas function. A SQL-defined body is expressed using Spark SQL operations, so its execution and optimization behavior differ from an opaque Python body. Check the supported DDL and catalog behavior for the deployed version.

## 5. Does registration improve performance?

Registration provides SQL name resolution; it is not a performance optimization by itself.

These calls use the classifier registered earlier:

### DataFrame API

```python
dataframe_result = df.withColumn(
    "category",
    classify_salary_udf("salary")
)
```

### SQL

```sql
SELECT classify_salary(salary) AS category
FROM employees;
```

For equivalent function calls and surrounding plans, both use the corresponding Python UDF execution path.

| Optimization/execution property | Registered opaque Python UDF |
| --- | --- |
| Pushdown of hidden function logic | Generally unavailable |
| Column pruning | Still possible for unused inputs/outputs |
| Partition pruning | Still possible for eligible independent filters |
| Catalyst visibility | Limited inside the Python body; surrounding operations remain optimizable |
| Whole-stage code generation | Cannot include Python execution itself |
| Arrow interchange | Available for supported modes; independent of calling through SQL |

Function implementation, execution mode, and the physical plan drive the costs. SQL registration does not remove worker dependencies, null/error handling, determinism requirements, or retry behavior.

## 6. Interview-ready answer

> Yes. Spark SQL can call registered UDFs in expressions such as SELECT and WHERE. In PySpark, spark.udf.register associates a function with a session-level SQL name and an appropriate return type.
>
> For example, I can register classify_salary and call SELECT classify_salary(salary) FROM employees. Pandas UDFs can also be registered and retain their Arrow-based batch execution.
>
> Registration makes the function accessible in SQL; it does not eliminate Python execution costs or make opaque logic fully visible to Catalyst. Permanent catalog functions and SQL-defined functions use their own supported creation mechanisms.
>
> I prefer native SQL expressions where they implement the requirement and use registered UDFs for justified custom logic.

**Key takeaway:** SQL registration connects a function name to its implementation. The implementation still determines its runtime, scope requirements, and optimization limits.
