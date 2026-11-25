export default function SparkExecutionHierarchy({ variant = "relationship" }: { variant?: "relationship" | "job" }) {
  return (
    <figure
      className="rounded-2xl border border-neutral-700 bg-[#0b0d10] p-3 text-neutral-200 sm:p-5"
      aria-label="Spark application contains jobs; each job contains dependent stages, and each stage contains partition tasks"
    >
      <div className="text-center">
        <p className="text-base font-bold text-white">Spark Application</p>
        <p className="mt-1 text-xs text-neutral-300">{variant === "job" ? "Driver + Executors" : "Contains one or more jobs"}</p>
      </div>

      <div className="py-3 text-center text-lg text-neutral-400" aria-hidden="true">↓</div>

      <div className="rounded-xl border border-blue-400/35 bg-blue-400/5 px-4 py-4 text-center">
        <p className="text-base font-bold text-white">{variant === "job" ? "Job" : "Job 1"}</p>
        <p className="mt-1 text-xs text-neutral-300">Triggered by an action</p>
      </div>

      <div className="py-3 text-center text-lg text-neutral-400" aria-hidden="true">↓</div>

      <div className="grid gap-3 sm:grid-cols-2">
        {[
          { label: "Stage 1", type: "ShuffleMapStage" },
          { label: "Stage 2", type: "ResultStage" },
        ].map((stage) => (
          <div key={stage.label} className="min-w-0 rounded-xl border border-emerald-400/35 bg-emerald-400/5 p-3">
            <p className="text-center text-base font-bold text-white">{stage.label}</p>
            {variant === "relationship" ? <p className="mt-1 text-center text-[11px] text-neutral-300">{stage.type}</p> : null}
            <ul className="mt-3 grid grid-cols-2 gap-1.5" aria-label={`${stage.label} tasks`}>
              {[1, 2, 3, 4].map((task) => (
                <li key={task} className="rounded-md border border-neutral-600 bg-neutral-800 px-2 py-2 text-center text-[11px] leading-4 text-neutral-100">
                  Task {task}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <figcaption className="mt-3 text-xs leading-5 text-neutral-300">
        {variant === "job"
          ? "Illustrative hierarchy: jobs are divided into stages, and stages into parallel tasks."
          : "Simplified hierarchy. Stage 2 depends on the shuffle output of Stage 1, so they do not necessarily run simultaneously."}
      </figcaption>
    </figure>
  );
}
