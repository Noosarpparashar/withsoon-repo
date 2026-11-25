export default function SparkSpeculationBenefit({ launch = 15, finish = 25 }: { launch?: number; finish?: number }) {
  return <figure aria-label={`Illustrative stage completion time falls from 120 seconds without speculation to ${finish} seconds when a duplicate task wins`} className="rounded-2xl border border-neutral-700 bg-[#0b0d10] p-4 text-neutral-200 sm:p-5">
    <p className="text-center font-bold text-white">Illustrative stage completion time</p>
    <div className="mt-5 space-y-4">{[{label:"Without speculation",seconds:120},{label:"With speculation",seconds:finish}].map(({label,seconds})=><div key={label}><div className="mb-2 flex justify-between gap-2 text-xs"><span>{label}</span><span className="font-bold">{seconds} sec</span></div><div className="h-7 rounded bg-neutral-800"><div style={{width:`${seconds/140*100}%`}} className={`h-full rounded ${seconds===120 ? "bg-amber-400/80" : "bg-emerald-400/80"}`} /></div></div>)}</div>
    <div aria-hidden="true" className="mt-3 flex justify-between text-[10px] text-neutral-500">{[0,35,70,105,140].map(s=><span key={s}>{s}s</span>)}</div>
    <figcaption className="mt-4 text-xs leading-5 text-neutral-400">Assumes the other 99 tasks finish by 10s, a speculative attempt starts at {launch}s and succeeds at {finish}s. Illustrative timing only: eligibility and resource availability determine actual behavior.</figcaption>
  </figure>;
}
