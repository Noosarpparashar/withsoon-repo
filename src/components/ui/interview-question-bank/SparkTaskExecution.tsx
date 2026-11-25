function ResourceIcon({ task = false }: { task?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className={`mx-auto mb-2 h-4 w-4 ${task ? "text-emerald-400" : "text-blue-400"}`} fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      {task ? (
        <>
          <rect x="6" y="6" width="12" height="12" rx="2" />
          <path d="M9 9h6v6H9zM9 2v4m6-4v4M9 18v4m6-4v4M2 9h4m-4 6h4m12-6h4m-4 6h4" />
        </>
      ) : (
        <>
          <ellipse cx="12" cy="5" rx="6" ry="2.5" />
          <path d="M6 5v6c0 3.3 12 3.3 12 0V5M6 11v6c0 3.3 12 3.3 12 0v-6" />
        </>
      )}
    </svg>
  );
}

export default function SparkTaskExecution() {
  return (
    <figure className="rounded-2xl border border-neutral-700 bg-[#0b0d10] p-3 text-neutral-200 sm:p-5" aria-label="Four partitions map to four tasks; Executor 1 runs tasks 1 and 2 and Executor 2 runs tasks 3 and 4, assuming two task slots per Executor">
      <div className="mb-5 text-center">
        <p className="text-base font-bold text-white">Spark Stage</p>
        <p className="mt-1 text-xs text-neutral-300">4 partitions → 4 tasks</p>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[1, 2, 3, 4].map((number) => (
          <div key={number} className="min-w-0 text-center">
            <div className="rounded-lg border border-blue-400/35 bg-blue-400/5 px-2 py-3">
              <ResourceIcon />
              <p className="text-[11px] font-bold leading-4">Partition {number}</p>
            </div>
            <div className="py-2 text-lg text-neutral-400" aria-hidden="true">↓</div>
            <div className="rounded-lg border border-emerald-400/35 bg-emerald-400/5 px-2 py-3">
              <ResourceIcon task />
              <p className="text-[11px] font-bold leading-4">Task {number}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="py-3 text-center text-lg text-neutral-400" aria-hidden="true">↓</div>

      <div className="grid gap-2 sm:grid-cols-2">
        {[
          { number: 1, tasks: "Tasks 1, 2" },
          { number: 2, tasks: "Tasks 3, 4" },
        ].map(({ number, tasks }) => (
          <div key={number} className="rounded-lg border border-neutral-700 px-3 py-4 text-center">
            <p className="text-sm font-bold text-white">Executor {number}</p>
            <p className="mt-1 text-xs leading-5 text-neutral-300">2 available cores</p>
            <p className="text-xs leading-5 text-neutral-300">{tasks}</p>
          </div>
        ))}
      </div>

      <figcaption className="mt-3 text-center text-xs leading-5 text-neutral-300">
        Illustration assuming 2 executors with 2 task slots each and 1 CPU core per task.
      </figcaption>
    </figure>
  );
}
