function PartitionIcon() {
  return (
    <svg viewBox="0 0 24 24" className="mx-auto mb-2 h-4 w-4 text-blue-400" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <ellipse cx="12" cy="5" rx="6" ry="2.5" />
      <path d="M6 5v6c0 3.3 12 3.3 12 0V5M6 11v6c0 3.3 12 3.3 12 0v-6" />
    </svg>
  );
}

function TaskIcon() {
  return (
    <svg viewBox="0 0 24 24" className="mx-auto mb-2 h-4 w-4 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <rect x="6" y="6" width="12" height="12" rx="2" />
      <path d="M9 9h6v6H9zM9 2v4m6-4v4M9 18v4m6-4v4M2 9h4m-4 6h4m12-6h4m-4 6h4" />
    </svg>
  );
}

export function SparkPracticalExecution() {
  return (
    <figure className="rounded-2xl border border-neutral-700 bg-[#0b0d10] p-3 text-neutral-200 sm:p-5" aria-label="One job executes four input tasks, shuffles into two partitions, then runs two final aggregation tasks and returns results to the Driver">
      <div className="text-center">
        <p className="text-base font-bold text-white">Job 0 — collect()</p>
        <p className="mt-1 text-xs text-neutral-300">Triggered by the action</p>
      </div>
      <div className="py-3 text-center text-lg text-neutral-400" aria-hidden="true">↓</div>

      <div className="rounded-xl border border-blue-400/35 bg-blue-400/5 p-3">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-bold text-white">Stage 0 — ShuffleMapStage</p>
          <span className="shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold leading-4">4 tasks</span>
        </div>
        <p className="mb-3 mt-2 text-xs text-neutral-300">Read → Filter → Partial aggregation</p>
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Stage 0 partition tasks">
          {[0, 1, 2, 3].map((task) => (
            <li key={task} className="min-w-0 rounded-lg border border-neutral-600 bg-neutral-800 px-2 py-3 text-center text-[11px] leading-5">
              <PartitionIcon />
              <p>Partition {task}</p>
              <span className="block text-neutral-400" aria-hidden="true">↓</span>
              <p className="font-bold">Task {task}</p>
            </li>
          ))}
        </ul>
      </div>

      <div className="px-2 py-4 text-center">
        <span className="text-xl text-orange-400" aria-hidden="true">⇵</span>
        <p className="font-bold text-white">Shuffle</p>
        <p className="mt-1 text-xs leading-5 text-neutral-300">Redistribute intermediate data by region into 2 partitions</p>
      </div>

      <div className="rounded-xl border border-emerald-400/35 bg-emerald-400/5 p-3">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-bold text-white">Stage 1 — ResultStage</p>
          <span className="shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold leading-4">2 tasks</span>
        </div>
        <p className="mb-3 mt-2 text-xs text-neutral-300">Read shuffle → Final aggregation</p>
        <ul className="grid grid-cols-2 gap-2" aria-label="Stage 1 shuffle partition tasks">
          {[0, 1].map((task) => (
            <li key={task} className="rounded-lg border border-neutral-600 bg-neutral-800 px-2 py-3 text-center text-[11px] leading-5">
              <TaskIcon />
              <p className="font-bold">Task {task}</p>
              <p>Shuffle partition {task}</p>
            </li>
          ))}
        </ul>
      </div>

      <div className="py-3 text-center text-lg text-neutral-400" aria-hidden="true">↓</div>
      <div className="rounded-xl border border-neutral-700 px-3 py-4 text-center">
        <p className="font-bold text-white">Driver</p>
        <p className="mt-1 text-xs text-neutral-300">collect() receives aggregated results</p>
      </div>
    </figure>
  );
}

export function SparkTaskWaves() {
  return (
    <figure className="rounded-2xl border border-neutral-700 bg-[#0b0d10] p-4 text-neutral-200 sm:p-5" aria-label="With two task slots, Stage 0 runs four tasks in two waves, followed by Stage 1 running two tasks in one wave">
      <p className="mb-3 text-sm font-bold text-white">Stage 0 — 4 tasks, 2 task slots</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {[{ wave: 1, tasks: "Task 0 + Task 1" }, { wave: 2, tasks: "Task 2 + Task 3" }].map(({ wave, tasks }) => (
          <div key={wave}>
            <p className="mb-2 text-xs font-semibold text-neutral-300">Wave {wave}</p>
            <p className="rounded-lg border border-emerald-400/25 bg-emerald-400/5 px-3 py-2 text-center text-xs">{tasks}</p>
          </div>
        ))}
      </div>
      <div className="mt-5 border-t border-neutral-800 pt-5">
        <p className="mb-3 text-sm font-bold text-white">Stage 1 — 2 tasks, 2 task slots</p>
        <p className="rounded-lg border border-blue-400/25 bg-blue-400/5 px-3 py-3 text-center text-xs">Task 0 + Task 1 run in one wave</p>
      </div>
    </figure>
  );
}
