import type { InterviewAnswer, InterviewAnswerCodeBlock, InterviewAnswerDiagram } from "@/lib/interviewAnswers";

function detailedAnswer(
  summary: string,
  points: string[],
  example: string,
  takeaway: string,
  diagrams?: InterviewAnswerDiagram[],
  codeBlocks?: InterviewAnswerCodeBlock[],
): InterviewAnswer {
  return {
    summary,
    sections: [{ heading: "Detailed explanation", points }],
    example,
    takeaway,
    diagrams,
    codeBlocks,
  };
}

export const SPARK_INTERVIEW_ANSWERS_55_TO_73: Record<string, InterviewAnswer> = {
  "What is the difference between rule-based optimization and cost-based optimization in Spark?": detailedAnswer(
    "In upstream Spark, `spark.sql.cbo.enabled=false` and `spark.sql.cbo.joinReorder.enabled=false` by default. Without CBO, Spark still applies Catalyst rules, uses available size estimates and heuristics for decisions such as automatic broadcast, and can use AQE runtime statistics for supported physical-plan changes, but it does not cost-rank alternative join orders. Rule-based optimization applies semantics-preserving rewrites without comparing estimated plan costs; CBO uses row counts, sizes, selectivity, and other statistics to compare valid alternatives.",
    [
      "Rule examples include constant folding, Boolean simplification, projection and predicate movement, null propagation, and removing redundant operators. A rule fires when its pattern and correctness conditions match.",
      "CBO is useful when several correct plans have very different costs. It can estimate whether joining two selective dimensions before a large fact table creates a smaller intermediate result than following the SQL text order.",
      "CBO depends on statistics. Table size, row count, distinct counts, null counts, minimum/maximum values, and histograms may be relevant, but availability varies by source and collection method.",
      "A cost is an estimate, not a measured runtime. Correlation between columns, skew, stale statistics, UDF selectivity, and remote-source behavior can make the estimate wrong.",
      "Enable CBO and cost-based join reordering deliberately, then collect useful, current table and column statistics. Turning on the settings does not manufacture accurate estimates when statistics are absent or stale.",
      "Adaptive Query Execution complements both approaches by observing shuffle-stage statistics at runtime and revising supported physical decisions after execution has started.",
    ],
    "For a three-table join, rules can push filters into each input. CBO can then reorder the joins using estimated sizes, and AQE can later convert a planned sort-merge join if a runtime side is actually small enough to broadcast.",
    "Rules decide what is logically safe to rewrite; costs help rank alternatives; AQE corrects selected decisions with runtime evidence.",
    [{
      title: "Spark optimization layers",
      steps: [
        { label: "Analyzed plan", detail: "Resolved columns and types" },
        { label: "Rule optimization", detail: "Semantics-preserving rewrites" },
        { label: "Cost-based planning", detail: "Statistics rank alternatives" },
        { label: "AQE", detail: "Runtime statistics revise the plan" },
      ],
    }],
  ),
  "What is the difference between Catalyst and cost-based optimization?": detailedAnswer(
    "Catalyst is Spark SQL's complete query analysis and optimization framework; cost-based optimization is one capability used inside that broader framework. Catalyst resolves names and types, rewrites logical plans, generates physical alternatives, and supports extensible tree transformations. CBO specifically uses statistics to estimate and compare the cost of alternatives such as join orders.",
    [
      "Catalyst begins with an unresolved logical plan and uses the catalog and analyzer to bind tables, columns, functions, aliases, and data types.",
      "Its optimizer applies rule batches even when no catalog statistics exist. Those rules can simplify expressions, prune columns, push predicates, and eliminate unnecessary work.",
      "Its planner maps optimized logical operators to executable physical operators such as scans, hash aggregates, exchanges, broadcast hash joins, and sort-merge joins.",
      "CBO participates only where statistics and alternative choices are available. It is not a separate execution engine and does not replace analysis or rule-based optimization.",
      "AQE also uses Catalyst plan transformations, but applies selected changes to the physical plan using runtime rather than only pre-execution statistics.",
    ],
    "A query can benefit from Catalyst column pruning even when CBO is disabled. The same query needs CBO statistics if Spark is expected to reorder a chain of inner joins based on estimated intermediate sizes.",
    "Catalyst is the framework; CBO is its statistics-driven decision-making component.",
  ),
  "Why is cost-based optimization needed when Spark already has rule-based optimization?": detailedAnswer(
    "Rules can prove that a rewrite is valid and commonly useful, but they cannot always determine which of several valid plans will process the least data. CBO supplies a quantitative comparison. This matters most for joins, where different orders and strategies can change an intermediate dataset from megabytes to terabytes while producing the same final rows.",
    [
      "A rule can push `country = 'IN'` into a scan because doing so preserves results. It cannot know how selective that predicate is unless statistics describe the data.",
      "Join associativity permits several orders for inner joins. CBO estimates the cardinality of each intermediate result and attempts to avoid large early joins.",
      "Physical choices also depend on size: broadcasting a genuinely small relation can remove a shuffle, whereas broadcasting an underestimated relation can exhaust executor memory.",
      "Statistics let the optimizer distinguish queries with identical syntax but very different data distributions. Rules alone would apply the same structural logic to both.",
      "CBO remains imperfect because estimates assume available statistics describe current data and may not capture correlated predicates or severe key skew.",
    ],
    "Joining a billion-row fact table to two dimensions is valid in either order. If one dimension filter leaves 20 rows and the other leaves 20 million, joining the 20-row result first can reduce the next join dramatically; CBO needs statistics to see that difference.",
    "Rule-based optimization finds valid improvements; CBO chooses among valid plans whose real cost depends on the data.",
  ),
  "What happens when table statistics are outdated?": detailedAnswer(
    "Spark plans against an incorrect picture of the data. Stale row counts, sizes, distinct counts, or histograms can lead it to broadcast a relation that is now too large, reject a beneficial broadcast, choose a poor join order, or badly estimate the number of rows produced by a filter. The query remains logically correct, but performance and stability can deteriorate.",
    [
      "Rapidly growing or heavily updated tables are common sources of stale catalog statistics. Partition-level statistics may also be uneven when only some partitions are refreshed.",
      "An underestimated table can cause executor memory pressure during broadcast construction or make downstream partition sizing too small for the real shuffle volume.",
      "An overestimated table can force sort-merge joins and additional exchanges even though the actual filtered relation would fit safely in memory.",
      "AQE can repair some decisions after shuffle statistics become available, including supported join conversions and partition coalescing, but it cannot correct every bad scan, UDF estimate, or decision made before useful runtime statistics exist.",
      "Refresh statistics after material changes, automate analysis for important tables/partitions, inspect estimated versus runtime row counts, and invalidate assumptions after major backfills.",
    ],
    "A dimension recorded as 20 MB grows to 2 GB. A plan based on the old size may attempt to broadcast it to every executor, causing long collection time, memory pressure, or failure instead of selecting a distributed join.",
    "Stale statistics usually hurt plan quality rather than query correctness; compare estimates with runtime evidence and refresh them deliberately.",
  ),
  "Does Spark automatically collect every statistic it needs?": detailedAnswer(
    "No. Spark can obtain basic size information from files, catalogs, and runtime stages, but it does not automatically maintain every table- and column-level statistic needed for accurate CBO across every source. Detailed row counts, distinct counts, null counts, ranges, and histograms often require explicit analysis or a catalog/table format that maintains them.",
    [
      "File length can approximate relation size, but compressed bytes do not directly reveal output rows, predicate selectivity, decoded memory size, or join-key distribution.",
      "Catalog table statistics may be absent, stale, or limited to total size. Column statistics generally require `ANALYZE TABLE ... COMPUTE STATISTICS FOR COLUMNS` or an equivalent maintenance process.",
      "Temporary views, arbitrary DataFrames, JDBC queries, and opaque UDF results may not expose reliable statistics to the optimizer.",
      "AQE collects runtime shuffle-stage statistics automatically for an executing query, but those observations are not the same as a complete, permanently maintained catalog profile.",
      "Statistics collection has scan, storage, and maintenance cost, so production systems prioritize influential tables, partitions, and join/filter columns rather than profiling everything continuously.",
    ],
    "A Parquet table may expose a total byte size sufficient for a rough broadcast decision while lacking a histogram on `country`; Spark then cannot accurately estimate how many rows survive `country = 'IN'`.",
    "Assume statistics are partial until `EXPLAIN` and catalog inspection prove otherwise.",
  ),
  "How do you inspect Spark's optimization decisions?": detailedAnswer(
    "Inspect the plan at multiple stages and compare estimates with runtime metrics. `DataFrame.explain('formatted')`, `explain('extended')`, or SQL `EXPLAIN COST` reveal logical and physical decisions; the Spark SQL UI and executed plan show what actually ran, including AQE revisions, exchanges, join operators, scan filters, and task metrics.",
    [
      "The analyzed plan confirms that columns, aliases, types, functions, and tables resolved as intended. A surprising cast or unresolved semantic assumption often begins here.",
      "The optimized logical plan shows pruning, filter movement, expression rewrites, and join reordering. Look for estimated `rowCount`, `sizeInBytes`, and column statistics where cost output provides them.",
      "The physical plan identifies broadcast hash, shuffled hash, sort-merge, or nested-loop joins; scan nodes show read schemas, partition filters, pushed filters, and remaining filters.",
      "With AQE enabled, compare the initial and final adaptive plans. Query stages, coalesced partitions, skew handling, and converted joins explain why the executed plan differs from the initial plan. `isFinalPlan=false` means the displayed adaptive plan has not yet reached its final executed form.",
      "Validate the plan with SQL UI metrics: actual output rows, shuffle bytes, spill, broadcast size/time, task skew, and stage duration. A plausible plan can still perform poorly on real distribution.",
    ],
    "If a join unexpectedly shuffles both sides, inspect `EXPLAIN COST` for relation sizes, check whether the filter was pushed, and open the final AQE plan to see whether Spark ever observed a broadcastable runtime side.",
    "Read the plan from scan to sink, then prove its assumptions with actual stage metrics.",
  ),
  "Does Adaptive Query Execution replace cost-based optimization?": detailedAnswer(
    "No. CBO and AQE operate at different times and with different information. CBO uses pre-execution catalog and source statistics to construct an initial plan, including join ordering. AQE observes materialized runtime statistics at query-stage boundaries and can revise supported physical decisions such as partition coalescing, skew handling, and some join strategies.",
    [
      "CBO can influence the shape of the plan before tasks start. That early choice affects which exchanges exist and therefore what runtime evidence AQE will later receive.",
      "AQE is strongest after a shuffle has produced accurate partition and relation sizes. It cannot freely rewrite every logical decision or recover all work already performed.",
      "Runtime conversion may replace a sort-merge join with a broadcast or shuffled-hash join when observed sizes meet configured conditions.",
      "AQE can split skewed shuffle partitions and coalesce very small ones, addressing distributions that static averages failed to represent.",
      "Good catalog statistics still reduce wasted stages and produce a stronger starting plan; AQE acts as a feedback layer, not permission to ignore statistics.",
    ],
    "CBO may order filtered dimensions before a fact table. After their shuffles complete, AQE may discover one result is only 8 MB and convert its next join to broadcast. Both optimizers contributed different decisions.",
    "CBO plans with historical knowledge; AQE adapts with evidence from the current execution.",
  ),
  "What is join reordering?": detailedAnswer(
    "Cost-based join reordering is disabled by default in upstream Spark because both `spark.sql.cbo.enabled=false` and `spark.sql.cbo.joinReorder.enabled=false`. Without enabling both and supplying useful statistics, Spark relies on its logical rules, available size estimates, the existing join shape, hints, and AQE rather than cost-ranking alternative join orders. When enabled, join reordering changes the sequence of logically reorderable joins to reduce intermediate size, shuffle, and memory pressure while preserving the final result.",
    [
      "The SQL text order is not necessarily the physical execution order. Spark can construct a join graph and cost-compare alternatives only when CBO, cost-based join reordering, and the required statistics are available.",
      "A selective filter or small dimension should often be joined early so fewer fact rows reach later joins, but only reliable cardinality estimates can quantify that benefit.",
      "The search space grows rapidly with the number of relations, so optimizers use algorithms and thresholds rather than enumerating every possible tree. Current upstream Spark uses `spark.sql.cbo.joinReorder.dp.threshold=12` by default: above the threshold, dynamic-programming join reordering is not attempted for that join set.",
      "Reordering does not remove the need to choose a physical operator. Each reordered edge may still become a broadcast hash, sort-merge, shuffled-hash, or nested-loop join.",
      "Hints can constrain strategy or order, but they should be used after validating statistics and plans because a hard-coded decision can age badly as data changes.",
    ],
    "For `fact JOIN customers JOIN filtered_regions`, joining `customers` first may retain hundreds of millions of rows, while joining a 30-row `filtered_regions` result first can remove most fact rows before the larger join.",
    "Join reordering optimizes intermediate size, not merely the visual order of tables in SQL.",
  ),
  "What if Spark chooses a poor join strategy despite CBO and AQE?": detailedAnswer(
    "Treat the choice as a symptom and verify why Spark believed it was correct. Compare estimated and actual relation sizes, filter selectivity, skew, broadcast thresholds, join conditions, and the final adaptive plan. Then fix the source of the wrong decision where possible; use a hint only when the data contract makes that strategy reliably safe.",
    [
      "Refresh table and column statistics, especially after backfills or growth. Confirm the query references analyzed catalog tables rather than a view or transformation whose cardinality is unknown.",
      "Push selective filters before the join and replace opaque UDF predicates with built-in expressions so Catalyst can estimate and move them.",
      "If one key is skewed, a globally reasonable sort-merge join may still create stragglers. Enable and validate AQE skew handling or use targeted salting/pre-aggregation.",
      "Review `autoBroadcastJoinThreshold`, timeout, executor memory, and the real in-memory size before forcing `BROADCAST`. A compressed 50 MB file can expand far beyond 50 MB when materialized.",
      "Use strategy hints such as `BROADCAST`, `MERGE`, or `SHUFFLE_HASH` as controlled overrides, then load-test and monitor them. Spark may be unable to honor an incompatible hint.",
      "Sometimes the right fix is architectural: pre-aggregate, bucket/cluster compatible tables, materialize a selective intermediate, or remove an accidental many-to-many join.",
    ],
    "If Spark broadcasts a relation that is estimated at 8 MB but actually expands to 900 MB, refresh statistics and expose the filtering logic. Temporarily use a merge hint only after confirming the distributed alternative is stable.",
    "Correct estimates and query shape first; hints are precise tools, not a substitute for understanding the plan.",
  ),

  "What are predicate pushdown and column pruning?": detailedAnswer(
    "Predicate pushdown asks a data source to apply supported filters as close to the scan as possible, reducing rows or row groups read. Column pruning asks the source to return only referenced columns, reducing bytes decoded and transferred. Catalyst derives both from the query, while the connector and file format determine how much can actually be performed below Spark's operators.",
    [
      "In Parquet or ORC, footer statistics can skip row groups or stripes that cannot satisfy a predicate; the source may still read selected pages and Spark can retain a residual filter for correctness.",
      "In JDBC, supported predicates are translated into the remote SQL query, so the database filters before sending rows over the network.",
      "Column pruning changes the scan's read schema. It is especially valuable for wide columnar datasets because unreferenced columns need not be decoded.",
      "Partition pruning is related but separate: it eliminates directory/table partitions using partition metadata before file scanning.",
      "Confirm behavior in the physical plan by inspecting `PushedFilters`, `PartitionFilters`, `ReadSchema`, and remaining `Filter` nodes rather than assuming a `where` or `select` was pushed.",
    ],
    "A query selecting `customer_id` from a 200-column Parquet table with `event_date = '2026-10-09' AND amount > 100` can prune directories by date, read two columns, and use Parquet statistics to skip row groups whose maximum amount is at most 100.",
    "Pushdown reduces rows near storage; pruning reduces columns and partitions before unnecessary bytes enter Spark.",
  ),
  "Does predicate pushdown work with every file format?": detailedAnswer(
    "No. Pushdown requires both a source implementation that accepts filters and a storage representation or remote engine capable of evaluating them. Parquet and ORC support useful metadata-based filtering; JDBC can translate supported expressions to SQL. Plain text and typical CSV files generally must be parsed record by record, so they cannot skip internal blocks using typed column statistics.",
    [
      "Even a capable format supports only particular operators and data types. Equality, ranges, null checks, and simple conjunctions are more likely to push than complex expressions.",
      "Compression layout matters: a splittable columnar file with row-group/stripe statistics can skip regions, while one compressed text stream may require sequential decompression.",
      "Connector implementation matters independently of format. Two data-source versions can expose different pushdown capabilities over the same backend.",
      "Functions, casts, timezone conversions, non-deterministic expressions, and UDFs can prevent translation because the source cannot reproduce Spark's exact semantics.",
      "A physical `Filter` above a scan does not prove pushdown failed; Spark may keep a residual check even when a subset appears under `PushedFilters`.",
    ],
    "`amount > 100` can use Parquet min/max statistics to skip a row group whose maximum is 80. The same condition on CSV requires Spark to parse each candidate line because the file contains no equivalent typed block statistics.",
    "Pushdown is a negotiated capability, not a universal property of writing a filter in Spark.",
  ),
  "What is the difference between predicate pushdown and partition pruning?": detailedAnswer(
    "Partition pruning removes whole table or directory partitions using partition metadata, usually before opening their data files. Predicate pushdown passes a filter into the scan so the source can reduce records or internal blocks within the remaining files or remote relation. A single query can benefit from both, but they act at different physical levels.",
    [
      "A filter on `event_date`, when that column is the dataset's partition key, can exclude all directories except the requested dates. No footer or record scan is needed for excluded partitions.",
      "A filter on non-partition column `amount` may be pushed into Parquet and use row-group statistics, but Spark still opens candidate files in the selected date partitions.",
      "Static partition pruning comes from query predicates known during planning. Dynamic partition pruning derives values from another join side at runtime to filter a partitioned scan.",
      "Partition pruning depends on discoverable partition metadata and compatible predicate forms. Applying a transformation to the partition key can make the pruning relationship harder to recognize.",
      "The plan distinguishes them: partition conditions appear under `PartitionFilters`; source-level record filters appear under `PushedFilters` or data filters.",
    ],
    "For `/sales/event_date=2026-10-09/...`, the date condition prunes other directories. Within the remaining files, `amount > 100` can be pushed to Parquet to skip row groups.",
    "Partition pruning chooses files; predicate pushdown reduces work inside the chosen source scan.",
  ),
  "Does predicate pushdown eliminate the need for a filter operator?": detailedAnswer(
    "Not necessarily. Spark may keep a filter above the scan when the source reports only partial support, when some conjuncts cannot be pushed, or when Spark needs to re-evaluate a predicate to preserve its own SQL semantics. Pushdown is an optimization contract; the residual Spark filter is the correctness boundary.",
    [
      "A plan can show `PushedFilters` and still contain `Filter`. This can mean the source uses the predicate for candidate reduction while Spark verifies every returned row.",
      "A compound condition may split: a simple range pushes while a regex, UDF, or complex nested expression remains in Spark.",
      "File statistics usually prove that a row group cannot match; they do not prove every row in a retained group does match. Spark must filter rows from retained groups.",
      "Null semantics, collation, timestamp rules, decimal precision, and connector implementation can make exact remote evaluation unsafe.",
      "The optimization remains valuable even with a residual filter because fewer files, blocks, or remote rows reach that operator.",
    ],
    "Parquet skips three row groups using `amount > 100`, reads a fourth whose min/max spans the threshold, and Spark's filter removes individual rows at or below 100 from that group.",
    "Pushdown reduces the filter's input; it does not always replace Spark's final correctness check.",
  ),
  "Can a UDF prevent predicate pushdown?": detailedAnswer(
    "Yes. A UDF is generally opaque to Catalyst and to the data-source connector, so Spark cannot safely translate the function into Parquet metadata logic, JDBC SQL, or another source predicate. The scan may therefore read far more data and apply the UDF afterward. Built-in expressions preserve semantics the optimizer understands and should be preferred.",
    [
      "Wrapping a pushable column in a UDF can hide a simple condition. `udf_normalize(country) = 'IN'` is not equivalent, from the optimizer's perspective, to a native expression it knows how to translate.",
      "Spark may still push independent conjuncts. In `date = ... AND my_udf(value)`, the date condition can prune/push even though the UDF portion remains above the scan.",
      "UDFs can also block constant folding, expression simplification, code generation, and accurate selectivity estimates in addition to pushdown.",
      "Replace the function with built-ins such as `trim`, `upper`, `regexp_extract`, higher-order collection functions, or a lookup join when possible.",
      "If a UDF is unavoidable, first apply all native selective predicates and column projection, then invoke the UDF on the smallest possible dataset.",
    ],
    "Instead of `is_target_udf(country)`, express `upper(trim(country)).isin('IN','INDIA')` with native functions when those semantics are correct; inspect the plan to see which part reaches the source.",
    "Opaque logic runs after the scan; expose logic with built-ins to give Catalyst and the connector room to optimize.",
  ),
  "Does column pruning work on nested data?": detailedAnswer(
    "It can, when the data source and Spark reader support nested schema pruning. Spark may request only referenced fields inside a struct instead of decoding the entire nested object. Effectiveness depends on format, reader implementation, data-source version, and query shape; selecting or serializing the whole parent struct can defeat the benefit.",
    [
      "Columnar formats store nested fields in column paths, allowing supported readers to avoid unrelated siblings such as `customer.address.notes` when only `customer.id` is required.",
      "The optimized scan's `ReadSchema` is the evidence. It should show the selected nested path rather than the complete struct.",
      "Using `select('customer.*')`, converting the struct to JSON, passing it to an opaque UDF, or referencing it as one value can force all nested children to be read.",
      "Arrays and maps are more nuanced: selecting one nested field from every array element may still require repetition/definition metadata and collection traversal even if sibling value columns are pruned.",
      "JSON and CSV do not receive the same I/O savings as columnar files because parsing a record may still require scanning its serialized text even when the final schema contains fewer fields.",
    ],
    "For Parquet schema `customer struct<id:long,address:struct<city:string,notes:string>>`, selecting only `customer.id` can produce a narrow read schema; selecting `to_json(customer)` requires the complete struct.",
    "Nested pruning works when the reader can address nested columns and the query does not demand the whole parent value.",
  ),
  "Can SQL structure improve predicate pushdown?": detailedAnswer(
    "Yes. Expressing filters as direct, deterministic comparisons on source columns makes them easier for Catalyst to move toward the scan and for connectors to translate. Equivalent-looking SQL can inhibit pushdown when it wraps columns in unsupported functions, introduces lossy casts, hides logic in a UDF, or places predicates across boundaries whose semantics restrict reordering.",
    [
      "Write sargable conditions such as `event_date >= DATE '2026-10-01'` instead of transforming every value with `date_format(event_ts, ...)` when a direct range is equivalent.",
      "Separate pushable conjuncts from non-pushable ones. Catalyst can push `region = 'APAC'` even if another condition must remain in Spark.",
      "Filter and project before expensive joins, aggregations, or UDFs, while preserving semantics. A filter on the nullable side of an outer join cannot always move below the join safely.",
      "Avoid unnecessary casts on source columns; cast literals to the correct type instead when possible so indexes, partition values, or typed source filters remain usable.",
      "Use `EXPLAIN` rather than relying on SQL appearance. Catalyst can rewrite subqueries and views, but connector limitations still decide the final pushdown.",
    ],
    "A JDBC condition `order_ts >= TIMESTAMP '2026-10-01 00:00:00'` is more likely to become a remote range predicate than `date_format(order_ts,'yyyy-MM') = '2026-10'`, which may require evaluating a function per row.",
    "Write native, type-aligned, deterministic predicates and verify the scan node.",
  ),
  "Does selecting fewer columns always make a query faster?": detailedAnswer(
    "No, although it often helps with wide columnar data. Column pruning reduces scan bytes, decoding, memory, serialization, and network only when the source can avoid reading those columns and when scan cost is material. If the query is dominated by a shuffle, skewed join, UDF, remote latency, or small row-oriented input, the improvement can be negligible.",
    [
      "Parquet and ORC benefit strongly because columns are stored separately. Avro, CSV, and JSON are row-oriented/serialized records, so the reader may still scan most bytes to locate selected fields.",
      "Some columns are physically read even if not in final output because filters, joins, ordering, grouping, or partition logic still require them.",
      "Selecting one nested field can still read broader structures when nested pruning is unsupported or the query references the parent object elsewhere.",
      "For `count(*)`, Spark may use metadata or the smallest available column depending on source capability; selecting an arbitrary column first is not automatically better.",
      "Always remove unused columns for clarity and memory safety, but use scan metrics and the physical plan to quantify performance rather than promising a universal speedup.",
    ],
    "Reducing a 300-column Parquet scan to five columns can cut I/O drastically. Doing the same over a tiny CSV lookup table may barely change runtime because line parsing and job startup dominate.",
    "Projection is a sound default, not a guarantee; the format and bottleneck determine the gain.",
  ),
  "How does predicate pushdown work with JDBC?": detailedAnswer(
    "Spark translates supported DataFrame filters into predicates in the SQL sent to the remote database. The database applies them before returning rows, which reduces network traffic and Spark-side processing and can use remote indexes. In current Spark JDBC, `pushDownPredicate` defaults to `true`; Spark keeps unsupported or semantically unsafe expressions as residual filters after the scan.",
    [
      "The JDBC dialect controls identifier quoting, literal rendering, data-type mapping, and which expressions can be translated correctly for that database.",
      "Simple comparisons, ranges, null checks, and Boolean combinations commonly push. Spark UDFs and unsupported database functions cannot be sent as portable predicates.",
      "Pushdown and parallel reading are separate. `partitionColumn`, bounds, and `numPartitions` create multiple JDBC queries; each query should also carry the relevant pushed filters. Importantly, `lowerBound` and `upperBound` calculate partition strides—they are not global row filters, so Spark still covers the table.",
      "Too many partitions can overload the database with concurrent scans even when filtering is pushed. Treat the database as a shared service with a connection and workload budget.",
      "Inspect the JDBC scan in `EXPLAIN`, database query logs, and returned-row metrics. Do not infer pushdown merely because the filter appears early in application code.",
    ],
    "Spark can turn `status = 'OPEN' AND created_at >= ...` into a remote `WHERE` clause while issuing four bounded range queries on `id`; the database filters and indexes each range before sending results.",
    "JDBC pushdown moves compatible computation to the database, but concurrency and database load still need deliberate control.",
  ),
  "What is the difference between predicate pushdown and dynamic partition pruning?": detailedAnswer(
    "Predicate pushdown sends a known filter into a source scan so that source reduces records or blocks. Dynamic partition pruning creates a partition filter at runtime from values produced by another side of a join, allowing Spark to skip partitions of a partitioned fact table even when those values were not literal constants during initial planning.",
    [
      "Static predicate pushdown can operate with `amount > 100` known directly from the query. It does not require another relation.",
      "Dynamic partition pruning commonly uses a filtered dimension: Spark collects or broadcasts relevant dimension keys and applies them to the fact table's partition column.",
      "DPP skips whole partitions and is most valuable when the fact table is large, partitioned on the join key, and the dimension filter is selective.",
      "After DPP selects partitions, ordinary pushdown and column pruning can still reduce rows and columns inside their files. The optimizations are complementary.",
      "The physical plan shows a dynamic pruning expression/subquery under partition filters; pushed data filters appear separately in the scan metadata.",
    ],
    "A sales table partitioned by `store_id` joins stores filtered to one region. DPP derives the region's store IDs and skips unrelated sales partitions; `amount > 100` can then be pushed into the remaining Parquet scans.",
    "DPP derives partition keys from a join at runtime; predicate pushdown evaluates source-compatible row conditions.",
  ),

  "How does Spark handle schema evolution?": detailedAnswer(
    "Spark handles schema evolution by reconciling the schema requested by a query with schemas stored in files, a catalog, or a transactional table format. Additive nullable fields are usually the safest change. File-level schema merging can combine compatible Parquet schemas, but it is disabled by default because discovering and merging schemas costs planning time. Plain Parquet schema merging is read-time reconciliation—not a schema registry, transactional migration, or automatic solution for renames, deletions, and type changes.",
    [
      "With plain files, Spark is primarily schema-on-read: the supplied or inferred read schema determines how bytes are interpreted. Different files can therefore contain different compatible fields.",
      "Parquet `mergeSchema=true` discovers a union of compatible file schemas. Without merging or authoritative table metadata, a schema selected from metadata/files may omit fields present only in other files.",
      "Supplying an explicit read schema is often cheaper and more predictable than scanning file metadata to discover a union. It also makes the expected contract reviewable, but Spark still needs compatible physical encodings for every requested field.",
      "A catalog or table format can make schema-on-write rules explicit. Delta Lake, Iceberg, and Hudi add controlled metadata changes, transactions, and—in some cases—field identifiers that are safer than matching only by name.",
      "Table formats such as Iceberg, Delta Lake, and Hudi provide provider-specific schema enforcement and evolution operations. Some preserve field identity, but their guarantees must not be attributed to plain Parquet or generic Spark file reads.",
      "Compatibility is a producer-consumer contract, not just a Spark read option. Defaults, nullability, semantic meaning, and downstream code must remain valid across versions.",
      "Production pipelines should validate incoming schemas, classify additive versus breaking changes, version transformations, quarantine unexpected drift, and test both old and new records before deployment.",
    ],
    "Version 1 files contain `id,name`; version 2 adds nullable `email`. A merged or catalog-managed schema can expose `email` and return null for old files. Renaming `name` to `full_name` is not automatically the same operation—it may appear as one deleted and one added field.",
    "Schema evolution is safe only when physical encoding, table metadata, and consumer expectations evolve together.",
    [{
      title: "Controlled schema-change flow",
      steps: [
        { label: "Detect", detail: "Compare incoming and expected schemas" },
        { label: "Classify", detail: "Additive, compatible, or breaking" },
        { label: "Migrate", detail: "Apply table and code changes" },
        { label: "Validate", detail: "Test old and new data" },
        { label: "Monitor", detail: "Track drift and rejected records" },
      ],
    }],
  ),
  "What happens when a new column is added to a Parquet dataset?": detailedAnswer(
    "New Parquet files can physically contain the added column while older files do not. If Spark reads with a schema that includes the new nullable field—or merges compatible file schemas—the old files return null for that column and new files return stored values. If schema merging is off and no authoritative table schema exposes the field, Spark may read a schema that does not include it.",
    [
      "Parquet stores schema metadata per file, so a directory can legally contain files written by different compatible schema versions.",
      "`mergeSchema=true` or `spark.sql.parquet.mergeSchema=true` asks Spark to combine file schemas, but footer discovery and merging add planning cost on large datasets.",
      "A catalog-managed table can expose the new column without scanning every footer; old physical files still yield null because they contain no value for that field.",
      "A non-nullable business requirement needs a default/backfill strategy. Merely declaring the new field non-null does not create values in historical files.",
      "Writers and readers should be deployed in a compatible order: readers must tolerate the new schema before producers depend on the field.",
    ],
    "After adding `loyalty_tier`, files written in September lack the column and return null, while October files contain values. A curated layer can apply `coalesce(loyalty_tier, 'UNKNOWN')` if that default is semantically approved.",
    "An added nullable column is physically absent from old files; Spark represents that absence as null when the read schema includes it.",
  ),
  "Is schema evolution automatically enabled in Spark?": detailedAnswer(
    "No universal switch automatically makes every schema change safe. Spark can infer schemas and some sources support compatible evolution, but behavior depends on the file format, table provider, read/write options, catalog metadata, and change type. In current upstream Spark, `spark.sql.parquet.mergeSchema=false` by default because schema discovery and merging can be expensive.",
    [
      "Plain Parquet can merge compatible schemas only when the merge option or corresponding SQL configuration is enabled, or when a catalog supplies the desired schema.",
      "CSV and JSON inference samples/parses data and can change unexpectedly as records change; production pipelines should provide explicit schemas instead of treating inference as schema governance.",
      "Transactional table formats have their own enforcement and evolution commands. Some permit automatic additive columns on write when explicitly configured, while rejecting incompatible types.",
      "Streaming queries persist source and state assumptions in checkpoints; a source option that accepts a new field does not guarantee a running stateful query can change schema in place.",
      "Automatic acceptance is risky because a syntactically compatible field can still change business meaning, nullability, units, or privacy classification.",
    ],
    "Writing a Parquet file with an extra column beside older files does not guarantee every Spark read sees that column. The reader needs a supplied/managed schema or schema merging, and downstream code must know how to handle historical nulls.",
    "Spark offers evolution mechanisms; the pipeline owner must enable and govern the correct one for the source and change type.",
  ),
  "What happens when a column's data type changes?": detailedAnswer(
    "A type change can be compatible, coercible with risk, or breaking. Safe widening such as certain integer expansions may be supported by a table format or an explicit cast, while incompatible changes such as string to integer can fail during analysis/read or produce null/error for invalid values. Files written with mixed physical types are not automatically a coherent dataset.",
    [
      "Parquet records a physical/logical type in each file. Spark must reconcile that encoding with the requested schema, and incompatible file schemas can raise conversion or merge errors. `mergeSchema` does not promise to coerce arbitrary mixed physical types into one safe type.",
      "Implicit casts can lose precision, overflow, alter timestamps/time zones, or reinterpret decimals. ANSI mode makes many invalid conversions fail instead of silently returning bad values.",
      "Prefer an additive migration: write a new column with the target type, validate conversion, update consumers, backfill history, and retire the old field later.",
      "For streaming, a type change can conflict with checkpointed state and serializer schemas; use a controlled new query/checkpoint or documented state migration rather than hoping a restart adapts.",
      "A table format may support declared type widening while blocking narrowing. Follow its compatibility matrix, not a generic assumption about Spark casts.",
    ],
    "To change `amount` from string to decimal, create `amount_decimal` with `try_cast`, measure rejected values, fix producers, backfill, migrate consumers, and only then remove the string column.",
    "Treat type changes as data migrations with validation, not merely metadata edits.",
  ),
  "How should a column rename be handled?": detailedAnswer(
    "Handle a rename through table metadata that preserves field identity, or as a staged compatibility migration. In name-based plain files, changing `customer_id` to `client_id` usually looks like deleting one field and adding another; Spark cannot infer that the two names represent the same logical column, and old files may populate one while new files populate the other.",
    [
      "With plain Parquet and name-based resolution, read both names during transition and create one canonical value, for example `coalesce(client_id, customer_id)` after confirming they cannot conflict.",
      "A table format with stable field IDs and explicit rename support can change the display name without rewriting all data, but consumers and engines must understand that metadata. Plain name-based Parquet reads do not infer rename intent; field-ID behavior must be deliberately enabled and supported end to end.",
      "Deploy readers that accept both names before producers switch. Update contracts, catalogs, quality rules, lineage, access policies, and downstream SQL—not only Spark code.",
      "Backfill or rewrite when older consumers cannot understand the new metadata or when plain-file readers must see one consistent physical schema.",
      "Do not enable generic schema merging and assume it performs a rename; it can expose both columns as separate fields and split the data across them.",
    ],
    "During migration, expose `canonical_customer_id = coalesce(client_id, customer_id)`, reject rows where both are present but disagree, and remove the alias only after historical data and consumers are migrated.",
    "A rename needs identity-aware metadata or a dual-read transition; name matching alone sees delete plus add.",
  ),
  "What is the difference between backward and forward schema compatibility?": detailedAnswer(
    "Backward compatibility means a new reader can correctly read data written with an older schema. Forward compatibility means an old reader can correctly read data written with a newer schema. Full compatibility requires both directions. The exact rules depend on the serialization format, default values, field identity, and reader behavior.",
    [
      "Adding an optional field with a reader default is often backward compatible because the new reader can supply the default for old records.",
      "The same addition is forward compatible only if old readers safely ignore unknown fields. Some strict consumers reject them.",
      "Removing a field can be forward compatible for a new writer only when old readers have a default or do not require it; otherwise old consumers fail.",
      "Changing type, nullability, units, or semantic meaning can break either direction even if the physical parser accepts the bytes.",
      "Compatibility should be tested with a matrix: old data/new reader and new data/old reader, including realistic nulls and defaults—not just schema-registry syntax checks.",
    ],
    "Schema v2 adds nullable `email` with a default. A v2 reader can read v1 records by supplying null; a v1 reader is forward compatible only if it ignores the unknown `email` field in v2 records.",
    "Backward asks whether new code reads old data; forward asks whether old code reads new data.",
  ),
  "How do you handle schema evolution in streaming jobs?": detailedAnswer(
    "Treat streaming schema changes as versioned deployments because the query is long-lived and its checkpoint can contain offsets, encoded state, and operator metadata based on the old schema. Validate the incoming schema before stateful logic, make additive changes backward compatible, and use a planned new query/checkpoint or supported state migration for breaking changes.",
    [
      "Use an explicit source schema or schema registry. Do not allow a JSON inference result to change unpredictably while the query is running.",
      "Preserve raw payload and schema/version metadata so a rejected or newly introduced record can be replayed after the pipeline is updated.",
      "For additive fields, deploy readers that tolerate absence/defaults before producers emit the field. A running file-stream query normally uses the schema with which it was planned; adding a source field does not mean the active query will automatically begin using it. Keep state keys and aggregation types stable unless the exact Spark/table-format version explicitly supports the evolution.",
      "For type, key, or state-schema changes, run a parallel versioned query, migrate/backfill state or rebuild it from retained input, verify outputs, then cut over.",
      "Monitor schema IDs, unknown-field counts, parse failures, null-rate shifts, and dead-letter volume. Alert before drift silently changes business results.",
    ],
    "A Kafka producer introduces `currency`. First deploy a consumer schema where it is optional, write raw events with schema ID, populate a default only when valid, then update aggregation logic. A later key-type change launches a new checkpointed query and replays retained offsets.",
    "In streaming, evolve the source contract and checkpointed state deliberately; a restart is not a schema migration strategy.",
  ),
  "What happens when a source column is deleted?": detailedAnswer(
    "New records or files no longer contain the field, while historical data may still contain it. A read schema that keeps the column generally produces null for new data when the format supports missing nullable fields. Downstream filters, joins, constraints, and aggregations can then silently change behavior, so deletion must be treated as a breaking contract unless every consumer proves the field optional.",
    [
      "For plain Parquet, merged or table schemas may continue to expose the old field because older files contain it. New files contribute null values.",
      "If readers infer schema only from newer data, the deleted field can disappear from the DataFrame entirely and cause analysis errors in code that references it.",
      "A filter such as `status = 'ACTIVE'` drops null rows, so a deleted field can reduce output to zero without a parsing exception.",
      "Deprecate first: inventory consumers, stop new dependencies, make readers tolerant, and retain an alias/default only when its business meaning remains valid.",
      "Preserve raw history and update quality rules, catalog metadata, privacy policies, and downstream models before physically rewriting or dropping historical data.",
    ],
    "If producers remove `country`, keep it optional during a transition and alert on its missing rate. Do not replace it with `'UNKNOWN'` if geographic routing requires a real country; quarantine or derive it through an approved source instead.",
    "A missing field can produce nulls or disappear from the inferred schema; both outcomes can silently alter downstream logic.",
  ),
  "How do you handle schema drift in JSON data?": detailedAnswer(
    "Use an explicit expected schema and separate parsing from validation. JSON is flexible and self-describing per record, so producers can add fields, change types, alter nesting, or send malformed payloads without changing a file header. A robust pipeline preserves the raw payload, parses known fields, captures corrupt or unexpected records, and promotes schema changes only through a governed contract.",
    [
      "Avoid repeated production inference: inferred types depend on observed records and options, can widen unexpectedly, and require scanning input.",
      "Use `from_json` with a versioned schema for Kafka strings, retain schema ID/version, and route `_corrupt_record` or null parse results with error context to quarantine storage.",
      "Measure unknown fields, missing required fields, type mismatches, nesting changes, and null-rate shifts. A syntactically valid JSON document can still violate the business schema.",
      "For additive optional fields, update the schema and downstream table through a reviewed release. For conflicting types, normalize into a new canonical field rather than relying on permissive string coercion.",
      "Keep bronze/raw data immutable so records can be reprocessed when a new schema version becomes supported.",
    ],
    "When `device.id` changes from integer to string for one producer, the bronze layer keeps the original JSON and producer version; validation quarantines incompatible records while the curated migration introduces a canonical string identifier.",
    "Schema drift is controlled by explicit parsing, observability, quarantine, and replay—not by trusting permissive inference.",
  ),
  "What is the difference between schema-on-read and schema-on-write?": detailedAnswer(
    "Schema-on-write validates and organizes data against a defined schema before it is accepted into the governed dataset. Schema-on-read stores data with less upfront normalization and applies a schema when a consumer reads it. The distinction is about when enforcement occurs; most mature lake architectures combine both at different layers.",
    [
      "Schema-on-write gives predictable types, constraints, partitioning, and query behavior, but rejects or delays records that do not satisfy the contract and makes migrations deliberate.",
      "Schema-on-read preserves ingestion flexibility and raw fidelity, which is useful for semi-structured sources and future reprocessing, but every reader can interpret the same bytes differently.",
      "Parquet files carry physical schemas even in a schema-on-read lake; the term does not mean data has no encoding. It means the unified business contract may be applied later.",
      "A bronze layer often stores raw JSON/Avro plus metadata, while silver/curated tables enforce types, deduplication, quality rules, and controlled evolution on write.",
      "Governance still applies to raw data: access control, retention, encryption, schema version, lineage, and quarantine cannot be postponed indefinitely.",
    ],
    "A landing topic stores the original Avro event for replay (flexible read interpretation), while a curated Iceberg/Delta table accepts only records matching the versioned customer schema and quality rules.",
    "Schema-on-read favors flexibility; schema-on-write favors consistency; layered systems use each where its trade-off belongs.",
  ),
  "What is the biggest risk in schema evolution?": detailedAnswer(
    "The greatest risk is silent semantic corruption: a change remains technically readable but alters meaning, units, defaults, key identity, null behavior, or field mapping, so the pipeline continues producing plausible yet incorrect data. Loud failures are easier to detect than a rename treated as two fields or a type/default change that biases aggregates.",
    [
      "Name-based formats can interpret a rename as delete plus add, splitting historical and new values across columns without an exception.",
      "Permissive casts can turn incompatible values into null, truncation, overflow, or changed timestamps; aggregate results then drift quietly.",
      "A changed key can break deduplication, joins, partitioning, and streaming state even when all rows parse successfully.",
      "Consumer compatibility is broader than Spark: BI models, quality checks, feature pipelines, permissions, retention policies, and external APIs may depend on the old semantics.",
      "Mitigate with versioned contracts, compatibility tests, canary/dual reads, reconciliation of old and new outputs, lineage-based consumer inventory, and monitored null/cardinality/distribution changes.",
    ],
    "Changing `amount` from cents to dollars while retaining the same numeric type passes every schema check but changes revenue by 100x. A semantic contract and distribution/reconciliation alert are the only defenses.",
    "The most dangerous schema change is one that succeeds technically while changing the truth represented by the data.",
  ),

  "What are Spark UDFs?": detailedAnswer(
    "A Spark user-defined function packages custom logic so it can be called from DataFrame expressions or Spark SQL when no suitable built-in expression exists. Spark serializes the function/closure and dependencies, sends them to executors, and evaluates the function for rows, Arrow batches, groups, or tables depending on the UDF API. UDFs extend Spark, but their bodies are opaque to Catalyst and may introduce object conversion, serialization, code-generation boundaries, or JVM-to-Python communication.",
    [
      "A scalar UDF returns one value per input row. A UDAF combines many rows into an aggregate, while UDTFs can produce a table-shaped result in supported APIs.",
      "Scala/Java UDFs run in executor JVMs. Python UDFs run in separate Python workers and exchange values with the executor JVM. Arrow-optimized scalar UDFs and Pandas UDFs can reduce serialization cost with columnar batches, but they do not remove the process boundary.",
      "Catalyst still plans the surrounding query and can prune unrelated columns or move independent filters, but it normally cannot inspect the UDF body to simplify, reorder, or push that expression into a source.",
      "UDF authors must define return types and handle nulls, exceptions, determinism, dependency packaging, and per-task initialization explicitly.",
      "Prefer native SQL/DataFrame functions for common string, date, JSON, array, map, window, and conditional logic; use a UDF only when the required semantics cannot be expressed clearly and correctly with those tools.",
    ],
    "A proprietary checksum algorithm may justify a UDF. Normalizing a phone number with standard regex and string operations usually does not, because built-ins remain visible to Catalyst and execute in optimized Spark code.",
    "A UDF is an extension boundary: useful for irreducible custom logic, costly when it replaces an available native expression.",
  ),
  "Why should UDFs be avoided when built-in functions can be used?": detailedAnswer(
    "Built-in functions describe their semantics to Catalyst and execute through Spark's optimized expression engine. A UDF usually appears as an opaque call, limiting constant folding, predicate pushdown, expression simplification, accurate selectivity estimation, and whole-stage code generation around that expression. Python UDFs add serialization and cross-process overhead as well.",
    [
      "Native expressions stay in Spark's compact internal row representation; a UDF may convert values into JVM objects, Python objects, or Arrow/Pandas batches and back.",
      "Catalyst can reason about `upper`, `substring`, `when`, array/map higher-order functions, and SQL predicates, but cannot prove what arbitrary user code returns or whether it has side effects.",
      "Built-ins have defined SQL null and type behavior, are broadly tested, and receive engine improvements without application changes.",
      "UDFs complicate debugging: failures surface inside executor tasks, dependencies must be serialized/deployed, and stack traces can be less connected to the logical plan.",
      "If a UDF remains necessary, reduce its input first with native filters/projections, batch expensive setup per partition/iterator, and benchmark against a built-in or join-based alternative.",
    ],
    "Use `transform(items, x -> upper(x))` or the DataFrame equivalent instead of a Python UDF that loops over an array and uppercases each value; the native expression avoids a Python boundary and remains optimizable.",
    "Built-ins expose intent to the engine; UDFs hide it and should earn their cost through genuinely custom logic.",
  ),
  "Are Scala UDFs faster than Python UDFs?": detailedAnswer(
    "Usually, but not universally. A Scala UDF executes inside the executor JVM and avoids moving each batch between JVM and Python worker processes. A traditional Python UDF adds serialization/deserialization, inter-process transfer, and Python execution overhead. However, both are generally less optimizable than native Spark expressions, and a vectorized Pandas/Arrow implementation can outperform poorly written object-heavy Scala code for suitable algorithms.",
    [
      "Scala avoids the executor-JVM-to-Python-worker serialization and inter-process transport required by Python evaluation. Py4J is primarily part of driver-side PySpark communication, so it should not be used as shorthand for the per-row executor data path.",
      "A Scala UDF can still allocate one object per row, trigger GC, break code-generation pipelines, and become slower than a built-in function.",
      "Python scalar UDF performance depends on serializer mode, batch size, data types, worker reuse, and the cost of the function relative to transfer overhead.",
      "Pandas UDFs amortize transfer across Arrow batches and use vectorized libraries, but materializing Pandas objects and batches consumes memory and is not free.",
      "Compare equivalent semantics on production-like data using the executed plan, task CPU, GC, Python time, serialization metrics, and peak memory rather than ranking languages alone.",
    ],
    "A one-line arithmetic transform is fastest as a native column expression. For a custom JVM library with no Spark equivalent, Scala may be appropriate; for a vectorized scientific library, a Pandas UDF may be competitive despite the Python boundary.",
    "Scala usually reduces transport overhead, but native expressions remain the first choice and measurement decides between custom implementations.",
  ),
  "Are Pandas UDFs always faster than regular Python UDFs?": detailedAnswer(
    "No. Pandas UDFs use Arrow to transfer columnar batches and invoke vectorized Pandas operations, which often reduces per-row serialization and interpreter overhead. They can be slower when batches are small, conversion dominates, the function is not truly vectorized, memory pressure causes spills/failures, or the data types require expensive conversions. A native Spark expression is still commonly faster than either.",
    [
      "Pandas UDF speed comes from amortizing boundary costs and operating on Series/arrays, not from the decorator itself. A Python loop inside a Pandas UDF can erase most of the benefit.",
      "A scalar Series-to-Series Pandas UDF receives an internal Arrow batch, not the entire DataFrame column. It must return the same number of rows and must not calculate a supposedly global statistic from one arbitrary batch.",
      "Arrow supports many but not all type combinations equally; nested structures, timestamps, decimals, or version mismatches can add constraints and conversion work.",
      "Each task materializes batches in both JVM/Arrow and Python/Pandas representations, so executor memory overhead and batch size must be monitored.",
      "For computationally expensive vectorized NumPy/Pandas operations, transfer cost can be small relative to saved compute. For a trivial conditional, transfer can dominate.",
      "Benchmark warm workers and realistic partitions, include null/type correctness, and compare with Arrow-optimized scalar UDFs and native higher-order functions available in the deployed Spark version.",
    ],
    "Vectorized z-score computation over large numeric batches may benefit from Pandas/NumPy. Converting a string to uppercase in a Pandas UDF is unnecessary overhead compared with Spark's native `upper`.",
    "Pandas UDFs optimize a particular data-transfer and vectorization pattern; they are not a universal fast version of Python code.",
  ),
  "What role does Apache Arrow play in Pandas UDFs?": detailedAnswer(
    "Apache Arrow provides a language-neutral, columnar in-memory representation used to move batches between Spark's JVM processes and Python workers efficiently. Instead of serializing every row as individual Python objects, Spark writes column buffers that Python/Pandas can consume in batches, then converts returned batches back to Spark's internal representation.",
    [
      "Columnar buffers improve locality and reduce per-row serialization calls. Supported primitives can be transferred with fewer copies than pickled row objects.",
      "Arrow handles transport and type representation; Pandas or user code still performs the computation. Arrow does not automatically vectorize a Python loop or optimize the business algorithm.",
      "Spark splits each task's input into Arrow batches. Batch size trades call overhead against Python memory usage and must fit input buffers, Pandas objects, intermediates, and returned buffers. The batch boundaries are implementation details and must not change the result.",
      "Schema and type conversion remain important: timestamps, decimal precision, nested values, null masks, and unsupported combinations can affect correctness or performance.",
      "Modern PySpark also supports Arrow optimization for scalar Python UDFs and direct Arrow UDF forms, but API availability and behavior depend on the deployed Spark version.",
    ],
    "For two million numeric rows, Spark sends a sequence of internal columnar batches to Python; a scalar Pandas UDF returns one value for every input value. An iterator Pandas UDF can initialize an expensive model once for that iterator invocation and reuse it across its batches.",
    "Arrow accelerates cross-language batch exchange; the function still needs an efficient, type-correct implementation.",
  ),
  "Do UDFs completely disable Catalyst optimization?": detailedAnswer(
    "No. Catalyst continues to analyze and optimize the query around the UDF, but it cannot generally inspect the UDF's internal logic. It can prune columns the function does not reference, push independent predicates, choose joins, and optimize other expressions. It usually cannot push the UDF predicate into a source, simplify its internals, infer precise selectivity, or freely reorder it when determinism/side effects are uncertain.",
    [
      "A projection containing one UDF does not turn the whole query into unoptimized execution. Native scans, filters, joins, and aggregations elsewhere still use Catalyst and AQE.",
      "If the only selective condition is inside a UDF, the source may read all candidate data before evaluating it, which can dominate the query despite other optimizations.",
      "Deterministic metadata allows some reuse/reordering assumptions, while a non-deterministic UDF must be evaluated with stricter semantics.",
      "Scala UDFs may break whole-stage code generation at their expression boundary; Python UDFs appear as separate evaluation operators and exchange batches/rows with Python workers.",
      "Refactor native portions out of the UDF so Catalyst can see them, and confirm the boundary in the optimized and physical plans.",
    ],
    "For `date = ... AND risk_udf(payload) > 0.8`, Spark can prune the date partition and required columns, but `risk_udf` itself remains an opaque executor-side evaluation unless replaced by supported native/model expressions.",
    "A UDF narrows Catalyst's visibility at that expression; it does not switch Catalyst off for the entire query.",
  ),
  "When is using a UDF justified?": detailedAnswer(
    "A UDF is justified when required logic cannot be expressed correctly and maintainably with Spark SQL/DataFrame built-ins, higher-order functions, joins, or supported libraries, and when the value of that custom logic outweighs its optimization and runtime cost. Typical examples include proprietary algorithms, specialized parsing, legacy domain libraries, and controlled model/scoring code.",
    [
      "First prove the gap. Many historical UDF use cases now have native regex, JSON, timestamp, array/map, lambda, geospatial, or table-function alternatives depending on the Spark distribution.",
      "Choose the least expensive boundary: JVM UDF for an existing JVM library, vectorized Pandas/Arrow for suitable batch computation, or `mapPartitions`/iterator initialization when expensive resources must be reused.",
      "Specify inputs, output schema, null behavior, determinism, exception policy, and dependency versions as part of the function contract.",
      "Apply native filters and projections first so the UDF processes the minimum rows and columns; never bury easy predicates inside it.",
      "Load-test CPU, serialization, Python-worker memory, skew, and failure behavior. Provide correctness fixtures that compare edge cases with a trusted implementation.",
    ],
    "A validated native library that tokenizes an industry-specific binary payload can justify a JVM UDF. Joining a country-code dimension is preferable to a giant UDF `if/else` lookup because the join is visible and maintainable.",
    "Use a UDF for irreducible domain logic after exhausting transparent native representations.",
  ),
  "Can a UDF cause executor out-of-memory errors?": detailedAnswer(
    "Yes. A UDF runs inside executor task capacity and can allocate large objects, retain references, expand one input into huge outputs, load a model per row, or materialize Arrow/Pandas batches beyond available memory. Multiple tasks run concurrently in one executor, so a function that appears safe for one task can exhaust memory when several execute together.",
    [
      "JVM UDF allocations contribute to executor heap and garbage collection. Large per-row collections or caches can survive long enough to create severe GC pressure.",
      "Python and Pandas UDF memory lives largely in Python worker/native processes and counts against container memory overhead, not only `executor-memory`.",
      "Arrow batching can temporarily hold input buffers, Pandas objects, intermediate arrays, and output buffers at once. Oversized batches or wide schemas multiply peak use.",
      "Skew sends an unusually large partition/group to one task, making a grouped Pandas UDF or per-key operation dangerous even when average partitions are small.",
      "Mitigate by reducing input, using iterator UDFs for reusable initialization, limiting batch/partition size, avoiding unbounded collections, sizing memory overhead, and monitoring peak execution/Python memory—not merely average heap.",
    ],
    "A grouped Pandas UDF receives one customer with 50 million events as a single Pandas group and fails while other tasks succeed. Repartitioning alone does not split that key; the algorithm needs bounded aggregation or special skew handling.",
    "UDF memory must be bounded per row, batch, group, and concurrent executor task.",
  ),
  "Can a UDF be used in a Spark SQL query?": detailedAnswer(
    "Yes. Register the function with the Spark session/catalog under a SQL name, or create a persistent/catalog function where the deployment supports it, then call it like another SQL function. Registration exposes the signature—not the internal semantics—so the same performance, null-handling, determinism, dependency, and optimization cautions still apply.",
    [
      "A session temporary UDF exists only for that SparkSession/application; SQL statements in that session can resolve it by name.",
      "A permanent function requires its implementation artifact and catalog metadata to be available on every cluster/session that executes it.",
      "Specify a precise return type. Incorrect type declarations can cause conversion failures or, worse, values interpreted differently from the implementation.",
      "Use namespacing/versioning for shared functions so a code deployment does not silently change semantics for existing queries.",
      "SQL usage does not turn a UDF into a native Catalyst expression. Inspect the plan and prefer a built-in function whenever equivalent.",
    ],
    "After registering `normalize_account`, SQL can call `SELECT normalize_account(raw_id) FROM events`; deploy the same versioned JAR/Python environment to executors and document how null and invalid IDs are handled.",
    "SQL registration makes a UDF callable, not inherently optimizable or globally portable.",
  ),
  "What happens when a UDF throws an exception?": detailedAnswer(
    "The task attempt evaluating that row or batch fails. Spark may retry the task on the same or another executor, but deterministic bad input usually throws again until the stage exceeds its retry limit and the job or streaming micro-batch fails. Retrying is useful for transient executor faults, not for an unhandled business-data exception.",
    [
      "A Python UDF exception is reported through the Python worker/executor boundary; the driver receives a task failure with a wrapped stack trace. A JVM UDF failure propagates through the executor task.",
      "Repeated task attempts can repeat any external side effects inside the UDF, another reason UDFs should be pure and side-effect free.",
      "Catching every exception and returning null keeps the job alive but can silently corrupt results. Distinguish expected invalid input from programming/infrastructure faults.",
      "For expected invalid values, validate with native expressions or return a structured result containing value and error code, then quarantine and count failures.",
      "For unexpected exceptions, fail with contextual but non-sensitive diagnostics, alert, fix the code/data contract, and replay from durable input or checkpoint.",
    ],
    "A parser UDF receives malformed bytes. Instead of an uncaught index error that fails every retry, a controlled parser emits `{value:null,error:'INVALID_LENGTH'}` and the pipeline routes that row to a dead-letter table while enforcing an error-rate threshold.",
    "Task retry cannot repair deterministic bad logic; design explicit data-error handling and keep unexpected failures loud.",
  ),
  "What is a deterministic versus non-deterministic UDF?": detailedAnswer(
    "A deterministic UDF returns the same result for the same inputs under the same declared environment. A non-deterministic UDF can vary because it uses randomness, current time, mutable state, external services, unordered data, or other changing context. Spark needs this distinction because caching, expression reuse, reordering, retries, and replay assume repeatable computation unless told otherwise.",
    [
      "A pure normalization function with fixed rules is deterministic. A function calling `now()`, generating a UUID, or reading a changing HTTP endpoint is non-deterministic.",
      "Incorrectly marking a changing function deterministic can let the optimizer reuse or rearrange evaluations in ways that violate application expectations.",
      "PySpark UDFs are treated as deterministic by default. Call `asNondeterministic()` when repeated evaluation may differ; declaring the property correctly does not make external side effects safe.",
      "A non-deterministic function makes replayed streaming batches produce different values, complicating exactly-once sinks and reconciliation.",
      "External lookup logic should generally be represented as a versioned dimension snapshot and join, making the data dependency explicit and repeatable.",
      "Seeded randomness is deterministic only if partitioning, ordering, and evaluation count are also controlled; retries and plan changes can otherwise alter results.",
    ],
    "`sha256(account_id)` is deterministic. `risk_score_from_live_api(account_id)` is not, because the service model or response can change between task attempts; snapshot scores or model version and compute locally instead.",
    "Determinism is essential for safe optimization and replay; declare and design it honestly.",
  ),
  "What is the difference between a UDF and a UDAF?": detailedAnswer(
    "A scalar UDF maps each input row's values to one output value and does not combine rows. A user-defined aggregate function consumes multiple rows for a group, maintains an aggregation buffer/state, merges partial buffers across partitions, and produces one result per group or window. The distributed merge contract makes UDAFs more complex and sensitive to state size and algebraic properties.",
    [
      "UDF example: normalize one email address. UDAF example: compute a custom sketch or weighted statistic across all events for each customer.",
      "A scalable UDAF needs bounded intermediate state and associative merge behavior because Spark aggregates partitions independently before combining them.",
      "Ordering is not guaranteed across distributed partitions unless the operation explicitly establishes it; an aggregate that depends on arbitrary arrival order can be incorrect.",
      "Built-in aggregates receive optimized partial aggregation, binary buffers, code generation, and known null semantics. Prefer them or compose them before implementing a UDAF.",
      "In streaming, aggregate state persists across triggers and requires watermarks/timeouts where applicable; an unbounded custom buffer can grow indefinitely.",
    ],
    "A UDF can compute `net = gross - tax` for each row. A UDAF computing a custom quantile sketch creates a sketch per partition, merges sketches by key, and emits one quantile estimate per group.",
    "A UDF transforms a row; a UDAF defines a distributed, mergeable aggregation over rows.",
  ),
  "What are the best alternatives to UDFs?": detailedAnswer(
    "Use expressions the optimizer understands: built-in SQL/DataFrame functions, `when`/`case`, window functions, higher-order array/map functions, joins to reference data, native JSON/CSV parsing, and supported extension libraries. The best alternative models the logic as relational or columnar operations so Catalyst can optimize and Spark can execute it without an opaque per-row boundary.",
    [
      "Replace lookup dictionaries and large conditional ladders with a broadcastable/versioned dimension table and join; this improves governance and updateability.",
      "Use `transform`, `filter`, `exists`, `aggregate`, and map functions for nested collections rather than converting each collection into Python.",
      "Use window functions for ranking, lag/lead, running totals, and session-like relational calculations rather than maintaining custom mutable state.",
      "Use native regex, date/time, URL, hashing, cryptographic, JSON, and conditional functions where semantics match; native expressions preserve pushdown/codegen opportunities.",
      "If custom code is unavoidable, consider a JVM expression/plugin, Arrow/Pandas iterator function, `mapPartitions`, or a precomputed service output based on performance, deployment, and correctness requirements.",
      "Sometimes restructuring the data model—normalizing nested data, materializing a reusable derived column, or pre-aggregating—removes repeated custom computation entirely.",
    ],
    "Replace a UDF that maps 20,000 product codes to categories with a governed product dimension join; replace a Python loop over tags with `transform` and `filter`; reserve a vectorized UDF for a proprietary numerical algorithm with no native expression.",
    "Prefer transparent relational and built-in expressions; choose the narrowest custom boundary only for logic the engine truly cannot represent.",
  ),

  "How does Spark handle nulls and missing data?": detailedAnswer(
    "Spark SQL represents missing/unknown values with SQL null and follows three-valued logic: a comparison can be true, false, or unknown. Ordinary arithmetic and equality involving null commonly return null/unknown; filters keep only true rows. Spark provides explicit null tests, null-safe equality, filling, dropping, and coalescing functions, but the correct treatment must come from business semantics rather than a blanket replacement.",
    [
      "Use `isNull`/`isNotNull` to test null. `col = null` does not work as a true null test because the result is unknown.",
      "Most aggregates ignore null inputs: `count(column)` excludes null, while `count(*)` counts rows. An aggregate over no non-null values can itself be null.",
      "Ordinary equi-joins do not match null keys. Null-safe equality (`<=>` in SQL or `eqNullSafe`) treats two nulls as equal and must be used only when that matches the domain.",
      "`fillna`, `coalesce`, `dropna`, conditional expressions, or domain-specific imputation can transform missing values. Each can change distributions and meaning, so quality metrics must record the decision.",
      "Null differs from NaN, empty text, zero, sentinel dates, and absent nested fields. Normalize them only through an explicit data contract.",
    ],
    "For customer age, null may mean 'not supplied' and should remain unknown; replacing it with zero would invent newborn customers and distort averages. Track the null rate and decide whether to quarantine, impute, or preserve it.",
    "Null handling is SQL logic plus a business decision; never equate missing with an arbitrary value by default.",
  ),
  "What is the difference between null, NaN, an empty string, and zero?": detailedAnswer(
    "They represent different states. Null means no known value; NaN is a special IEEE floating-point value meaning an undefined/not-a-number numeric result; an empty string is a known string of length zero; and zero is a valid numeric value. Spark predicates, aggregates, joins, ordering, and quality checks treat them differently.",
    [
      "Null participates in SQL three-valued logic and is tested with `isNull`. Many aggregates ignore it and ordinary equality does not match it.",
      "NaN exists for floating types and is tested with `isnan`; it is not the same as null. In Spark SQL, `NaN = NaN` is true, NaN sorts above every other numeric value, and all NaN values group together under one grouping key. These are defined Spark semantics, not behavior that needs to be guessed or verified at interview time.",
      "An empty string is present data. `length(value)=0` can identify it, while whitespace-only strings require an explicit trim rule.",
      "Zero contributes to sums, averages, comparisons, and joins. Replacing missing numeric values with zero asserts a real measurement and can bias every aggregate.",
      "Profiling should report each category separately, including sentinels such as `'N/A'`, `-1`, or `9999-12-31`, before canonicalization.",
    ],
    "In a temperature column, null can mean sensor missing, NaN can mean invalid calculation, and 0°C is a real observation. Treating all three as zero changes both quality reporting and the mean.",
    "Missing, invalid, empty, and zero are distinct facts; normalize only with domain-approved rules.",
  ),
  "Does COUNT(*) include rows containing null values?": detailedAnswer(
    "Yes. `COUNT(*)` counts rows, regardless of whether one or every column in a row is null. `COUNT(column)` counts only rows where that specific expression is non-null. `COUNT(DISTINCT column)` counts distinct non-null values under Spark SQL aggregate semantics.",
    [
      "A row with `(id=null, amount=null)` contributes one to `COUNT(*)` and zero to `COUNT(id)` and `COUNT(amount)`.",
      "`COUNT(1)` is also a row count because the literal expression is non-null for every row; the optimizer generally treats it similarly to `COUNT(*)`.",
      "For completeness, compare `COUNT(*)`, `COUNT(column)`, and `SUM(CASE WHEN column IS NULL THEN 1 ELSE 0 END)` so both present and missing counts are explicit.",
      "After a join, row multiplication can increase `COUNT(*)` independently of null behavior; validate join cardinality before interpreting counts.",
      "Grouping by a nullable key creates a null group, and `COUNT(*)` counts its rows even though `COUNT(key)` returns zero within that group.",
    ],
    "For 1,000 events where 80 have null `customer_id`, `COUNT(*)` is 1,000, `COUNT(customer_id)` is 920, and the difference gives the missing-key count.",
    "Use `COUNT(*)` for rows and `COUNT(expression)` for non-null expression values.",
  ),
  "What happens when every value in a numeric column is null?": detailedAnswer(
    "Aggregates that require a numeric value—such as `sum`, `avg`, `min`, and `max`—normally return null because no non-null observation exists. `count(column)` returns zero, while `count(*)` still returns the number of rows. Treating the result as zero would incorrectly claim the aggregate was computed from real zero values.",
    [
      "An all-null group is different from an empty input and from a group of numeric zeros, even when an application later displays both as zero.",
      "`coalesce(sum(amount), 0)` is appropriate only when the business definition says 'no known amount should display as zero'; preserve a completeness indicator so consumers can distinguish it.",
      "Type inference can be problematic when constructing data where every value is null; provide an explicit numeric schema so Spark knows the intended type.",
      "Statistical functions can produce null or undefined results when their required non-null sample count is absent; validate counts alongside metrics.",
      "Quality monitoring should flag all-null partitions/groups because they often indicate an upstream mapping or source failure rather than legitimate absence.",
    ],
    "A region with 200 orders and null `amount` has `count(*)=200`, `count(amount)=0`, and `sum(amount)=null`. Reporting revenue as zero without the present-value count would hide missing financial data.",
    "No observed numeric values produce an unknown aggregate, not a measured zero.",
  ),
  "How does Spark handle null values in joins?": detailedAnswer(
    "In a normal equi-join, null does not equal any value, including another null, so rows with null join keys do not match. Their final presence depends on join type: an inner join drops unmatched rows; a left outer join retains the left row with nulls for right columns; full outer retains unmatched rows from both sides. Null-safe equality can deliberately match null to null.",
    [
      "Use `<=>` in SQL or `eqNullSafe` in the DataFrame API when two unknown keys should belong to the same match class. This changes semantics and can create a large null-to-null many-to-many result.",
      "Left semi joins retain left rows with at least one match; ordinary null keys have none. Left anti joins therefore normally retain null-key rows unless another condition changes the result.",
      "Replacing null with a sentinel before joining can collide with a real value and concentrates all missing keys into one hot key. Prefer explicit predicates or separate handling.",
      "Composite keys follow the condition per component. Any ordinary equality comparison that is unknown prevents the combined join predicate from being true.",
      "Profile null rates and expected cardinality before joining. A null-safe join between two large null groups can multiply `N × M` rows and exhaust resources.",
    ],
    "If 10,000 left rows and 5,000 right rows have null `account_id`, ordinary equality creates no matches for them. Null-safe equality could create 50 million matches, which is usually not the intended meaning of an unknown account.",
    "Ordinary joins keep unknown keys unmatched; null-safe joins match them and must be guarded against many-to-many explosion.",
  ),
  "Can null values cause data skew?": detailedAnswer(
    "Yes. Although null keys do not match in ordinary equi-joins, operations such as `groupBy`, repartitioning, sorting, null-safe joins, or sentinel replacement can route a large fraction of records to the same partition/key group. One task then processes much more data than its peers, causing stragglers, spill, GC, or out-of-memory errors.",
    [
      "A `groupBy(customer_id)` forms one null group, so millions of missing IDs can dominate a single reducer partition.",
      "Replacing every null with `'UNKNOWN'` preserves the same concentration and may make it less visible. It does not distribute the workload.",
      "For an ordinary inner join, null-key rows can often be filtered or handled separately before shuffle if the business result does not require them.",
      "For aggregation, process nulls in a separate path, pre-aggregate them, or redesign the metric. Random salting is appropriate only when partial results can be recombined without changing meaning.",
      "Detect the issue using key-frequency profiles, Spark UI partition/task sizes, maximum-versus-median task duration, spill, and AQE skew information.",
    ],
    "A billion-row event table has 35% null `campaign_id`. Grouping by campaign sends 350 million rows toward one logical key; aggregate nulls separately and union the one final null result with normal campaign aggregates.",
    "Null is a value class for grouping/partitioning and can become the largest hot key in the dataset.",
  ),
  "What is the difference between ordinary equality and null-safe equality in Spark?": {
    summary:
      "Ordinary equality returns unknown when either operand is null. Null-safe equality (`<=>` or `eqNullSafe`) returns true for two nulls, false for one null, and otherwise compares the non-null values normally.",
    takeaway:
      "For join consequences and null-to-null explosion risk, see “How does Spark handle null values in joins?”; the code example below shows both operators.",
  },
  "What is the difference between coalesce() and fillna()?": detailedAnswer(
    "`coalesce` is a column expression that returns the first non-null value among its arguments, allowing row-by-row fallback across columns or expressions. `fillna`/`DataFrameNaFunctions.fill` replaces nulls in selected columns with supplied literal values, often by type or column mapping. They overlap for simple defaults but express different intent and flexibility.",
    [
      "`coalesce(primary_email, backup_email, lit('unknown'))` can choose among multiple row values and supports expressions, not just fixed constants.",
      "`df.fillna({'country':'UNKNOWN','quantity':0})` applies constant replacements to several columns in one DataFrame operation.",
      "Both change data values; neither is Spark SQL's partition-reduction method `DataFrame.coalesce(numPartitions)`, which shares the name but changes partition count.",
      "Type compatibility matters. A fill value applies only where it can be converted to the column type; review the resulting schema and behavior.",
      "Defaulting can hide source failures. Preserve missing indicators or metrics when absence is analytically meaningful.",
    ],
    "Use `coalesce(shipping_country, billing_country)` for a business fallback between columns. Use `fillna({'comment':'','retry_count':0})` for approved constant defaults across fields.",
    "Column `coalesce` selects the first available expression; `fillna` applies declared literal replacements across DataFrame columns.",
  ),
  "Does Spark automatically convert empty strings to null?": detailedAnswer(
    "No, not as a general rule. An empty string is a valid string value and remains distinct from null unless a data-source option, parsing rule, or explicit transformation maps it to null. CSV options such as `nullValue` and `emptyValue` can affect parsing, so behavior must be defined and tested for the exact reader configuration.",
    [
      "For existing string columns, normalize explicitly with logic such as `when(trim(col) === '', null).otherwise(col)` only when whitespace/empty truly means missing.",
      "An empty CSV field, a quoted empty string, a missing token, and a configured null token can have different parser outcomes depending on options.",
      "JSON `null`, an absent JSON field, and `\"\"` are distinct: the first two can become null under the schema, while the last is an empty string.",
      "Casting empty text to numeric/date can yield null or an ANSI-mode error depending on operation and configuration; it is not a reliable normalization method.",
      "Profile raw values before normalization and preserve rejected/source values when regulatory or reconciliation needs require fidelity.",
    ],
    "If upstream sends `''`, `'   '`, `'NULL'`, and actual null, define which are missing for each field. A name may treat blanks as missing; a free-text comment may legitimately be empty.",
    "Spark preserves empty strings unless parsing or explicit business logic says otherwise.",
  ),
  "How does ANSI mode affect null handling?": detailedAnswer(
    "Since Apache Spark 4.0, `spark.sql.ansi.enabled` defaults to `true`. Invalid casts, arithmetic overflow, divide-by-zero, and certain malformed inputs now raise errors by default instead of silently returning null, truncating, or wrapping. ANSI mode does not remove ordinary SQL null propagation; it separates legitimate missing values from invalid operations that should fail visibly.",
    [
      "Valid propagation remains: `null + 1` is null, and ordinary comparisons with null remain unknown.",
      "The default changed in Spark 4.0. Older Spark releases and vendor distributions may differ, so inspect the deployed session during upgrades and test pipelines that previously relied on permissive casts or overflow behavior.",
      "A malformed string cast to integer can throw in ANSI mode. Use `try_cast` or tolerant parsing when invalid input is expected and should become an explicitly measured null.",
      "Arithmetic overflow errors instead of wrapping. This protects aggregates and identifiers from plausible-looking corrupted results.",
      "ANSI behavior can expose latent issues during migration from permissive pipelines; test representative bad records and update error-handling deliberately.",
      "Do not disable strictness merely to make the job pass. Separate valid missingness from invalid data, quarantine failures, and monitor tolerant conversions.",
    ],
    "For value `'12x'`, a strict cast to integer fails the task under ANSI behavior. `try_cast` returns null by design; the pipeline can count and quarantine that record rather than silently treating it as a normal missing integer.",
    "ANSI mode distinguishes legitimate null propagation from invalid operations that should be surfaced.",
  ),
  "How would you measure missing data in a production pipeline?": detailedAnswer(
    "Measure missingness as a governed data-quality signal by column, partition/time window, source, and schema version. Count actual nulls separately from NaN, blank/whitespace text, absent nested fields, parse failures, and domain sentinels. Publish both counts and rates against total rows and compare them with historical baselines and contractual thresholds.",
    [
      "Compute `total_rows`, `null_count`, `non_null_count`, `nan_count` for floating fields, blank-string count, invalid-cast count, and missing-required-key count in the same quality run.",
      "Segment metrics by ingestion date, producer, region, file/topic partition, and schema version so a localized source failure is not hidden by a global average.",
      "Use thresholds appropriate to the field: a primary key may require zero nulls, while an optional profile attribute may use an anomaly band rather than a fixed zero target.",
      "Track trends and sudden deltas. A change from 2% to 25% can be more important than whether 25% crosses a generic platform threshold.",
      "Persist rejected samples with lineage and non-sensitive error context, reconcile input/output counts, alert owners, and block publication when critical contract rules fail.",
    ],
    "For each hourly producer partition, publish `{rows, null_customer_id, blank_email, invalid_amount, schema_version}` and alert if required-key nulls exceed zero or optional-field missingness exceeds its seven-day baseline by an approved margin.",
    "Production missingness needs typed definitions, segmentation, trends, ownership, and an enforcement action—not one global null count.",
  ),

  "What are the differences among Parquet, ORC, and Avro?": detailedAnswer(
    "Parquet and ORC are columnar file formats optimized for analytical scans: values are organized by column within independently readable units, enabling column pruning, compression by type, and metadata-based skipping. Avro is row-oriented and optimized for record serialization, streaming interchange, and writer/reader schema resolution. The right choice follows access pattern and ecosystem, not a universal speed ranking.",
    [
      "Parquet organizes data into row groups with column chunks/pages and has broad interoperability across Spark, lakehouse tables, warehouses, and query engines.",
      "ORC organizes data into stripes with column streams, indexes, and statistics; it has especially strong roots in the Hive ecosystem and also works well with Spark.",
      "Avro stores complete records sequentially in object container files, using a writer schema and optional block compression. Reading one field generally still traverses record encoding rather than skipping unrelated column chunks.",
      "Avro object-container files use sync-marked blocks and can be split for distributed reads. That splitability does not turn Avro into a columnar format or give it Parquet/ORC-style column pruning.",
      "Parquet/ORC fit OLAP projections and aggregates. Avro fits Kafka/CDC payloads, archival event exchange, and workloads that reconstruct complete records frequently.",
      "Compression, schema evolution, splitability, file size, writer implementation, and downstream compatibility matter as much as the format name.",
    ],
    "A Kafka CDC event can use Avro plus Schema Registry for row-level exchange, while the curated lake converts those events into Parquet/Iceberg for selective analytics over a small subset of columns.",
    "Use row-oriented Avro for record movement and columnar Parquet/ORC for analytical reading unless measured constraints indicate otherwise.",
    [{
      title: "Typical data lifecycle",
      steps: [
        { label: "Producer / CDC", detail: "Creates individual records" },
        { label: "Avro + registry", detail: "Versioned row exchange" },
        { label: "Spark processing", detail: "Validates and transforms" },
        { label: "Parquet or ORC table", detail: "Columnar analytical storage" },
      ],
    }],
  ),
  "When should each format be used?": detailedAnswer(
    "Use Parquet as the common default for interoperable analytical lake and lakehouse tables; use ORC when the platform is strongly Hive-oriented or testing shows its indexing/encoding works best for the workload; use Avro for row-oriented events, CDC, Kafka integration, and durable record interchange where reader/writer schema evolution is central.",
    [
      "Choose Parquet when consumers read a subset of columns, perform large scans/aggregations, and span Spark, Trino, warehouse, and lakehouse ecosystems.",
      "Choose ORC for similar columnar analytics when Hive compatibility, ORC-specific indexes/encodings, or existing platform standards are decisive.",
      "Choose Avro when the unit of access is a complete event/record, messages evolve through schema resolution, and append/stream transport matters more than analytical projection.",
      "For mutable tables, combine Parquet/ORC files with a table format such as Iceberg, Delta, or Hudi; the file format alone does not provide transactions, snapshots, or row-level update semantics.",
      "Validate with representative schemas, codecs, engines, and queries. A standard format selected for ecosystem consistency can be more valuable than a small isolated benchmark win.",
    ],
    "Store raw Kafka business events as Avro when that matches the contract, compact them into Parquet-backed curated tables, and select ORC only if the organization's Hive-heavy stack and benchmarks justify that standard.",
    "Match format to access pattern and ecosystem: event interchange versus analytical column scans.",
  ),
  "Why is Parquet generally better for OLAP than Avro?": detailedAnswer(
    "OLAP queries commonly scan many rows but reference only a few columns and apply filters/aggregations. Parquet stores each column's values together inside row groups, so engines can read only needed column chunks, use statistics to skip row groups, apply vectorized decoding, and achieve effective type-specific compression. Avro stores complete records, so projecting a few fields usually requires traversing much more of each record.",
    [
      "Column pruning reduces physical I/O for wide tables; a query using 5 of 200 columns can avoid decoding the other 195 in Parquet.",
      "Row-group minimum/maximum, null counts, and encodings can eliminate blocks that cannot satisfy a filter, subject to writer metadata and predicate support.",
      "Repeated similar values in a column compress well with dictionary, run-length, delta, and general codecs.",
      "Vectorized readers process batches of typed column values with better CPU locality than reconstructing each row object.",
      "Avro can be better for pointwise full-record exchange, sequential writes, and schema-based event transport. 'Better for OLAP' is not 'better for every workload.'",
    ],
    "A revenue query reading `date`, `region`, and `amount` from a 150-column event table can prune 147 Parquet columns and skip row groups outside the date range; an Avro scan still walks record encodings containing all fields.",
    "Parquet aligns physical layout with analytical projection, filtering, compression, and vectorized execution.",
  ),
  "Is ORC faster than Parquet?": detailedAnswer(
    "Not universally. Both are mature columnar formats with compression, statistics, predicate filtering, and vectorized readers. ORC can outperform for particular Hive-centric workloads or encodings; Parquet can outperform with other schemas, engines, codecs, and reader implementations. File layout and writer quality often matter more than the logo on the file.",
    [
      "Performance depends on selected columns, filter selectivity, cardinality, data types, nesting, compression codec, row-group/stripe size, sorting, and file count.",
      "Engine versions implement readers differently. A result measured in Hive may not transfer to Spark, Trino, or a cloud warehouse.",
      "ORC's stripe indexes and encodings can be valuable, while Parquet's broad ecosystem and optimized readers can offer better interoperability and equal or better scans.",
      "A badly written dataset—tiny files, poor clustering, oversized units, missing statistics—can make either format slow.",
      "Benchmark end-to-end: write cost, storage, scan bytes, CPU, planning/listing, predicate pruning, and all required consumer engines.",
    ],
    "Run representative fact-table filters, wide exports, group-bys, and joins on equivalently sorted and sized ORC and Parquet files. A single `SELECT count(*)` benchmark is not enough to choose an enterprise standard.",
    "ORC versus Parquet is an empirical workload decision, not a permanent speed hierarchy.",
  ),
  "Which format provides the best compression?": detailedAnswer(
    "There is no format that always compresses best. Parquet and ORC often compress analytical datasets efficiently because values of the same type are colocated and can use dictionary, run-length, delta, bit-packing, and general codecs. Avro block compression can be effective for row records, but usually has fewer column-specific opportunities. Actual results depend on data entropy, ordering, cardinality, schema, codec, and writer settings.",
    [
      "Low-cardinality columns often benefit from dictionary or run-length encoding; sorted data can improve repetition and min/max pruning.",
      "High-entropy IDs, encrypted values, already-compressed blobs, and random strings compress poorly in any format.",
      "Codec choice changes the trade-off: Snappy/LZ4 favor speed, while Zstandard/Gzip can reduce bytes more at additional CPU cost.",
      "Smaller is not automatically faster. A high-ratio codec can increase query CPU and write latency enough to lose end-to-end performance.",
      "Compare compressed bytes per row together with scan CPU, write CPU, predicate skipping, and consumer compatibility on production-like samples.",
    ],
    "A sorted low-cardinality status column may compress extremely well in ORC or Parquet, while a random UUID column remains expensive. Zstandard may save more storage than Snappy but should be tested against the cluster's CPU and latency budget.",
    "Compression is a property of the data, ordering, encoding, and codec—not the file extension alone.",
  ),
  "What is the difference between Parquet row groups and ORC stripes?": detailedAnswer(
    "Both are large, independently readable horizontal groups of rows whose column values are stored together within the unit. A Parquet row group contains a column chunk for each column, further divided into pages. An ORC stripe contains column data streams plus stripe-level indexes/statistics and a footer. Readers use these boundaries for parallelism, skipping, decompression, and memory planning.",
    [
      "Parquet row-group metadata describes column chunks and statistics; pages hold encoded values and may have additional indexes depending on writer/support.",
      "ORC stripes contain index, data, and stripe-footer information, with streams representing values, null presence, lengths, dictionaries, and encodings.",
      "Larger groups/stripes improve sequential I/O and compression but reduce fine-grained skipping and increase per-task/decode memory. Smaller units add metadata and seek overhead.",
      "A file can contain multiple row groups or stripes, and a distributed reader can schedule work around splittable boundaries subject to filesystem and reader behavior.",
      "These units are not Spark partitions, though Spark uses file splits based on them/near them when planning input tasks.",
    ],
    "A Parquet file with eight 128 MB row groups can expose multiple scan splits and skip groups by statistics. An ORC file achieves the analogous goal with stripes and stripe/row-index metadata, but its internal stream organization differs.",
    "Row groups and stripes serve the same high-level columnar unit role but use different internal metadata and encoding layouts.",
  ),
  "Do Parquet and ORC support schema evolution?": detailedAnswer(
    "Yes, they can represent compatible schema changes across files, especially adding nullable columns, but the file format alone does not make every evolution safe. Spark must reconcile file schemas with the requested/catalog schema, and renames, deletions, nested changes, field ordering/identity, and incompatible type changes need explicit handling or a table format with stronger metadata semantics.",
    [
      "Old files lacking an added nullable field can be read as null when the unified read schema contains that field.",
      "Parquet schema merging is available but disabled by default in Spark because collecting and merging file schemas is expensive.",
      "Name-based matching can treat a rename as delete plus add. Field-ID-aware table metadata is safer when renames/reordering must preserve identity across engines.",
      "Type widening may be accepted in controlled cases; narrowing or incompatible physical types can fail or corrupt meaning if coerced carelessly.",
      "Use a catalog/table-format evolution command, compatibility tests, and writer-reader deployment order rather than leaving a directory of arbitrary schemas for inference.",
    ],
    "Adding nullable `email` is usually manageable: old files return null. Renaming `customer_id` to `client_id` in plain files may expose two columns unless a table format records the rename or the pipeline performs a staged migration.",
    "Parquet and ORC enable compatible physical evolution; governed table metadata makes that evolution dependable.",
  ),
  "Why is Avro popular in Kafka and CDC applications?": detailedAnswer(
    "Avro is row-oriented, compact, schema-driven, and designed for writer/reader schema resolution, which aligns with Kafka and CDC where each message represents a complete event or row change. A Schema Registry can assign a small schema identifier to messages, enforce compatibility, and let consumers retrieve the writer schema without embedding verbose field descriptions in every payload.",
    [
      "Binary encoding avoids JSON field-name repetition and preserves typed values such as integers, unions/nullability, records, arrays, and logical types.",
      "Reader/writer resolution allows consumers with a compatible newer schema to read older messages using defaults, aliases, and defined promotion rules.",
      "Kafka keys and values can use separate schemas, enabling a stable business key and independently evolving event payload.",
      "CDC envelopes naturally map to Avro records containing operation, before/after images, source position, and transaction metadata.",
      "Operational value comes from registry governance: compatibility modes, subject strategy, schema version audit, and controlled producer deployment—not Avro bytes alone.",
    ],
    "A CDC value schema adds optional `customer_tier` with a default. The producer registers the new schema, old consumers continue reading compatible fields, and new consumers can read both old and new events through writer/reader resolution.",
    "Avro combines compact complete-record encoding with explicit, governable evolution—well suited to event streams.",
  ),
  "Does every Avro message contain its complete schema?": detailedAnswer(
    "No. The answer depends on the Avro container/protocol. An Avro object container file stores the writer schema in the file header and then writes blocks of records under that schema. Kafka integrations commonly place a compact schema ID or fingerprint in each message and keep the full schema in a registry. Raw schemaless transport must provide the writer schema out of band for reliable decoding.",
    [
      "Avro binary data does not carry field names for every value; the decoder needs the writer schema to interpret the byte sequence.",
      "Schema Registry wire formats typically prepend a small identifier, not the full JSON schema, reducing per-message overhead.",
      "The consumer obtains the writer schema by ID and resolves it against its reader schema, applying defaults and compatible promotions.",
      "Caching schemas avoids a registry network call for every record, but availability, authorization, and cache behavior still need production design.",
      "Do not assume all Avro ecosystems use the same wire format. Confluent-style IDs, single-object encoding, and object container files have different envelopes.",
    ],
    "A Kafka value may contain a magic/version byte, four-byte schema ID, and Avro payload. The registry entry for that ID contains the full writer schema; the message itself does not repeat it.",
    "Avro decoding always needs the writer schema, but it is usually referenced or stored once rather than copied into every message.",
  ),
  "Does Parquet always read fewer bytes than Avro?": detailedAnswer(
    "No. Parquet usually reads fewer bytes for selective analytical projections because it can skip unneeded columns and sometimes row groups. If a query needs nearly every column, files are small, predicates cannot prune, or Parquet metadata/encoding is poor, the difference can shrink. For one complete record or a sequential full-row scan, Avro can be competitive and operationally simpler.",
    [
      "A Parquet reader still reads file footers, selected column chunks, indexes/pages, and filesystem blocks; object-store request overhead can dominate tiny files.",
      "Filters help only when statistics and layout separate matching from non-matching values. Randomly distributed values can force reading most row groups.",
      "Nested reconstruction and many selected columns can approach a full-file scan, reducing columnar I/O advantage.",
      "Compression ratios and codecs differ. A well-compressed Avro file can be smaller on disk than a poorly configured Parquet dataset for some data.",
      "Measure bytes read, requests, decompression CPU, rows decoded, and elapsed time for representative queries instead of making a format-wide guarantee.",
    ],
    "A query selecting 3 of 150 columns likely reads far less from Parquet. A full export selecting all columns from many tiny Parquet files may spend more time on metadata and object-store requests than scanning well-sized Avro blocks.",
    "Parquet's byte advantage is workload-dependent: strongest for selective columnar analytics, not guaranteed for every read.",
  ),
  "How does file size affect performance?": detailedAnswer(
    "File size controls planning overhead, object-store requests, scan parallelism, compression opportunity, task duration, and failure recovery. Too many small files overwhelm listing and scheduling and create tiny tasks; very large files can limit parallelism, create long stragglers, and make rewrite/compaction expensive. Healthy sizes are measured for the storage system, format, compression, and query workload.",
    [
      "Each file has metadata, open/close, authorization, and task-planning cost. Millions of tiny files can make planning slower than processing.",
      "Larger Parquet row groups/files improve sequential throughput and compression but require enough independent splits/files to occupy the cluster.",
      "Compressed file size is not task memory size. Decoded columns, filters, joins, and aggregation structures can expand substantially.",
      "Output partition count, `maxRecordsPerFile`, repartition/coalesce choices, and periodic compaction control the write side; avoid forcing a single output file through one task.",
      "Do not confuse input split size with output file size. `spark.sql.files.maxPartitionBytes` defaults to 128 MB in current upstream Spark and controls how bytes are packed into file-scan partitions; it is not a target size for files that Spark writes.",
      "Current upstream Spark defaults `spark.sql.files.maxRecordsPerFile` to `0`, meaning no record-count limit. Setting it bounds records, not bytes, so variable-width rows can still produce uneven file sizes.",
      "A planning estimate is `output partitions ≈ ceil(estimated compressed output bytes / target file bytes)`. If using `maxRecordsPerFile`, estimate `records per file ≈ target file bytes / observed compressed bytes per row`, then validate actual output because row sizes and compression vary.",
      "Select a target range from measured scan throughput and task duration—often hundreds of MB for analytical files, but not a universal 128 MB rule—and monitor distribution, not only average size.",
    ],
    "Ten terabytes stored as ten million 1 MB files causes huge listing/task overhead. Compacting into consistently sized columnar files reduces requests while retaining enough files/row groups for parallel reads.",
    "Aim for files large enough for efficient I/O and small enough for balanced parallelism and manageable rewrites.",
  ),
  "Which format would you select for a new enterprise data lake?": detailedAnswer(
    "For most new analytical lakes, choose Parquet as the physical file default because it is columnar, splittable, efficient for Spark scans, and interoperable across a broad set of engines. Put a transactional table format such as Iceberg, Delta Lake, or Hudi above it when the lake needs snapshots, atomic commits, schema/partition evolution, deletes, and concurrent writers. Keep Avro where row-oriented event interchange is the real requirement.",
    [
      "The decision must include every consumer: Spark, query engines, warehouses, ML tools, governance/catalog systems, and long-term portability.",
      "Standardize codecs, target file/row-group sizes, data types, timestamps, partitioning/clustering, and compaction; inconsistent Parquet can still perform poorly.",
      "Choose the table format based on transaction model, update/delete patterns, catalog support, cloud/storage environment, and operational tooling—not popularity alone.",
      "Use raw immutable storage for replay when needed, but curate into governed tables with explicit schemas, quality checks, and lifecycle policies.",
      "Benchmark ORC if the enterprise is Hive-centric and it offers a measured advantage, but avoid multiple physical standards without a clear consumer-driven reason.",
    ],
    "A practical standard is Avro plus registry for Kafka events, immutable raw retention, and Parquet-backed Iceberg/Delta/Hudi tables for bronze-to-gold analytics with compaction and governance.",
    "Select an interoperable columnar default and a table layer that supplies the management guarantees files alone do not provide.",
  ),

  "How does Spark handle corrupt CSV or Parquet files?": detailedAnswer(
    "Spark distinguishes malformed records in text formats from physically corrupt or incompatible files. CSV can use parsing modes such as permissive, drop-malformed, or fail-fast and can capture an unparseable record in a designated corrupt-record column when a schema is provided. For file-level corruption, Spark can fail the read or skip unreadable files with `ignoreCorruptFiles`; skipping is an availability choice that can silently omit data and therefore requires reconciliation.",
    [
      "CSV parser modes are `PERMISSIVE` (the default), `DROPMALFORMED`, and `FAILFAST`. In permissive mode, include the configured corrupt-record column as a string in the supplied schema if the raw malformed line must be retained.",
      "Spark does not classify a CSV row as corrupt merely because its token count differs from the schema: missing trailing fields become null and extra tokens are discarded. Malformed quoting/escaping and other parser failures follow the selected mode, while type-conversion behavior must be tested against the exact schema and options.",
      "CSV parsing can inspect only the required columns because parser column pruning is enabled by default, so which records appear corrupt can vary with the projection. A quality ingestion pass should deliberately parse the complete governed schema rather than accidentally validating only selected columns.",
      "Parquet corruption is usually file/block/footer-level: truncated objects, invalid metadata, incompatible physical types, or unreadable pages. There is no general row-level `_corrupt_record` recovery equivalent for arbitrary damaged binary bytes.",
      "`ignoreCorruptFiles` defaults to `false`. Setting it to `true` allows valid files in the same read to continue, but the job must report exactly which paths and expected records were omitted. It should not be a silent global default for critical datasets.",
      "`ignoreMissingFiles` addresses files removed after planning and is a separate condition from corruption. Concurrent replacement and object-store behavior should be investigated rather than masked.",
      "Use explicit schemas, parser options, checksums/file manifests where available, input-versus-output counts, and a quarantine/replay workflow. Choose fail-fast when partial results would be more dangerous than delayed results.",
    ],
    "A CSV feed routes malformed lines with file path and ingestion timestamp to quarantine while valid rows continue under an error threshold. A truncated Parquet object is quarantined as a whole file and excluded only if the pipeline can prove and report the missing partition.",
    "Recover malformed text at record level when possible; treat skipped binary files as explicit data loss requiring audit and replay.",
  ),
  "How should a pipeline isolate and process bad records?": detailedAnswer(
    "Separate ingestion from acceptance. Preserve an immutable raw copy, parse against an explicit versioned schema, attach source lineage, and divide results into valid and rejected streams. Rejected records belong in a durable quarantine/dead-letter table with a structured reason—not in executor logs—and publication should depend on severity and error-rate policy.",
    [
      "Capture source path or Kafka topic/partition/offset, ingestion time, schema version, parser error code, rule name, and a protected/raw payload or reference to it.",
      "Classify failures: syntax/encoding, schema/type mismatch, missing required field, domain-rule violation, duplicate, referential failure, and infrastructure corruption need different owners and remedies.",
      "Use native parsing functions with permissive/error columns where practical, then validate business rules explicitly. Avoid a catch-all UDF that converts every exception to null.",
      "Define thresholds: one malformed optional record may be quarantined; a missing primary key or sudden 20% rejection rate may block the entire partition and page the producer owner.",
      "Build replay as a first-class path. After correcting data or parser logic, process quarantined records idempotently and reconcile them into the target without duplicating prior valid output.",
      "Protect sensitive payloads with access controls and retention rules; quarantine is production data, not a debugging dump.",
    ],
    "A silver job writes accepted rows and a quarantine table keyed by source offset and rule ID in the same controlled batch. A dashboard reports rejection rates by producer; repaired records are replayed with the same event ID into an idempotent merge.",
    "Bad-record handling needs lineage, classification, thresholds, ownership, and replay—not silent dropping.",
  ),
  "What output format is best for Spark workloads?": detailedAnswer(
    "For analytical Spark output, Parquet is the usual file default because it is columnar, compressed, splittable, broadly interoperable, and supports column pruning and filter statistics. For production tables that receive concurrent writes, corrections, deletes, or schema/partition changes, use a transactional table format such as Iceberg, Delta Lake, or Hudi over columnar files. The best choice still depends on consumers and update semantics.",
    [
      "Choose Avro for row-oriented event interchange and CDC transport, not as the default for wide analytical scans. Choose ORC when the ecosystem and measured workload favor it.",
      "Select a compression codec by balancing CPU and storage/scan cost; Snappy is a common speed-oriented choice, while Zstandard can provide stronger compression when supported and justified.",
      "Control file sizes and count. Repartition by the intended table layout before writing, use `maxRecordsPerFile` or table maintenance where appropriate, and compact small files later.",
      "Estimate write parallelism from data volume rather than copying a fixed partition count: `partitions ≈ ceil(estimated compressed output bytes / chosen target file bytes)`. A target in the hundreds of MB is a common starting experiment for analytical object-store files, not a universal rule.",
      "The estimate controls tasks, not an exact one-file-per-task promise: `partitionBy`, speculative/retried tasks, skew, record limits, and table-writer behavior affect the final files. Measure the resulting distribution and compact when needed.",
      "Partition only on commonly filtered columns with manageable cardinality. Excessive directory partitions create metadata overhead and tiny files; modern table formats can provide better partition evolution/clustering.",
      "Preserve types precisely—especially decimals and timestamps—and validate the output with row counts, schema checks, uniqueness, and atomic commit behavior.",
      "Do not use `coalesce(1)` as a general delivery pattern for large output; it serializes the final write through one task and creates a bottleneck.",
    ],
    "For a curated sales table, write Parquet-backed Iceberg/Delta/Hudi with Zstandard or Snappy, compact to measured healthy file sizes, partition/cluster by real filter patterns, and expose snapshots for reliable downstream queries.",
    "Use columnar files for analytics and a table format for correctness and lifecycle; optimize layout for actual readers.",
  ),
  "What is the difference between Spark Streaming and Structured Streaming?": detailedAnswer(
    "Spark Streaming is the legacy DStream API, where a stream is represented as a sequence of RDD micro-batches and developers reason in batch intervals and RDD transformations. Structured Streaming represents a stream as an unbounded table and expresses computation with DataFrame/Dataset or SQL operations. Spark incrementally executes that relational query with integrated event-time, state, checkpoint, and sink semantics.",
    [
      "DStreams expose operations such as `transform`, `updateStateByKey`, and receiver/direct source integrations. Fault tolerance combines RDD lineage, checkpointing, and source-specific reliability.",
      "Structured Streaming uses Catalyst and the Spark SQL execution engine, so projections, filters, joins, aggregation, code generation, and Data Source V2 connectors share the structured stack.",
      "Event-time windows, watermarks, streaming deduplication, stream-stream joins, state-store metrics, and output modes form a coherent model rather than application-managed RDD batches.",
      "DStreams always use micro-batches. Structured Streaming also uses micro-batches by default, including processing-time and Available Now triggers. Its experimental continuous mode supports a narrower set of operations and different sink/fault-tolerance constraints; it is not what makes the API 'structured.'",
      "Structured Streaming checkpoints source progress, commit logs, metadata, and state for the logical query. Sink semantics still determine end-to-end exactly-once behavior.",
      "Use Structured Streaming for new applications. Migrate DStreams by re-evaluating state, offset, output, and retry semantics rather than translating each RDD operation mechanically.",
    ],
    "A DStream job may manually update per-key state every five seconds. A Structured Streaming query groups an event-time DataFrame with a watermark, stores managed state, reports query progress, and writes through a checkpoint-aware sink.",
    "DStreams are RDD batches; Structured Streaming is an incrementally maintained relational query and is the modern API.",
    [{
      title: "API model comparison",
      steps: [
        { label: "DStream", detail: "Sequence of RDD micro-batches" },
        { label: "Manual streaming logic", detail: "RDD transforms and state APIs" },
        { label: "Structured Streaming", detail: "Unbounded table abstraction" },
        { label: "Incremental SQL engine", detail: "Plans event time, state, and sinks" },
      ],
    }],
  ),
  "How does Spark Structured Streaming consume data from Kafka?": detailedAnswer(
    "Spark's Kafka source uses Kafka consumer clients to read explicit topic-partition offset ranges directly into a streaming DataFrame; it does not use legacy receiver tasks. For each trigger, the driver discovers partitions and available offsets, chooses start/end ranges using prior checkpoint progress and rate settings, and schedules executor tasks that fetch and deserialize those ranges.",
    [
      "The returned schema includes binary `key` and `value` plus topic, partition, offset, timestamp, timestamp type, and headers when requested. Parse key/value with explicit schemas and retain source coordinates for lineage.",
      "On the first start, `startingOffsets` selects earliest, latest, or explicit positions. Once the query has a checkpoint, checkpointed offsets normally take precedence on restart.",
      "`maxOffsetsPerTrigger` caps the total offset range admitted per trigger and divides the allowance proportionally across topic-partitions. It is an intake control, not a sink commit or exactly-once switch.",
      "By default there is roughly one Spark input partition per Kafka topic-partition for the planned range. `minPartitions` or `maxRecordsPerPartition` can split large ranges into more Spark tasks in supported Spark versions.",
      "For a new streaming query, `startingOffsets` defaults to `latest`; batch reads default to `earliest`. A restarted streaming query resumes from its checkpoint, and the Kafka source manages offsets internally rather than using `enable.auto.commit`.",
      "`failOnDataLoss` defaults to `true`. If checkpointed offsets have expired under Kafka retention or a topic/partition was removed, keeping this protection normally exposes the loss instead of silently resetting progress.",
      "The query records source offset and batch commit progress in its checkpoint. A failed, uncommitted trigger is replayed, which requires an idempotent/transactional sink for end-to-end exactly-once results.",
      "Kafka order is preserved only within each topic-partition range. Parallel processing and downstream shuffles do not provide a global record order.",
    ],
    "A trigger discovers offsets 1,000-1,399 for partition 0 and 8,000-8,249 for partition 1, plans those ranges under the rate limit, and executor tasks fetch them. The checkpoint advances only after successful batch completion.",
    "The driver plans bounded offsets, executors read them directly, and the checkpoint—not Kafka auto-commit—controls query recovery.",
    [{
      title: "Kafka trigger flow",
      steps: [
        { label: "Kafka metadata", detail: "Discover partitions and latest offsets" },
        { label: "Driver", detail: "Plans bounded offset ranges" },
        { label: "Executor tasks", detail: "Fetch ranges with Kafka consumers" },
        { label: "Transform + sink", detail: "Processes the micro-batch" },
        { label: "Checkpoint commit", detail: "Records successful progress" },
      ],
    }],
  ),
  "How are Kafka partitions mapped to Spark tasks?": detailedAnswer(
    "By default, Spark plans approximately one Kafka source partition/task for each Kafka topic-partition that has data in the selected offset range. That mapping preserves the range's per-partition order and makes Kafka partition count the baseline source parallelism. It is not an absolute one-to-one rule: current connectors can split a large topic-partition range into multiple Spark input partitions using `minPartitions` or `maxRecordsPerPartition`.",
    [
      "A Spark task reads one planned offset range from one Kafka topic-partition; Spark does not combine records from different Kafka partitions into one ordered source range.",
      "If the topic has four active partitions, the default trigger exposes about four source tasks even when the cluster has forty cores. Downstream transformations can repartition to additional tasks after the read.",
      "`minPartitions` is a desired minimum/hint. Spark subdivides large ranges and rounding or empty partitions can make the final task count differ from the exact requested number.",
      "`maxRecordsPerPartition` bounds records in each Spark input partition and can create multiple tasks from one Kafka partition's range; ordering across those parallel subranges must not be mistaken for global processing order.",
      "More source tasks help only if ranges are large enough and downstream stages/sinks can use the concurrency. Excessive splitting adds consumer creation, scheduling, and per-task overhead.",
      "Kafka key design still determines which topic-partition receives an event and therefore baseline skew. Spark-side splitting can distribute reading but cannot restore global order or fix a semantically hot key in later aggregation.",
    ],
    "A topic has two partitions, but partition 0 contains 90% of a trigger. The default creates two source tasks and one straggles. A supported range-splitting option can create several Spark tasks for partition 0 while each task reads a disjoint offset interval.",
    "Kafka partitions define baseline source parallelism; Spark may subdivide offset ranges, but ordering remains partition-scoped.",
  ),

  "What is the difference between the receiver-based and direct Kafka approaches in Spark Streaming?": detailedAnswer(
    "Receiver-based and direct Kafka integrations belong to the legacy DStream API. A receiver-based stream runs long-lived receiver tasks that continuously consume Kafka and place records into Spark's BlockManager before later micro-batches process those blocks. The direct approach does not stage input through receivers: for every batch, Spark determines explicit Kafka topic-partition offset ranges and executor tasks read those immutable ranges directly from Kafka.",
    [
      "Receiver tasks occupy executor cores continuously. Their number, placement, and input rate can become a bottleneck independent of the number of tasks that later process the stored blocks.",
      "Once a receiver has accepted data, recovery requires those received blocks to survive. Replicated storage or a write-ahead log on reliable storage was used to protect data that might otherwise disappear with a failed receiver/executor.",
      "The direct approach treats Kafka as the durable replay log. A failed task or batch can fetch the same half-open offset range again, eliminating the extra receiver storage/WAL path and making consumed ranges auditable.",
      "Direct input can provide effectively exactly-once source computation when the same offsets and deterministic logic are replayed, but it does not make arbitrary output exactly once. A sink write can succeed before the batch is recorded as complete and then be repeated after recovery.",
      "Legacy direct DStreams may checkpoint offset state, persist ranges externally, or commit offsets to Kafka after output completion. The ordering of output and offset commits must be designed deliberately.",
      "Structured Streaming uses the modern direct, offset-based model and should be chosen for new applications; the current Spark documentation classifies the DStream engine as a legacy project with no further updates.",
    ],
    "Suppose batch 17 owns `orders-0` offsets `[10,000, 12,000)`. A direct task that fails can reread precisely those 2,000 records from Kafka. In a receiver design, Spark must recover the receiver blocks that were filled continuously before the batch boundaries were processed.",
    "Receiver-based ingestion copies records into Spark before processing; direct ingestion plans replayable Kafka offset ranges. Direct improves source recovery, not sink semantics.",
    [{
      title: "Receiver versus direct ingestion",
      steps: [
        { label: "Receiver path", detail: "Kafka → long-running receiver → Spark blocks/WAL → batch tasks" },
        { label: "Direct path", detail: "Driver plans offsets → tasks read Kafka ranges directly" },
        { label: "Recovery", detail: "Recover blocks versus reread the same offsets" },
        { label: "Output", detail: "Both still require idempotent or transactional writes" },
      ],
    }],
  ),
  "Where are Kafka offsets stored in Spark Streaming?": detailedAnswer(
    "The answer depends on the streaming API. Structured Streaming stores its authoritative query progress in the configured checkpoint: the offset log records the source end offsets planned for each micro-batch, and the commit log records which batch IDs completed successfully. Legacy direct DStreams can recover offsets from a Spark checkpoint, Kafka's consumer-offset store, or an application-managed external store. Receiver-based DStreams traditionally rely on consumer-group offsets plus Spark's recovery of received blocks.",
    [
      "For Structured Streaming, the checkpoint also stores query metadata and, when the query is stateful, state-store versions. It is one query's recovery protocol—not merely a folder containing Kafka offsets.",
      "`startingOffsets` is consulted only when a new query starts. Once a valid checkpoint exists, its progress takes precedence, so changing `earliest` to `latest` does not reposition an existing query.",
      "The Structured Streaming Kafka source explicitly disables Kafka auto-commit and does not commit its progress through `enable.auto.commit`; it generates consumer group IDs for reading while managing consumed offsets internally.",
      "The offset log may contain a batch that was planned but whose output did not finish. Absence of the matching successful commit means recovery can rerun that batch, which is why external sinks must tolerate retries.",
      "Keep checkpoints on durable shared storage, use a unique location per logical query, restrict access because source metadata can be sensitive, and never edit or delete checkpoint internals as an ordinary reset mechanism.",
      "If Kafka retention removes data before Spark consumes or replays it, a checkpoint cannot recreate the records. `failOnDataLoss=true` should normally surface the missing offset range.",
    ],
    "Before batch 42 runs, Spark writes `offsets/42` with the source end offsets it plans to process. After the sink succeeds, Spark writes `commits/42` to mark that batch complete. If `offsets/43` exists without `commits/43` when the query restarts, Spark reruns batch 43 with the same planned offset range, so an external sink must make that replay idempotent or transactional.",
    "Structured Streaming recovery comes from checkpoint offset and commit logs; an offset proves source position, not successful exactly-once output in an external system.",
  ),
  "How does Spark read from Kafka?": detailedAnswer(
    "Spark reads Kafka as explicit topic-partition offset ranges. The driver discovers subscribed partitions and obtains available offsets, constructs a bounded range for a batch or streaming trigger, and schedules executor tasks. Executors borrow Kafka consumers, seek to the assigned starting offsets, and fetch records until the exclusive ending offsets; they do not rely on Kafka consumer auto-commit to decide query progress.",
    [
      "Choose exactly one subscription mode: `subscribe` for named topics, `subscribePattern` for a regular expression, or `assign` for explicit topic-partitions. Supply the Kafka connector package and broker/security configuration on the driver and executors.",
      "A batch `spark.read` can set both `startingOffsets` and `endingOffsets`; the resulting DataFrame is a reproducible snapshot of those half-open ranges. A streaming `readStream` repeatedly derives the next range from checkpointed progress and current available offsets.",
      "The driver uses Kafka metadata/offset APIs to plan work; current Spark can use Kafka AdminClient for offset discovery. Executor-side consumer clients perform the actual data fetch and are pooled to reduce creation overhead.",
      "The source schema contains binary `key` and `value`, plus `topic`, `partition`, `offset`, `timestamp`, `timestampType`, and optional `headers`. Cast or parse payloads with an explicit schema, while retaining source coordinates for lineage and deduplication.",
      "By default, a topic-partition range maps to one Spark input partition. `minPartitions` is an approximate lower-bound hint and `maxRecordsPerPartition` can subdivide large ranges; downstream `repartition` changes Spark processing parallelism but not Kafka's partition ordering.",
      "`maxOffsetsPerTrigger` rate-limits streaming intake; it does not modify Kafka retention or commit a consumer-group position. Monitor input rate, processed rate, batch duration, and offset lag together.",
      "Kafka order is guaranteed only within one topic-partition. Parallel source tasks and later shuffles do not create a global event order.",
    ],
    "For ranges `orders-0:[500,800)` and `orders-1:[900,1,250)`, Spark schedules reads for 300 and 350 offsets respectively. Each output row retains its Kafka partition and offset, making the exact input auditable even if downstream operations repartition it.",
    "The driver plans ranges, executors fetch them, parsing creates typed columns, and the checkpoint—not Kafka auto-commit—advances a streaming query.",
    [{
      title: "Kafka read path",
      steps: [
        { label: "Subscribe / assign", detail: "Resolve topics and topic-partitions" },
        { label: "Driver", detail: "Fetch available offsets and plan [start, end) ranges" },
        { label: "Executor consumers", detail: "Seek and fetch assigned ranges" },
        { label: "Kafka DataFrame", detail: "Binary payload plus source metadata" },
        { label: "Parse + process", detail: "Apply schema and distributed transformations" },
        { label: "Checkpoint + sink", detail: "Record progress after safe output handling" },
      ],
    }],
  ),
  "How do you achieve end-to-end exactly-once processing with Kafka and Spark?": detailedAnswer(
    "End-to-end exactly-once means that one logical input event produces one final business effect, even if Spark retries a task, reruns a micro-batch, or restarts the query. Kafka and Spark can replay the same input deterministically, but checkpointing alone cannot make an external database insert, API call, or Kafka output atomic with Spark's progress record. The complete guarantee is: replayable source + recoverable deterministic processing + retry-safe sink.",
    [
      "Source boundary: Kafka provides immutable records addressed by `(topic, partition, offset)`. Structured Streaming records the offset range for each trigger in its durable checkpoint and resumes from checkpoint progress after a restart. The Kafka source does not use consumer auto-commit as its correctness boundary.",
      "Processing boundary: Spark must restore the same state version and recompute the same logical result for a replayed batch. Built-in stateful operators participate in checkpoint recovery; arbitrary side effects inside `map`, UDF, `foreachPartition`, or external service calls do not.",
      "Determinism matters. A replay should not invent different identifiers or values through unseeded randomness, processing-time-dependent logic, non-repeatable external lookups, or a changed query plan. Persist a stable `event_id`, source coordinates, and the reference-data version when correctness requires them.",
      "Sink boundary: the write must be atomic for the batch or idempotent for each event. Common designs are an atomic file/table commit, `MERGE`/upsert on a stable event key, a unique constraint, or a processed-batch marker stored in the same database transaction as the output.",
      "Critical failure window: Spark can finish writing batch 317 and crash before recording batch 317 as committed in its checkpoint. Recovery must replay that batch to avoid data loss. A plain append repeats the effect; an idempotent or transactional sink recognizes the retry and leaves the same final state.",
      "The standard Structured Streaming Kafka sink is documented as at-least-once and can produce duplicates. Setting producer acknowledgements or idempotence options does not by itself create one transaction spanning Spark's checkpoint and Kafka output.",
      "`foreachBatch` is at-least-once by default. Its stable `batchId` can be used for deduplication, but a batch marker is safe only when the marker and all output changes commit atomically. If a database can partially write a batch, row-level event IDs or a staging-plus-transaction pattern are safer.",
      "Prove the guarantee with failure injection: kill the driver after the sink commits but before the Spark batch commit, restart from the same checkpoint, and verify uniqueness, totals, and state. Also test a partial sink failure and a restart longer than Kafka retention.",
    ],
    "For batch 317, Spark reads `orders-0:[10,000,10,500)`. In one database transaction, the writer merges rows by `event_id` and inserts `(query_id, 317)` into a processed-batches table. If Spark crashes before its checkpoint commit, the retry either sees the batch marker or repeats the same merges; both paths leave one final row per event.",
    "Exactly-once is an end-to-end protocol, not a checkpoint option: source replay, deterministic recovery, and an atomic or idempotent sink must all hold.",
    [{
      title: "Exactly-once responsibility chain",
      steps: [
        { label: "Kafka offsets", detail: "Identify replayable source records" },
        { label: "Spark checkpoint", detail: "Restores batch progress and state" },
        { label: "Deterministic logic", detail: "Recreates the same logical output" },
        { label: "Retry-safe sink", detail: "Turns every replay into one final effect" },
      ],
      note: "If any link is only at-least-once, the end-to-end result is also at-least-once unless duplicates are removed later.",
    }],
  ),
  "What must the source, Spark processing layer, and sink each guarantee?": detailedAnswer(
    "Each layer owns a different part of the exactly-once contract. The source must replay the same records, Spark must recover the same progress and state, and the sink must make a retry indistinguishable from the original successful attempt. Saying only that 'Spark is exactly-once' hides the system boundary where duplicates normally arise.",
    [
      "Kafka source guarantee: the record for every required offset must remain available throughout the maximum recovery period. Topic deletion, partition replacement, or retention that expires unread offsets breaks replayability even when the Spark checkpoint is intact.",
      "Spark source-progress guarantee: use one durable checkpoint per logical query. On restart, the checkpointed offset/commit logs, not a newly supplied `startingOffsets` value, determine where that query resumes.",
      "Spark state guarantee: checkpoint stateful operators together with source progress and keep state-compatible query changes. A checkpoint cannot safely recover arbitrary code changes, state-schema changes, or a different logical query.",
      "Spark computation guarantee: derive stable event keys and make replay deterministic. Do not place non-idempotent database writes, HTTP calls, emails, or counters inside transformations that Spark may execute more than once.",
      "Sink guarantee: expose an atomic commit protocol or detect a duplicate event/batch. If rows and the deduplication marker live in different transactions, a crash between them still creates either duplicate output or skipped output.",
      "Operational guarantee: retain checkpoints, Kafka records, sink transaction history, schemas, and referenced dimension versions for at least the designed outage/replay horizon. Exactly-once claims should state this horizon explicitly.",
      "Audit guarantee: preserve `topic`, `partition`, `offset`, `event_id`, `query_id`, and `batch_id` where appropriate so a replay can be proven rather than guessed from row counts.",
    ],
    "Kafka can replay offsets 100-199; Spark restores the state that existed before that failed batch; the target table has a unique `event_id` and applies an upsert. The same retry therefore produces the same final table even though some physical work runs twice.",
    "The source guarantees replay, Spark guarantees consistent recomputation, and the sink guarantees a single visible business effect.",
  ),
  "When is an idempotent or transactional sink required?": detailedAnswer(
    "Use an idempotent or transactional sink whenever a Spark retry could repeat a harmful external effect. That includes most database writes, messages, REST calls, counters, payments, notifications, and multi-table updates. It is not an exceptional failure mode: task retries and replay after an ambiguous write are normal parts of distributed processing.",
    [
      "Idempotency is sufficient when applying the same key and value repeatedly produces the same final state. Examples include `MERGE` by immutable `event_id`, an upsert under a unique key, or replacing a deterministic partition/version.",
      "A transaction is required when several rows, tables, balances, or the output plus its processed-batch marker must succeed or fail together. The transaction closes the gap between partial output and the deduplication record.",
      "A batch-ID marker prevents a fully committed micro-batch from being written again, but it must be committed with that batch's data. Otherwise `data committed / marker missing` duplicates on retry, while `marker committed / data missing` loses output.",
      "Event-level keys are preferable when the sink can partially accept a batch, when different queries may replay overlapping inputs, or when historical backfills do not preserve the original Spark batch IDs.",
      "Append-only output is safe only when the sink's commit protocol can recognize and suppress a repeated Spark epoch/batch. A raw JDBC append or per-row HTTP POST normally cannot.",
      "An assignment such as `status = 'complete'` may be naturally idempotent; an operation such as `balance = balance + 100` is not. Guard the latter with a unique ledger event and a transaction rather than hoping the batch runs once.",
      "For an API, send a durable idempotency key and store the remote receipt. For Kafka output, assume the built-in Spark Kafka sink is at-least-once and design downstream deduplication with a stable key.",
    ],
    "A payment pipeline stores `payment_event_id` under a unique constraint and inserts the ledger movement and processed-event row in one transaction. A retried Spark task receives a conflict for the same event instead of applying the amount twice.",
    "If repeating a write can change the business result, that boundary needs idempotency, a transaction, or both.",
  ),
  "What happens if a Spark job fails in the middle of a batch?": detailedAnswer(
    "Spark first retries failed task attempts. If the stage eventually succeeds, the same micro-batch can still finish normally. If the query terminates before the micro-batch is committed, that batch is incomplete: after restart with the same checkpoint, Spark restores the last committed state and executes the failed offset range again.",
    [
      "Before executing a micro-batch, Structured Streaming records the source end offsets it intends to process. Successful completion is recorded separately. Therefore a planned offset range can exist without a matching completed-batch commit.",
      "A completed task attempt does not commit the entire micro-batch. If another task fails and the batch ultimately aborts, Spark is allowed to rerun work from already successful partitions during recovery.",
      "For stateful queries, state-store versions are coordinated with batch progress. Recovery uses the state associated with the last successful batch instead of accepting half-applied aggregation, join, or deduplication state.",
      "The source data is reread from Kafka as long as the required offsets still exist. If retention has removed them, the query can fail with `failOnDataLoss=true`; silently starting later would violate the no-data-loss claim.",
      "A checkpoint-aware file or table sink may hide/abort incomplete output through its commit protocol. An external database, API, or message send can remain visible even though Spark considers the batch failed.",
      "Do not delete the checkpoint to solve a failed batch before establishing the last good source range and sink state. Deleting it changes the recovery identity and can cause skipped or fully replayed history.",
      "After recovery, verify the failed batch ID, input offset ranges, state-store recovery, sink commit/transaction ID, duplicates, and source lag before declaring the incident resolved.",
    ],
    "Suppose batch 58 owns partition 0 offsets `[1,000,1,500)` and partition 1 offsets `[4,000,4,300)`. One task writes successfully, another exhausts its retries, and the query stops. Because batch 58 was never committed, restart can execute both ranges again; a retry-safe sink prevents the first task's prior output from becoming a duplicate.",
    "Task success is local; only a successful batch commit advances recoverable query progress.",
    [{
      title: "Failure and recovery timeline",
      steps: [
        { label: "Plan batch 58", detail: "Record Kafka end offsets" },
        { label: "Run tasks", detail: "Some output may become externally visible" },
        { label: "Failure", detail: "No successful batch-58 commit" },
        { label: "Restart", detail: "Restore batch 57 state and progress" },
        { label: "Replay batch 58", detail: "Sink must suppress repeated effects" },
      ],
    }],
  ),
  "What happens to uncommitted Kafka offsets after restart?": detailedAnswer(
    "The records behind uncommitted offsets are read again. More precisely, Structured Streaming does not commit source progress through Kafka consumer auto-commit; it stores its own offset and commit logs in the checkpoint. On recovery it compares planned batches with successfully committed batches and reruns the incomplete range from the last successful progress point.",
    [
      "If batch 57 committed through exclusive end offset 1,000 and failed batch 58 planned `[1,000,1,500)`, restart processes offset 1,000 again and stops before 1,500 for that range. Offset ranges are half-open: start inclusive, end exclusive.",
      "A new `startingOffsets` setting does not override a valid checkpoint for an existing query. To preserve correctness, restart with the same checkpoint and compatible query definition.",
      "Earlier committed ranges are not normally reread. The incomplete batch is replayed because Spark cannot prove that its complete output and state were safely committed.",
      "Kafka retention is the hard limit. If offset 1,000 has expired before restart, the checkpoint identifies the missing data but cannot restore it; retaining `failOnDataLoss=true` normally makes the loss visible.",
      "Re-reading the range gives at-least-once physical execution. Exactly-once final results require the checkpointed state and sink to handle that replay safely.",
    ],
    "The checkpoint shows `commits/57`, while the offset log also contains the planned end offsets for batch 58. Spark resumes batch 58 rather than trusting those planned offsets as completed output.",
    "Uncommitted input is replayed from Kafka; it is neither acknowledged as complete nor intentionally skipped.",
  ),
  "Why can duplicate output still occur?": detailedAnswer(
    "Duplicates occur because Spark's checkpoint and an arbitrary external sink usually do not participate in one atomic transaction. The sink can accept the output while Spark fails before recording the matching batch commit. Spark must replay the batch to prevent data loss, and a non-idempotent sink treats the retry as a second write.",
    [
      "Failure window: `read offsets -> transform -> sink commits -> driver fails -> Spark commit missing`. On restart, Spark can prove the input was planned but cannot prove the external side effect should be trusted, so it re-executes the range.",
      "Task retries can repeat side effects inside a UDF, `mapPartitions`, `foreach`, or custom writer. Spark's scheduler promises correct dataset computation, not exactly-once execution of arbitrary user code.",
      "Timeouts create an ambiguous result. A database or API may have committed a request even though the client lost the acknowledgement; an unkeyed retry duplicates it.",
      "Partial batches create a second problem: some rows may be visible while others failed. A batch marker written separately cannot distinguish this safely; use one transaction, staged atomic promotion, or row-level idempotency.",
      "The built-in Kafka sink is at-least-once and may duplicate records on producer retry. Preserve a stable key/event ID so consumers can deduplicate if duplicate Kafka records are unacceptable.",
      "Prevent duplicates with unique event IDs, constraints, `MERGE`, transactional outbox/ledger patterns, table commit protocols, and failure-injection tests at the sink/checkpoint boundary.",
    ],
    "Batch 58 inserts 500 database rows and the driver dies before the Spark commit is durable. Recovery inserts the same 500 rows again. Plain `INSERT` produces 1,000 rows; `MERGE ON event_id` or a unique-key transaction still produces 500.",
    "Replay is how Spark avoids missing data; idempotency is how the sink makes replay harmless.",
  ),
  "What is late data?": detailedAnswer(
    "Late data is an event that arrives after newer event-time progress has already been observed, often after the event's original window has begun or even become eligible for finalization. Lateness is based on the timestamp of when the event happened, not merely the server clock when Spark processed it.",
    [
      "Event time comes from the business event, such as when an order was placed or a device reading was captured. Processing time is when Spark happens to read it. A ten-minute processing delay is not meaningful unless it is compared with event-time progress and the query's correctness SLA.",
      "Common causes are mobile devices buffering offline, network retries, out-of-order Kafka production, producer clock skew, regional outages, CDC retries, and historical backfills.",
      "A record can be out of order without being too late. If the relevant window state is still retained, Spark can incorporate it and revise the aggregate.",
      "A watermark supplies the bounded-lateness assumption used by supported stateful operators. It does not delay each row for exactly that duration, and the threshold is not a wall-clock timer attached to every event.",
      "Validate timestamp type, timezone, nullability, future timestamps, and impossible old dates before using the field for a watermark. One corrupt far-future event can advance event-time progress and make valid records appear late.",
      "Choose lateness from observed percentiles and business cost: for example, compare p95, p99, and p99.9 event delay with the state size and result-finality SLA. A larger threshold accepts more disorder but retains more state and delays append-mode final output.",
      "Keep immutable raw input when very late records cannot simply disappear. The real-time query may use a bounded state horizon while a reconciliation job repairs the authoritative table later.",
    ],
    "An event occurred at 10:03 and belongs to the 10:00-10:05 window, but reaches Spark after events through 10:20 have been observed. With a 10-minute delay threshold, the conceptual watermark is around 10:10, so the 10:03 event may be too late for that stateful window even though it remains valid source data.",
    "Late data is an event-time ordering problem; whether it is accepted depends on the watermark and whether the operator still has the required state.",
  ),
  "How do you handle late data in Structured Streaming?": detailedAnswer(
    "Use a trustworthy event-time column, put `withWatermark` before the supported stateful operation, aggregate or join on that same event-time lineage, and define a deliberate correction path for records outside the real-time horizon. Handling late data is a business trade-off between completeness, state cost, and when results may be considered final.",
    [
      "Measure `arrival_time - event_time` by source, producer version, region, and event type. Choose the delay threshold from this distribution and the business SLA rather than copying a universal ten-minute value.",
      "Parse and validate event time before watermarking. Quarantine malformed or implausibly future timestamps because they can corrupt event-time progress; preserve source coordinates for repair and replay.",
      "Call `withWatermark(\"event_time\", \"10 minutes\")` before `groupBy(window(...))`, deduplication, or the relevant join. For aggregation cleanup, the watermark column must be the same event-time column used by the aggregation.",
      "Choose output mode intentionally. Update mode can publish revised windows while state remains open. Append mode emits a window only after the watermark crosses its finalization boundary. Complete mode retains the entire aggregation result and therefore does not use the watermark to drop aggregation state.",
      "A watermark is not a general dead-letter router. Preserve a raw Bronze/archive stream before the stateful query, then reconcile very late events into the authoritative table with idempotent corrections.",
      "Monitor `eventTime.watermark`, maximum event time, `stateOperators.numRowsTotal`, state-store memory/bytes, `numRowsDroppedByWatermark`, trigger duration, and source lag. A configured watermark that stops advancing does not bound state as expected.",
      "Test the boundary with events just before and just after the expected cleanup point, including an idle source and a deliberately future-dated record.",
    ],
    "For five-minute order windows, suppose measured p99 delay is 7 minutes and the accepted SLA is 10 minutes. Use a 10-minute watermark for the live aggregation, persist raw events independently, and run a correction merge for the rare events that arrive after state eviction.",
    "Bound live state with a measured watermark, but preserve raw evidence and an idempotent correction path when completeness matters.",
  ),
  "What happens when late data arrives after a window is created?": detailedAnswer(
    "Creating a window does not immediately close it. If its aggregation state still exists, a late event can update that window. Once the event-time watermark passes the operator's cleanup boundary and Spark removes the state, a still-later event may be dropped instead of recreating a window that has already been treated as final.",
    [
      "In Update mode, each accepted late event can cause the changed window row to be emitted again. The sink should upsert by window boundaries and grouping keys rather than blindly append every revision.",
      "In Append mode, Spark waits until the watermark has passed the window end before emitting the finalized row. After that finalization and state cleanup, the output is not reopened by a very late event.",
      "In Complete mode, the whole result table is emitted each trigger and aggregation state is not dropped using the watermark, so its storage behavior differs from Append and Update modes.",
      "Spark's documented guarantee is asymmetric: records less late than the delay threshold are guaranteed not to be dropped; records later than the threshold may be dropped. Some beyond-threshold records can still be processed when cleanup has not yet occurred.",
      "The comparison is against query event-time progress, not the wall clock. If no newer event times arrive, the watermark may stop and an old window may remain open longer than the configured duration suggests.",
      "If a finalized result must be corrected, use retained raw data and publish a new version/upsert through a reconciliation flow rather than relying on evicted streaming state.",
    ],
    "For a 10:00-10:05 window and a ten-minute delay, an event with time 10:04 can update the count while that window remains in state. Once the watermark moves beyond 10:05 and the operator evicts it, another 10:04 event may be discarded by that aggregation.",
    "A window can accept revisions while its state exists; watermark-driven finalization determines when it can no longer change in that streaming operator.",
  ),
  "What is watermarking?": detailedAnswer(
    "Watermarking is Spark's event-time progress mechanism for bounded state. Conceptually, `watermark = maximum event time observed - delay threshold`. Supported stateful operators use that progress to decide when old aggregation, deduplication, or join state is eligible for cleanup and when append-mode results can be finalized.",
    [
      "Example formula: maximum observed `event_time = 10:20`, configured delay `= 10 minutes`, so the conceptual watermark is approximately `10:10`. This is about observed event time, not `current_timestamp()` on the driver.",
      "The actual watermark used by the engine can lag the simple formula because it is coordinated across partitions and updated as triggers progress. Spark guarantees that it will be at least the configured delay behind actual event-time progress, so some records older than the nominal threshold may still be processed.",
      "`withWatermark` attaches watermark metadata to a streaming event-time column; it is useful only when a downstream supported stateful operator can apply that metadata. It does not by itself filter every row older than a computed timestamp.",
      "For a windowed aggregation, state becomes eligible for removal after the watermark passes the window's end. A 10:00-10:05 window is not retained until 10:15 wall-clock time; it is retained until query event-time progress makes the watermark cross 10:05.",
      "With multiple streaming inputs, Spark calculates an input watermark for each and chooses a global watermark. The default `min` policy follows the slowest input to avoid prematurely dropping its data; `max` can advance faster but may drop data from a lagging stream.",
      "The delay is a trade-off. Increasing it reduces the chance of excluding legitimate late events but increases state rows, state-store I/O, checkpoint size, recovery time, and append-mode result latency.",
      "A future-dated bad record can move the observed maximum forward. Validate clocks and timestamp ranges before the stateful operator, and monitor the reported watermark rather than assuming the configuration alone is effective.",
    ],
    "If the largest valid event time seen is 10:20 and the delay is ten minutes, watermark progress is around 10:10. Any window ending before that point may become eligible for finalization and cleanup; a record at 10:04 arriving afterward may be dropped because its 10:00-10:05 state is gone.",
    "A watermark is a query-wide event-time progress and state-retention boundary, not a per-record waiting timer.",
    [{
      title: "Numerical watermark example",
      steps: [
        { label: "Maximum event time", detail: "10:20 observed in the query" },
        { label: "Allowed delay", detail: "10 minutes" },
        { label: "Watermark", detail: "Approximately 10:10" },
        { label: "Window end", detail: "10:05 is now behind the watermark" },
        { label: "State action", detail: "10:00-10:05 may be finalized and evicted" },
      ],
      note: "The threshold is based on event-time progress and may advance later than this simplified calculation.",
    }],
  ),
  "Why are watermarks needed?": detailedAnswer(
    "A stream has no natural end, so without a lateness boundary Spark cannot know that an old window, event ID, or join row will never be needed again. A watermark converts the business statement 'we accept data this late' into an execution rule that bounds state and, in supported modes, establishes when output is final.",
    [
      "Window aggregation otherwise has to retain every historical group because an older event could theoretically arrive years later and change it. That produces unbounded state, larger checkpoints, slower recovery, and eventually an unstable query.",
      "Append-mode aggregation cannot emit a row while that row may still change. Crossing the window end with the watermark provides the finalization condition required for one append.",
      "Streaming deduplication needs a horizon after which old event IDs can be forgotten; remembering every identifier forever is not operationally finite.",
      "Stream-stream joins need watermarks plus appropriate event-time range constraints so Spark can determine when a row can no longer find a future match and old join state can be removed.",
      "A watermark also makes the correctness/cost trade-off explicit and observable: accepted lateness, state size, result delay, and dropped-late-row metrics can be reviewed together.",
      "Watermarking does not solve source loss, malformed timestamps, sink duplicates, or all state growth. Complete-mode aggregations and unsupported stateful patterns can still retain unbounded state.",
    ],
    "A service accepts revisions up to 24 hours after event time. A 24-hour watermark lets Spark keep only the deduplication and window state required for that horizon instead of every key since the query began, while a separate backfill process handles rarer corrections.",
    "Watermarks make event-time state finite and give supported output modes a defensible point of finality.",
  ),
  "How does a watermark affect state cleanup and late-event acceptance?": detailedAnswer(
    "The watermark makes old state eligible for eviction; the existence of that state determines whether a late event can still contribute. Before cleanup, a late event can update its window, match a join row, or participate in watermark-aware deduplication. After cleanup, the relevant stateful operator may discard it rather than recreate finalized history.",
    [
      "Window rule: cleanup is tied to the window end. When the watermark becomes later than a window's end, Spark can finalize and remove that window in Append/Update aggregation modes under their supported semantics.",
      "Acceptance is intentionally not a hard symmetric cutoff. Data delayed by less than the configured threshold is guaranteed not to be dropped; data delayed by more than it may or may not be processed depending on actual watermark advancement and cleanup timing.",
      "Join rule: both input watermarks and the event-time range condition influence when state is safe to remove. Adding watermarks without a bounded time relationship may not bound join state.",
      "Deduplication rule: the chosen watermark-aware deduplication API determines how long seen keys are retained. Confirm whether event time is part of the deduplication key and what state the API version guarantees.",
      "Output mode changes visible behavior. Append waits for finality; Update can emit revisions; Complete mode does not drop aggregation state based on the watermark.",
      "Observe `numRowsDroppedByWatermark`, total/updated state rows, state memory/bytes, watermark value, and batch duration. A zero drop count does not prove the threshold is correct, and a configured watermark that never advances cannot clean old state.",
    ],
    "A five-minute window ends at 10:05. While the watermark is 10:04, a new 10:03 event can update it. After watermark progress crosses 10:05 and the state is evicted, an equivalent 10:03 event may be counted as dropped by the watermark-aware aggregation.",
    "The watermark does not directly delete all old input; it authorizes operator state cleanup, and cleanup changes which late events can still affect results.",
  ),
  "What is backpressure?": detailedAnswer(
    "Backpressure is the control applied when data can arrive faster than the complete Spark pipeline can safely process it. It limits or adapts admitted work so batch duration, memory, shuffle, state, and sink load remain bounded. Legacy DStreams provide an automatic rate estimator; Structured Streaming instead uses pull-based execution and source-specific admission limits.",
    [
      "Let arrival rate be `lambda` and sustainable end-to-end processing rate be `mu`. If `lambda > mu`, backlog grows at approximately `lambda - mu` records per second. A throttle protects the job from oversized batches, but only raising `mu` above `lambda` can drain sustained lag.",
      "Receiver-based DStreams can enable `spark.streaming.backpressure.enabled=true`. Spark uses recent processing/scheduling behavior and its rate estimator to adjust how quickly receivers accept records.",
      "Legacy direct Kafka DStreams use the backpressure estimator with `spark.streaming.kafka.maxRatePerPartition` as an upper bound; receiver sources can also use `spark.streaming.receiver.maxRate`.",
      "Structured Streaming is pull-based: a micro-batch does not create another independent pile of Spark tasks while the prior one is still running. However, the external source continues accumulating data, so the next trigger can still be too large without admission control.",
      "For Structured Streaming Kafka, `maxOffsetsPerTrigger` bounds total offsets per trigger and distributes them proportionally among topic-partitions. Apache Spark's built-in file source supports `maxFilesPerTrigger`; byte limits are connector-specific, such as Delta Lake's `maxBytesPerTrigger` or Databricks Auto Loader's `cloudFiles.maxBytesPerTrigger`.",
      "Trigger interval is scheduling, not a record limit. If a ten-second trigger takes fifteen seconds, the next eligible trigger runs as soon as Spark can; the missed interval does not safely cap its input.",
      "Backpressure is an operational safety mechanism, not a cure for skew, slow UDFs, undersized clusters, expensive state, tiny files, broker throttling, or a sink whose capacity is below the source rate.",
    ],
    "Kafka receives 200,000 records/s while the whole query and sink sustain 120,000 records/s. Lag grows by roughly 80,000 records/s. Limiting each trigger prevents a catastrophic batch, but the team must remove the bottleneck or scale capacity above 200,000 records/s to catch up.",
    "Backpressure bounds admitted work; spare processing capacity is what prevents or removes long-term lag.",
    [{
      title: "Backpressure control loop",
      steps: [
        { label: "Source backlog", detail: "Kafka offsets or waiting files accumulate" },
        { label: "Admission limit", detail: "Bound records, files, or bytes per trigger" },
        { label: "Spark + sink", detail: "Measure full batch processing capacity" },
        { label: "Tune / scale", detail: "Keep batches safe and make processing exceed arrival" },
      ],
    }],
  ),
  "Why is backpressure needed?": detailedAnswer(
    "Backpressure prevents a temporary source spike or recovery backlog from turning into one unmanageably large batch. Without it, excessive input can amplify shuffle volume, state updates, garbage collection, spill, checkpoint time, and sink concurrency until batches slow further and the query enters a failure loop.",
    [
      "A bounded batch has a tested memory footprint and sink transaction size. This is especially important after downtime, when Kafka may expose hours of accumulated offsets at once.",
      "Rate control protects slower downstream systems. Spark may transform data faster than a database can merge it, so end-to-end sink throughput, not only executor CPU, determines a safe intake limit.",
      "Stable batch size makes latency and recovery behavior predictable. It is easier to diagnose a consistent five-minute batch than a single trigger that consumes an entire backlog and spills for hours.",
      "The trade-off is source lag: admitting less now leaves more data in Kafka or the file backlog. Retention and freshness alerts must allow enough time for recovery.",
      "Use headroom rather than setting the limit at the best observed throughput. Capacity changes with record size, skew, state, compaction, concurrent workloads, and downstream latency.",
      "If long-run input exceeds sustainable output, throttling only delays failure through growing lag. Optimize joins/UDFs, add usable parallelism, scale the sink, split hot partitions, or change the architecture.",
    ],
    "After a 30-minute outage, a query has 360 million Kafka records waiting. A measured admission limit drains them through predictable batches while the cluster is temporarily scaled so processed rate remains higher than the live producer rate.",
    "Backpressure keeps recovery work safe and predictable, but it must be paired with enough end-to-end capacity to satisfy retention and freshness goals.",
  ),
  "Where is backpressure supported in Spark Streaming and Structured Streaming?": detailedAnswer(
    "Classical automatic backpressure belongs to the legacy Spark Streaming DStream engine. Structured Streaming does not use that receiver/PID controller; it uses pull-based micro-batches plus admission controls implemented by individual sources. The similar goal should not be confused with the same configuration mechanism.",
    [
      "Receiver-based DStreams: set `spark.streaming.backpressure.enabled=true` to enable dynamic receiver-rate estimation. `spark.streaming.backpressure.initialRate` supplies the starting rate before sufficient feedback exists.",
      "Receiver safety ceiling: `spark.streaming.receiver.maxRate` limits records per second per receiver. It is an upper bound, not a target throughput guarantee.",
      "Direct Kafka DStreams: `spark.streaming.kafka.maxRatePerPartition` limits the rate per Kafka partition. With backpressure enabled, the calculated rate operates under that bound.",
      "Structured Streaming Kafka: use `maxOffsetsPerTrigger` for a maximum total number of offsets per trigger. `minOffsetsPerTrigger` with `maxTriggerDelay` serves a different purpose: waiting for a minimum batch size unless the delay limit is reached.",
      "Structured Streaming built-in file source: use `maxFilesPerTrigger`; `latestFirst`, `maxFileAge`, and `cleanSource` control discovery order, file age, and cleanup rather than byte admission. Delta Lake provides the soft `maxBytesPerTrigger` option, and Databricks Auto Loader uses `cloudFiles.maxBytesPerTrigger`. Do not apply those byte options to a plain Parquet source.",
      "A processing-time trigger controls when Spark checks for work; it does not impose a source rate. Not every connector implements admission control, so verify the exact source and Spark version.",
      "The DStream engine is legacy. For new applications, prefer Structured Streaming and do not expect `spark.streaming.backpressure.enabled` to affect a Structured Streaming Kafka query.",
    ],
    "Setting the legacy backpressure flag in a Structured Streaming application changes nothing about Kafka intake. That query needs `.option(\"maxOffsetsPerTrigger\", ...)` on its Kafka source and capacity monitoring around the full trigger.",
    "DStreams have automatic receiver backpressure; Structured Streaming has source-specific admission control.",
  ),
  "How does Structured Streaming throttle Kafka or file ingestion?": detailedAnswer(
    "Structured Streaming bounds the new source data assigned to one trigger with source-specific controls. Kafka uses an offset budget; Apache Spark's built-in file source uses a file-count budget; Delta Lake and Databricks Auto Loader additionally provide connector-specific byte budgets. These limits control input admission only: they do not directly cap output rows, shuffle expansion, state size, executor memory, or sink calls.",
    [
      "Kafka: `maxOffsetsPerTrigger=N` caps the total number of offsets across all subscribed topic-partitions for that trigger. Spark splits N proportionally according to available volume; it is not N per partition.",
      "Kafka batching: `minOffsetsPerTrigger` can postpone a trigger until enough offsets exist, while `maxTriggerDelay` forces progress after a maximum wait. This reduces tiny batches; it is not a replacement for the maximum limit.",
      "Built-in file stream: `maxFilesPerTrigger` admits at most a chosen number of new files. Options such as `latestFirst`, `maxFileAge`, and `cleanSource` affect discovery or cleanup, not the admitted byte total, so count-based control remains imprecise when file sizes vary widely.",
      "Delta Lake: `maxBytesPerTrigger` is a soft byte target and still admits at least one file when that file alone exceeds the target. Databricks Auto Loader exposes the corresponding byte control as `cloudFiles.maxBytesPerTrigger`. Large individual files still require adequate partitions, memory, and task sizing.",
      "A trigger interval schedules checks. If prior processing overruns the interval, Spark starts the next trigger when it can; the interval alone does not stop the source backlog from making the next batch large.",
      "A practical first estimate is `safe offsets per trigger = sustainable processed rows/s x target trigger work seconds x safety factor`. Use a safety factor below 1, then validate bytes/record, skew, state growth, and sink time because equal record counts can have very different costs.",
      "Tune from `numInputRows`, `inputRowsPerSecond`, `processedRowsPerSecond`, trigger duration percentiles, source offset lag, state metrics, executor spill/GC, and sink latency. Increase gradually only while processing has headroom.",
    ],
    "If the full pipeline sustains 60,000 records/s, the desired work budget is ten seconds, and the chosen safety factor is 0.8, a starting estimate is `60,000 x 10 x 0.8 = 480,000 offsets/trigger`. Load-test it; larger messages or skew may require a lower value.",
    "Admission settings bound source work per trigger; size them from measured end-to-end capacity and keep enough headroom to drain lag.",
  ),
  "What causes lag in a Kafka and Spark pipeline?": detailedAnswer(
    "Kafka-Spark lag grows when Kafka's latest offsets advance faster than Spark can durably finish the corresponding records. For topic-partition `p`, offset lag is approximately `latestOffset(p) - SparkProcessedOffset(p)`. The operational question is not merely whether lag exists, but which boundary—producer, Kafka partition, Spark task/stage, state/checkpoint, or sink—is limiting committed throughput.",
    [
      "Start with the rate equation. If arrival rate is `lambda` records/s and sustainable committed processing rate is `mu`, backlog changes at approximately `lambda - mu`. When `lambda > mu`, no retry or retention setting can prevent long-term growth; the pipeline needs more end-to-end throughput or less input work.",
      "Kafka-side causes include too few topic partitions for the desired source parallelism, a hot partition caused by a skewed key, broker disk or network throttling, ISR/leader instability, large messages, producer bursts, and retention pressure during a long outage.",
      "Spark compute causes include source tasks that do not use the available slots, expensive parsing, Python or row UDF overhead, unnecessary wide shuffles, poor joins, skewed keys, excessive task scheduling, spill, long garbage collection, fetch failures, executor loss, and repeated retries.",
      "Stateful-streaming causes include high-cardinality state, a stalled or overly long watermark horizon, slow state-store maintenance, large checkpoints, and a remote checkpoint store with high latency. A growing state store can make each later trigger slower than the preceding one.",
      "Sink causes are common: database locks or throttling, low write concurrency, tiny-file commits, object-store/listing latency, API rate limits, transaction retries, or one slow output partition. The trigger cannot commit faster than its slowest required sink action.",
      "A short trigger interval is not itself the root cause. If a trigger takes 15 seconds while the requested interval is 10 seconds, Structured Streaming starts the next trigger when it can; this is evidence that work exceeds the interval, not a second set of batches running concurrently.",
      "Inspect lag per Kafka partition rather than only a topic-wide sum or average. Seven healthy partitions can conceal one hot partition whose straggling Spark task determines the entire micro-batch duration.",
      "For Structured Streaming, a normal Kafka consumer-group lag dashboard can be misleading because Spark manages source progress in its checkpoint and does not use Kafka consumer auto-commit. Correlate broker latest offsets with the source `endOffset` in `StreamingQueryProgress`.",
    ],
    "Kafka receives 100,000 records/s while the sink-committed Spark rate is 80,000 records/s, so backlog grows by about `100,000 - 80,000 = 20,000 records/s`, or 1.2 million records each minute. If one partition owns most of that growth, adding Spark executors without splitting or re-keying the work may leave the limiting task unchanged.",
    "Lag is the accumulated difference between arrival and committed processing; diagnose the slowest boundary and the worst partition before scaling anything.",
    [{
      title: "Lag diagnosis path",
      steps: [
        { label: "Kafka latest offsets", detail: "Measure arrival and lag per partition" },
        { label: "Spark source progress", detail: "Compare start/end offsets and trigger input" },
        { label: "Stages and state", detail: "Find skew, spill, GC, retries, or state growth" },
        { label: "Sink commit", detail: "Measure durable write and transaction latency" },
        { label: "Business freshness", detail: "Confirm event-to-queryable-data age" },
      ],
    }],
  ),
  "How do you reduce that lag?": detailedAnswer(
    "Reduce lag by making the bottleneck's sustainable committed throughput exceed the live arrival rate, while keeping each recovery batch within safe memory and sink limits. The correct action depends on evidence: more executors help only when there are enough runnable tasks and the sink, Kafka, and checkpoint store can support the extra concurrency.",
    [
      "Calculate the required catch-up headroom. If current backlog is `B`, live arrival is `lambda`, and processing capacity is `mu > lambda`, ideal catch-up time is `B / (mu - lambda)`. Add safety margin for retries, skew, and rate variation.",
      "For source parallelism, use enough Kafka partitions and a key that distributes load without violating required ordering. On supported connectors, `minPartitions` or `maxRecordsPerPartition` can split a large Kafka offset range into more Spark input tasks, but neither repairs a hot business key in later aggregations.",
      "For Spark compute, prune columns and rows early, use built-in expressions instead of row UDFs, avoid unnecessary repartitions, select an appropriate join, remove skew, and size input/shuffle partitions so tasks fit memory without creating excessive scheduling overhead.",
      "For stateful queries, apply correct event-time bounds and watermarks, reduce unnecessary key cardinality, monitor state rows and bytes, and isolate stateful work whose scaling/recovery profile differs from stateless parsing.",
      "For a slow sink, batch writes, use an optimized connector, increase safe partitioned concurrency, remove per-row network calls, compact file output, and scale or redesign the target. Preserve idempotency while changing write parallelism.",
      "Use `maxOffsetsPerTrigger` to keep a recovery trigger safe, not as a way to make lag disappear. A lower cap can stabilize the job but also lowers intake; raise it only after load testing shows the complete pipeline can finish the larger trigger reliably.",
      "Temporary extra capacity drains backlog only when it creates usable tasks and leaves positive headroom. Kafka retention must exceed the estimated catch-up time plus outage and safety margins, or old offsets can expire before Spark reaches them.",
      "Validate the fix through a sustained downward per-partition lag slope, `processedRowsPerSecond > inputRowsPerSecond` over a meaningful interval, bounded trigger duration, stable state/checkpoint time, and improving end-to-end event age.",
    ],
    "A query has 360 million records of backlog, receives 100,000 records/s, and after tuning commits 160,000 records/s. Net drain rate is `160,000 - 100,000 = 60,000 records/s`; ideal catch-up time is `360,000,000 / 60,000 = 6,000 seconds`, or 100 minutes. Retention and the operational plan should allow more than that ideal estimate.",
    "Fix the measured bottleneck and create positive throughput headroom; throttling controls batch risk but does not by itself drain backlog.",
  ),
  "How do you monitor Kafka and Spark together?": detailedAnswer(
    "Monitor Kafka, Spark, checkpoint/state, the sink, and business freshness as one causal timeline. Kafka metrics show what was produced and remains unread; Spark progress shows what each trigger planned and completed; runtime metrics explain where time and resources were consumed; sink and data-quality metrics prove that records became correct, durable, queryable output.",
    [
      "Producer and broker layer: records/bytes in, producer error and retry rates, request latency, batch/compression behavior, broker CPU/network/disk, offline or under-replicated partitions, ISR changes, leader changes, and disk/retention headroom.",
      "Partition progress layer: capture broker latest offset and Spark's latest completed source end offset for every topic-partition. Report both record lag and the age of the oldest unprocessed event; a million tiny events and a million huge events have different risk.",
      "Structured Streaming progress: record query `id`, `runId`, `batchId`, `numInputRows`, input and processed rates, source start/end/latest offsets, `durationMs` breakdown, event-time maximum/watermark, sink description, and any source-specific metrics.",
      "State layer: monitor `numRowsTotal`, `numRowsUpdated`, state memory/bytes, commit and maintenance time, custom state-store metrics, and `numRowsDroppedByWatermark`. Alert when the watermark stalls while Kafka continues moving.",
      "Spark execution layer: use the SQL/Streaming and Stages views plus event logs for task duration distribution, stragglers, skewed shuffle partitions, shuffle bytes, spill, GC, executor loss, failed/retried tasks, fetch failures, CPU utilization, and unused task slots.",
      "Checkpoint and sink layer: measure checkpoint write/list latency, failed commits, sink batch/transaction duration, database locks/throttling, output file counts and sizes, rejected rows, and the time at which data becomes visible to readers.",
      "Business layer: publish event-time-to-output freshness percentiles, expected-versus-written counts, unique-event counts, duplicate rate, schema rejects, DLQ/quarantine volume, and last successful certified output. Infrastructure health alone does not prove data correctness.",
      "Use trend-based alerts: positive lag slope for several intervals, trigger p95 approaching or exceeding its scheduling interval, no successful batch for an SLO period, stalled watermark, accelerating state size, repeated restart, retention headroom below catch-up time, or stale downstream data.",
    ],
    "For one incident, align a graph of Kafka latest offsets, Spark source end offsets, trigger duration, maximum task duration, state-store commit time, sink transaction time, and p95 event age. If only sink time rises before lag begins, scaling Kafka partitions is not the remedy.",
    "A useful dashboard follows one record range from Kafka availability through Spark execution to durable, correct output and makes the limiting boundary obvious.",
    [{
      title: "One pipeline, five evidence layers",
      steps: [
        { label: "Kafka", detail: "Production rate, partition health, latest offsets" },
        { label: "Streaming progress", detail: "Batch IDs, source offsets, rates, duration" },
        { label: "Spark runtime", detail: "Tasks, skew, shuffle, spill, GC, failures" },
        { label: "State + sink", detail: "Checkpoint, state, commit, and visibility latency" },
        { label: "Data SLO", detail: "Freshness, completeness, uniqueness, correctness" },
      ],
    }],
  ),
  "How do you process a huge dataset safely when the Spark cluster is small?": detailedAnswer(
    "Make each task, shuffle, and output commit fit the available cluster, and make the overall job restartable. Spark does not normally load an entire 10 TB dataset into memory: batch scans are partitioned and operators can spill. Structured Streaming micro-batches are useful when input arrives continuously or when a supported source needs bounded admission, but a bounded historical dataset can often be processed more simply as pruned, restartable batch slices.",
    [
      "Choose the execution model from the workload. Use batch for a finite snapshot or explicit date/range backfill. Use Structured Streaming for continuously arriving data, or an Available Now trigger when the source supports dividing the current backlog into multiple rate-limited micro-batches and then stopping.",
      "Reduce bytes before expensive work: use Parquet/ORC, explicit schemas, partition pruning, predicate pushdown, column pruning, and compact healthy input files. Avoid schema inference across a huge raw directory and avoid repeatedly listing millions of tiny files.",
      "For bounded history, process independent date, partition, or key ranges and record each successful slice in a control table. Write to staging and publish atomically or idempotently so a failed slice can be retried without duplicating prior output.",
      "Bound a built-in file stream with `maxFilesPerTrigger`. If byte-based admission is required, use a connector that implements it: Delta Lake's `maxBytesPerTrigger` or Auto Loader's `cloudFiles.maxBytesPerTrigger`. Even a 1 GB source budget does not guarantee 1 GB of executor memory because decoding, joins, aggregation, and shuffle can expand it.",
      "Bound Kafka input with `maxOffsetsPerTrigger`, then verify average and tail bytes per record, skew, state cost, and sink duration. An offset count controls records, not bytes or post-transformation cardinality.",
      "Size input and shuffle partitions so one task fits memory and local disk, but retain enough partitions for multiple waves across the available slots. A starting estimate is `ceil(stage bytes / target bytes per task)`; validate peak task memory and spill rather than treating 128 MB as a universal rule.",
      "Avoid operations that defeat distributed processing: `collect`, unbounded `toPandas`, large `groupByKey` collections, accidental Cartesian products, a broadcast that does not fit every executor, unbounded cache/state, and per-row network calls.",
      "Provision local disk for shuffle spill, reserve executor memory overhead for native/Python/shuffle needs, limit concurrent memory-heavy tasks with sensible executor cores, and let recomputable intermediates spill instead of forcing the whole working set into cache.",
      "Control the sink as carefully as the source: cap database concurrency, batch writes, prevent tiny output files, choose deterministic output partitions, and use retry-safe commits. A small cluster can still overload a small target system.",
      "Monitor task peak memory, spill, GC, executor loss, skew, input/shuffle bytes per task, batch or slice duration, checkpoint/commit time, and end-to-end progress. Optimize the stage that actually limits throughput before buying memory or changing every setting.",
    ],
    "For a 10 TB historical table, process one source date at a time, read only the required Parquet columns, write each target date to a versioned staging location, validate counts and keys, and atomically publish it. For a live Delta or Auto Loader backlog, an Available Now query can use the connector's byte admission option, checkpoint each micro-batch, and stop after all initially available files are processed; a built-in Parquet source instead uses a file-count limit.",
    "The dataset may be much larger than cluster memory; correctness depends on bounded task/shuffle/commit units and restartability, not on forcing all work through streaming.",
    [{
      title: "Small-cluster safety boundaries",
      steps: [
        { label: "Prune input", detail: "Read only required partitions, rows, and columns" },
        { label: "Bound work", detail: "Slice history or rate-limit supported streaming sources" },
        { label: "Fit each task", detail: "Control partition bytes, skew, concurrency, and spill" },
        { label: "Commit safely", detail: "Publish idempotent, restartable output units" },
        { label: "Measure", detail: "Tune from peak task and end-to-end evidence" },
      ],
    }],
  ),
  "Which ingestion, partitioning, memory, and Adaptive Query Execution settings should be tuned?": {
    summary:
      "Tune each layer independently: source-specific admission limits, file-scan sizing, initial shuffle partitions, AQE coalescing and skew controls, executor heap and overhead, per-executor concurrency, spill disk, and sink parallelism. Validate effective settings against the executed plan and task metrics.",
    takeaway:
      "For the canonical small-cluster strategy and worked sizing example, see “How do you process a huge dataset safely when the Spark cluster is small?”",
  },
};

