export default function SparkClusterCapacity() {
  return (
    <figure aria-label="Ten executors with four task slots each provide 40 concurrent task slots" className="rounded-2xl border border-neutral-700 bg-[#0b0d10] p-4 text-neutral-200 sm:p-5">
      <p className="text-center text-xs uppercase tracking-wide text-neutral-400">Cluster task capacity</p>
      <p className="mt-2 text-center text-xl font-bold text-white">40 concurrent tasks</p>
      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-5">
        {Array.from({length:10},(_,i)=><div key={i} className="rounded-xl border border-neutral-700 p-3 text-center">
          <p className="text-xs font-bold">Executor {i+1}</p>
          <div className="my-3 grid grid-cols-4 gap-1">{[0,1,2,3].map(n=><span key={n} aria-hidden="true" className="h-5 rounded border border-emerald-400/50 bg-emerald-400/25" />)}</div>
          <p className="text-xs text-emerald-300">4 tasks</p>
        </div>)}
      </div>
      <figcaption className="mt-4 text-center text-xs leading-5 text-neutral-400">Each green block represents one concurrent task slot. Assumes 4 available cores per executor and 1 CPU core per task.</figcaption>
    </figure>
  );
}
