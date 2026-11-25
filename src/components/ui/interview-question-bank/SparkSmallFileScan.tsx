export default function SparkSmallFileScan() {
  return <figure aria-label="Spark groups many physical small files into fewer scan partitions, one task per scan partition" className="rounded-2xl border border-neutral-700 bg-[#0b0d10] p-4 text-neutral-200 sm:p-5">
    <p className="text-center font-bold text-white">Illustrative Spark file scan</p><p className="mt-1 text-center text-xs text-neutral-400">Many physical files → fewer scan tasks</p>
    <div aria-hidden="true" className="mt-4 grid grid-cols-12 gap-1">{Array.from({length:36},(_,i)=><span key={i} className="h-5 rounded-sm border border-amber-400/40 bg-amber-400/15" />)}</div>
    <p className="py-4 text-center text-xs text-amber-300">Group files using scan sizing and estimated open costs ↓</p>
    <div className="grid gap-3 sm:grid-cols-3">{[1,2,3].map(n=><div key={n} className="rounded-xl border border-blue-400/35 bg-blue-400/5 p-3 text-center"><p className="text-xs font-bold text-blue-300">Scan partition {n}</p><div aria-hidden="true" className="my-3 grid grid-cols-4 gap-1">{Array.from({length:12},(_,i)=><span key={i} className="h-4 rounded-sm border border-neutral-600 bg-neutral-800" />)}</div><p className="rounded-lg border border-emerald-400/30 p-2 text-xs text-emerald-300">Task {n}</p></div>)}</div>
    <figcaption className="mt-4 text-xs leading-5 text-neutral-400">Icons are conceptual, not an exact packing calculation. Each file still has to be opened; file grouping does not merge physical files.</figcaption>
  </figure>;
}
