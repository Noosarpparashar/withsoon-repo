export function SparkExecutorLossDiagram() {
  return (
    <figure className="rounded-2xl border border-neutral-700 bg-[#0b0d10] p-3 text-neutral-200 sm:p-5" aria-label="Executor 2 loses partitions 3 and 4; the schedulers arrange recovery on surviving or optional replacement Executors">
      <p className="mb-4 text-center text-sm font-bold text-white">Before failure</p>
      <div className="grid gap-2 sm:grid-cols-3">
        {[{ id: 1, data: "P1, P2" }, { id: 2, data: "P3, P4" }, { id: 3, data: "P5, P6" }].map(({ id, data }) => (
          <div key={id} className={`rounded-lg border p-3 text-center ${id === 2 ? "border-red-400/40 bg-red-400/10" : "border-blue-400/30 bg-blue-400/5"}`}>
            <p className="text-xs font-bold text-white">Executor {id}</p>
            <p className="mt-2 font-mono text-xs">{data}</p>
            <p className={`mt-2 text-[11px] ${id === 2 ? "text-red-200" : "text-emerald-200"}`}>{id === 2 ? "Failed" : "Running"}</p>
          </div>
        ))}
      </div>
      <p className="py-3 text-center text-xs text-neutral-300"><span className="mb-1 block text-lg text-neutral-400" aria-hidden="true">↓</span>Driver detects Executor 2 failure</p>
      <div className="rounded-lg border border-amber-400/35 bg-amber-400/5 p-4 text-center">
        <p className="text-sm font-bold text-white">TaskScheduler + DAGScheduler</p>
        <p className="mt-1 text-xs leading-5 text-neutral-300">Identify affected tasks and lost data; arrange retries and recomputation</p>
      </div>
      <p className="py-3 text-center text-xs text-neutral-300"><span className="mb-1 block text-lg text-neutral-400" aria-hidden="true">↓</span>After rescheduling</p>
      <div className="grid gap-2 sm:grid-cols-3">
        {[{ id: 1, detail: "P1, P2 + P3" }, { id: 3, detail: "P5, P6 + P4" }, { id: 4, detail: "Replacement (optional)" }].map(({ id, detail }) => (
          <div key={id} className="rounded-lg border border-emerald-400/30 bg-emerald-400/5 p-3 text-center">
            <p className="text-xs font-bold text-white">Executor {id}</p>
            <p className="mt-2 text-[11px] leading-5 text-neutral-300">{detail}</p>
          </div>
        ))}
      </div>
      <figcaption className="mt-3 text-xs leading-5 text-neutral-300">Illustrative scheduling: partitions represent tasks or data that may need recomputation, not permanently assigned partitions.</figcaption>
    </figure>
  );
}

export function SparkLostShuffleDiagram() {
  return (
    <figure className="rounded-2xl border border-neutral-700 bg-[#0b0d10] p-3 text-neutral-200 sm:p-5" aria-label="Executor 2 loses shuffle files B, causing a downstream fetch failure; Spark recomputes missing shuffle-map outputs and retries affected downstream tasks">
      <p className="mb-4 text-center text-sm font-bold text-white">Stage 1: Shuffle Map</p>
      <div className="grid gap-2 sm:grid-cols-3">
        {["A", "B", "C"].map((file, index) => (
          <div key={file} className="rounded-lg border border-blue-400/30 bg-blue-400/5 p-3 text-center">
            <p className="text-xs font-bold text-white">Executor {index + 1}</p>
            <p className="mt-2 text-[11px] text-neutral-300">Shuffle files {file}</p>
          </div>
        ))}
      </div>
      <ol className="mt-1">
        {[
          { title: "Executor 2 dies", detail: "Shuffle files B lost", failure: true },
          { title: "Stage 2: Shuffle Read", detail: "Cannot fetch shuffle files B", failure: false },
          { title: "Shuffle fetch failure", detail: "Required intermediate data is unavailable", failure: true },
          { title: "Recompute missing shuffle-map outputs", detail: "Recover the necessary upstream data", failure: false },
          { title: "Retry affected downstream tasks", detail: "Continue once required shuffle output is available", failure: false },
        ].map(({ title, detail, failure }) => (
          <li key={title}>
            <div className="py-2 text-center text-lg text-neutral-400" aria-hidden="true">↓</div>
            <div className={`rounded-lg border p-3 text-center ${failure ? "border-red-400/35 bg-red-400/5" : "border-emerald-400/30 bg-emerald-400/5"}`}>
              <p className="text-xs font-bold text-white">{title}</p>
              <p className="mt-1 text-[11px] leading-5 text-neutral-300">{detail}</p>
            </div>
          </li>
        ))}
      </ol>
    </figure>
  );
}
