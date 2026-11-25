# Why is cost-based optimization needed when Spark already has rule-based optimization?

**Cost-Based Optimization (CBO) is needed because Rule-Based Optimization (RBO) applies general optimization rules without fully considering the actual size, cardinality, and distribution of the data.**

Although RBO can simplify a query and eliminate unnecessary processing, it cannot always determine which execution strategy is most efficient for a particular dataset.

CBO addresses this limitation by using data statistics to estimate the cost of alternative query plans and choose a more efficient one.

## 1. Limitations of Rule-Based Optimization

Rule-Based Optimization applies predefined transformations such as:

- **Predicate Pushdown:** Apply filters as early as possible.
- **Column Pruning:** Read only required columns.
- **Constant Folding:** Evaluate constant expressions during optimization.
- **Expression Simplification:** Remove unnecessary computations.

These optimizations are generally beneficial, but they do not always provide enough information to choose the best join order.

For example, RBO knows that filtering early is usually beneficial, but it cannot reliably predict how many records will remain after a filter without data statistics.

## 2. How CBO solves this problem

Consider three tables:

| Table     | Number of rows |
| --------- | -------------- |
| Orders    | 100 million    |
| Customers | 10 million     |
| Countries | 200            |

Suppose we execute:

```sql
SELECT o.order_id, c.customer_name
FROM orders o
JOIN customers c
    ON o.customer_id = c.customer_id
JOIN countries co
    ON c.country_id = co.country_id
WHERE co.country_name = 'India';
```

Two possible join strategies are:

**Plan A: Join Orders and Customers first**

1. Join 100 million Orders with 10 million Customers.
2. Apply the India filter to Countries where eligible; RBO can push this filter down.
3. Join the Orders-Customers intermediate with the matching Countries.

This could produce a large Orders-Customers intermediate before the selective country join, even when the country filter itself has already been pushed down.

**Plan B: Join Customers with filtered Countries first**

1. Filter Countries for India.
2. Join matching Countries with Customers.
3. Join those Customers with Orders.

If the country filter is highly selective, this plan can substantially reduce the number of rows processed by the final join.

[spark-reference:rbo-cbo-join-order]

**Why CBO helps:** By estimating intermediate row counts using table and column statistics, CBO can determine which join order is likely to involve less processing.

The second plan is not always faster. If most customers are from India, the reduction may be small. This is precisely why data statistics matter.

## 3. Why RBO alone is insufficient

| Problem                | RBO                                                    | How CBO helps                                    |
| ---------------------- | ------------------------------------------------------ | ------------------------------------------------ |
| Different table sizes  | Applies general transformations                        | Considers actual table sizes                     |
| Join ordering          | Does not compare alternative join orders using statistical cost estimates | Estimates costs of alternative join orders       |
| Filter selectivity     | Pushes filters down                                    | Estimates how many rows remain                   |
| Intermediate data size | May produce large intermediates                        | Attempts to minimize costly intermediate results |
| Data distribution      | Does not require distribution statistics               | Can use column statistics for better estimates   |

One important distinction: **RBO can push the** `country_name = 'India'` **filter down in both example plans.** CBO's additional benefit is determining which join order is more efficient after accounting for the estimated filter selectivity.

Spark's documentation confirms that accurate row-count estimates help the optimizer choose efficient plans, while missing or incorrect statistics can lead to poor performance.

## 4. Is CBO always better than RBO?

Not necessarily. CBO is especially useful for complex analytical queries involving multiple joins and tables with significantly different sizes.

However, CBO has limitations:

- Statistics may be missing or outdated.
- Incorrect cardinality estimates may produce worse plans.
- Evaluating multiple join orders adds planning overhead.
- Simple queries may already be efficiently optimized by RBO.

Spark therefore uses rule-based optimization as its foundation and optionally enhances planning with CBO. In standard Spark configurations, dedicated CBO and cost-based join reordering are disabled by default.

Additionally, **Adaptive Query Execution (AQE)** can improve selected physical execution decisions using runtime statistics, even when initial estimates are inaccurate.

## Interview-ready answer

> Rule-Based Optimization applies predefined rules such as predicate pushdown, column pruning, and constant folding. However, it does not fully account for actual data size, cardinality, or distribution when determining the most efficient plan.
>
> Cost-Based Optimization addresses this limitation by using table and column statistics to estimate the cost of alternative query plans.
>
> For example, when joining three tables containing 100 million, 10 million, and 200 rows, respectively, RBO can simplify the query and push down filters, but CBO can additionally estimate which join order produces the smallest intermediate datasets.
>
> This can reduce shuffle, memory consumption, and execution time.
>
> However, CBO depends on accurate statistics, and stale statistics can lead to suboptimal decisions.
>
> **RBO makes queries logically more efficient using predefined rules, while CBO makes data-dependent optimization decisions using statistics. Both complement each other within the Catalyst Optimizer.**
