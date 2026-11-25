export default function SparkSaltExchange() {
  return <figure aria-label="Project adds salt without moving records; a hash-partitioning Exchange redistributes the salted keys before a sort-merge join" className="rounded-2xl border border-neutral-700 bg-[#0b0d10] p-4 text-neutral-200 sm:p-5">
    <div className="rounded-xl border border-blue-400/35 bg-blue-400/5 p-4 text-center"><p className="text-sm font-bold text-white">Original transactions</p><p className="mt-1 text-xs leading-5">C101 records may be concentrated after partitioning by customer_id</p></div>
    <div aria-hidden="true" className="py-2 text-center">↓</div>
    <div className="rounded-xl border border-blue-400/35 bg-blue-400/5 p-4 text-center"><p className="text-sm font-bold text-white">Project / withColumn(&quot;salt&quot;)</p><p className="mt-1 text-xs">Assign salt values 0–9 without moving records</p></div>
    <div aria-hidden="true" className="py-2 text-center">↓</div>
    <div className="rounded-xl border border-amber-400/40 bg-amber-400/10 p-4 text-center"><p className="break-words text-sm font-bold text-amber-300">Exchange hashpartitioning(customer_id, salt, 200)</p><p className="mt-2 text-xs">Actual redistribution: shuffle write → shuffle read</p></div>
    <div aria-hidden="true" className="py-2 text-center">↓</div>
    <div className="grid gap-2 sm:grid-cols-3">{[1,2,3].map(n=><div key={n} className="rounded-xl border border-emerald-400/35 bg-emerald-400/5 p-3 text-center"><p className="text-xs font-bold text-emerald-300">Partition {n}</p><p className="mt-2 text-xs">Different salted keys</p><p className="mt-2 text-xs text-neutral-400">Sort by join keys</p></div>)}</div>
    <div aria-hidden="true" className="py-2 text-center">↓</div><p className="rounded-xl border border-neutral-600 p-3 text-center text-sm font-bold text-white">SortMergeJoin</p>
    <figcaption className="mt-4 text-xs leading-5 text-neutral-400">Three of the illustrative 200 target partitions are shown. The matching input also needs compatible distribution. Broadcast joins or AQE may produce a different plan.</figcaption>
  </figure>;
}
