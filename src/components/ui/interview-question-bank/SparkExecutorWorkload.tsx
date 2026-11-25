export default function SparkExecutorWorkload() {
  return <figure aria-label="Illustrative workload across ten executors: nine process 60 to 70 GiB each while executor ten processes 410 GiB" className="rounded-2xl border border-neutral-700 bg-[#0b0d10] p-4 text-neutral-200 sm:p-5">
    <p className="text-center font-bold text-white">Illustrative workload distribution</p><p className="mt-1 text-center text-xs text-neutral-400">1,000 GiB total across 10 executors</p>
    <div className="mt-5 space-y-2">{[60,65,70,65,60,70,65,70,65,410].map((n,i)=><div key={i} className="grid grid-cols-[4.5rem_1fr_3.5rem] items-center gap-2 text-xs"><span>Executor {i+1}</span><div className="h-5 rounded bg-neutral-800"><div style={{width:`${n/450*100}%`}} className={`h-full rounded ${i===9 ? "bg-amber-400/80" : "bg-blue-400/80"}`} /></div><span className="text-right">{n} GiB</span></div>)}</div>
    <figcaption className="mt-4 text-xs leading-5 text-neutral-400">Aggregate workload illustration, not fixed partition ownership. Spark schedules tasks dynamically; investigate whether the delay follows a partition or an executor/host.</figcaption>
  </figure>;
}
