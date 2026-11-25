export default function SparkPartitionParallelism() {
  return (
    <figure aria-label="Task counts for 100 GiB: 128 MiB gives 800 tasks, 256 MiB gives 400, 512 MiB gives 200, 1 GiB gives 100, and 4 GiB gives 25" className="rounded-2xl border border-neutral-700 bg-[#0b0d10] p-4 text-neutral-200 sm:p-5">
      <p className="text-center font-bold text-white">Partition size versus available parallelism</p>
      <p className="mt-1 text-center text-xs text-neutral-400">100 GiB dataset · 40 available task slots</p>
      <div className="mt-5 space-y-3">
        {[{size:"128 MiB",tasks:800},{size:"256 MiB",tasks:400},{size:"512 MiB",tasks:200},{size:"1 GiB",tasks:100},{size:"4 GiB",tasks:25}].map(({size,tasks})=><div key={size} className="grid grid-cols-[4rem_1fr_2.5rem] items-center gap-2 text-xs">
          <span>{size}</span>
          <div className="h-5 rounded bg-neutral-800"><div style={{width:`${tasks/8}%`}} className={`h-full min-w-1 rounded ${tasks < 40 ? "bg-amber-400/80" : "bg-blue-400/80"}`} /></div>
          <span className="text-right">{tasks}</span>
        </div>)}
      </div>
      <p className="mt-2 text-right text-[11px] text-neutral-400">Tasks per stage</p>
      <p className="mt-4 rounded-lg border border-amber-400/30 bg-amber-400/5 p-3 text-xs leading-5 text-amber-200">4 GiB partitions create only 25 tasks: at most 25 of the 40 slots can be used at once.</p>
      <figcaption className="mt-3 text-center text-xs leading-5 text-neutral-400">Illustrative balanced partitions measured against the same data representation. One task per partition and one CPU core per task.</figcaption>
    </figure>
  );
}
