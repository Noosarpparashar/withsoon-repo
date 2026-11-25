export default function SparkEightTaskExecutors() {
  return <figure aria-label="Two executors with four cores each run eight tasks concurrently" className="rounded-2xl border border-neutral-700 bg-[#0b0d10] p-4 text-neutral-200 sm:p-5">
    <p className="text-center font-bold text-white">8 concurrent task slots</p>
    <div className="mt-4 grid gap-3 sm:grid-cols-2">{[1,2].map(executor=><div key={executor} className="rounded-xl border border-blue-400/40 bg-blue-400/5 p-3"><p className="mb-3 text-center text-sm font-bold">Executor {executor}</p><div className="space-y-2">{[1,2,3,4].map(core=><div key={core} className="flex justify-between gap-2 rounded-lg border border-emerald-400/40 bg-emerald-400/10 p-3 text-xs"><span>Core {core}</span><strong className="text-emerald-200">Task {(executor-1)*4+core}</strong></div>)}</div></div>)}</div>
    <figcaption className="mt-4 text-xs leading-5 text-neutral-400">Eight tasks run concurrently; remaining tasks wait for slots. Assumes one CPU per task and all executor cores available. Assigned input bytes do not equal resident memory usage.</figcaption>
  </figure>;
}
