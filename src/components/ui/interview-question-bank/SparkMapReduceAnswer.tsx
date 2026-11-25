const differences = [
  ["Processing model", "DAG-based distributed execution engine", "Map and Reduce execution model"],
  ["Intermediate data", "Can pipeline operations and keep intermediate data in memory", "Typically materializes intermediate results between MapReduce jobs"],
  ["Performance", "Often faster, especially for iterative and complex pipelines", "Typically slower for workloads requiring multiple chained jobs"],
  ["Memory utilization", "Supports in-memory processing and caching", "Primarily disk-oriented"],
  ["Execution optimization", "Catalyst optimizer, physical planning, and whole-stage code generation for supported SQL workloads", "No equivalent built-in cross-job SQL optimizer"],
  ["Data processing", "Batch, streaming, interactive SQL, machine learning", "Primarily batch processing"],
  ["Programming APIs", "Python, Scala, Java, R, SQL", "Primarily Java, with additional language support through Hadoop Streaming"],
  ["Iterative computation", "Efficiently supports repeated computations on cached datasets", "Often requires repeated jobs and intermediate materialization"],
  ["Ease of development", "High-level DataFrame, Dataset, and SQL APIs", "More verbose, lower-level MapReduce programming"],
  ["Fault tolerance", "Lineage-based recomputation, retries, and recovery mechanisms", "Task retries and durable intermediate outputs"],
  ["Resource management", "Standalone, YARN, Kubernetes", "Typically YARN"],
  ["Storage", "Uses external systems such as HDFS, S3, and others", "Commonly uses HDFS, but supports other compatible storage systems"],
];

const interview = [
  "Apache Spark and Hadoop MapReduce are both distributed data processing frameworks, but their execution models are different. Hadoop MapReduce follows a Map and Reduce model and typically writes intermediate results to disk between separate jobs. Spark uses a DAG-based execution model, allowing it to optimize and pipeline multiple transformations.",
  "Spark also supports in-memory caching, making it suitable for iterative computations. Additionally, Spark provides high-level APIs for SQL, batch processing, streaming, and machine learning, whereas traditional MapReduce is primarily designed for batch processing.",
  "Spark is generally preferred for complex ETL pipelines and analytical workloads, while MapReduce remains suitable for certain straightforward batch workloads. Importantly, Spark can work with Hadoop components such as HDFS and YARN, so it does not replace the entire Hadoop ecosystem.",
];

function ExecutionFlow({ title, description, steps }: { title: string; description: string; steps: string[] }) {
  return (
    <figure className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
      <figcaption className="text-sm font-bold text-neutral-900">{title}</figcaption>
      <p className="mb-5 mt-2 text-[13px] leading-6 text-neutral-600">{description}</p>
      <ol className="space-y-2">
        {steps.map((step, index) => <li key={step} className="text-center">
          {index > 0 && <span className="mb-2 block text-neutral-400" aria-hidden="true">↓</span>}
          <div className="rounded-lg border border-neutral-200 bg-white px-3 py-3 text-xs font-semibold text-neutral-700">{step}</div>
        </li>)}
      </ol>
    </figure>
  );
}

