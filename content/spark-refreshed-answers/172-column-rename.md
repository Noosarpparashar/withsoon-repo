# How should a column rename be handled?

A column rename should be handled as a controlled schema evolution operation because changing a column's name does not necessarily preserve its relationship with existing data.

The correct approach depends on the underlying storage format:

- **Plain Parquet:** Ordinary name-based reads generally treat the old and new names as different columns unless data is explicitly normalized or a compatible mapping mechanism is used.
- **Delta Lake:** Supports metadata-only column renames when column mapping is enabled.
- **Apache Iceberg:** Supports safe renames using unique field IDs, without rewriting existing data files.

**Important:** Unlike adding a new column, a rename can break downstream queries because consumers referencing the old name will no longer find it.

## 1. What happens when a column is renamed?

Suppose an employee dataset originally contains:

```text
employee_id: INT
name: STRING
salary: DOUBLE
```

Later, name is renamed to full_name. The new schema becomes:

```text
employee_id: INT
full_name: STRING
salary: DOUBLE
```

Logically, both names represent the same information. Ordinary Parquet schema merging does not automatically understand that relationship.

### Example: Plain Parquet

Suppose the dataset contains:

```text
/data/employees/
    part-00001.parquet   # name: STRING
    part-00002.parquet   # name: STRING
    part-00003.parquet   # full_name: STRING
    part-00004.parquet   # full_name: STRING
```

Reading the dataset with schema merging:

```python
df = (
    spark.read
    .option("mergeSchema", "true")
    .parquet("/data/employees")
)

df.printSchema()
```

May produce a schema containing both names:

```text
root
 |-- employee_id: integer
 |-- name: string
 |-- full_name: string
 |-- salary: double
```

Column order is illustrative. Results may look like:

| employee_id | name | full_name | salary |
| --- | --- | --- | --- |
| 101 | Rahul | NULL | 50000 |
| 102 | Priya | NULL | 60000 |
| 103 | NULL | Amit | 70000 |
| 104 | NULL | Neha | 80000 |

Spark sees two different column names rather than recognizing a rename. This is why mergeSchema=true is not sufficient to handle renames safely in plain Parquet datasets.

[spark-reference:rename-field-identity]

## 2. How to handle a column rename in plain Parquet

Normalize historical and incoming data to a common schema.

### Option 1: Rename the column using PySpark

```python
df = spark.read.parquet("/data/employees_old")

renamed_df = df.withColumnRenamed(
    "name",
    "full_name"
)
```

This changes the DataFrame's column name. It does not modify the original Parquet files or update a stored table schema.

To persist the new schema, write to a separate normalized destination:

```python
renamed_df.write.mode("overwrite").parquet(
    "/data/employees_renamed"
)
```

Spark writes new files using the renamed column. The destination here is deliberately different from the source path.

### Option 2: Combine datasets with different column names

Suppose older files use name while newer files use full_name:

```python
old_df = spark.read.parquet("/data/old_employees")
new_df = spark.read.parquet("/data/new_employees")

old_df = old_df.withColumnRenamed(
    "name",
    "full_name"
)

combined_df = old_df.unionByName(
    new_df,
    allowMissingColumns=True
)
```

Both datasets now use the same logical name. The result can be written to a new, normalized dataset.

allowMissingColumns=True fills other missing columns with null; it does not infer renames. Validate the input columns and types, including whether full_name already exists, before renaming and combining the datasets.

## 3. How Apache Iceberg handles column renames

Iceberg identifies columns using unique field IDs rather than relying only on names.

| Field ID | Old column name | New column name |
| --- | --- | --- |
| 1 | employee_id | employee_id |
| 2 | name | full_name |
| 3 | salary | salary |

Although name changes to full_name, its field ID remains 2. Iceberg preserves the field's identity across schema versions.

### Rename using SQL

```sql
ALTER TABLE catalog.db.employees
RENAME COLUMN name TO full_name;
```

Iceberg updates the table metadata:

- Existing data files do not need to be rewritten.
- Historical values remain associated with the same field ID.
- New queries use full_name.
- Queries referencing name must be updated.

Iceberg also supports renaming nested fields. This assumes a configured Iceberg catalog and connector, and reads through the Iceberg table rather than directly scanning its data-file directory as plain Parquet.

## 4. How Delta Lake handles column renames

Delta Lake supports metadata-only renames when column mapping is enabled.

For an existing compatible Delta table with the required protocol support, enable column mapping if it is not already enabled:

```sql
ALTER TABLE employees
SET TBLPROPERTIES (
    'delta.columnMapping.mode' = 'name'
);
```

Then rename the column:

```sql
ALTER TABLE employees
RENAME COLUMN name TO full_name;
```

Delta maintains the association between logical names and their physical representation, so existing files do not need to be rewritten. Access the result through the Delta table, not a plain Parquet scan of its files.

**Important:** Column mapping requires reader protocol 2 or above and writer protocol 5 or above. Enabling it on an older table may require a protocol upgrade. Check reader/writer compatibility and effects on streaming readers and Change Data Feed consumers before enabling it; rename support and schema tracking requirements depend on the Delta version.

## 5. Comparison across storage formats

| Feature | Plain Parquet | Delta Lake | Apache Iceberg |
| --- | --- | --- | --- |
| Recognizes field identity during a rename | Not through ordinary name-based merging | Through supported column-mapping operations | Through field IDs |
| Metadata-only rename | Not generally supported | Yes, with column mapping | Yes |
| Requires rewriting old files | Often, for a normalized physical dataset | No, for a supported metadata rename | No |
| Preserves field identity | No general guarantee from column names alone | Yes, using column mapping | Yes, using field IDs |
| Schema merging sufficient | No | Not the rename mechanism | Not required |
| Downstream queries need updating | Yes | Yes | Yes |

## 6. How should renames be managed in production?

A rename is a potentially breaking schema change. A recommended process is:

1. **Identify dependencies:** Find Spark jobs, queries, dashboards, APIs, streaming applications, and CDC consumers using the original name.
2. **Maintain compatibility:** If necessary, temporarily expose both names using a view or alias.
3. **Apply the appropriate change:** Normalize Parquet data or use metadata-managed renaming in Iceberg or Delta Lake.
4. **Update consumers:** Replace references to the old column.
5. **Validate historical data:** Compare row counts, null counts, and field values before and after the change.
6. **Remove the old alias:** Once consumers have migrated, retire compatibility logic.

After employees exposes full_name, a compatibility view can temporarily expose both names:

```sql
CREATE OR REPLACE VIEW employees_compatible AS
SELECT
    employee_id,
    full_name,
    full_name AS name,
    salary
FROM employees;
```

Older consumers using name can continue by querying employees_compatible, while newer consumers use full_name. Creating this view does not automatically redirect queries that still read employees directly.

## 7. Interview-ready answer

> A column rename should be handled carefully because the behavior depends on the storage format.
>
> In plain Parquet, older files containing name and newer files containing full_name are generally read as two separate columns, even with mergeSchema=true. We can explicitly rename DataFrame columns, normalize historical and incoming data, and rewrite files when necessary.
>
> Apache Iceberg preserves field IDs during ALTER TABLE RENAME COLUMN, so existing data files do not need to be rewritten. Delta Lake also supports metadata-only renames when column mapping is enabled.
>
> In production, treat renames as potentially breaking changes. Identify downstream dependencies, update data contracts, and maintain compatibility through aliases or views when required.

**Key takeaway:** Plain Parquet generally requires explicit reconciliation for column renames. Iceberg and Delta Lake support metadata-based renaming under their respective requirements, but consumers referencing the original name still need attention.
