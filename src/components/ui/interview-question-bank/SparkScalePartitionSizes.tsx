export default function SparkScalePartitionSizes() {
  return <figure aria-label="For one decimal TB, ten balanced partitions average one hundred GB while five thousand average two hundred MB" className="rounded-2xl border border-neutral-700 bg-[#0b0d10] p-4 text-neutral-200 sm:p-5">
    <p className="text-center font-bold text-white">Illustrative average data per partition</p><p className="mt-1 text-center text-xs text-neutral-400">1 TB of data · decimal units</p>
    <div className="mt-5 grid gap-3 sm:grid-cols-2">{[{count:"10 partitions",size:"100 GB",hot:true},{count:"5,000 partitions",size:"200 MB",hot:false}].map(({count,size,hot})=><div key={count} className={`rounded-xl border p-4 text-center ${hot ? "border-amber-400/35 bg-amber-400/5" : "border-emerald-400/35 bg-emerald-400/5"}`}><p className="text-sm font-semibold">{count}</p><p className={`mt-3 text-2xl font-bold ${hot ? "text-amber-300" : "text-emerald-300"}`}>{size}</p><p className="mt-1 text-xs text-neutral-400">Per partition</p></div>)}</div>
    <figcaption className="mt-4 text-xs leading-5 text-neutral-400">Assumes evenly distributed data. Actual working memory can differ substantially from input bytes. More partitions do not automatically fix hot-key skew or unbounded aggregation state.</figcaption>
  </figure>;
}
