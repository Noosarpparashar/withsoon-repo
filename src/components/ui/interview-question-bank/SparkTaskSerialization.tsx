export default function SparkTaskSerialization() {
  return <figure aria-label="Driver serializes task information and sends bytes to two executors which deserialize and execute their assigned tasks" className="rounded-2xl border border-neutral-700 bg-[#0b0d10] p-4 text-neutral-200 sm:p-5">
    <div className="rounded-xl border border-blue-400/40 bg-blue-400/5 p-4 text-center"><p className="font-bold text-white">Driver</p><p className="mt-2 text-xs">Tasks, closures, and required dependencies</p></div>
    <div aria-hidden="true" className="py-2 text-center text-neutral-400">↓</div>
    <div className="rounded-xl border border-amber-400/40 bg-amber-400/5 p-3 text-center"><p className="text-sm font-bold text-amber-200">Serialize task information</p><p className="mt-1 text-xs">Transmit encoded bytes over the network</p></div>
    <div className="mt-3 grid gap-3 sm:grid-cols-2">{[1,2].map(n=><div key={n} className="text-center"><div aria-hidden="true" className="mb-3 text-neutral-400">↓</div><div className="rounded-xl border border-emerald-400/40 bg-emerald-400/5 p-4"><p className="text-sm font-bold text-white">Executor {n}</p><p className="mt-3 text-xs text-emerald-200">Receive bytes → Deserialize → Run tasks</p></div></div>)}</div>
    <figcaption className="mt-4 text-xs leading-5 text-neutral-400">Illustrative task distribution to independent executor processes. Each executor receives its assigned work; the diagram does not imply that every task is copied to both executors.</figcaption>
  </figure>;
}
