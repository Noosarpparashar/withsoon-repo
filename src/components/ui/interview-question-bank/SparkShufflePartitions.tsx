export default function SparkShufflePartitions() {
  return <figure aria-label="Five input partitions redistribute records by key into four shuffle partitions, each processed by a downstream task" className="rounded-2xl border border-neutral-700 bg-[#0b0d10] p-4 text-neutral-200 sm:p-5">
    <p className="text-center font-bold text-white">How shuffle partitioning works</p>
    <p className="mt-4 text-xs font-semibold text-blue-300">Input stage · 5 partitions</p>
    <div className="mt-2 grid grid-cols-5 gap-1.5">{[0,1,2,3,4].map(n=><div key={n} className="rounded-lg border border-blue-400/35 bg-blue-400/5 py-3 text-center text-xs">P{n}</div>)}</div>
    <div className="my-4 rounded-xl border border-amber-400/30 bg-amber-400/5 p-3 text-center"><p className="text-sm font-semibold text-amber-300">Shuffle by customer_id</p><p className="mt-1 text-xs leading-5 text-neutral-300">Each upstream task can write blocks for multiple downstream partitions</p><span aria-hidden="true">↓</span></div>
    <p className="text-xs font-semibold text-emerald-300">Next stage · 4 shuffle partitions</p>
    <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">{[0,1,2,3].map(n=><div key={n} className="rounded-lg border border-emerald-400/35 bg-emerald-400/5 p-3 text-center text-xs"><p className="font-semibold text-emerald-300">Shuffle P{n}</p><p className="mt-2">Task {n}</p></div>)}</div>
    <figcaption className="mt-4 text-center text-xs leading-5 text-neutral-400">Illustrative 5-to-4 layout, separate from the 10-input-partition code example. Each downstream task processes one shuffle partition; concurrent execution depends on available task slots.</figcaption>
  </figure>;
}
