# Does Spark automatically convert empty strings to null?

No, not as a general rule. In Spark SQL and existing DataFrames, an empty string is a present STRING value of length zero, while NULL represents a missing or unknown value.

Data-source parsing is a separate step. CSV can interpret empty fields or configured tokens as NULL during ingestion, depending on the reader options, schema, and field representation. That does not mean Spark globally converts every empty string to NULL.

## 1. NULL and empty strings are different

| Feature | NULL | Empty string "" |
| --- | --- | --- |
| Meaning | Missing or unknown | Present string with zero characters |
| isNull() | TRUE | FALSE |
| COUNT(column) | Excluded | Included |
| LENGTH(column) | NULL | 0 |
| column = '' | NULL (UNKNOWN) | TRUE |
| fillna() | Can replace | Does not replace |
| COALESCE(column, 'Unknown') | Returns Unknown | Returns the empty string |

Create a DataFrame containing NULL, an empty string, a name, and three spaces:

```python
from pyspark.sql import functions as F

df = spark.createDataFrame(
    [(1, None), (2, ""), (3, "Rahul"), (4, "   ")],
    "id INT, name STRING"
)
df.createOrReplaceTempView("employees")

df.select(
    "id",
    "name",
    F.length("name").alias("name_length"),
    F.col("name").isNull().alias("is_null")
).orderBy("id").show()
```

Expected output:

```text
+---+-----+-----------+-------+
| id| name|name_length|is_null|
+---+-----+-----------+-------+
|  1| NULL|       NULL|   true|
|  2|     |          0|  false|
|  3|Rahul|          5|  false|
|  4|     |          3|  false|
+---+-----+-----------+-------+
```

The displayed blank cells look similar, so length is useful for distinguishing an empty string from spaces. Neither is NULL.

## 2. Convert empty strings explicitly

The following examples derive new DataFrames from the original df. They do not change df or its registered view in place.

### A. when/otherwise: exact empty strings

```python
exact_empty_normalized = df.withColumn(
    "name",
    F.when(F.col("name") == "", F.lit(None).cast("string"))
     .otherwise(F.col("name"))
)
```

This converts only exact empty strings to NULL. Existing NULLs remain NULL, and spaces/nonempty names are preserved.

### B. NULLIF in SQL

```sql
SELECT
    id,
    NULLIF(name, '') AS name
FROM employees;
```

NULLIF returns NULL when its two expressions are equal; otherwise it returns the first value. Existing NULL input also remains NULL here.

The PySpark expression form is:

```python
nullif_normalized = df.withColumn(
    "name",
    F.expr("nullif(name, '')")
)
```

For PySpark 3.5+ there is also a direct function:

```python
nullif_normalized = df.withColumn(
    "name",
    F.nullif(F.col("name"), F.lit(""))
)
```

The literal wrapper matters: F.lit("") supplies an empty-string value, rather than a column name.

### C. Include names containing only ordinary spaces

```python
space_normalized = df.withColumn(
    "name",
    F.when(
        F.trim(F.col("name")) == "",
        F.lit(None).cast("string")
    ).otherwise(F.col("name"))
)
```

This recognizes "", " ", and "   " as missing under the chosen rule. Existing NULLs are preserved through the otherwise branch. Nonempty values retain their original contents, including any leading or trailing spaces.

Default trim removes ordinary spaces from the ends; it is not a universal tab, newline, or Unicode-whitespace normalizer. Define any broader character rule explicitly and check its effect on valid text.

| Original value | Exact-empty rule | Empty-after-trim rule |
| --- | --- | --- |
| NULL | NULL | NULL |
| "" | NULL | NULL |
| "   " | Preserved as three spaces | NULL |
| "Rahul" | Rahul | Rahul |

[spark-reference:empty-string-normalization]

Avoid replacing this expression with NULLIF(TRIM(name), '') unless trimming every surviving name is also intended. That expression changes nonempty strings with surrounding spaces, whereas the when/otherwise example preserves them.

