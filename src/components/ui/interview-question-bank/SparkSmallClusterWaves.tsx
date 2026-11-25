export default function SparkSmallClusterWaves() {
  return <figure aria-label="Eight task slots process eight, eighty, eight hundred, or eight thousand partitions in one, ten, one hundred, or one thousand illustrative waves" className="rounded-2xl border border-neutral-700 bg-[#0b0d10] p-4 text-neutral-200 sm:p-5">
    <p className="text-center font-bold text-white">8 available task slots</p><div aria-hidden="true" className="my-4 grid grid-cols-8 gap-2">{Array.from({length:8},(_,i)=><span key={i} className="h-7 rounded border border-emerald-400/40 bg-emerald-400/20" />)}</div>
    <div className="space-y-2">{[8,80,800,8000].map(n=><div key={n} className="flex flex-wrap justify-between gap-2 rounded-lg border border-neutral-700 p-3 text-xs"><span>{n.toLocaleString()} partitions</span><span className="font-bold text-blue-300">{(n/8).toLocaleString()} {n===8 ? "wave" : "waves"}</span></div>)}</div>
    <figcaption className="mt-4 text-xs leading-5 text-neutral-400">Assumes eight slots, one CPU core per task, equal task durations, and no retries. More waves need not mean a slower job: smaller tasks may reduce memory pressure and spill.</figcaption>
  </figure>;
}
