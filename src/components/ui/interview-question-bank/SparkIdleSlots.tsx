export default function SparkIdleSlots({ active = 8 }: { active?: number }) {
  return <figure aria-label={`${active} active task slots and ${40-active} idle slots out of 40`} className="rounded-2xl border border-neutral-700 bg-[#0b0d10] p-4 text-neutral-200 sm:p-5">
    <p className="text-center font-bold text-white">{active} tasks / 40 available cores</p>
    <div className="mt-5 grid grid-cols-8 gap-2 sm:grid-cols-10">{Array.from({length:40},(_,i)=><span key={i} aria-hidden="true" className={`h-6 rounded border ${i<active ? "border-emerald-400/50 bg-emerald-400/30" : "border-neutral-600 bg-neutral-800"}`} />)}</div>
    <div className="mt-4 flex flex-wrap justify-center gap-4 text-xs"><span className="text-emerald-300">{active} active task slots</span><span className="text-neutral-400">{40-active} idle task slots</span></div>
    <div className="mt-4 rounded-xl border border-amber-400/30 bg-amber-400/5 p-3 text-center"><p className="text-2xl font-bold text-amber-300">{active/40*100}%</p><p className="mt-1 text-xs">Maximum core-slot utilization</p></div>
    <figcaption className="mt-4 text-center text-xs leading-5 text-neutral-400">Assumes one CPU core per task and no other jobs running. Occupied task slots are different from measured CPU usage.</figcaption>
  </figure>;
}
