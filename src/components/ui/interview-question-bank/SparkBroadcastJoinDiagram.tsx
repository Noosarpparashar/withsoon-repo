export default function SparkBroadcastJoinDiagram() {
  return <figure aria-label="Small Countries table broadcast to three executors, each joining its own Transactions partitions locally" className="rounded-2xl border border-neutral-700 bg-[#0b0d10] p-4 text-neutral-200 sm:p-5">
    <div className="mx-auto max-w-sm rounded-xl border border-amber-400/35 bg-amber-400/5 p-4 text-center"><p className="font-bold text-amber-300">Countries · 5 MiB</p><p className="mt-1 text-xs">Small build-side table</p></div>
    <p className="py-4 text-center text-sm text-amber-300">Broadcast to executors ↓</p>
    <div className="grid gap-3 sm:grid-cols-3">{[1,2,3].map(n=><div key={n} className="rounded-xl border border-neutral-700 p-3 text-center"><p className="text-sm font-bold text-white">Executor {n}</p><p className="mt-3 rounded-lg border border-amber-400/30 bg-amber-400/5 p-2 text-xs">Countries hash relation</p><p className="mt-2 rounded-lg border border-blue-400/30 bg-blue-400/5 p-2 text-xs">Local Transactions partitions</p><p className="py-2 text-xs text-neutral-400">Probe matching country_id</p><p className="rounded-lg border border-emerald-400/30 bg-emerald-400/5 p-2 text-xs text-emerald-300">Joined rows</p></div>)}</div>
    <figcaption className="mt-4 text-center text-xs leading-5 text-neutral-400">Conceptual broadcast hash join. The large side avoids a join-key shuffle; broadcasting still transfers the small side over the network. Three executors shown for illustration.</figcaption>
  </figure>;
}