## 3. CSV ingestion can interpret fields differently

CSV parsing maps source text into typed column values. The source representations of an unquoted empty field, a quoted empty string, a null marker, and a string of spaces can differ.

| CSV option | Purpose |
| --- | --- |
| nullValue | Defines a textual representation of NULL |
| emptyValue | Controls the string representation of an empty value; read/write behavior must be considered separately |

For a small test file at /data/employees.csv:

```csv
id,name
1,NULL
2,
3,""
4,"   "
5,Rahul
```

Use an explicit schema and options:

```python
csv_df = (
    spark.read
    .schema("id INT, name STRING")
    .option("header", "true")
    .option("nullValue", "NULL")
    .option("emptyValue", "")
    .option("ignoreLeadingWhiteSpace", "false")
    .option("ignoreTrailingWhiteSpace", "false")
    .csv("/data/employees.csv")
)
```

Inspect both NULL status and string length rather than relying on visually blank show() cells:

```python
csv_df.select(
    "id",
    F.concat(F.lit("["), F.col("name"), F.lit("]"))
     .alias("name_with_boundaries"),
    F.length("name").alias("name_length"),
    F.col("name").isNull().alias("is_null")
).orderBy("id").show(truncate=False)
```

For an empty string, the boundary display is []; three spaces appear inside the brackets with length three; a NULL input stays NULL. Validate the fixture's parsed results in the deployed Spark version/configuration before adopting the rule.

Setting nullValue to "NULL" is not a guarantee that every unquoted empty field will remain an empty string. emptyValue is not a blanket instruction to preserve all source blanks. Quoting, parser options, and target types matter, and read/write defaults differ.

Other sources have their own contracts too: JSON null, an absent JSON field, and a JSON empty string are distinct source cases. Do not use an invalid cast as a substitute for intentional string normalization; casts may return NULL or raise errors depending on the operation and configuration.

## 4. Why does this affect counts and reporting?

Use a separate customer dataset:

| customer_id | name |
| --- | --- |
| 101 | Rahul |
| 102 | NULL |
| 103 | "" |
| 104 | Priya |

```python
customers = spark.createDataFrame(
    [(101, "Rahul"), (102, None), (103, ""), (104, "Priya")],
    "customer_id INT, name STRING"
)
customers.createOrReplaceTempView("customers")
```

```sql
SELECT COUNT(name) AS non_null_names
FROM customers;
```

This returns three: Rahul, the empty string, and Priya are non-null. The NULL name is excluded.

```sql
SELECT COUNT(NULLIF(name, '')) AS non_empty_names
FROM customers;
```

This returns two because the empty string is converted to NULL before counting.

| Metric | Result |
| --- | --- |
| COUNT(name) | 3 |
| COUNT(NULLIF(name, '')) | 2 |

The second metric removes exact empty strings, not strings of spaces. Define what counts as a usable name before interpreting it as a completeness measure. Retain raw values or quality indicators when normalization would erase an important source distinction.

## 5. Interview-ready answer

> No, Spark does not generally convert empty strings to NULL in ordinary DataFrame or SQL operations. An empty string is a present value of length zero: isNull is FALSE, and COUNT(column) includes it.
>
> If blanks mean missing for a field, I normalize them explicitly with when or NULLIF. I can use trim in the detection rule for ordinary spaces while preserving valid nonempty values, and define a broader whitespace policy if needed.
>
> CSV ingestion is a separate concern. The schema, nullValue, emptyValue, quoting, and other parser options can affect how source fields become NULL or empty strings. I verify representative fixtures rather than assuming every blank has the same result.
>
> The normalization rule should follow business meaning, especially for identifiers and mandatory fields, because it changes counts, quality metrics, and downstream comparisons.

**Key takeaway:** An existing empty string and SQL NULL are different values. Normalize explicitly when required, and validate source-specific parsing separately.
