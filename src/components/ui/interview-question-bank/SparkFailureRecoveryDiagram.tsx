export default function SparkFailureRecoveryDiagram() {
  return (
    <figure className="rounded-2xl border border-neutral-700 bg-[#0b0d10] p-3 text-neutral-200 sm:p-5" aria-label="Executor 2 fails while processing partition 2. Spark reschedules that partition and recomputes its map and filter to recover values 12, 14, and 16.">
      <p className="mb-4 text-center text-sm font-bold text-white">Before failure</p>
      <div className="grid gap-2 sm:grid-cols-3">
        {[
          { executor: 1, partition: "P1: [1–4]", failed: false },
          { executor: 2, partition: "P2: [5–8]", failed: true },
          { executor: 3, partition: "P3: [9–12]", failed: false },
        ].map(({ executor, partition, failed }) => (
          <div key={executor} className={`rounded-lg border px-2 py-3 text-center ${failed ? "border-red-400/40 bg-red-400/10" : "border-blue-400/30 bg-blue-400/5"}`}>
            <p className="text-xs font-bold text-white">Executor {executor}</p>
            <p className="mt-2 font-mono text-xs">{partition}</p>
            <p className={`mt-2 text-[11px] ${failed ? "text-red-200" : "text-emerald-200"}`}>{failed ? "Failed" : "Available"}</p>
          </div>
        ))}
      </div>

      <div className="py-3 text-center">
        <span className="text-lg text-neutral-400" aria-hidden="true">↓</span>
        <p className="text-xs text-neutral-300">Spark detects the failure</p>
      </div>
      <div className="rounded-lg border border-amber-400/35 bg-amber-400/5 p-4 text-center">
        <p className="text-sm font-bold text-white">Driver / Schedulers</p>
        <p className="mt-1 text-xs leading-5 text-neutral-300">Identify affected tasks and schedule recomputation</p>
      </div>
      <div className="py-3 text-center text-lg text-neutral-400" aria-hidden="true">↓</div>

      <div className="rounded-xl border border-emerald-400/35 bg-emerald-400/5 p-3">
        <p className="mb-3 text-center text-xs font-bold text-white">Recompute Partition 2 on an available executor</p>
        <ol className="grid gap-2 sm:grid-cols-3" aria-label="Partition 2 recovery steps">
          {[
            { label: "Source", values: "[5, 6, 7, 8]" },
            { label: "map × 2", values: "[10, 12, 14, 16]" },
            { label: "filter(x > 10)", values: "[12, 14, 16]" },
          ].map(({ label, values }, index) => (
            <li key={label} className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
              {index > 0 ? <span className="text-center text-neutral-400" aria-hidden="true"><span className="sm:hidden">↓</span><span className="hidden sm:inline">→</span></span> : null}
              <div className="min-w-0 flex-1 rounded-lg border border-neutral-600 bg-neutral-800 px-1 py-3 text-center">
                <p className="text-[10px] leading-5 text-neutral-300">{label}</p>
                <p className="mt-1 font-mono text-[10px] leading-5 text-neutral-100">{values}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-3 text-center text-xs font-semibold text-emerald-200">Recovered: [12, 14, 16]</p>
      </div>
    </figure>
  );
}
