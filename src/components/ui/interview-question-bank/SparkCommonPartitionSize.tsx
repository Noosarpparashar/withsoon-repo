export default function SparkCommonPartitionSize({ tuning = false }: { tuning?: boolean }) {
  return <figure aria-label={tuning ? "For 500 GiB input, 64, 128, 256 and 512 MiB targets yield about 8000, 4000, 2000 and 1000 tasks" : "For one hundred GiB input, task counts fall from 6400 at sixteen MiB to 200 at 512 MiB, with 800 tasks at 128 MiB"} className="rounded-2xl border border-neutral-700 bg-[#0b0d10] p-4 text-neutral-200 sm:p-5">
    <p className="text-center font-bold text-white">Partition size versus approximate task count</p>
    <div className="mt-5 space-y-3">{(tuning ? [64,128,256,512] : [16,32,64,128,256,512]).map(size=>{const tasks=(tuning ? 512000 : 102400)/size;return <div key={size} className="grid grid-cols-[3.5rem_1fr_3rem] items-center gap-2 text-xs"><span>{size} MiB</span><div className="h-6 rounded bg-neutral-800"><div style={{width:`${tasks/(tuning ? 8000 : 6400)*100}%`}} className={`h-full min-w-1 rounded ${size===128 ? "bg-emerald-400/80" : "bg-blue-400/80"}`} /></div><span className="text-right">{tasks.toLocaleString()}</span></div>})}</div>
    <figcaption className="mt-4 text-xs leading-5 text-neutral-400">Illustrative {tuning ? "500" : "100"} GiB of ideally splittable input, ignoring file-open costs and other sizing rules. The highlighted 128 MiB setting gives about {tuning ? "4,000" : "800"} input tasks.</figcaption>
  </figure>;
}
