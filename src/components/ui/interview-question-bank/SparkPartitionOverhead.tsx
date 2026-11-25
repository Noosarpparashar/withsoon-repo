export default function SparkPartitionOverhead() {
  return <figure aria-label="Illustrative runtime model: more partitions add overhead after 40 task slots are occupied" className="rounded-2xl border border-neutral-700 bg-[#0b0d10] p-4 text-neutral-200 sm:p-5">
    <p className="text-center font-bold text-white">Partitions versus potential overhead</p>
    <div className="mt-5 space-y-2">
      {[40,80,200,400,800,2000,4000,8000].map(p=>{
        const seconds=2.56+Math.ceil(p/40)*0.05;
        return <div key={p} className="grid grid-cols-[3rem_1fr_3.5rem] items-center gap-2 text-xs"><span>{p.toLocaleString()}</span><div className="h-5 rounded bg-neutral-800"><div style={{width:`${seconds/16*100}%`}} className="h-full rounded bg-blue-400/80" /></div><span className="text-right">{seconds.toFixed(2)} s</span></div>;
      })}
    </div>
    <p className="mt-2 text-xs text-neutral-400">Partition count → modeled runtime</p>
    <figcaption className="mt-4 text-xs leading-5 text-neutral-400">Illustrative model, not benchmark results: 10 GiB, 40 task slots, 100 MiB/s per task, and 50 ms overhead per task. Runtime ≈ 2.56 s processing + ceil(partitions / 40) × 0.05 s overhead. Assumes balanced tasks and overhead paid independently in each slot; actual scheduling and I/O can behave differently.</figcaption>
  </figure>;
}
