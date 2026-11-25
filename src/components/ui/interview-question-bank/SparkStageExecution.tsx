function OperationPipeline({ operations }: { operations: string[] }) {
  return (
    <ol className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center" aria-label="Operations in execution order">
      {operations.map((operation, index) => (
        <li key={operation} className="flex min-w-0 flex-1 flex-col items-stretch gap-2 sm:flex-row sm:items-center">
          {index > 0 ? <span className="shrink-0 text-center text-neutral-400" aria-hidden="true"><span className="sm:hidden">↓</span><span className="hidden sm:inline">→</span></span> : null}
          <span className="min-w-0 flex-1 rounded-md border border-neutral-600 bg-neutral-800 px-2 py-2 text-center text-xs leading-5 text-neutral-100">{operation}</span>
        </li>
      ))}
    </ol>
  );
}

export default function SparkStageExecution({ includePartialAggregation = false, shuffleExample = false, aggregationOnly = false }: { includePartialAggregation?: boolean; shuffleExample?: boolean; aggregationOnly?: boolean }) {
  return (
    <figure className="rounded-2xl border border-neutral-700 bg-[#0b0d10] p-3 text-neutral-200 sm:p-5" aria-label="A Spark job triggered by show runs a shuffle map stage, crosses a shuffle boundary, then runs a result stage">
      <div className="text-center">
        <p className="text-base font-bold text-white">Spark Job</p>
        <p className="mt-1 text-xs text-neutral-300">Triggered by show()</p>
      </div>
      <div className="py-3 text-center text-lg text-neutral-400" aria-hidden="true">↓</div>

      <div className="rounded-xl border border-emerald-400/35 bg-emerald-400/5 p-3">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-bold text-white">{aggregationOnly ? "Stage 1 — Map Side" : "Stage 1 — Shuffle Map Stage"}</p>
          <p className="text-[11px] text-neutral-300">{aggregationOnly ? "Local partial aggregation" : "Narrow operations"}</p>
        </div>
        <OperationPipeline operations={aggregationOnly ? ["Read data", "Partial aggregation", "Shuffle write"] : shuffleExample ? ["Read", "Filter", "Partial aggregation", "Shuffle write"] : includePartialAggregation ? ["Read", "Filter", "Select", "Partial aggregate"] : ["Read", "Filter", "Select"]} />
        <p className="mt-3 text-center text-xs leading-5 text-neutral-300">Tasks produce intermediate shuffle data</p>
      </div>

      <div className="flex items-center justify-center gap-2 py-4 text-xs text-neutral-300">
        <span className="text-xl text-orange-400" aria-hidden="true">⇵</span>
        <div className="text-center">Shuffle boundary{aggregationOnly ? <p className="mt-1 text-[11px] text-neutral-400">Redistribute data by department</p> : shuffleExample ? <p className="mt-1 text-[11px] text-neutral-400">Data redistributed across partitions</p> : null}</div>
      </div>

      <div className="rounded-xl border border-blue-400/35 bg-blue-400/5 p-3">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-bold text-white">{aggregationOnly ? "Stage 2 — Reduce Side" : "Stage 2 — Result Stage"}</p>
          <p className="text-[11px] text-neutral-300">Aggregation</p>
        </div>
        <OperationPipeline operations={shuffleExample || aggregationOnly ? ["Shuffle read", "Final aggregation", "Output"] : ["Read shuffle", "Aggregate", "Show"]} />
      </div>

      <figcaption className="mt-3 text-xs leading-5 text-neutral-300">
        Conceptual example: the aggregation requires a shuffle, separating the computation into stages. Actual plans can include additional stages or jobs.
      </figcaption>
    </figure>
  );
}

export function SparkExecutionCounts() {
  return (
    <figure aria-label="This simplified example has one job, two stages, and six tasks">
      <div className="grid grid-cols-3 gap-2">
        {[
          { count: 1, label: "Job", detail: "collect()" },
          { count: 2, label: "Stages", detail: "Separated by shuffle" },
          { count: 6, label: "Tasks", detail: "4 + 2" },
        ].map(({ count, label, detail }) => (
          <div key={label} className="min-w-0 rounded-xl border border-neutral-700 bg-[#0b0d10] px-2 py-5 text-center">
            <p className="text-2xl font-bold leading-8 text-white">{count}</p>
            <p className="mt-1 text-sm font-semibold text-neutral-100">{label}</p>
            <p className="mt-2 text-[10px] leading-4 text-neutral-300">{detail}</p>
          </div>
        ))}
      </div>
    </figure>
  );
}
