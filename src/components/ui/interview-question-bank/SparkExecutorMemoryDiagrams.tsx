export default function SparkExecutorMemoryDiagram({ demand = false }: { demand?: boolean }) {
  return <figure aria-label={demand ? "Eight tasks at one and a half GiB peak heap each demand twelve GiB, exceeding an eight GiB heap" : "Executor memory includes JVM execution, storage, other heap usage, and additional memory outside the heap"} className="rounded-2xl border border-neutral-700 bg-[#0b0d10] p-4 text-neutral-200 sm:p-5">
    {demand ? <>
      <p className="mb-4 text-center font-bold text-white">Concurrent task demand can exceed heap capacity</p>
      <div className="grid gap-3 sm:grid-cols-2">{[{label:"Peak task demand",value:"12 GiB",note:"8 tasks × 1.5 GiB",hot:true},{label:"Executor JVM heap",value:"8 GiB",note:"Total heap limit",hot:false}].map(({label,value,note,hot})=><div key={label} className={`rounded-xl border p-4 text-center ${hot ? "border-amber-400/35 bg-amber-400/5" : "border-blue-400/35 bg-blue-400/5"}`}><p className="text-xs">{label}</p><p className={`mt-3 text-2xl font-bold ${hot ? "text-amber-300" : "text-blue-300"}`}>{value}</p><p className="mt-2 text-xs text-neutral-400">{note}</p></div>)}</div>
      <figcaption className="mt-4 text-xs leading-5 text-neutral-400">Illustrative simultaneous peak demand, before other heap consumers. Reducing concurrency may help combined pressure; it does not fix a task whose individual working set is too large.</figcaption>
    </> : <>
      <p className="mb-4 text-center font-bold text-white">Executor with 8 GiB JVM heap</p>
      <div className="rounded-xl border border-blue-400/35 bg-blue-400/5 p-4"><p className="text-center text-sm font-bold text-blue-300">JVM heap</p><div className="mt-3 rounded-xl border border-emerald-400/35 p-3"><p className="mb-3 text-center text-xs text-emerald-300">Unified memory pool · dynamically shared</p><div className="grid grid-cols-2 gap-2">{["Execution memory","Storage"].map(t=><p key={t} className="rounded-lg border border-neutral-600 p-3 text-center text-xs">{t}</p>)}</div></div><p className="mt-3 rounded-lg border border-neutral-600 p-3 text-center text-xs">Other heap usage and reserved memory</p></div>
      <div className="mt-3 rounded-xl border border-amber-400/35 bg-amber-400/5 p-4 text-center text-xs leading-6 text-amber-200">Outside the JVM heap: native/direct memory, other overhead, configured off-heap memory, and Python worker processes</div>
      <figcaption className="mt-4 text-xs leading-5 text-neutral-400">Conceptual layout, not fixed proportions. Container sizing and separate allowances depend on deployment and memory configuration.</figcaption>
    </>}
  </figure>;
}
