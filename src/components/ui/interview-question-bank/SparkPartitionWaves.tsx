export default function SparkPartitionWaves() {
  return (
    <figure aria-label="400 partition tasks execute in ten waves on 40 available task slots" className="rounded-2xl border border-neutral-700 bg-[#0b0d10] p-4 text-neutral-200 sm:p-5">
      <p className="text-center font-bold text-white">400 partitions · 40 available cores</p>
      <p className="mt-1 text-center text-xs text-neutral-400">One task slot per core → approximately 10 waves</p>
      <div className="mt-5 grid grid-cols-5 gap-2 sm:grid-cols-10">
        {Array.from({length:100},(_,i)=><span key={i} aria-hidden="true" className={`h-4 rounded border ${i < 10 ? "border-emerald-400/50 bg-emerald-400/30" : "border-blue-400/30 bg-blue-400/10"}`} />)}
      </div>
      <div className="mt-4 grid gap-2 text-center text-xs sm:grid-cols-2">
        <p className="rounded-lg border border-emerald-400/30 p-3 text-emerald-300">First wave: 40 tasks</p>
        <p className="rounded-lg border border-blue-400/30 p-3 text-blue-300">Remaining: 360 tasks</p>
      </div>
      <figcaption className="mt-4 text-center text-xs leading-5 text-neutral-400">Each cell represents 4 partitions. Conceptual waves assume equal task durations, all slots available, and no retries.</figcaption>
    </figure>
  );
}
