export default function SparkRepartitionCoalesce({ coalesce = false }: { coalesce?: boolean }) {
  const before = coalesce ? [100,20,150,30,10,170,40,80] : [100,100,100,100];
  const after = coalesce ? [120,180,180,120] : [50,50,50,50,50,50,50,50];
  return <figure aria-label={coalesce ? "Eight partitions combined into four without a full shuffle" : "Four partitions redistributed into eight through a full shuffle"} className="rounded-2xl border border-neutral-700 bg-[#0b0d10] p-4 text-neutral-200 sm:p-5">
    <p className="mb-3 text-sm font-bold text-white">Before: {before.length} partitions</p>
    <div className="grid grid-cols-4 gap-2">{before.map((size,i)=><div key={i} className="rounded-lg border border-blue-400/35 bg-blue-400/5 p-2 text-center text-xs"><p className="font-semibold text-blue-300">P{i+1}</p><p className="mt-2">{size} MiB</p></div>)}</div>
    <div className="my-4 rounded-lg border border-amber-400/30 bg-amber-400/5 p-3 text-center text-sm font-semibold text-amber-300">{coalesce ? "Combine existing partitions without full shuffle" : "Full shuffle and redistribution"}<span aria-hidden="true" className="mt-1 block">↓</span></div>
    <p className="mb-3 text-sm font-bold text-white">After: {after.length} partitions</p>
    <div className="grid grid-cols-4 gap-2">{after.map((size,i)=><div key={i} className="rounded-lg border border-emerald-400/35 bg-emerald-400/5 p-2 text-center text-xs"><p className="font-semibold text-emerald-300">P{i+1}</p><p className="mt-2">{size} MiB</p>{coalesce && <p className="mt-2 text-[10px] text-neutral-400">From P{i*2+1} + P{i*2+2}</p>}</div>)}</div>
    <figcaption className="mt-4 text-center text-xs leading-5 text-neutral-400">{coalesce ? "Illustrative grouping of 600 MiB. Spark may group partitions differently; output sizes can remain uneven." : "Illustrative 400 MiB redistributed evenly. Actual byte sizes may differ even when record counts are balanced."}</figcaption>
  </figure>;
}
