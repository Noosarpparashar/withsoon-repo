export default function SparkRunVariation() {
  return <figure aria-label="Hypothetical daily execution times: Monday twenty, Tuesday twenty-two, Wednesday sixty-five, Thursday twenty-four, and Friday twenty minutes" className="rounded-2xl border border-neutral-700 bg-[#0b0d10] p-4 text-neutral-200 sm:p-5">
    <p className="text-center font-bold text-white">Illustrative daily execution times</p>
    <div className="mt-5 space-y-3">{[{day:"Monday",min:20},{day:"Tuesday",min:22},{day:"Wednesday",min:65},{day:"Thursday",min:24},{day:"Friday",min:20}].map(({day,min})=><div key={day} className="grid grid-cols-[4.5rem_1fr_3rem] items-center gap-2 text-xs"><span>{day}</span><div className="h-6 rounded bg-neutral-800"><div style={{width:`${min/80*100}%`}} className={`h-full rounded ${day==="Wednesday" ? "bg-amber-400/80" : "bg-blue-400/80"}`} /></div><span className="text-right">{min} min</span></div>)}</div>
    <div aria-hidden="true" className="ml-20 mr-14 mt-3 flex justify-between text-[10px] text-neutral-500">{[0,20,40,60,80].map(n=><span key={n}>{n}</span>)}</div>
    <figcaption className="mt-4 text-xs leading-5 text-neutral-400">Hypothetical comparison, not benchmark results. A slower run requires investigation of input, plan, shuffle/spill, executor availability, and infrastructure metrics.</figcaption>
  </figure>;
}