export default function SparkMapReduceAnswer() {
  const heading = "mb-4 text-base font-bold tracking-tight text-neutral-900";
  return (
    <article className="overflow-hidden bg-white">
      <header className="bg-neutral-900 px-5 py-8 text-white sm:px-7">
        <h2 className="text-2xl font-black leading-tight tracking-tight sm:text-3xl">How is Spark different from Hadoop MapReduce?</h2>
      </header>
      <div className="space-y-8 px-5 py-6 text-sm leading-7 text-neutral-600 sm:px-7 sm:py-8">
        <section aria-label="Overview" className="space-y-3">
          <p className="text-[15px] font-medium text-neutral-800">Apache Spark and Hadoop MapReduce are both distributed data processing frameworks, but they differ in their execution model, performance, memory utilization, programming flexibility, and supported workloads.</p>
          <p>Hadoop MapReduce primarily follows a Map → Shuffle/Sort → Reduce processing model, whereas Spark uses a more flexible Directed Acyclic Graph (DAG) execution model, allowing multiple transformations to be combined into a single execution plan.</p>
        </section>
        <section>
          <h3 className={heading}>1. Key differences</h3>
          <div role="region" aria-label="Spark and MapReduce comparison, scroll horizontally to see all columns" tabIndex={0} className="overflow-x-auto rounded-xl border border-neutral-200 focus-visible:outline-2 focus-visible:outline-amber-500">
            <table className="w-full min-w-[550px] border-collapse text-left text-[13px] leading-6">
              <thead className="bg-neutral-900 text-white"><tr>{["Feature", "Apache Spark", "Hadoop MapReduce"].map(label => <th key={label} scope="col" className="px-4 py-4 font-bold">{label}</th>)}</tr></thead>
              <tbody>{differences.map(([feature, spark, hadoop], index) => <tr key={feature} className={index % 2 ? "bg-neutral-50" : "bg-white"}>
                <th scope="row" className="w-[24%] border-t border-neutral-200 px-4 py-4 align-top font-semibold text-neutral-900">{feature}</th>
                <td className="w-[38%] border-t border-neutral-200 px-4 py-4 align-top">{spark}</td>
                <td className="w-[38%] border-t border-neutral-200 px-4 py-4 align-top">{hadoop}</td>
              </tr>)}</tbody>
            </table>
          </div>
        </section>
        <section>
          <h3 className={heading}>2. Example</h3>
          <p>Suppose we need to process <strong className="text-neutral-900">1 TB of transaction data</strong> to:</p>
          <ol className="mb-5 mt-3 list-decimal space-y-1 pl-5"><li>Filter successful transactions.</li><li>Group transactions by customer.</li><li>Calculate total transaction amount.</li></ol>
          <div className="grid gap-4 sm:grid-cols-2">
            <ExecutionFlow title="Hadoop MapReduce" description="If the implementation requires multiple MapReduce jobs, the output of one job is typically written to storage before the next job consumes it." steps={["Input Data", "MapReduce Job 1", "Intermediate Output (HDFS)", "MapReduce Job 2", "Final Output"]} />
            <ExecutionFlow title="Apache Spark" description="Spark can represent the operations as one logical computation, optimize the execution plan, and execute the necessary stages." steps={["Input Data", "Filter Transactions", "Group By Customer", "Calculate Total Amount", "Final Output"]} />
          </div>
          <p className="mt-4 rounded-lg border border-neutral-200 px-4 py-3 text-[13px]">Spark can pipeline compatible operations, although operations such as <code className="rounded bg-neutral-100 px-1.5 py-0.5 text-neutral-900">groupBy</code> may require a network shuffle and disk spilling.</p>
        </section>
        <section className="rounded-xl border border-neutral-200 bg-neutral-50 p-5">
          <h3 className={heading}>3. Important interview clarification</h3>
          <p className="font-semibold text-neutral-900">Hadoop is not the same thing as Hadoop MapReduce.</p>
          <p className="mt-2">Hadoop is a broader ecosystem containing components such as:</p>
          <ul className="my-3 list-disc space-y-1 pl-5"><li><strong>HDFS:</strong> Distributed storage.</li><li><strong>YARN:</strong> Cluster resource management.</li><li><strong>MapReduce:</strong> Distributed data processing.</li></ul>
          <p>Spark primarily replaces the MapReduce processing engine, not the entire Hadoop ecosystem.</p>
          <p className="mt-2">In fact, Spark can run on YARN and process data stored in HDFS.</p>
        </section>
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-5 sm:p-6">
          <h3 className={heading}>4. Interview-ready answer</h3>
          <blockquote className="space-y-4 border-l-2 border-amber-400 pl-4 text-neutral-800">{interview.map(paragraph => <p key={paragraph}>{paragraph}</p>)}</blockquote>
        </section>
        <p className="border-t border-neutral-200 pt-5 text-neutral-800"><strong>Key point to remember:</strong> The fundamental difference is their execution model and handling of intermediate computations, not simply that Spark uses RAM and MapReduce uses disk.</p>
      </div>
    </article>
  );
}
