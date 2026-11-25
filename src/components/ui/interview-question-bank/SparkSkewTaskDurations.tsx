export default function SparkSkewTaskDurations() {
  return <figure aria-label="Illustrative task durations: seven tasks take about ten seconds and task eight takes 120 seconds" className="rounded-2xl border border-neutral-700 bg-[#0b0d10] p-4 text-neutral-200 sm:p-5">
    <p className="text-center font-bold text-white">Task duration in a skewed Spark stage</p>
    <p className="mt-1 text-center text-xs text-neutral-400">Illustrative execution times across eight tasks</p>
    <div className="mt-5 space-y-3">{[10,9,11,10,12,9,10,120].map((seconds,i)=><div key={i} className="grid grid-cols-[1.5rem_1fr_3rem] items-center gap-2 text-xs"><span>T{i+1}</span><div className="h-5 rounded bg-neutral-800"><div style={{width:`${seconds/140*100}%`}} className={`h-full rounded ${i===7 ? "bg-amber-400/80" : "bg-blue-400/80"}`} /></div><span className="text-right">{seconds} sec</span></div>)}</div>
    <div aria-hidden="true" className="ml-8 mr-14 mt-3 flex justify-between text-[10px] text-neutral-500">{[0,35,70,105,140].map(n=><span key={n}>{n}s</span>)}</div>
    <figcaption className="mt-4 text-xs leading-5 text-neutral-400">Task 8 is a straggler. Confirm larger records/bytes and inspect spill, GC, and executor conditions before concluding that data skew is the cause.</figcaption>
  </figure>;
}
