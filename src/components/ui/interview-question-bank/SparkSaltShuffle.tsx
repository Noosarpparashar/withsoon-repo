export default function SparkSaltShuffle() {
  return <figure aria-label="Without salt ten million C101 rows share one shuffle key; after a salted shuffle ten salt groups each hold roughly one million rows" className="rounded-2xl border border-neutral-700 bg-[#0b0d10] p-4 text-neutral-200 sm:p-5">
    <p className="text-center font-bold text-white">Salt creates keys; shuffle redistributes records</p>
    <div className="mt-4 rounded-xl border border-amber-400/35 bg-amber-400/5 p-4 text-center"><p className="text-sm font-bold text-amber-300">Without salting</p><p className="mt-2 text-xs">10M records · customer_id = C101</p><p className="mt-3 rounded-lg border border-neutral-600 p-3 text-sm">Partition 7 · 10M records</p></div>
    <div className="my-4 rounded-xl border border-blue-400/35 bg-blue-400/5 p-4 text-center"><p className="text-sm font-bold text-blue-300">Add salt values 0–9</p><p className="mt-1 text-xs text-neutral-300">Records remain in their existing partitions</p></div>
    <p className="my-4 rounded-lg border border-amber-400/35 p-3 text-center text-xs text-amber-300">↓ Exchange hashpartitioning(customer_id, salt) ↓</p>
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">{Array.from({length:10},(_,i)=><div key={i} className="rounded-lg border border-emerald-400/35 bg-emerald-400/5 p-3 text-center"><p className="text-xs text-emerald-300">Salt {i}</p><p className="mt-2 text-sm font-bold">≈1M</p></div>)}</div>
    <figcaption className="mt-4 text-xs leading-5 text-neutral-400">Conceptual salt groups after a shuffle-based join. Hash collisions may place multiple groups in the same physical partition; ten salt values do not guarantee ten distinct partitions.</figcaption>
  </figure>;
}
