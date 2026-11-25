export default function SparkControlledConcurrency() {
  return <figure aria-label="Sixteen partitions with four running tasks and twelve waiting" className="rounded-2xl border border-neutral-700 bg-[#0b0d10] p-4 text-neutral-200 sm:p-5">
    <p className="text-center font-bold text-white">16 partitions / 4 task slots</p>
    <div className="mt-4 grid grid-cols-4 gap-2">{Array.from({length:16},(_,i)=><div key={i} className={`rounded-lg border p-3 text-center text-xs ${i<4 ? "border-emerald-400/50 bg-emerald-400/15 text-emerald-200" : "border-neutral-700 bg-neutral-800 text-neutral-400"}`}><strong>P{i+1}</strong><span className="mt-1 block">{i<4 ? "Running" : "Waiting"}</span></div>)}</div>
    <p className="mt-4 text-center text-sm text-emerald-300">4 running + 12 waiting</p>
    <figcaption className="mt-3 text-xs leading-5 text-neutral-400">Snapshot at the start of execution. Slots are reused as tasks finish: approximately four waves with equal task durations, one CPU per task, and no retries.</figcaption>
  </figure>;
}
