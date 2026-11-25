export function SparkTaskRetryDiagram() {
  return (
    <figure className="rounded-2xl border border-neutral-700 bg-[#0b0d10] p-4 text-neutral-200 sm:p-5" aria-label="Stage 1 has 100 tasks; task 45 fails and is retried successfully without necessarily rerunning unaffected tasks">
      <p className="text-center text-sm font-bold text-white">Stage 1 — 100 tasks</p>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[1, 2, 45, 100].map((task) => (
          <div key={task} className={`rounded-lg border px-2 py-3 text-center ${task === 45 ? "border-red-400/40 bg-red-400/10" : "border-emerald-400/30 bg-emerald-400/5"}`}>
            <p className="text-xs font-bold text-white">Task {task}</p>
            <p className={`mt-1 text-[11px] ${task === 45 ? "text-red-200" : "text-emerald-200"}`}>{task === 45 ? "Failed" : "Succeeded"}</p>
          </div>
        ))}
      </div>
      <p className="mt-2 text-center text-[10px] text-neutral-400">Representative tasks shown; other task cards omitted.</p>
      <div className="py-3 text-center text-lg text-neutral-400" aria-hidden="true">↓</div>
      <ol className="grid gap-2 sm:grid-cols-3" aria-label="Failed task recovery sequence">
        {["Task 45", "Retried", "Success"].map((label, index) => (
          <li key={label} className={`rounded-lg border px-3 py-3 text-center text-xs font-semibold ${index === 2 ? "border-emerald-400/30 bg-emerald-400/5 text-emerald-200" : "border-neutral-600 bg-neutral-800"}`}>{index + 1}. {label}</li>
        ))}
      </ol>
    </figure>
  );
}

export function SparkExecutorRecoveryDiagram() {
  return (
    <figure className="rounded-2xl border border-neutral-700 bg-[#0b0d10] p-4 text-neutral-200 sm:p-5" aria-label="Executor 2 fails. Driver and schedulers identify lost tasks and data, then schedule necessary recomputation on available Executors 1, 3, and 4">
      <p className="mb-4 text-center text-sm font-bold text-white">Executor 2 fails</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[1, 2, 3, 4].map((executor) => (
          <div key={executor} className={`rounded-lg border px-2 py-3 text-center ${executor === 2 ? "border-red-400/40 bg-red-400/10" : "border-blue-400/30 bg-blue-400/5"}`}>
            <p className="text-xs font-bold text-white">Executor {executor}</p>
            <p className="mt-1 text-[11px] text-neutral-300">{executor === 2 ? "Failed" : "Available"}</p>
          </div>
        ))}
      </div>
      <div className="py-3 text-center text-lg text-neutral-400" aria-hidden="true">↓</div>
      <div className="rounded-lg border border-amber-400/35 bg-amber-400/5 p-4 text-center">
        <p className="text-sm font-bold text-white">Driver + Schedulers</p>
        <p className="mt-1 text-xs leading-5 text-neutral-300">Detect Executor 2 failure, identify lost tasks and data, then schedule necessary recomputation</p>
      </div>
      <div className="py-3 text-center text-lg text-neutral-400" aria-hidden="true">↓</div>
      <div className="grid grid-cols-3 gap-2">
        {[1, 3, 4].map((executor) => (
          <div key={executor} className="rounded-lg border border-emerald-400/30 bg-emerald-400/5 px-2 py-3 text-center">
            <p className="text-xs font-bold text-white">Executor {executor}</p>
            <p className="mt-1 text-[10px] leading-5 text-neutral-300">Replacement tasks</p>
          </div>
        ))}
      </div>
    </figure>
  );
}

export function SparkShuffleRecoveryDiagram() {
  return (
    <figure className="rounded-2xl border border-neutral-700 bg-[#0b0d10] p-4 text-neutral-200 sm:p-5" aria-label="Stage 1 produces shuffle output; Stage 2 reads it. Missing shuffle blocks can require upstream tasks to rerun before downstream recovery">
      <div className="rounded-lg border border-blue-400/35 bg-blue-400/5 p-4 text-center">
        <p className="text-sm font-bold text-white">Stage 1</p>
        <p className="mt-2 text-xs leading-6 text-neutral-300">Read → Partial Aggregation → Shuffle Write</p>
      </div>
      <div className="py-3 text-center">
        <span className="text-lg text-orange-400" aria-hidden="true">↓</span>
        <p className="text-xs font-semibold text-neutral-200">Shuffle Boundary</p>
        <span className="text-lg text-orange-400" aria-hidden="true">↓</span>
      </div>
      <div className="rounded-lg border border-emerald-400/35 bg-emerald-400/5 p-4 text-center">
        <p className="text-sm font-bold text-white">Stage 2</p>
        <p className="mt-2 text-xs leading-6 text-neutral-300">Shuffle Read → Final Aggregation → Result</p>
      </div>
      <figcaption className="mt-4 rounded-lg border border-amber-400/30 bg-amber-400/5 px-3 py-3 text-xs leading-5 text-neutral-300">
        Missing shuffle blocks can trigger recomputation of required upstream shuffle-map outputs and retry of the affected downstream stage.
      </figcaption>
    </figure>
  );
}