const CODE_EXAMPLES_55_TO_73: Record<string, InterviewAnswerCodeBlock[]> = {
  "What is the difference between rule-based optimization and cost-based optimization in Spark?": [
    {
      title: "Enable CBO deliberately and collect the statistics it needs",
      language: "PySpark / Spark SQL",
      code: `# These CBO switches are false by default in upstream Spark.
spark.conf.set("spark.sql.cbo.enabled", "true")
spark.conf.set("spark.sql.cbo.planStats.enabled", "true")
spark.conf.set("spark.sql.cbo.joinReorder.enabled", "true")

# Current upstream default: dynamic-programming reordering up to 12 joins.
print(spark.conf.get("spark.sql.cbo.joinReorder.dp.threshold"))

spark.sql("ANALYZE TABLE sales COMPUTE STATISTICS")
spark.sql("""
  ANALYZE TABLE sales
  COMPUTE STATISTICS FOR COLUMNS customer_id, region, amount
""")

spark.sql("""
  EXPLAIN COST
  SELECT c.segment, SUM(s.amount)
  FROM sales s JOIN customers c USING (customer_id)
  WHERE s.region = 'APAC'
  GROUP BY c.segment
""").show(truncate=False)`,
    },
  ],
  "How do you inspect Spark's optimization decisions?": [
    {
      title: "Inspect estimated and executed plans",
      language: "PySpark / SQL",
      code: `query = (
    spark.table("sales")
         .where("event_date >= DATE '2026-10-01'")
         .join(spark.table("customers"), "customer_id")
)

# Logical details, estimates, physical operators and pushed filters
query.explain(mode="cost")
query.explain(mode="formatted")

# SQL equivalent
spark.sql("""
  EXPLAIN COST
  SELECT *
  FROM sales s JOIN customers c USING (customer_id)
  WHERE s.event_date >= DATE '2026-10-01'
""").show(truncate=False)`,
    },
  ],
  "Does Spark automatically collect every statistic it needs?": [
    {
      title: "Collect table and column statistics deliberately",
      language: "Spark SQL",
      code: `ANALYZE TABLE sales COMPUTE STATISTICS;

ANALYZE TABLE sales
COMPUTE STATISTICS FOR COLUMNS customer_id, region, amount;

DESCRIBE EXTENDED sales;

EXPLAIN COST
SELECT region, SUM(amount)
FROM sales
GROUP BY region;`,
    },
  ],
  "What are predicate pushdown and column pruning?": [
    {
      title: "Create a narrow scan and verify it",
      language: "PySpark",
      code: `from pyspark.sql import functions as F

query = (
    spark.read.parquet("s3://lake/sales/")
         .select("customer_id", "event_date", "amount")
         .where(
             (F.col("event_date") == F.lit("2026-10-09")) &
             (F.col("amount") > 100)
         )
)

query.explain(mode="formatted")
# Inspect ReadSchema, PartitionFilters and PushedFilters.`,
    },
  ],
  "How does predicate pushdown work with JDBC?": [
    {
      title: "Push filters while bounding database concurrency",
      language: "PySpark",
      code: `orders = (
    spark.read.format("jdbc")
         .option("url", jdbc_url)
         .option("dbtable", "sales.orders")
         .option("user", user)
         .option("password", password)
         .option("pushDownPredicate", "true")  # current default
         .option("partitionColumn", "order_id")
         .option("lowerBound", "1")
         .option("upperBound", "10000000")
         .option("numPartitions", "8")
         .load()
         .where("status = 'OPEN' AND created_at >= TIMESTAMP '2026-10-01 00:00:00'")
         .select("order_id", "customer_id", "amount")
)

orders.explain(mode="formatted")
# Verify pushed predicates in the plan and in database query logs.
# lowerBound/upperBound choose partition strides; they do not filter rows.`,
    },
  ],
  "How does Spark handle schema evolution?": [
    {
      title: "Read compatible Parquet schema versions",
      language: "PySpark",
      code: `path = "s3://lake/customers/"

# Option A: discover the union of compatible Parquet file schemas.
# This is disabled by default because discovery/merging has a cost.
merged = (
    spark.read
         .option("mergeSchema", "true")
         .parquet(path)
)

# Option B: enforce a known contract without discovering a union.
expected_schema = """
  id BIGINT,
  name STRING,
  email STRING
"""

contract_read = (
    spark.read
         .schema(expected_schema)
         .parquet(path)
)

# Compatible old files that do not contain email return null for email.
merged.printSchema()
contract_read.printSchema()`,
    },
  ],
  "What happens when a column's data type changes?": [
    {
      title: "Use an additive, measurable type migration",
      language: "PySpark / Spark SQL",
      code: `from pyspark.sql import functions as F

migrated = raw.withColumn(
    "amount_decimal",
    F.expr("try_cast(amount AS DECIMAL(18,2))")
)

quality = migrated.select(
    F.count("*").alias("rows"),
    F.sum(
        (F.col("amount").isNotNull() & F.col("amount_decimal").isNull())
        .cast("long")
    ).alias("failed_conversions")
)

# Publish amount_decimal only after validation and backfill.
# Keep the original amount during the consumer migration window.
quality.show()`,
    },
  ],
  "How should a column rename be handled?": [
    {
      title: "Dual-read a name-based rename during migration",
      language: "PySpark",
      code: `from pyspark.sql import functions as F

transition = source.withColumn(
    "canonical_customer_id",
    F.coalesce("client_id", "customer_id")
)

conflicts = transition.where(
    F.col("client_id").isNotNull()
    & F.col("customer_id").isNotNull()
    & (F.col("client_id") != F.col("customer_id"))
)

# Require zero conflicts, migrate every consumer, then backfill/retire
# the old physical name. mergeSchema alone does not perform a rename.`,
    },
  ],
  "How do you handle schema drift in JSON data?": [
    {
      title: "Parse explicitly and quarantine invalid payloads",
      language: "PySpark",
      code: `from pyspark.sql import functions as F

event_schema = """
  event_id STRING,
  event_time TIMESTAMP,
  customer STRUCT<id: STRING, country: STRING>,
  amount DECIMAL(18,2)
"""

parsed = raw.select(
    "topic", "partition", "offset",
    F.col("value").cast("string").alias("raw_json"),
    F.from_json(F.col("value").cast("string"), event_schema)
     .alias("event")
)

valid = parsed.where("event IS NOT NULL")
quarantine = parsed.where("event IS NULL")`,
    },
  ],
  "What are Spark UDFs?": [
    {
      title: "Define and use a scalar Python UDF",
      language: "PySpark",
      code: `from pyspark.sql import functions as F
from pyspark.sql.types import StringType

@F.udf(returnType=StringType())
def normalize_account(value: str) -> str | None:
    if value is None:
        return None
    return value.strip().upper().replace("-", "")

result = accounts.withColumn(
    "normalized_account",
    normalize_account("raw_account")
)`,
    },
  ],
  "Why should UDFs be avoided when built-in functions can be used?": [
    {
      title: "Prefer an equivalent native expression",
      language: "PySpark",
      code: `# Avoid: opaque Python execution for standard string logic
with_udf = accounts.withColumn(
    "normalized_account",
    normalize_account("raw_account")
)

# Prefer: Catalyst-visible built-in expressions
with_builtins = accounts.withColumn(
    "normalized_account",
    F.regexp_replace(
        F.upper(F.trim("raw_account")),
        "-", ""
    )
)

with_builtins.explain(mode="formatted")`,
    },
  ],
  "Are Scala UDFs faster than Python UDFs?": [
    {
      title: "Scala UDF stays inside the executor JVM",
      language: "Scala",
      code: `import org.apache.spark.sql.functions.udf

val normalizeAccount = udf { value: String =>
  Option(value)
    .map(_.trim.toUpperCase.replace("-", ""))
    .orNull
}

val result = accounts.withColumn(
  "normalized_account",
  normalizeAccount($"raw_account")
)`,
    },
    {
      title: "Python UDF crosses the JVM/Python boundary",
      language: "PySpark",
      code: `@F.udf("string")
def normalize_account(value):
    return None if value is None else value.strip().upper().replace("-", "")

result = accounts.withColumn(
    "normalized_account",
    normalize_account("raw_account")
)`,
    },
  ],
  "Are Pandas UDFs always faster than regular Python UDFs?": [
    {
      title: "Do not calculate global statistics from arbitrary Arrow batches",
      language: "PySpark / Pandas",
      code: `import pandas as pd
from pyspark.sql import functions as F
from pyspark.sql.functions import pandas_udf

# Compute dataset-level statistics with Spark first. A scalar Pandas UDF
# receives arbitrary internal batches, not the complete reading column.
stats = measurements.agg(
    F.avg("reading").alias("mean"),
    F.stddev_pop("reading").alias("stddev")
).first()

global_mean = stats["mean"]
global_stddev = stats["stddev"]

@pandas_udf("double")
def z_score(values: pd.Series) -> pd.Series:
    if global_stddev is None or global_stddev == 0:
        # Keep missing inputs missing; only real constant values get z=0.
        return values.where(values.isna(), 0.0)
    return (values - global_mean) / global_stddev

scored = measurements.withColumn(
    "z_score", z_score("reading")
)

# For this calculation, a native Spark expression using the two constants
# is still preferable; this example demonstrates correct batch semantics.`,
    },
  ],
  "What role does Apache Arrow play in Pandas UDFs?": [
    {
      title: "Reuse setup with an iterator Pandas UDF",
      language: "PySpark / Pandas",
      code: `from collections.abc import Iterator
import pandas as pd
from pyspark.sql.functions import pandas_udf

@pandas_udf("double")
def apply_rate(batches: Iterator[pd.Series]) -> Iterator[pd.Series]:
    # Initialized once for this iterator invocation, not once globally.
    rate = load_rate_once_per_iterator()
    for values in batches:
        # Each Series arrived as an Arrow columnar batch.
        yield values * rate

result = payments.withColumn("converted", apply_rate("amount"))`,
    },
  ],
  "Can a UDF be used in a Spark SQL query?": [
    {
      title: "Register a session UDF and call it from SQL",
      language: "PySpark / SQL",
      code: `def normalize_account(value):
    return None if value is None else value.strip().upper().replace("-", "")

spark.udf.register(
    "normalize_account_v1",
    normalize_account,
    "string"
)

result = spark.sql("""
  SELECT account_id,
         normalize_account_v1(raw_account) AS normalized_account
  FROM accounts
""")`,
    },
  ],
  "What happens when a UDF throws an exception?": [
    {
      title: "Return an explicit parse result for expected bad input",
      language: "PySpark",
      code: `result_type = "struct<value:int,error:string>"

@F.udf(result_type)
def parse_quantity(raw):
    if raw is None:
        return (None, "MISSING")
    try:
        return (int(raw), None)
    except ValueError:
        return (None, "INVALID_INTEGER")

checked = source.withColumn("parsed", parse_quantity("raw_quantity"))
valid = checked.where("parsed.error IS NULL")
quarantine = checked.where("parsed.error IS NOT NULL")`,
    },
  ],
  "What is a deterministic versus non-deterministic UDF?": [
    {
      title: "Mark changing output as non-deterministic",
      language: "PySpark",
      code: `import random
from pyspark.sql.types import DoubleType

random_value = F.udf(
    lambda: random.random(),
    DoubleType()
).asNondeterministic()

result = events.withColumn("sample_value", random_value())

# Do not use changing external calls inside replayable streaming UDFs.`,
    },
  ],
  "What are the best alternatives to UDFs?": [
    {
      title: "Use higher-order functions for nested data",
      language: "PySpark",
      code: `cleaned = events.withColumn(
    "clean_tags",
    F.transform(
        F.filter("tags", lambda tag: tag.isNotNull()),
        lambda tag: F.upper(F.trim(tag))
    )
)

# For reference-data mapping, prefer a governed join.
enriched = cleaned.join(
    F.broadcast(product_dimension),
    "product_code",
    "left"
)`,
    },
  ],
  "What is the difference between a UDF and a UDAF?": [
    {
      title: "Scalar UDF versus grouped aggregate UDF",
      language: "PySpark / Pandas",
      code: `import numpy as np
import pandas as pd
from pyspark.sql.functions import pandas_udf

# Scalar UDF: one returned element for every input element.
@pandas_udf("double")
def apply_tax(amount: pd.Series) -> pd.Series:
    return amount * 1.18

# Grouped aggregate UDF: one scalar result for each group.
@pandas_udf("double")
def weighted_mean(value: pd.Series, weight: pd.Series) -> float | None:
    valid = value.notna() & weight.notna() & (weight != 0)
    if not valid.any():
        return None
    return float(np.average(value[valid], weights=weight[valid]))

row_result = orders.withColumn("gross_amount", apply_tax("net_amount"))
group_result = observations.groupBy("sensor_id").agg(
    weighted_mean("reading", "confidence").alias("weighted_reading")
)`,
    },
  ],
  "How does Spark handle nulls and missing data?": [
    {
      title: "Apply explicit null semantics",
      language: "PySpark",
      code: `from pyspark.sql import functions as F

quality = source.select(
    F.count("*").alias("rows"),
    F.count("customer_id").alias("present_customer_ids"),
    F.sum(F.col("customer_id").isNull().cast("int"))
     .alias("missing_customer_ids")
)

normalized = source.withColumn(
    "country",
    F.when(F.trim("country") == "", None)
     .otherwise(F.col("country"))
)`,
    },
  ],
  "How would you measure missing data in a production pipeline?": [
    {
      title: "Publish segmented counts and rates",
      language: "PySpark",
      code: `from pyspark.sql import functions as F

quality = (
    source.groupBy("ingestion_date", "producer", "schema_version")
          .agg(
              F.count("*").alias("rows"),
              F.sum(F.col("customer_id").isNull().cast("long"))
               .alias("null_customer_id"),
              F.sum(F.when(F.trim("email") == "", 1).otherwise(0))
               .alias("blank_email"),
              F.sum(F.isnan("reading").cast("long"))
               .alias("nan_reading"),
          )
          .withColumn(
              "null_customer_id_rate",
              F.col("null_customer_id") / F.col("rows")
          )
)

# Persist the metrics, compare with contract/baseline thresholds,
# and block publication when a critical rule fails.`,
    },
  ],
  "What is the difference between ordinary equality and null-safe equality in Spark?": [
    {
      title: "Choose equality semantics deliberately",
      language: "PySpark / SQL",
      code: `# Ordinary equality: null never matches null.
ordinary = left.join(right, left.key == right.key, "inner")

# Null-safe equality: two null keys match.
null_safe = left.join(
    right,
    left.key.eqNullSafe(right.key),
    "inner"
)

-- SQL equivalent
SELECT * FROM left JOIN right ON left.key <=> right.key;`,
    },
  ],
  "What is the difference between coalesce() and fillna()?": [
    {
      title: "Expression fallback versus constant replacement",
      language: "PySpark",
      code: `# First non-null expression for each row
with_country = customers.withColumn(
    "country",
    F.coalesce("shipping_country", "billing_country")
)

# Fixed replacements across selected columns
with_defaults = with_country.fillna({
    "retry_count": 0,
    "comment": ""
})

# Different API: reduce DataFrame partitions, not nulls
fewer_partitions = with_defaults.coalesce(20)`,
    },
  ],
  "How does ANSI mode affect null handling?": [
    {
      title: "Keep invalid data separate from valid nulls",
      language: "Spark SQL",
      code: `-- Spark 4.0+: ANSI mode is already true by default. Verify the session value.
SET spark.sql.ansi.enabled;

-- Fails because the input is invalid under a strict cast.
SELECT CAST('12x' AS INT);

-- Fails instead of wrapping past the maximum INT value.
SELECT CAST(2147483647 AS INT) + CAST(1 AS INT);

-- Returns null deliberately, allowing explicit quality handling.
SELECT TRY_CAST('12x' AS INT) AS parsed_value;

SELECT
  COUNT(*) AS rows,
  COUNT(TRY_CAST(raw_value AS INT)) AS valid_values
FROM source;`,
    },
  ],
  "How does Spark handle corrupt CSV or Parquet files?": [
    {
      title: "Capture malformed CSV records",
      language: "PySpark",
      code: `schema = "id BIGINT, amount DECIMAL(18,2), _corrupt_record STRING"

parsed = (
    spark.read
         .schema(schema)
         .option("mode", "PERMISSIVE")
         .option("columnNameOfCorruptRecord", "_corrupt_record")
         .csv("s3://landing/orders/")
).cache()

# Materialize the complete governed parse before filtering the error column.
parsed.count()

valid = parsed.where("_corrupt_record IS NULL")
quarantine = parsed.where("_corrupt_record IS NOT NULL")`,
    },
    {
      title: "Skip corrupt files only with reconciliation",
      language: "PySpark",
      code: `readable = (
    spark.read
         .option("ignoreCorruptFiles", "true")
         .parquet("s3://landing/parquet/")
)

# Production requirement: compare the planned manifest with
# input_file_name() values and report every omitted file.`,
    },
  ],
  "What output format is best for Spark workloads?": [
    {
      title: "Derive output parallelism and file limits from measured data",
      language: "PySpark",
      code: `import math

# Inputs come from a representative write/benchmark, not a universal rule.
estimated_compressed_output_bytes = measured_output_bytes
chosen_target_file_bytes = benchmarked_target_file_bytes
observed_compressed_bytes_per_row = measured_bytes_per_row

output_partitions = max(
    1,
    math.ceil(
        estimated_compressed_output_bytes / chosen_target_file_bytes
    )
)
max_records_per_file = max(
    1,
    int(chosen_target_file_bytes / observed_compressed_bytes_per_row)
)

(
    curated.repartition(output_partitions, "event_date")
           .write
           .format("parquet")
           .mode("append")
           .option("compression", "zstd")
           .option("maxRecordsPerFile", max_records_per_file)
           .partitionBy("event_date")
           .save(output_path)
)

# Validate actual file-size distribution and compact later if necessary.
# For concurrent updates/deletes, use a transactional table format rather
# than treating a directory of Parquet files as a transactional table.`,
    },
  ],
  "What is the difference between Spark Streaming and Structured Streaming?": [
    {
      title: "Structured Streaming uses the DataFrame API",
      language: "PySpark",
      code: `from pyspark.sql import functions as F

event_schema = "event_id STRING, event_time TIMESTAMP, amount DOUBLE"

events = (
    spark.readStream
         .format("kafka")
         .option("kafka.bootstrap.servers", brokers)
         .option("subscribe", "events")
         .load()
         .select(
             F.from_json(
                 F.col("value").cast("string"),
                 event_schema
             ).alias("event")
         )
         .select("event.*")
)

counts = (
    events.withWatermark("event_time", "10 minutes")
          .groupBy(F.window("event_time", "5 minutes"))
          .count()
)

query = (
    counts.writeStream
          .outputMode("append")
          .option("checkpointLocation", checkpoint)
          .format("parquet")
          .start(output_path)
)`,
    },
  ],
  "How does Spark Structured Streaming consume data from Kafka?": [
    {
      title: "Configure a checkpointed Kafka source",
      language: "PySpark",
      code: `from pyspark.sql import functions as F

# Set these from measured input rate, processing capacity, and skew.
max_offsets_per_trigger = measured_safe_offsets_per_trigger
desired_source_partitions = measured_source_task_target

kafka_rows = (
    spark.readStream
         .format("kafka")
         .option("kafka.bootstrap.servers", brokers)
         .option("subscribe", "orders")
         .option("startingOffsets", "earliest")
         .option("maxOffsetsPerTrigger", max_offsets_per_trigger)
         .option("minPartitions", desired_source_partitions)
         .option("failOnDataLoss", "true")
         .option("includeHeaders", "true")
         .load()
)

orders = kafka_rows.select(
    F.col("key").cast("string").alias("order_id"),
    F.from_json(F.col("value").cast("string"), order_schema)
     .alias("order"),
    "topic", "partition", "offset", "timestamp", "headers"
)

query = (
    orders.writeStream
          .option("checkpointLocation", checkpoint)
          .format("parquet")
          .start(output_path)
)`,
    },
  ],
  "How are Kafka partitions mapped to Spark tasks?": [
    {
      title: "Split large Kafka offset ranges when needed",
      language: "PySpark",
      code: `# Tune these from per-partition lag and observed task duration.
desired_source_partitions = measured_source_task_target
records_per_source_task = measured_safe_records_per_task
desired_downstream_partitions = measured_downstream_task_target

source = (
    spark.readStream
         .format("kafka")
         .option("kafka.bootstrap.servers", brokers)
         .option("subscribe", "events")
         # Desired source-task floor; it is a hint, not an exact count.
         .option("minPartitions", desired_source_partitions)
         # Bound records in each Spark input partition.
         .option("maxRecordsPerPartition", records_per_source_task)
         .load()
)

# Repartitioning here changes downstream Spark parallelism;
# it does not change Kafka's topic partitioning or ordering.
downstream = source.repartition(desired_downstream_partitions)`,
    },
  ],
  "What is the difference between the receiver-based and direct Kafka approaches in Spark Streaming?": [
    {
      title: "Legacy direct DStream consumption with explicit offset ranges",
      language: "Scala (legacy DStream API)",
      code: `import org.apache.spark.streaming.kafka010._
import org.apache.spark.streaming.kafka010.LocationStrategies.PreferConsistent
import org.apache.spark.streaming.kafka010.ConsumerStrategies.Subscribe

val input = KafkaUtils.createDirectStream[String, String](
  streamingContext,
  PreferConsistent,
  Subscribe[String, String](topics, kafkaParams)
)

input.foreachRDD { rdd =>
  val ranges = rdd.asInstanceOf[HasOffsetRanges].offsetRanges

  // Finish an idempotent/transactional output before acknowledging progress.
  writeIdempotently(rdd, ranges)

  input.asInstanceOf[CanCommitOffsets].commitAsync(ranges)
}

// This is historical DStream code. New pipelines should use
// Structured Streaming's Kafka DataFrame source.`,
    },
  ],
  "Where are Kafka offsets stored in Spark Streaming?": [
    {
      title: "Configure durable progress and inspect live offset ranges",
      language: "PySpark",
      code: `query = (
    parsed.writeStream
          .format("parquet")
          .option("path", output_path)
          .option("checkpointLocation", checkpoint_path)
          .start()
)

# Operational view only—do not edit checkpoint offset/commit files.
progress = query.lastProgress
if progress is not None:
    source_progress = progress["sources"][0]
    print("batch:", progress["batchId"])
    print("start:", source_progress["startOffset"])
    print("end:", source_progress["endOffset"])
    print("rows:", source_progress["numInputRows"])

# On restart with the same checkpoint_path, checkpoint progress wins over
# startingOffsets. A new logical query must use its own checkpoint.`,
    },
  ],
  "How does Spark read from Kafka?": [
    {
      title: "Read a reproducible bounded Kafka offset range",
      language: "PySpark",
      code: `from pyspark.sql import functions as F

# Ranges are half-open: start is included, end is excluded.
start_offsets = '{"orders":{"0":500,"1":900}}'
end_offsets = '{"orders":{"0":800,"1":1250}}'

snapshot = (
    spark.read
         .format("kafka")
         .option("kafka.bootstrap.servers", brokers)
         .option("subscribe", "orders")
         .option("startingOffsets", start_offsets)
         .option("endingOffsets", end_offsets)
         .option("failOnDataLoss", "true")
         .option("includeHeaders", "true")
         .load()
         .select(
             F.col("key").cast("string").alias("order_id"),
             F.col("value").cast("string").alias("raw_value"),
             "topic", "partition", "offset", "timestamp", "headers"
         )
)

# Preserve topic + partition + offset through parsing for auditability.
snapshot.groupBy("topic", "partition").agg(
    F.min("offset").alias("first_offset"),
    F.max("offset").alias("last_offset"),
    F.count("*").alias("records")
).show()`,
    },
  ],
  "How do you achieve end-to-end exactly-once processing with Kafka and Spark?": [
    {
      title: "Wire a retry-aware transactional writer to foreachBatch",
      language: "PySpark + transactional SQL pattern",
      code: `query_id = "orders-to-ledger-v3"  # Stable across restart of this query.

def write_batch(batch_df, batch_id):
    # The database implementation must execute the following as ONE transaction.
    # Staging can be retried because rows carry a stable event_id.
    rows = batch_df.select(
        "event_id", "account_id", "amount", "event_time"
    )
    write_one_database_transaction(rows, query_id, batch_id)

query = (
    transformed.writeStream
               .foreachBatch(write_batch)
               .option("checkpointLocation", checkpoint_path)
               .start()
)

# Transactional SQL pattern inside write_one_database_transaction:
#
# BEGIN;
# IF NOT EXISTS (
#   SELECT 1 FROM processed_batches
#   WHERE query_id = :query_id AND batch_id = :batch_id
# ) THEN
#   MERGE INTO ledger AS target
#   USING staged_batch AS source
#   ON target.event_id = source.event_id
#   WHEN MATCHED THEN UPDATE SET ...
#   WHEN NOT MATCHED THEN INSERT (...);
#
#   INSERT INTO processed_batches(query_id, batch_id, committed_at)
#   VALUES (:query_id, :batch_id, CURRENT_TIMESTAMP);
# END IF;
# COMMIT;
#
# Do not commit the marker separately from the MERGE.`
    },
  ],
  "How do you handle late data in Structured Streaming?": [
    {
      title: "Apply the watermark before the event-time window",
      language: "Scala",
      code: `import org.apache.spark.sql.functions._

// events.event_time must be a validated timestamp from the business event.
val windowedCounts = events
  .filter(col("event_time").isNotNull)
  .withWatermark("event_time", "10 minutes")
  .groupBy(
    window(col("event_time"), "5 minutes"),
    col("country")
  )
  .count()

val query = windowedCounts.writeStream
  .outputMode("append")
  .format("parquet")
  .option("path", outputPath)
  .option("checkpointLocation", checkpointPath)
  .start()

// In append mode, a window is emitted only after watermark progress
// has crossed the window end. Preserve raw input separately if events
// beyond this real-time horizon must be reconciled later.`
    },
  ],
  "Where is backpressure supported in Spark Streaming and Structured Streaming?": [
    {
      title: "Do not mix legacy DStream controls with Structured Streaming controls",
      language: "Spark configuration",
      code: `# Legacy DStream engine: automatic rate estimation
spark.streaming.backpressure.enabled=true
spark.streaming.backpressure.initialRate=5000

# Receiver-based DStream ceiling: records/second per receiver
spark.streaming.receiver.maxRate=10000

# Direct Kafka DStream ceiling: records/second per Kafka partition
spark.streaming.kafka.maxRatePerPartition=10000

# These spark.streaming.* settings do NOT throttle Structured Streaming.
# Structured Streaming limits are configured on each supported source.`
    },
  ],
  "How does Structured Streaming throttle Kafka or file ingestion?": [
    {
      title: "Bound one trigger's Kafka or file input",
      language: "PySpark",
      code: `# Kafka: the maximum is TOTAL offsets per trigger, not per partition.
kafka_events = (
    spark.readStream
         .format("kafka")
         .option("kafka.bootstrap.servers", brokers)
         .option("subscribe", "events")
         .option("maxOffsetsPerTrigger", 480000)
         .option("failOnDataLoss", "true")
         .load()
)

# Apache Spark built-in file source: limit file count.
files_by_count = (
    spark.readStream
         .schema(input_schema)
         .option("maxFilesPerTrigger", 20)
         .parquet(input_path)
)

# Delta Lake connector: optional soft byte target.
delta_by_bytes = (
    spark.readStream
         .format("delta")
         .option("maxBytesPerTrigger", "1g")
         .load(delta_path)
)

# Databricks Auto Loader uses cloudFiles.maxBytesPerTrigger.
# Plain Parquet does not support maxBytesPerTrigger.`
    },
  ],
  "How do you monitor Kafka and Spark together?": [
    {
      title: "Inspect the exact progress record emitted for a trigger",
      language: "PySpark",
      code: `import json

progress = query.lastProgress

if progress is not None:
    print("query_id:", query.id)       # Stable when restarted from checkpoint.
    print("run_id:", query.runId)     # New for each start/restart.
    print("batch_id:", progress["batchId"])
    print("input_rows:", progress["numInputRows"])
    print("input_rows_per_second:", progress["inputRowsPerSecond"])
    print("processed_rows_per_second:", progress["processedRowsPerSecond"])
    print("duration_ms:", progress["durationMs"])
    print("event_time:", progress.get("eventTime", {}))

    for source in progress.get("sources", []):
        print("source:", source.get("description"))
        print("start_offset:", source.get("startOffset"))
        print("end_offset:", source.get("endOffset"))
        print("latest_offset:", source.get("latestOffset"))

    for state in progress.get("stateOperators", []):
        print("state_rows:", state.get("numRowsTotal"))
        print("updated_rows:", state.get("numRowsUpdated"))
        print("dropped_by_watermark:",
              state.get("numRowsDroppedByWatermark"))

    # Export the complete document to metrics/log storage in production.
    print(json.dumps(progress, indent=2, default=str))`
    },
  ],
  "How do you process a huge dataset safely when the Spark cluster is small?": [
    {
      title: "Drain a bounded Delta backlog through restartable micro-batches",
      language: "PySpark",
      code: `from pyspark.sql import functions as F

# Delta Lake implements the soft maxBytesPerTrigger admission option.
source = (
    spark.readStream
         .format("delta")
         .option("maxBytesPerTrigger", "1g")
         .load(input_path)
)

result = (
    source.select("event_date", "customer_id", "amount")
          .filter(F.col("event_date").isNotNull())
          .withColumn("amount", F.col("amount").cast("decimal(18,2)"))
)

query = (
    result.writeStream
          .outputMode("append")
          .format("parquet")
          .option("path", output_path)
          .option("checkpointLocation", checkpoint_path)
          .partitionBy("event_date")
          # Process data available at start in as many bounded batches as needed,
          # then stop. Confirm source/operation support in the deployed version.
          .trigger(availableNow=True)
          .start()
)

query.awaitTermination()`
    },
  ],
  "Which ingestion, partitioning, memory, and Adaptive Query Execution settings should be tuned?": [
    {
      title: "Separate scan sizing, shuffle sizing, and AQE",
      language: "PySpark / Spark configuration",
      code: `# File scan planning: current upstream default is 128 MiB.
spark.conf.set("spark.sql.files.maxPartitionBytes", 128 * 1024 * 1024)

# Estimate an initial shuffle count from measured stage bytes.
estimated_shuffle_bytes = 1 * 1024**4       # Example: 1 TiB
target_reducer_bytes = 256 * 1024**2        # Tested target: 256 MiB
initial_shuffle_partitions = (
    estimated_shuffle_bytes + target_reducer_bytes - 1
) // target_reducer_bytes                   # 4,096

spark.conf.set(
    "spark.sql.shuffle.partitions",
    initial_shuffle_partitions
)

# AQE settings for supported batch/stateless plans.
spark.conf.set("spark.sql.adaptive.enabled", "true")
spark.conf.set("spark.sql.adaptive.coalescePartitions.enabled", "true")
spark.conf.set(
    "spark.sql.adaptive.advisoryPartitionSizeInBytes",
    64 * 1024 * 1024
)
spark.conf.set("spark.sql.adaptive.skewJoin.enabled", "true")

# Do not assume AQE rewrites stateful streaming operators. Spark support
# depends on query type and version; verify the executed plan and runtime UI.`
    },
  ],
};

for (const [question, codeBlocks] of Object.entries(CODE_EXAMPLES_55_TO_73)) {
  const answer = SPARK_INTERVIEW_ANSWERS_55_TO_73[question];
  if (answer) SPARK_INTERVIEW_ANSWERS_55_TO_73[question] = { ...answer, codeBlocks };
}
