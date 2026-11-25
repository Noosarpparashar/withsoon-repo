export default function SparkSpeculationSkew() {
  return <figure aria-label="Four tasks process about one million records each while task five processes twenty million; its speculative copy must also process twenty million" className="rounded-2xl border border-neutral-700 bg-[#0b0d10] p-4 text-neutral-200 sm:p-5">
    <p className="text-center font-bold text-white">Task workloads in a skewed Spark stage</p><p className="mt-1 text-center text-xs text-neutral-400">Records each task must process</p>
    <div className="mt-5 space-y-3">{[1,1,1,1,20].map((n,i)=><div key={i} className="grid grid-cols-[1.5rem_1fr_2rem] items-center gap-2 text-xs"><span>T{i+1}</span><div className="h-6 rounded bg-neutral-800"><div style={{width:`${n/24*100}%`}} className={`h-full min-w-1 rounded ${i===4 ? "bg-amber-400/80" : "bg-blue-400/80"}`} /></div><span className="text-right">{n}M</span></div>)}</div>
    <div aria-hidden="true" className="ml-8 mr-10 mt-3 flex justify-between text-[10px] text-neutral-500">{[0,6,12,18,24].map(n=><span key={n}>{n}M</span>)}</div>
    <div className="mt-4 grid gap-2 sm:grid-cols-2">{["Original Task 5","Speculative Task 5"].map(label=><div key={label} className="rounded-lg border border-amber-400/35 bg-amber-400/5 p-3 text-center"><p className="text-xs">{label}</p><p className="mt-2 text-lg font-bold text-amber-300">20M records</p></div>)}</div>
    <figcaption className="mt-4 text-xs leading-5 text-neutral-400">Illustrative workloads. Speculation duplicates the work; it does not divide the hot partition. AQE skew handling or salting targets the distribution problem.</figcaption>
  </figure>;
}
