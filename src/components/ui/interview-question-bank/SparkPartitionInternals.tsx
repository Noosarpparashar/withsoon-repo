export default function SparkPartitionInternals({ shuffle = false }: { shuffle?: boolean }) {
  return (
    <figure className="rounded-2xl border border-neutral-700 bg-[#0b0d10] p-4 text-neutral-200 sm:p-5" aria-label={shuffle ? "Four map-side partitions redistribute data into three downstream shuffle partitions" : "Driver schedules four partition tasks across two executors"}>
      <div className="mb-4 text-center">
        <p className="font-bold text-white">{shuffle ? "Stage 1: Map-side partitions" : "Spark Driver"}</p>
        <p className="mt-1 text-xs text-neutral-400">{shuffle ? "Each task processes one input partition" : "Builds execution plan and schedules tasks"}</p>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[0, 1, 2, 3].map(n => <div key={n} className="rounded-lg border border-blue-400/35 bg-blue-400/5 p-3 text-center text-xs"><p className="font-bold text-blue-300">P{n}</p><p className="mt-1">{shuffle ? `Map task ${n}` : `Input partition ${n}`}</p></div>)}
      </div>
      <div className="my-4 rounded-lg border border-amber-400/25 bg-amber-400/5 p-3 text-center">
        <p className="text-sm font-semibold text-amber-200">{shuffle ? "Shuffle: redistribute by key" : "Assign tasks to available executor slots"}</p>
        <p className="mt-1 text-xs leading-5 text-neutral-300">{shuffle ? "Each map task can write blocks for all 3 downstream partitions" : "Stage 1: 4 input partitions → 4 tasks"}</p>
        <span aria-hidden="true">↓</span>
      </div>
      <div className={`grid gap-2 ${shuffle ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
        {(shuffle ? [0, 1, 2] : [1, 2]).map(n => <div key={n} className="rounded-lg border border-emerald-400/35 bg-emerald-400/5 p-3 text-center"><p className="text-sm font-bold text-emerald-300">{shuffle ? `Shuffle partition ${n}` : `Executor ${n}`}</p><p className="mt-2 text-xs leading-6">{shuffle ? `Reduce-side task ${n}` : n === 1 ? "Task 0 → P0 · Task 1 → P1" : "Task 2 → P2 · Task 3 → P3"}</p></div>)}
      </div>
      <figcaption className="mt-4 text-center text-xs leading-5 text-neutral-400">{shuffle ? "Stage 2: 3 tasks fetch and process their assigned shuffle partitions." : "Four tasks run concurrently across two executors with two available task slots each."}</figcaption>
    </figure>
  );
}
